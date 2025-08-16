
const Wallet = require('../../models/walletSchema');
const Order = require('../../models/orderSchema');
const User = require('../../models/userSchema');

const get_wallet_history = async (req, res) => {
    try {
        const userId = req.body.userId;
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 4;
        const skip = (page - 1) * limit;

        const wallet = await Wallet.findOne({ userId: userId });
        
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        
        const sortedTransactions = wallet.transactions
            .sort((a, b) => b.date - a.date)
            .slice(skip, skip + limit);

        const walletResponse = {
            ...wallet.toObject(),
            transactions: sortedTransactions
        };

        res.status(200).json({
            message: "Wallet retrieved successfully",
            wallet: walletResponse,
            totalTransactions: wallet.transactions.length
        });

    } catch (error) {
        res.status(500).json({ message: "Error getting wallet", error: error.message });
    }
};

const add_to_wallet = async (req, res) => {
    try {
        const userId = req.body.userId;
        const amount = parseFloat(req.body.amount);
        const description = req.body.description;
        
        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ userId: userId });

    
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        wallet.balance += amount;
        
        const transactionItem = {
            type: 'credit',
            amount: amount,
            description: description||"Added money to wallet",
            date: Date.now(),
        };

        wallet.transactions.push(transactionItem);
        await wallet.save();

        res.status(200).json({
            message: "Amount added to wallet successfully",
            wallet
        });
    } catch (error) {
        res.status(500).json({
            message: "Error adding to wallet",
            error: error.message
        });
    }
};

const withdraw_from_wallet = async (req, res) => {
    try {
        const userId = req.body.userId;
        const amount = parseFloat(req.body.amount);

        if (isNaN(amount) || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const wallet = await Wallet.findOne({ userId: userId });
        
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }

        if (amount > wallet.balance) {
            return res.status(400).json({ message: "Insufficient balance in wallet" });
        }

        wallet.balance -= amount;
        
        const transactionItem = {
            type: 'debit',
            amount: amount,
            description: "Withdrawn from wallet",
            date: Date.now(),
        };

        wallet.transactions.push(transactionItem);
        await wallet.save();

        res.status(200).json({
            message: "Amount withdrawn from wallet successfully",
            wallet
        });
    } catch (error) {
        res.status(500).json({
            message: "Error withdrawing from wallet",
            error: error.message
        });
    }
};

const wallet_balance = async (req, res) => {
    const userId = req.body.userId;
    try {
        const wallet = await Wallet.findOne({
            userId: userId,
        })
        
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }
        
        res.status(200).json({
            message: "Wallet balance retrieved successfully",
            balance: wallet.balance
        })
    } catch (error) {
        res.status(500).json({
            message: "Error getting wallet balance",
            error: error.message
        })
    }
}

module.exports = {
    get_wallet_history,
    add_to_wallet,
    withdraw_from_wallet,
    wallet_balance, 
};