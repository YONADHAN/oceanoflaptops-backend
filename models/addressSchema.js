const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    trim: true,
    required: true
  },
  email: {
    type: String,
    trim: true,
    required: true
  },
  phone: {
    type: String,
    trim: true,
    required: true
  },
  pincode: {
    type: String,
    trim: true,
    required: true
  },
  flatHouseNo: {
    type: String,
    trim: true,
    default: ''
  },
  areaStreet: {
    type: String,
    trim: true,
    default: ''
  },  
  landmark: {
    type: String,
    trim: true,
    default: ''
  },
  city: {
    type: String,
    trim: true,
    required: true
  },
  district: {
    type: String,
    trim: true,
    required: true
  },
  state: {
    type: String,
    trim: true,
    required: true
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  addressType: {
    type: String,
    enum: ['Temporary Address', 'Permanent Address', 'home', 'work', 'office', 'Pickup point', 'Friends/Relatives', 'Others'],
    default: 'home'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  deliveryInstructions: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'addresses',
  strict: false
});

module.exports = mongoose.model('Address', AddressSchema);