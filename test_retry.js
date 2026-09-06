require('dotenv').config();
const mongoose = require('mongoose');
const { retry_payment } = require('./controllers/user/paymentController');
const Order = require('./models/orderSchema');
const Product = require('./models/productSchema');
const User = require('./models/userSchema');

async function testRetry() {
  await mongoose.connect(process.env.DB_URI);
  console.log('MongoDB connected');
  
  const user = await User.findOne();
  if (!user) return console.log("No user found");

  const product = await Product.findOne();
  
  const order = await Order.create({
      user: user._id,
      orderItems: [{
        product: product._id,
        productName: 'Test Retry',
        productImage: 'test.jpg',
        quantity: 1,
        price: 100,
        totalPrice: 100,
      }],
      totalAmount: 100,
      orderedAmount: 100,
      payableAmount: 100,
      shippingAddress: { name: "T", email: "e", phone: 1, pincode: 1, city: "C", district: "D", state: "S" },
      paymentMethod: "Razor pay",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      shippingFee: 0,
      reservationExpiresAt: new Date(Date.now() + 100000),
      paymentAttempts: [{
        attemptId: "123",
        razorpayOrderId: "order_mock",
        amount: 100,
        status: "FAILED"
      }]
  });
  
  console.log("Testing retry for order:", order.orderId);
  
  const req = {
    body: { orderId: order.orderId },
    user: user
  };
  
  const res = {
    status: (code) => {
      console.log("Status:", code);
      return res;
    },
    json: (data) => {
      console.log("Response:", data);
    }
  };
  
  await retry_payment(req, res);
  
  await mongoose.disconnect();
}

testRetry().catch(console.error);
