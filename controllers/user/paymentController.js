const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../../models/orderSchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");
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
    // const order = await Order.findOne({ razorpayPaymentId: razorpay_order_id });

    // if (!order) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    // }

    // order.paymentStatus = "Completed";
    // order.razorpayPaymentId = razorpay_payment_id;
    // await order.save();

    // return res.json({
    //   success: true,
    //   message: SUCCESS_MESSAGES.PAYMENT_VERIFIED,
    // });
  } else {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.INVALID_SIGNATURE });
  }
};

const retry_payment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;
    
    // Lock the order for update
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.ORDER_NOT_FOUND });
    }

    // 1. Verify ownership
    if (order.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.FORBIDDEN).json({ success: false, message: "Not authorized to retry this order" });
    }

    // 2. Retry Eligibility Check
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

    // Check if any attempt is already CAPTURED
    const alreadyCaptured = order.paymentAttempts.some(a => a.status === "CAPTURED");
    if (alreadyCaptured) {
      await session.abortTransaction();
      session.endSession();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Payment already captured" });
    }

    // 3. Prevent creating multiple active attempts for the exact same retry payload
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

    // 4. Create new Razorpay Order with authoritative amount
    const attemptAmount = order.payableAmount || order.totalAmount; // authoritative amount fallback
    if (!attemptAmount || attemptAmount <= 0) {
        throw new Error("Invalid authoritative order amount for retry");
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(attemptAmount * 100),
      currency: "INR",
      receipt: `retry_${order._id}_${Date.now()}`,
    });

    // 5. Create new Payment Attempt
    order.paymentAttempts.push({
      attemptId: crypto.randomUUID(),
      razorpayOrderId: razorpayOrder.id,
      amount: attemptAmount,
      status: "CREATED",
    });

    order.razorpayPaymentId = razorpayOrder.id; // Keep legacy field populated for compatibility

    await order.save({ session });
    
    await session.commitTransaction();
    session.endSession();

    res.status(HTTP_STATUS.OK).json({ success: true, ...razorpayOrder });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in retry payment:", error);
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
    //res.json({ success: true });
    const order = await Order.findOne({ razorpayPaymentId: razorpay_order_id });

    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: "Order not found" });
    }

    order.paymentStatus = "Completed";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

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
    
    // 1. Cryptographically verify signature server-side
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
      
    if (expectedSignature !== razorpay_signature) {
      console.warn("Invalid Razorpay signature on frontend callback");
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.INVALID_SIGNATURE });
    }

    // 2. Call unified reconciliation service
    const result = await reconcilePayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "CAPTURED", // Valid signature means frontend callback is claiming success
      userId: req.user?._id // Enforce ownership if authenticated
    });

    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    console.error("Frontend reconciliation failed:", error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Reconciliation failed" });
  }
};

module.exports = {
  create_razorpay_order,
  verify_razorpay_payment,
  retry_payment,
  verify_retry_razorpay_payment,
  reconcile_frontend_payment
};
