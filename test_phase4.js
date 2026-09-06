require('dotenv').config();
const mongoose = require('mongoose');
const { reconcilePayment } = require('./services/paymentReconciliationService');
const Order = require('./models/orderSchema');
const crypto = require('crypto');
const Product = require('./models/productSchema');
const User = require('./models/userSchema');

async function runTests() {
  await mongoose.connect(process.env.DB_URI);
  console.log('MongoDB connected');

  // Setup Test User
  const user = await User.findOne();
  if (!user) throw new Error("No user found");
  const userId = user._id;

  // Setup Test Order
  const razorpayOrderId = 'order_' + crypto.randomBytes(8).toString('hex');
  const attemptId = crypto.randomUUID();

  const newOrder = await Order.create({
    user: userId,
    orderItems: [{
      product: new mongoose.Types.ObjectId(),
      productName: 'Test',
      productImage: 'test.jpg',
      quantity: 1,
      price: 1000,
      totalPrice: 1000,
    }],
    totalAmount: 1000,
    orderedAmount: 1000,
    shippingAddress: {
      name: "Test", email: "test@test.com", phone: 1234567890, pincode: 123456, city: "C", district: "D", state: "S"
    },
    paymentMethod: "Razor pay",
    paymentStatus: "Pending",
    orderStatus: "Pending",
    shippingFee: 0,
    paymentAttempts: [{
      attemptId,
      razorpayOrderId,
      amount: 1000,
      status: "CREATED"
    }]
  });

  console.log(`\n--- Test 1: Callback success ---`);
  let res1 = await reconcilePayment({
    razorpayOrderId,
    razorpayPaymentId: 'pay_123',
    status: 'CAPTURED',
    amount: 100000, // paise
    userId: userId
  });
  console.log(`Result: ${res1.success}, Order Status: ${res1.paymentStatus}`);

  console.log(`\n--- Test 2: Webhook success (Idempotent Duplicate) ---`);
  let res2 = await reconcilePayment({
    razorpayOrderId,
    razorpayPaymentId: 'pay_123',
    status: 'CAPTURED',
    amount: 100000,
    userId: null
  });
  console.log(`Result: ${res2.success}, Message: ${res2.message}`);

  console.log(`\n--- Test 3: Late Failure (Ignored) ---`);
  let res3 = await reconcilePayment({
    razorpayOrderId,
    razorpayPaymentId: 'pay_123_failed',
    status: 'FAILED',
    amount: 100000,
    userId: null
  });
  console.log(`Result: ${res3.success}, Message: ${res3.message}`);

  console.log(`\n--- Test 4: Wrong User (Ownership protection) ---`);
  try {
    await reconcilePayment({
      razorpayOrderId,
      razorpayPaymentId: 'pay_123',
      status: 'CAPTURED',
      amount: 100000,
      userId: new mongoose.Types.ObjectId()
    });
  } catch (err) {
    console.log(`Caught Error: ${err.message}`);
  }

  // Cleanup
  await Order.findByIdAndDelete(newOrder._id);
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
