const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderId: {
    type: String,
  },
  orderItems: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
     
      productName:{
        type: String,
        required: true,
      },
      productImage: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity cannot be less than 1"],
      },
      price: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        required: true,
        min: [0, "Discount cannot be negative"],
        max: [100, "Discount cannot exceed 100%"],
        default: 0,
      },
      orderStatus: {
        type: String,
        required: true,
        enum: [
          "Pending",
          "Placed",
          "Shipped",
          "Delivered",
          "Cancelled",
          "Returned",
          "Return Rejected",
        ],
        default: "Pending",
      },
      cancellationReason: {
        type: String,        
      },
      paymentStatus: {
        type: String,
        required: true,
        enum: ["Processing","Pending","Completed", "Paid", "Failed", "Refunded"],
        default: "Pending",
      },
     
      DeliveredOn: {
        type: Date,
      },
      totalPrice: {
        type: Number,
        required: true,
      },
      returnRequest: {
        requestStatus: {
          type: String,
          enum: ["Pending", "Approved", "Rejected"],
        },
        reason: {
          type: String,
        },
        explanation: {
          type: String,
        },
      },
    },
  ],  
  totalAmount: {
    type: Number,
    required: true,
    min: [0, "Total amount cannot be negative"],
  },
  payableAmount: {
    type: Number,
    min: [0, "Payable amount cannot be negative"],
  },
  orderedAmount: {
    type: Number
  },
  shippingAddress: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: Number, required: true },
    landmark: { type: String },
    pincode: { type: Number, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["Cash on Delivery", "Razor pay", "wallet"],
  },
  paymentStatus: {
    type: String,
    required: true,
  },
  razorpayPaymentId: {
    type: String,
    default: null
},
  totalDiscount: {
    type: Number,
    min: [0, "Discount cannot be negative"],
    default: 0,
  },
  couponDiscount: {
    type: Number,
    default: 0,
  },
  shippingFee: {
    type: Number,
    required: true,
    min: [0, "Shipping fee cannot be negative"],
  }, 
  placedAt: {
    type: Date,
    default: Date.now,
  },
  deliveryBy: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isReturnReq: {
    type: Boolean,
    default: false,
  },
  orderStatus: {
    type: String,
    required: true,
    enum: [
      
      "Pending",
      "Placed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Returned",
      "Return Rejected",
    ],
    default: "Pending",
  },
});

// Middleware to set `deliveryBy` if not provided
orderSchema.pre("save", function (next) {
  if (!this.deliveryBy) {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days after order placement
    this.deliveryBy = deliveryDate;
  }
  next();
});

// Middleware to set `orderId` if not provided
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    const uniqueId = `STC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    this.orderId = uniqueId;
  }
  next();
});

// Middleware to update `updatedAt`
orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

orderSchema.pre('save', function(next) {
  console.log('Pre-save document:', JSON.stringify(this.toObject(), null, 2));
  next();
});

module.exports = mongoose.model("Order", orderSchema);
