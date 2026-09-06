const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Parse incoming webhooks as raw bytes (Buffer)
router.post('/razorpay', express.raw({ type: 'application/json' }), webhookController.razorpayWebhook);

module.exports = router;
