

const mongoose = require('mongoose');
const { Schema } = mongoose;

const unverifiedUserSchema = new Schema({
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
   
    password: {
        type: String,
        required: false,
    },
   
    isVerified: {
        type: Boolean,
        default: false,
    },
   
    otp: {
        type: String,
    },
    otpExpiresAt: {
        type: Date,
    },
    
    
},
{
    timestamps: true,
    collection: "unverifiedUser" 
});

const UnverifiedUser = mongoose.model('UnverifiedUser', unverifiedUserSchema);
module.exports = UnverifiedUser;
