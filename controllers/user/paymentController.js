const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../../models/orderSchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");
const { sendOrderConfirmationEmail, sendOrderFailureEmail } = require("../../utils/emailService");
const mongoose = require("mongoose");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const create_razorpay_order = async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "order_rcptid_11",
    });
    res.status(HTTP_STATUS.OK).json(order);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Error creating order" });
  }
};

const verify_razorpay_payment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const hmac = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");
  if (hmac === razorpay_signature) {
    res.json({ success: true });
  } else {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.INVALID_SIGNATURE });
  }
};

const retry_payment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: "Not authorized to retry this order" });
    }

    if (order.paymentStatus !== "Pending") {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order is not pending payment" });
    }

    if (order.orderStatus === "Cancelled") {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order is already cancelled" });
    }

    if (!order.reservationExpiresAt || order.reservationExpiresAt <= new Date()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Reservation has expired. Please create a new order." });
    }

    const alreadyCaptured = order.paymentAttempts.some(a => a.status === "CAPTURED");
    if (alreadyCaptured) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Payment already captured" });
    }

    const activeAttempt = order.paymentAttempts.find(a => a.status === "CREATED");
    if (activeAttempt) {
      await session.commitTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        id: activeAttempt.razorpayOrderId,
        amount: activeAttempt.amount * 100,
        currency: "INR" 
      });
    }

    const attemptAmount = order.payableAmount || order.totalAmount;
    if (!attemptAmount || attemptAmount <= 0) {
        throw new Error("Invalid authoritative order amount for retry");
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(attemptAmount * 100),
      currency: "INR",
      receipt: `retry_${order._id}_${Date.now()}`,
    });

    order.paymentAttempts.push({
      attemptId: crypto.randomUUID(),
      razorpayOrderId: razorpayOrder.id,
      amount: attemptAmount,
      status: "CREATED",
    });

    order.razorpayPaymentId = razorpayOrder.id;

    await order.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(HTTP_STATUS.OK).json({ success: true, ...razorpayOrder });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, error: "Error retrying payment" });
  }
};


const verify_retry_razorpay_payment = async(req,res)=>{
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const hmac = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");
  if (hmac === razorpay_signature) {
    const order = await Order.findOne({ razorpayPaymentId: razorpay_order_id });

    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    order.paymentStatus = "Completed";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    try {
      const emailItems = order.orderItems.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: item.price
      }));
      sendOrderConfirmationEmail({
        email: order.shippingAddress.email,
        name: order.shippingAddress.name,
        orderId: order.orderId,
        items: emailItems,
        totalAmount: order.payableAmount || order.totalAmount
      });
    } catch (err) {
    }

    return res.json({
      success: true,
      message: SUCCESS_MESSAGES.PAYMENT_VERIFIED,
    });
  } else {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.INVALID_SIGNATURE });
  }
}

const { reconcilePayment } = require("../../services/paymentReconciliationService");

const reconcile_frontend_payment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
      
    if (expectedSignature !== razorpay_signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.INVALID_SIGNATURE });
    }

    const result = await reconcilePayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "CAPTURED",
      userId: req.user?._id
    });

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Reconciliation failed" });
  }
};

const notify_payment_failure = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order ID is required" });
    }
    
    const order = await Order.findOne({ 
      $or: [{ orderId: orderId }, { _id: orderId }],
      user: req.user._id
    });
    
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
    }
    
    try {
      sendOrderFailureEmail({
        email: order.shippingAddress.email,
        name: order.shippingAddress.name,
        orderId: order.orderId,
        totalAmount: order.payableAmount || order.totalAmount
      });
    } catch (err) {}
    
    return res.status(HTTP_STATUS.OK).json({ success: true, message: "Failure notification sent" });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  create_razorpay_order,
  verify_razorpay_payment,
  retry_payment,
  verify_retry_razorpay_payment,
  reconcile_frontend_payment,
  notify_payment_failure
};
