const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [
        {
            type: {
                type: String,
                enum: ['credit', 'debit', 'refund'],
                required: true
            },
            amount: {
                type: Number,
                required: true
            },
            description: {
                type: String,
                required: true
            },
            orderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Order'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

const wallet = mongoose.model('Wallet', walletSchema);
module.exports = wallet;
;