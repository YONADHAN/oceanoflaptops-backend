const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  description: {
    type: String,
    trim: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  minPurchaseAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  maxDiscountPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  users: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },  
    appliedOn: {
      type: Date,
      default: Date.now,
    }
  }],
});


couponSchema.index({ couponCode: 1 });
couponSchema.index({ status: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

couponSchema.pre('save', function (next) {
  const startDate = new Date(this.startDate);
  const endDate = new Date(this.endDate);
  const currentDate = new Date();

  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);

 
  if (endDate < startDate) {
    return next(new Error('End date must be after start date'));
  }


  if (currentDate > endDate) {
    this.status = 'expired';
  } else if (currentDate >= startDate && currentDate <= endDate) {
    this.status = 'active';
  } else {
    this.status = 'inactive';
  }

  next();
});


module.exports =  mongoose.model('Coupon', couponSchema);
