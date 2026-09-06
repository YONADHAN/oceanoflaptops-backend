const crypto = require("crypto");
const WebhookEvent = require("../models/webhookEventSchema");

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const eventId = req.headers["x-razorpay-event-id"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature || !eventId || !webhookSecret) {
      console.warn("Webhook rejected: Missing signature, event ID, or webhook secret.");
      return res.status(400).send("Bad Request");
    }

    // req.body is a Buffer because we used express.raw()
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.warn("Razorpay webhook rejected: invalid signature");
      return res.status(400).send("Invalid signature");
    }

    // Now safely parse the payload
    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch (err) {
      console.error("Webhook rejected: Malformed JSON");
      return res.status(400).send("Malformed JSON");
    }

    const eventType = payload.event;

    // Deduplicate event using WebhookEvent schema
    try {
      await WebhookEvent.create({
        eventId,
        type: eventType,
      });
      console.log(`Razorpay webhook received - eventId: ${eventId}, eventType: ${eventType}`);
    } catch (err) {
      // If error is duplicate key error (code 11000), it's a duplicate webhook
      if (err.code === 11000) {
        console.log(`Razorpay webhook duplicate: ${eventId}`);
        // Return 200 so Razorpay knows it's received and doesn't retry
        return res.status(200).send("Duplicate acknowledged");
      }
      
      console.error("Database error while recording webhook event:", err);
      // Return 500 so Razorpay retries later
      return res.status(500).send("Internal Server Error");
    }

    const { reconcilePayment } = require("../services/paymentReconciliationService");

    if (eventType === "payment.captured") {
      const paymentEntity = payload.payload.payment.entity;
      await reconcilePayment({
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        status: "CAPTURED",
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        userId: null // Webhook has no session, relies entirely on order_id matching
      });
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload.payload.payment.entity;
      await reconcilePayment({
        razorpayOrderId: paymentEntity.order_id,
        razorpayPaymentId: paymentEntity.id,
        status: "FAILED",
        amount: paymentEntity.amount,
        currency: paymentEntity.currency,
        userId: null
      });
    }
    
    return res.status(200).send("Webhook processed successfully");
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  razorpayWebhook,
};
