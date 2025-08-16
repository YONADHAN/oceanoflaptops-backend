const mongoose = require("mongoose");
const Order = require("../models/orderSchema"); 

const cancelPendingOrders = async () => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2); 

    const ordersToCancel = await Order.find({
      paymentMethod: "Razor pay",
      paymentStatus: "Pending",
      placedAt: { $lt: twoDaysAgo }, 
      orderStatus: { $ne: "Cancelled" }, 
    });

    if (ordersToCancel.length > 0) {
      await Order.updateMany(
        { _id: { $in: ordersToCancel.map((order) => order._id) } },
        { $set: { orderStatus: "Cancelled", updatedAt: new Date() } }
      );
      console.log(`${ordersToCancel.length} orders cancelled.`);
    } else {
      console.log("No pending orders to cancel.");
    }
  } catch (error) {
    console.error("Error cancelling pending orders:", error);
  }
};

module.exports = cancelPendingOrders;
