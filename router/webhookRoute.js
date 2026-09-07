const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');


router.post('/razorpay', express.raw({ type: 'application/json' }), webhookController.razorpayWebhook);

module.exports = router;
