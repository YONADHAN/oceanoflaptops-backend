const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../../models/orderSchema");

const razorpayInstance = new Razorpay({
  key_id: "rzp_test_2aUGLgE6VrGTVa",
  key_secret: "HOQKojWqHdEsqLQZ7N5Km49i",
});
const create_razorpay_order = async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await razorpayInstance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: "order_rcptid_11",
    });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: "Error creating order" });
  }
};

const verify_razorpay_payment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const hmac = crypto
    .createHmac("sha256", "HOQKojWqHdEsqLQZ7N5Km49i")
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");
  if (hmac === razorpay_signature) {
    res.json({ success: true });
    // const order = await Order.findOne({ razorpayPaymentId: razorpay_order_id });

    // if (!order) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Order not found" });
    // }

    // order.paymentStatus = "Completed";
    // order.razorpayPaymentId = razorpay_payment_id;
    // await order.save();

    // return res.json({
    //   success: true,
    //   message: "Payment verified and updated.",
    // });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
};

const retry_payment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found", error: "Order not found" });
    }

    if (order.paymentStatus === "Completed") {
      return res.status(400).json({ error: "Payment is already completed" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: (order.payableAmount+order.shippingFee) * 100,
      currency: "INR",
      receipt: `retry_${orderId}`,
    });
   
    order.razorpayPaymentId = razorpayOrder.id;
    await order.save();

    res.status(200).json(razorpayOrder);
  } catch (error) {
    console.error("Error in retry payment:", error);
    res.status(500).json({ error: "Error retrying payment" });
  }
};


const verify_retry_razorpay_payment = async(req,res)=>{
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const hmac = crypto
    .createHmac("sha256", "HOQKojWqHdEsqLQZ7N5Km49i")
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");
  if (hmac === razorpay_signature) {
    //res.json({ success: true });
    const order = await Order.findOne({ razorpayPaymentId: razorpay_order_id });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    order.paymentStatus = "Completed";
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    return res.json({
      success: true,
      message: "Payment verified and updated.",
    });
  } else {
    res.status(400).json({ success: false, message: "Invalid signature" });
  }
}

module.exports = {
  create_razorpay_order,
  verify_razorpay_payment,
  retry_payment,
  verify_retry_razorpay_payment
};
