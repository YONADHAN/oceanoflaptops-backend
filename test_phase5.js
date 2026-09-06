require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./models/orderSchema');
const Product = require('./models/productSchema');
const User = require('./models/userSchema');
const expireReservations = require('./utils/expireReservations');

async function runTests() {
  await mongoose.connect(process.env.DB_URI);
  console.log('MongoDB connected');

  const user = await User.findOne();
  const userId = user._id;

  const productDoc = new Product({
    productName: "Test Expiration Product",
    price: 1000,
    salePrice: 1000,
    quantity: 10,
    productImages: ["test.jpg"],
    brand: "Test",
    description: "test",
    specifications: { processor: "test", ram: "test", storage: "test", display: "test" }
  });
  const product = await productDoc.save({ validateBeforeSave: false });

  // Create an expired order
  const expiredOrder = await Order.create({
    user: userId,
    orderItems: [{
      product: product._id,
      productName: 'Test Expiration Product',
      productImage: 'test.jpg',
      quantity: 2,
      price: 1000,
      totalPrice: 2000,
    }],
    totalAmount: 2000,
    orderedAmount: 2000,
    shippingAddress: { name: "T", email: "e", phone: 1, pincode: 1, city: "C", district: "D", state: "S" },
    paymentMethod: "Razor pay",
    paymentStatus: "Pending",
    orderStatus: "Pending",
    shippingFee: 0,
    reservationExpiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
  });

  console.log(`\n--- Test 8: Expiration ---`);
  await expireReservations();

  const checkOrder = await Order.findById(expiredOrder._id);
  const checkProduct = await Product.findById(product._id);
  
  console.log(`Order Status: ${checkOrder.orderStatus} (Expected: Cancelled)`);
  console.log(`Reservation Expires At: ${checkOrder.reservationExpiresAt} (Expected: null)`);
  console.log(`Product Quantity: ${checkProduct.quantity} (Expected: 12)`);

  console.log(`\n--- Test 9: Duplicate expiration ---`);
  await expireReservations();
  const checkProductDuplicate = await Product.findById(product._id);
  console.log(`Product Quantity after second run: ${checkProductDuplicate.quantity} (Expected: 12)`);

  // Cleanup
  await Order.findByIdAndDelete(expiredOrder._id);
  await Product.findByIdAndDelete(product._id);
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
