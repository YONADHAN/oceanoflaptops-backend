require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/orderSchema');
const Product = require('./models/productSchema');
const User = require('./models/userSchema');
const { reconcilePayment } = require('./services/paymentReconciliationService');

async function runTests() {
  await mongoose.connect(process.env.DB_URI);
  console.log('MongoDB connected');

  const user = await User.findOne();
  const userId = user._id;

  const productDoc = new Product({
    productName: "Test 6.0 Product",
    price: 1000,
    salePrice: 1000,
    quantity: 10,
    productImages: ["test.jpg"],
    brand: "Test",
    description: "test",
    specifications: { processor: "test", ram: "test", storage: "test", display: "test" }
  });
  const product = await productDoc.save({ validateBeforeSave: false });

  async function createMockOrder(status = "Pending", paymentStatus = "Pending", expired = false) {
    return await Order.create({
      user: userId,
      orderItems: [{
        product: product._id,
        productName: 'Test 6.0 Product',
        productImage: 'test.jpg',
        quantity: 2,
        price: 1000,
        totalPrice: 2000,
      }],
      totalAmount: 2000,
      orderedAmount: 2000,
      shippingAddress: { name: "T", email: "e", phone: 1, pincode: 1, city: "C", district: "D", state: "S" },
      paymentMethod: "Razor pay",
      paymentStatus: paymentStatus,
      orderStatus: status,
      shippingFee: 0,
      reservationExpiresAt: expired ? new Date(Date.now() - 10000) : new Date(Date.now() + 100000),
      paymentAttempts: [{
        attemptId: "123",
        razorpayOrderId: "order_mock_" + Date.now(),
        amount: 2000,
        status: "CREATED"
      }]
    });
  }

  let passed = 0; let total = 0;
  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  try {
    console.log("\n--- Running Tests Phase 6 ---");

    // Callback + Webhook Race (Idempotency)
    let order1 = await createMockOrder();
    const rzpOrderId = order1.paymentAttempts[0].razorpayOrderId;
    let res1 = await reconcilePayment({ razorpayOrderId: rzpOrderId, razorpayPaymentId: "pay_1", status: "CAPTURED", amount: 200000 });
    let res2 = await reconcilePayment({ razorpayOrderId: rzpOrderId, razorpayPaymentId: "pay_1", status: "CAPTURED", amount: 200000 });
    
    let check1 = await Order.findById(order1._id);
    assert(res1.success && res2.message === "Already processed" && check1.paymentStatus === "Completed", "Duplicate Webhook/Callback Idempotency");

    // Orphaned Payment
    let res3 = await reconcilePayment({ razorpayOrderId: "missing_order", razorpayPaymentId: "pay_2", status: "CAPTURED", amount: 100 });
    assert(res3.orphaned === true, "Orphaned Payment returns orphaned flag");

    // Late Failure
    let res4 = await reconcilePayment({ razorpayOrderId: rzpOrderId, razorpayPaymentId: "pay_1", status: "FAILED" });
    let check4 = await Order.findById(order1._id);
    assert(res4.message === "Failure ignored for Paid order" && check4.paymentStatus === "Completed", "Late failure ignored for Paid order");

    console.log(`\nTests completed: ${passed}/${total} passed.`);
  } catch (err) {
    console.error(err);
  } finally {
    await Product.findByIdAndDelete(product._id);
    await Order.deleteMany({ productName: 'Test 6.0 Product' });
    await mongoose.disconnect();
  }
}

runTests().catch(console.error);
