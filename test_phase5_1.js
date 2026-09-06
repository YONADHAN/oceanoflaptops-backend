require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/orderSchema');
const Product = require('./models/productSchema');
const User = require('./models/userSchema');
const expireReservations = require('./utils/expireReservations');
const { reconcilePayment } = require('./services/paymentReconciliationService');

async function runTests() {
  await mongoose.connect(process.env.DB_URI);
  console.log('MongoDB connected');

  const user = await User.findOne();
  const userId = user._id;

  const productDoc = new Product({
    productName: "Test 5.1 Product",
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
        productName: 'Test 5.1 Product',
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
        razorpayOrderId: "order_mock",
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
    console.log("\n--- Running Tests ---");

    // Test 1 — Normal expiration
    let order1 = await createMockOrder("Pending", "Pending", true);
    await expireReservations();
    let check1 = await Order.findById(order1._id);
    assert(check1.orderStatus === "Expired" && !check1.reservationExpiresAt, "Test 1: Normal expiration");

    // Test 2 — Duplicate expiration
    let prodBefore = await Product.findById(product._id);
    await expireReservations();
    let prodAfter = await Product.findById(product._id);
    assert(prodBefore.quantity === prodAfter.quantity, "Test 2: Duplicate expiration (exact once inventory release)");

    // Test 3 — Expiration after PAID
    let order3 = await createMockOrder("Placed", "Completed", true);
    await expireReservations();
    let check3 = await Order.findById(order3._id);
    assert(check3.orderStatus === "Placed", "Test 3: Expiration after PAID");

    // Test 5 & 6 — Late capture after expiration/cancellation
    let order5 = await createMockOrder("Expired", "Pending", true);
    let res5 = await reconcilePayment("order_mock", "pay_mock", "CAPTURED");
    let check5 = await Order.findById(order5._id);
    assert(check5.orderStatus === "Expired" && check5.paymentStatus === "Pending", "Test 5 & 6: Late capture after expiration");
    assert(res5.isolated === true, "Test 5 & 6: Late capture returns isolated flag");

    // Test 13 — Multiple attempts reconciliation
    let order13 = await createMockOrder("Pending", "Pending", false);
    order13.paymentAttempts = [
      { attemptId: "1", razorpayOrderId: "order_1", status: "FAILED" },
      { attemptId: "2", razorpayOrderId: "order_2", status: "CREATED" }
    ];
    await order13.save();
    let res13 = await reconcilePayment("order_2", "pay_mock", "CAPTURED");
    let check13 = await Order.findById(order13._id);
    assert(check13.paymentStatus === "Completed" && check13.orderStatus === "Placed", "Test 13: Multiple attempts reconciliation");

    // Test 10 — Late failure
    let res10 = await reconcilePayment("order_1", "pay_mock_fail", "FAILED");
    let check10 = await Order.findById(order13._id);
    assert(check10.paymentStatus === "Completed" && check10.orderStatus === "Placed", "Test 10: Late failure ignores if already paid");

    console.log(`\nTests completed: ${passed}/${total} passed.`);
  } catch (err) {
    console.error(err);
  } finally {
    await Product.findByIdAndDelete(product._id);
    await Order.deleteMany({ _id: { $in: [/* skipped IDs */] } }); // Keep simple for now
    await mongoose.disconnect();
  }
}

runTests().catch(console.error);
