
const Wallet = require('../../models/walletSchema');
const HTTP_STATUS = require('../../utils/constants/httpStatus');
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


const get_wallet_history = async (req, res) => {
    try {
        const userId = req.body.userId;
        const page = parseInt(req.body.page) || 1;
        const limit = parseInt(req.body.limit) || 4;
        const skip = (page - 1) * limit;

        const wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.WALLET_NOT_FOUND });
        }


        const sortedTransactions = wallet.transactions
            .sort((a, b) => b.date - a.date)
            .slice(skip, skip + limit)
            .map(t => {
                const transaction = typeof t.toObject === 'function' ? t.toObject() : { ...t };
                if (transaction.description) {
                    transaction.description = transaction.description
                        .replace(/order [a-zA-Z0-9_-]+ for the cancelled product/gi, 'cancelled product:')
                        .replace(/order [a-zA-Z0-9_-]+/gi, 'order');
                }
                return transaction;
            });

        const walletResponse = {
            ...wallet.toObject(),
            transactions: sortedTransactions
        };

        res.status(HTTP_STATUS.OK).json({
            message: SUCCESS_MESSAGES.WALLET_FETCHED,
            wallet: walletResponse,
            totalTransactions: wallet.transactions.length
        });

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.ERROR_GETTING_WALLET, error: error.message });
    }
};

const add_to_wallet = async (req, res) => {
    try {
        const userId = req.body.userId;
        const amount = parseFloat(req.body.amount);
        const description = req.body.description;

        if (isNaN(amount) || amount <= 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_AMOUNT });
        }

        let wallet = await Wallet.findOne({ userId: userId });


        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        wallet.balance += amount;

        const transactionItem = {
            type: 'credit',
            amount: amount,
            description: description || "Added money to wallet",
            date: Date.now(),
        };

        wallet.transactions.push(transactionItem);
        await wallet.save();

        res.status(HTTP_STATUS.OK).json({
            message: SUCCESS_MESSAGES.AMOUNT_ADDED_TO_WALLET_SUCCESSFULLY,
            wallet
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: ERROR_MESSAGES.ERROR_ADDING_TO_WALLET,
            error: error.message
        });
    }
};

const withdraw_from_wallet = async (req, res) => {
    try {
        const userId = req.body.userId;
        const amount = parseFloat(req.body.amount);

        if (isNaN(amount) || amount <= 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_AMOUNT });
        }

        const wallet = await Wallet.findOne({ userId: userId });

        if (!wallet) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.WALLET_NOT_FOUND });
        }

        if (amount > wallet.balance) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INSUFFICIENT_BALANCE_IN_WALLET });
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

        res.status(HTTP_STATUS.OK).json({
            message: SUCCESS_MESSAGES.AMOUNT_WITHDRAWN_FROM_WALLET_SUCCESSFULLY,
            wallet
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: ERROR_MESSAGES.ERROR_WITHDRAWING_FROM_WALLET,
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
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.WALLET_NOT_FOUND });
        }

        res.status(HTTP_STATUS.OK).json({
            message: SUCCESS_MESSAGES.WALLET_BALANCE_FETCHED,
            balance: wallet.balance
        })
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: ERROR_MESSAGES.ERROR_GETTING_WALLET_BALANCE,
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