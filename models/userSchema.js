

const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: false,
    },
    avatar: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    otp: {
        type: String,
    },
    otpExpiresAt: {
        type: Date,
    },
    address: [
        {
            type: Schema.Types.ObjectId,
            ref: "Address"
        }
    ],
    cart: [
        {
            type: Schema.Types.ObjectId,
            ref: "Cart",
        },
    ],
    wallet: [
        {
            type: Schema.Types.ObjectId,
            ref: "Wishlist",
        },
    ],
    orderHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Order",
        },
    ],
    referralCode: {
        type: String,
    },
    redeemed: {
        type: Boolean,
    },
    redeemedUser: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    searchHistory: [
        {
            category: {
                type: Schema.Types.ObjectId,
                ref: "Category",
            },
            brand: {
                type: String,
            },
            searchOn: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    appliedCoupons: [
        {
            couponId: {
                type: Schema.Types.ObjectId,
                ref: "Coupon",
            },
            appliedOn: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    birthday: {
        type: Date,
        required: false,
    },
    language: {
        type: String,
        required: false,
    },
   
    gender: {
        type: String,
        enum: ["male", "female", "other",""],
        required: false,
    },
    resetPasswordToken: {
        type: String,
        required: false,
    },
    resetPasswordExpires: {
        type: Date,
        required: false,
    }
},
{
    timestamps: true,
    collection: "users" 
});

const User = mongoose.model('User', userSchema);
module.exports = User;
