const mongoose = require("mongoose");
const Order = require("../models/orderSchema");
const User = require("../models/userSchema");
const Coupon = require("../models/couponSchema");

const reconcilePayment = async ({ razorpayOrderId, razorpayPaymentId, status, amount, currency, userId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ 
      "paymentAttempts.razorpayOrderId": razorpayOrderId 
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      console.error(`ORPHANED_PAYMENT: Order not found for razorpayOrderId: ${razorpayOrderId}, paymentId: ${razorpayPaymentId}. Requires manual refund/reconciliation.`);
      return { success: true, orphaned: true, message: "Orphaned payment logged" };
    }

    if (userId && order.user.toString() !== userId.toString()) {
      throw new Error("Payment ownership validation failed");
    }

    const attempt = order.paymentAttempts.find(
      (a) => a.razorpayOrderId === razorpayOrderId
    );

    if (!attempt) {
      await session.abortTransaction();
      session.endSession();
      console.error(`ORPHANED_PAYMENT: Payment attempt not found within order ${order.orderId} for razorpayOrderId: ${razorpayOrderId}. Requires manual refund/reconciliation.`);
      return { success: true, orphaned: true, message: "Orphaned payment logged" };
    }

    const normalizedAmount = amount ? (amount / 100) : attempt.amount;
    if (amount && normalizedAmount !== attempt.amount) {
       console.warn(`Amount mismatch for ${razorpayOrderId}: Expected ${attempt.amount}, got ${normalizedAmount}`);
       throw new Error("Payment amount validation failed");
    }
    if (currency && currency !== "INR") {
       console.warn(`Currency mismatch for ${razorpayOrderId}: Expected INR, got ${currency}`);
       throw new Error("Payment currency validation failed");
    }

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

      if (order.appliedCoupon) {
        const coupon = await Coupon.findOne({ name: order.appliedCoupon }).session(session);
        if (coupon) {
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
      if (order.paymentStatus === "Completed" || order.paymentStatus === "Paid") {
        console.log(`Reconciliation idempotent no-op: Ignored failure for already Paid Order ${order.orderId}.`);
        await session.commitTransaction();
        session.endSession();
        return { success: true, message: "Failure ignored for Paid order", orderId: order.orderId };
      }

      attempt.status = "FAILED";
      attempt.razorpayPaymentId = razorpayPaymentId;
      
      await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    if (status === "CAPTURED") {
      try {
        const { sendOrderConfirmationEmail } = require("../utils/emailService");
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
        console.error("Silent error in triggering email:", err);
      }
    } else if (status === "FAILED") {
      try {
        const { sendOrderFailureEmail } = require("../utils/emailService");
        sendOrderFailureEmail({
          email: order.shippingAddress.email,
          name: order.shippingAddress.name,
          orderId: order.orderId,
          totalAmount: order.payableAmount || order.totalAmount
        });
      } catch (err) {
        console.error("Silent error in triggering failure email:", err);
      }
    }

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
