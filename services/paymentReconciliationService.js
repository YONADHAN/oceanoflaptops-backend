const mongoose = require("mongoose");
const Order = require("../models/orderSchema");
const User = require("../models/userSchema");
const Coupon = require("../models/couponSchema");

/**
 * Unified Payment Reconciliation Service
 * 
 * Safely processes Razorpay payment state changes, ensuring idempotency and 
 * one-time fulfillment (e.g., coupon consumption) regardless of whether 
 * the trigger is a webhook or a frontend callback.
 * 
 * @param {Object} params
 * @param {string} params.razorpayOrderId - The order_id from Razorpay
 * @param {string} params.razorpayPaymentId - The payment_id from Razorpay (null for failed initially)
 * @param {string} params.status - 'CAPTURED' or 'FAILED'
 * @param {number} params.amount - The authoritative amount from the Razorpay payload
 * @param {string} params.currency - The currency from Razorpay
 * @param {string} params.userId - Extracted user ID (to prevent paying someone else's order)
 */
const reconcilePayment = async ({ razorpayOrderId, razorpayPaymentId, status, amount, currency, userId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the Order containing the PaymentAttempt
    const order = await Order.findOne({ 
      "paymentAttempts.razorpayOrderId": razorpayOrderId 
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      console.error(`ORPHANED_PAYMENT: Order not found for razorpayOrderId: ${razorpayOrderId}, paymentId: ${razorpayPaymentId}. Requires manual refund/reconciliation.`);
      return { success: true, orphaned: true, message: "Orphaned payment logged" };
    }

    // 2. Validate Ownership (if userId is provided from frontend context)
    if (userId && order.user.toString() !== userId.toString()) {
      throw new Error("Payment ownership validation failed");
    }

    // 3. Find specific PaymentAttempt
    const attempt = order.paymentAttempts.find(
      (a) => a.razorpayOrderId === razorpayOrderId
    );

    if (!attempt) {
      await session.abortTransaction();
      session.endSession();
      console.error(`ORPHANED_PAYMENT: Payment attempt not found within order ${order.orderId} for razorpayOrderId: ${razorpayOrderId}. Requires manual refund/reconciliation.`);
      return { success: true, orphaned: true, message: "Orphaned payment logged" };
    }

    // 4. Validate Amount/Currency
    const normalizedAmount = amount ? (amount / 100) : attempt.amount;
    if (amount && normalizedAmount !== attempt.amount) {
       console.warn(`Amount mismatch for ${razorpayOrderId}: Expected ${attempt.amount}, got ${normalizedAmount}`);
       throw new Error("Payment amount validation failed");
    }
    if (currency && currency !== "INR") {
       console.warn(`Currency mismatch for ${razorpayOrderId}: Expected INR, got ${currency}`);
       throw new Error("Payment currency validation failed");
    }

    // 5. Idempotent State Transitions
    if (status === "CAPTURED") {
      if (order.paymentStatus === "Completed" || order.paymentStatus === "Paid") {
        await session.commitTransaction();
        session.endSession();
        return { success: true, message: "Already processed" };
      }

      attempt.status = "CAPTURED";
      attempt.razorpayPaymentId = razorpayPaymentId;

      if (order.orderStatus === "Expired" || order.orderStatus === "Cancelled") {
        await order.save({ session });
        await session.commitTransaction();
        session.endSession();
        return { success: true, message: "Payment isolated for cancelled/expired order", isolated: true };
      }

      order.paymentStatus = "Completed"; 
      order.orderStatus = "Placed"; 
      order.razorpayPaymentId = razorpayPaymentId; 

      // ONE-TIME FULFILLMENT: Coupon Consumption
      if (order.appliedCoupon) {
        const coupon = await Coupon.findOne({ name: order.appliedCoupon }).session(session);
        if (coupon) {
          // Verify it wasn't already applied by this order somehow
          const userObj = await User.findById(order.user).session(session);
          if (userObj) {
             coupon.users.push({
               userId: order.user,
               appliedOn: new Date(),
             });
             await coupon.save({ session });
             
             userObj.appliedCoupons.push({
               couponId: coupon._id,
               appliedOn: new Date(),
             });
             await userObj.save({ session });
          }
        }
      }

      await order.save({ session });
      
    } else if (status === "FAILED") {
      // If order is already completed, a late failure event MUST NOT overwrite it.
      if (order.paymentStatus === "Completed" || order.paymentStatus === "Paid") {
        console.log(`Reconciliation idempotent no-op: Ignored failure for already Paid Order ${order.orderId}.`);
        await session.commitTransaction();
        session.endSession();
        return { success: true, message: "Failure ignored for Paid order", orderId: order.orderId };
      }

      // Update attempt to FAILED, leave Order as PAYMENT_PENDING
      attempt.status = "FAILED";
      attempt.razorpayPaymentId = razorpayPaymentId;
      // We DO NOT set order.paymentStatus = "Failed" because retry is allowed.
      
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return { 
      success: true, 
      orderId: order.orderId, 
      mongodbId: order._id,
      paymentStatus: order.paymentStatus 
    };

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Reconciliation Service Error:", error.message);
    throw error;
  }
};

module.exports = {
  reconcilePayment,
};
