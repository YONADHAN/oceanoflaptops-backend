require("dotenv").config();
const { sendOrderConfirmationEmail } = require("./utils/emailService");

async function testEmail() {
  console.log("Starting email test...");
  try {
    await sendOrderConfirmationEmail({
      email: "yonadhanmm0@gmail.com",
      name: "Test User",
      orderId: "TEST-123",
      items: [{ productName: "Test Laptop", quantity: 1, price: 50000 }],
      totalAmount: 50000
    });
    console.log("Email function completed.");
  } catch (error) {
    console.error("Test script caught error:", error);
  }
}

testEmail();
