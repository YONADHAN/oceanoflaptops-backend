require('dotenv').config();
const mongoose = require('mongoose');
const { processCheckout_v2 } = require('./controllers/user/checkoutControllerV2');
const Product = require('./models/productSchema');
const Cart = require('./models/cartSchema');
const Order = require('./models/orderSchema');
const crypto = require('crypto');

const mockRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
};

async function runTests() {
  await mongoose.connect(process.env.DB_URI);
  console.log('MongoDB connected');

  // Setup Test Data
  const userId = new mongoose.Types.ObjectId();
  const product = await Product.findOne();
  if (!product) {
    console.error('No products in DB to run tests');
    process.exit(1);
  }
  // Set quantity to 1 for concurrency test
  await Product.findByIdAndUpdate(product._id, { quantity: 1, salePrice: 80000 });
  product.quantity = 1;
  product.salePrice = 80000;

  const cart = await Cart.create({
    userId,
    items: [{
      productId: product._id,
      productName: product.productName,
      productImage: 'test.jpg',
      quantity: 1,
      price: 80000,
      totalPrice: 80000,
      regularPrice: 1000,
      salePrice: 80000
    }],
    totalSalesPrice: 80000,
    netTotal: 80000
  });

  const baseReq = {
    user: { _id: userId },
    body: {
      shippingAddress: { city: 'Test City', pincode: 123456, phone: 9999999999, state: 'Test State', district: 'Test Dist' },
      paymentMethod: 'Razor pay',
      appliedCouponCode: ''
    }
  };

  console.log('\n--- Test 1: Amount Tampering (Frontend sends ₹1) ---');
  let req1 = { ...baseReq, headers: { 'idempotency-key': crypto.randomUUID() }, body: { ...baseReq.body, totalAmount: 1 } };
  let res1 = mockRes();
  await processCheckout_v2(req1, res1);
  if (res1.statusCode === 200) {
    console.log(`Razorpay Order Amount Created: ₹${res1.data.amount} (Expected 80015 with shipping)`);
  } else {
    console.log(`Error: ${res1.data.message}`);
  }

  const cartObj = cart.toObject();
  delete cartObj._id;
  await Cart.create(cartObj);
  await Product.findByIdAndUpdate(product._id, { quantity: 1 });
  
  console.log('\n--- Test 2: Inventory Concurrency ---');
  let req2a = { ...baseReq, headers: { 'idempotency-key': crypto.randomUUID() } };
  let req2b = { ...baseReq, headers: { 'idempotency-key': crypto.randomUUID() } };
  let res2a = mockRes(), res2b = mockRes();
  
  await Promise.all([
    processCheckout_v2(req2a, res2a),
    processCheckout_v2(req2b, res2b)
  ]);
  
  console.log(`Req A Status: ${res2a.statusCode} ${res2a.data?.message || 'Success'}`);
  console.log(`Req B Status: ${res2b.statusCode} ${res2b.data?.message || 'Success'}`);

  console.log('\n--- Test 3: Idempotency (Duplicate Checkout) ---');
  await Cart.create(cartObj);
  await Product.findByIdAndUpdate(product._id, { quantity: 1 });
  
  const idempKey = crypto.randomUUID();
  let req3 = { ...baseReq, headers: { 'idempotency-key': idempKey } };
  let res3a = mockRes(), res3b = mockRes();
  await processCheckout_v2(req3, res3a);
  await processCheckout_v2(req3, res3b);
  
  console.log(`Req 1 Status: ${res3a.statusCode}, OrderID: ${res3a.data.orderId}`);
  console.log(`Req 2 Status: ${res3b.statusCode}, Message: ${res3b.data.message}`);

  // Cleanup
  await Product.findByIdAndDelete(product._id);
  await Order.deleteMany({ user: userId });
  await Cart.deleteMany({ userId });
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
