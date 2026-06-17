
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const { jwtDecode } = require("jwt-decode");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


const order_history = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
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
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message:ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
}



const cancel_order = async (req, res) => {
  const orderId = req.params.orderId;
  const reason = req.body.reason
  try {
      const order = await Order.findById(orderId);
      if (!order) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
      }
      if(order.orderStatus === "Delivered"){
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.ORDER_IS_ALREADY_DELIVERED });
      }

     
      let cancelledProducts = [];
      await Promise.all(order.orderItems.map(async (item) => {
          item.orderStatus = "Cancelled";
          item.cancellationReason = reason;
          const product = await Product.findById(item.product);
          if (product) {
              cancelledProducts.push(product.productName);
              product.quantity += item.quantity;
              await product.save();
          }
      }));

      if ((order.paymentMethod === "Razor pay" ||order.paymentMethod === "wallet") && order.paymentStatus === "Completed") {
        const userId = order.user;
        let wallet = await Wallet.findOne({ userId });
      
        if (!wallet) {
          wallet = new Wallet({
            userId,
            balance: 0, 
            transactions: [],
          });
        }
              
        wallet.balance += order.payableAmount+order.shippingFee;
      
        const transactionItem = {
          type: "credit",
          amount: order.payableAmount+order.shippingFee,
          description: `Refund for cancelled product(s): ${cancelledProducts.join(', ')}`,
          date: new Date(),
        };
      
        wallet.transactions.push(transactionItem);
        await wallet.save();
         order.paymentStatus = "Refunded"
      }
      
      if(order.paymentMethod ==="Cash on Delivery"){
        order.paymentStatus = "Cancelled";
      }

      order.orderStatus = "Cancelled";
      
      order.payableAmount = 0;
      await order.save();

      return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: SUCCESS_MESSAGES.ORDER_CANCELLED,
      });

  } catch (error) {
      console.error("Error in cancel_order:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const cancel_product = async (req, res) => {
  const { productId, orderId, quantity, reason } = req.body;
  // console.log(productId, orderId, quantity, " product cancelled");

  try {
      
      const order = await Order.findById(orderId);
      if (!order) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
      }

  
      const orderItem = order.orderItems.find(item => item._id.toString() === productId);
      if (!orderItem) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_ITEM_NOT_FOUND });
      }

    
      const product = await Product.findById(orderItem.product);
      if (!product) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
      }

      // console.log("Original product quantity", product.quantity);
     
      product.quantity += quantity;
      await product.save();

      let amountReduced = 0;
     
      let flag = true;
      order.orderItems.forEach(item => {
          if (item._id.toString() === productId) {
              item.orderStatus = "Cancelled";
              if(order.paymentStatus === "Completed"){
                item.paymentStatus = "Refunded";
              }
              item.cancellationReason = reason
              amountReduced += item.totalPrice
          }
          if (item.orderStatus !== "Cancelled") {
              flag = false;
          }
      });

      if (flag ) {
          order.orderStatus = "Cancelled";
          if(order.paymentMethod === "Cash on Delivery"){
            order.paymentStatus = "Cancelled";
          }         
      }
      const noOfItems = order.orderItems.length;
      const averageCouponDiscount = Math.floor(order.couponDiscount / noOfItems);
    
      order.payableAmount-=(amountReduced - averageCouponDiscount);
      let amountGetAddedToTheWallet = (amountReduced - averageCouponDiscount)+(flag?order.shippingFee:0)

      if ((order.paymentMethod === "Razor pay" || order.paymentMethod === "wallet" ) && order.paymentStatus === "Completed") {
        const userId = order.user;
        let wallet = await Wallet.findOne({ userId });
      
        if (!wallet) {
          wallet = new Wallet({
            userId,
            balance: 0, 
            transactions: [],
          });
        }
              
        wallet.balance += amountGetAddedToTheWallet;
      
        const transactionItem = {
          type: "credit",
          amount: amountGetAddedToTheWallet,
          description: `Refund for cancelled product: ${product.productName}`,
          date: new Date(),
        };
      
        wallet.transactions.push(transactionItem);
        await wallet.save();
        if(flag ) {
          order.paymentStatus = "Refunded";
        }
      }   
     
      await order.save();
      res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.PRODUCT_CANCELLED });

  } catch (error) {
      //console.error("Error in cancel_product:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


const return_product = async (req, res) => {
  const { productId, orderId, reason } = req.body;
 
  try {
    const order = await Order.findById(orderId);
    if(!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }
    
    const orderItem = order.orderItems.find(item => item._id.toString() === productId);
    orderItem.returnRequest.requestStatus = 'Pending';
    orderItem.returnRequest.reason = reason;
    order.isReturnReq = true;
    order.save();
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.ORDER_RETURNED });
    
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR})
  }
}


const get_order_id = async (req, res) => {
  const orderId = req.body.orderId;
  try {
    const order = await Order.findOne({orderId: orderId});
    if(!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.ORDER_ID_FETCHED, orderDatabaseId: order._id });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error: error});
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
