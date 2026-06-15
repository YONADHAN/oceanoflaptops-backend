const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../../models/orderSchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


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
    res.status(HTTP_STATUS.OK).json(order);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Error creating order" });
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
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ message: ERROR_MESSAGES.ORDER_NOT_FOUND, error: "Order not found" });
    }

    if (order.paymentStatus === "Completed") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Payment is already completed" });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: (order.payableAmount+order.shippingFee) * 100,
      currency: "INR",
      receipt: `retry_${orderId}`,
    });
   
    order.razorpayPaymentId = razorpayOrder.id;
    await order.save();

    res.status(HTTP_STATUS.OK).json(razorpayOrder);
  } catch (error) {
    console.error("Error in retry payment:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Error retrying payment" });
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

module.exports = {
  create_razorpay_order,
  verify_razorpay_payment,
  retry_payment,
  verify_retry_razorpay_payment
};
