const mongoose = require("mongoose");
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Coupon = require("../../models/couponSchema");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const HTTP_STATUS = require("../../utils/constants/httpStatus");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

const processCheckout_v2 = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { shippingAddress, paymentMethod, appliedCouponCode } = req.body;
    const idempotencyKey = req.headers["idempotency-key"] || crypto.randomUUID();
    const userId = req.user._id;

    // 1. Idempotency Check
    const existingOrder = await Order.findOne({ idempotencyKey }).session(session);
    if (existingOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "Order already processed",
        orderId: existingOrder.orderId,
        razorpayOrderId: existingOrder.paymentAttempts[0]?.razorpayOrderId,
      });
    }

    // 2. Fetch Authoritative Cart
    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty or not found");
    }

    // 3. Authoritative Amount Calculation
    let calculatedTotal = 0;
    const processedItems = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Product ${item.productName} not found`);

      // Atomic inventory check and reservation (Phase 3 Rule 7)
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.productName}`);
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, quantity: { $gte: item.quantity } },
        { $inc: { quantity: -item.quantity } },
        { new: true, session }
      );

      if (!updatedProduct) {
        throw new Error(`Concurrency issue: Could not reserve stock for ${product.productName}`);
      }

      const itemTotal = item.salePrice * item.quantity;
      calculatedTotal += itemTotal;

      processedItems.push({
        product: product._id,
        productName: product.productName,
        productImage: product.productImages && product.productImages[0] ? product.productImages[0] : item.productImage,
        quantity: item.quantity,
        price: item.salePrice,
        discount: item.discount || 0,
        orderStatus: "Pending",
        paymentStatus: "Pending",
        totalPrice: itemTotal,
      });
    }

    // 4. Shipping & Coupon Rules
    let shippingFee = 15;
    let couponDiscountAmount = 0;

    if (appliedCouponCode) {
      const coupon = await Coupon.findOne({ name: appliedCouponCode, isList: true }).session(session);
      if (coupon && calculatedTotal >= coupon.minimumPrice) {
        couponDiscountAmount = coupon.offerPrice;
        // Business rule: track coupon usage if needed. We assume it's applied correctly.
      }
    }

    const finalAmount = calculatedTotal + shippingFee - couponDiscountAmount;
    if (finalAmount < 0) throw new Error("Invalid final amount");

    // 5. Wallet check if applicable
    if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet || wallet.balance < finalAmount) {
        throw new Error("Insufficient balance in wallet");
      }
      wallet.balance -= finalAmount;
      wallet.transactions.push({
        type: "debit",
        amount: finalAmount,
        description: `Withdrawn for order checkout`,
        date: Date.now(),
      });
      await wallet.save({ session });
    }

    // 6. Create Application Order (PAYMENT_PENDING)
    const newOrder = new Order({
      user: userId,
      orderItems: processedItems,
      orderedAmount: calculatedTotal + shippingFee,
      totalAmount: finalAmount,
      payableAmount: finalAmount,
      shippingAddress: {
        name: shippingAddress.name || "N/A",
        email: shippingAddress.email || "N/A",
        phone: shippingAddress.phone || "N/A",
        pincode: shippingAddress.pincode,
        flatHouseNo: shippingAddress.flatHouseNo || "",
        areaStreet: shippingAddress.areaStreet || "",
        landmark: shippingAddress.landmark || "",
        city: shippingAddress.city,
        district: shippingAddress.district,
        state: shippingAddress.state,
      },
      orderStatus: "Pending",
      paymentMethod,
      paymentStatus: paymentMethod === "Cash on Delivery" || paymentMethod === "wallet" ? "Completed" : "Pending",
      totalDiscount: cart.totalDiscount || 0,
      couponDiscount: couponDiscountAmount,
      appliedCoupon: couponDiscountAmount > 0 ? appliedCouponCode : null,
      shippingFee,
      idempotencyKey,
      reservationExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days retry window
      deliveryBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 7. PaymentAttempt #1 & Razorpay Order
    let rzpOrder = null;
    if (paymentMethod === "Razor pay") {
      try {
        rzpOrder = await razorpayInstance.orders.create({
          amount: Math.round(finalAmount * 100),
          currency: "INR",
          receipt: `rcpt_${newOrder._id}`,
        });
      } catch (rzpErr) {
        throw new Error("Razorpay Order creation failed");
      }

      newOrder.paymentAttempts = [{
        attemptId: crypto.randomUUID(),
        razorpayOrderId: rzpOrder.id,
        amount: finalAmount,
        status: "CREATED",
      }];
      
      // Keep legacy field populated for compatibility
      newOrder.razorpayPaymentId = rzpOrder.id;
    }

    await newOrder.save({ session });

    // 8. Delete cart
    await Cart.findOneAndDelete({ userId }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      orderId: newOrder.orderId,
      mongodbId: newOrder._id,
      razorpayOrderId: rzpOrder ? rzpOrder.id : null,
      amount: finalAmount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Checkout V2 Error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  processCheckout_v2,
};
