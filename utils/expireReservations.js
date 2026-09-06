const mongoose = require("mongoose");
const Order = require("../models/orderSchema");
const Product = require("../models/productSchema");

const expireReservations = async () => {
  try {
    const now = new Date();

    const expiredOrders = await Order.find({
      paymentStatus: "Pending",
      orderStatus: { $nin: ["Cancelled", "Expired"] },
      reservationExpiresAt: { $lte: now },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    for (const order of expiredOrders) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const currentOrder = await Order.findById(order._id).session(session);

        if (
          currentOrder.paymentStatus !== "Pending" ||
          currentOrder.orderStatus === "Cancelled" ||
          currentOrder.orderStatus === "Expired" ||
          !currentOrder.reservationExpiresAt ||
          currentOrder.reservationExpiresAt > now
        ) {
          await session.abortTransaction();
          session.endSession();
          continue;
        }

        for (const item of currentOrder.orderItems) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            product.quantity += item.quantity;
            await product.save({ session });
          }
        }

        currentOrder.orderStatus = "Expired";
        currentOrder.updatedAt = new Date();
        currentOrder.reservationExpiresAt = null;

        await currentOrder.save({ session });

        await session.commitTransaction();
        session.endSession();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
      }
    }
  } catch (error) {
  }
};

module.exports = expireReservations;
