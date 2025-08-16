const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            productName: {
                type: String,
                required: true,
            },
            productImage: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
            },
            price: {
                type: Number,
                required: true,
            },
            totalPrice: {
                type: Number,
                required: true,
            },
            status: {
                type: String,
                default: "Placed",
            },
            regularPrice: {
                type: Number,
                required: true,
            },
            salePrice: {
                type: Number,
                required: true,
            },
            discount:{
                type: Number,
                default: 0,
            },
            cancellationReason: {
                type: String,
                default: "none",
            },
        },
    ],
    subTotal: {
        type: Number,
        default: 0, 
    },
    globalTotal: {
        type: Number,
        default: 0, 
    },
    globalDiscount: {
        type: Number,
        default: 0,
    },
    finalTotal: {
        type: Number,
        default: 0,
    },
    //above subtotal , globaltotal, globaldiscount, finalTotal will get replaced by the below variables
    totalRegularPrice: {
        type: Number,
        default: 0,
    },
    totalSalesPrice: {
        type: Number,
        default: 0,
    },
    totalDiscount: {
        type: Number,
        default: 0,
    },
    netTotal: {
        type: Number,
        default: 0,
    }
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
