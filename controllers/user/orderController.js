
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const { jwtDecode } = require("jwt-decode");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


const order_history = async (req, res) => {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ success: false, message: ERROR_MESSAGES.UNAUTHORIZED });
    }

    const decode = jwtDecode(token);
    const userId = decode._id;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count of orders for pagination
    const total = await Order.countDocuments({ user: userId });

    // Fetch paginated orders for the user
    const orders = await Order.find({ user: userId })
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit);

    if (!orders || orders.length === 0) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: SUCCESS_MESSAGES.NO_ORDERS_FOUND });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.ORDER_HISTORY_FETCHED,
      orders,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const get_order = async (req, res) => {

  const orderId = req.params.orderId;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.ORDER_FETCHED, order });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
}



const cancel_order = async (req, res) => {
  const orderId = req.params.orderId;
  const reason = req.body.reason;
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // 1. Lock and validate order state to ensure idempotency exactly once
    const order = await Order.findOneAndUpdate(
      { 
        _id: orderId, 
        orderStatus: { $in: ["Pending", "Placed", "Shipped"] } 
      },
      { $set: { orderStatus: "Cancelled" } },
      { session, new: true }
    );

    if (!order) {
      await session.abortTransaction();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order cannot be cancelled in its current state, or it is already cancelled." });
    }

    let cancelledProducts = [];
    
    // 2. Restore inventory atomically
    for (const item of order.orderItems) {
      if (item.orderStatus !== "Cancelled") {
        item.orderStatus = "Cancelled";
        item.cancellationReason = reason;
        
        await Product.updateOne(
          { _id: item.product },
          { $inc: { quantity: item.quantity } },
          { session }
        );
        cancelledProducts.push(`${item.productName || item.product} (x${item.quantity})`);
      }
    }

    // 3. Process Wallet Refund atomically
    if ((order.paymentMethod === "Razor pay" || order.paymentMethod === "wallet") && order.paymentStatus === "Completed") {
      const userId = order.user;
      const refundAmount = order.payableAmount + order.shippingFee;

      const transactionItem = {
        type: "credit",
        amount: refundAmount,
        description: `Refund for cancelled product(s): ${cancelledProducts.join(', ')}`,
        date: new Date(),
      };

      await Wallet.findOneAndUpdate(
        { userId },
        { 
          $inc: { balance: refundAmount },
          $push: { transactions: transactionItem }
        },
        { session, upsert: true }
      );
      
      order.paymentStatus = "Refunded";
    }

    if (order.paymentMethod === "Cash on Delivery") {
      order.paymentStatus = "Cancelled";
    }

    order.payableAmount = 0;
    
    // 4. Save order to finalize item statuses and payment status
    await order.save({ session });
    
    await session.commitTransaction();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.ORDER_CANCELLED,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error in cancel_order:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  } finally {
    await session.endSession();
  }
};

const cancel_product = async (req, res) => {
  const { productId, orderId, quantity, reason } = req.body;
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }

    if (["Delivered", "Cancelled", "Returned", "Expired"].includes(order.orderStatus)) {
      await session.abortTransaction();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order cannot be modified in its current state." });
    }

    const orderItem = order.orderItems.find(item => item._id.toString() === productId);
    if (!orderItem) {
      await session.abortTransaction();
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_ITEM_NOT_FOUND });
    }

    if (orderItem.orderStatus === "Cancelled") {
      await session.abortTransaction();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Item is already cancelled." });
    }

    // Atomic inventory restoration
    await Product.updateOne(
      { _id: orderItem.product },
      { $inc: { quantity: quantity } },
      { session }
    );

    let amountReduced = 0;
    let flag = true;

    order.orderItems.forEach(item => {
      if (item._id.toString() === productId) {
        item.orderStatus = "Cancelled";
        if (order.paymentStatus === "Completed") {
          item.paymentStatus = "Refunded";
        }
        item.cancellationReason = reason;
        amountReduced += item.totalPrice;
      }
      if (item.orderStatus !== "Cancelled") {
        flag = false;
      }
    });

    if (flag) {
      order.orderStatus = "Cancelled";
      if (order.paymentMethod === "Cash on Delivery") {
        order.paymentStatus = "Cancelled";
      }
    }

    const noOfItems = order.orderItems.length;
    const averageCouponDiscount = Math.floor(order.couponDiscount / noOfItems);

    order.payableAmount -= (amountReduced - averageCouponDiscount);
    let amountGetAddedToTheWallet = (amountReduced - averageCouponDiscount) + (flag ? order.shippingFee : 0);

    if ((order.paymentMethod === "Razor pay" || order.paymentMethod === "wallet") && order.paymentStatus === "Completed") {
      const userId = order.user;
      
      const transactionItem = {
        type: "credit",
        amount: amountGetAddedToTheWallet,
        description: `Refund for cancelled product: ${orderItem.productName || orderItem.product} (x${quantity})`,
        date: new Date(),
      };

      await Wallet.findOneAndUpdate(
        { userId },
        { 
          $inc: { balance: amountGetAddedToTheWallet },
          $push: { transactions: transactionItem }
        },
        { session, upsert: true }
      );
      
      if (flag) {
        order.paymentStatus = "Refunded";
      }
    }

    await order.save({ session });
    
    await session.commitTransaction();
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.PRODUCT_CANCELLED });

  } catch (error) {
    await session.abortTransaction();
    //console.error("Error in cancel_product:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  } finally {
    await session.endSession();
  }
};


const return_product = async (req, res) => {
  const { productId, orderId, reason } = req.body;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }

    const orderItem = order.orderItems.find(item => item._id.toString() === productId);
    orderItem.returnRequest.requestStatus = 'Pending';
    orderItem.returnRequest.reason = reason;
    order.isReturnReq = true;
    order.save();
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.ORDER_RETURNED });

  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR })
  }
}


const get_order_id = async (req, res) => {
  const orderId = req.body.orderId;
  try {
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.ORDER_ID_FETCHED, orderDatabaseId: order._id });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error: error });
  }
}



module.exports = {
  order_history,
  get_order,
  cancel_order,
  cancel_product,
  return_product,
  get_order_id,
};
