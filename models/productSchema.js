


const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
      index: true
    },
    brand: {
      type: String,
      required: true,
      index: true
    },
    modelNumber: {
      type: String,
      required: true,
    },
    processor: {
      brand: {
        type: String,
        required: true,
        index: true
      },
      model: {
        type: String,
        required: true,
        index: true
      },
      generation: {
        type: String,
        required: true,
        index: true
      },
    },
    ram: {
      size: {
        type: String,
        required: true,
        index: true
      },
      type: {
        type: String,
        required: true,
      },
    },
    storage: {
      type: {
        type: String,
        required: true,
      },
      capacity: {
        type: String,
        required: true,
        index: true
      },
    },
    graphics: {
      model: {
        type: String,
        required: true,
        index: true
      },
      vram: {
        type: String,
        required: true,
      },
    },
    display: {
      size: {
        type: String,
        required: true,
        index: true
      },
      resolution: {
        type: String,
        required: true,
        index: true
      },
      refreshRate: {
        type: String,
        required: true,
      },
    },
    operatingSystem: {
      type: String,
      required: true,
      index: true
    },
    batteryLife: {
      type: String,
      required: true,
      
    },
    weight: {
      type: String,
      required: true,
      
    },
    ports: {
      type: String,
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      index: true
    },
    quantity: {
      type: Number,
      default: 1,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    size: {
      type: String,
    },
    color: {
      type: String,
      required: true,
      index: true
    },
    productImage: {
      type: [String],
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Available", "Out of Stock"],
      required: true,
      default: "Available",
    },
    offer: {
      type: Number,
      required: true,
      default: 0,  
    },
    popularity: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);


productSchema.pre("save", function (next) {
  if (this.quantity === 0) {
    this.status = "Out of Stock";
  } else {
    this.status = "Available";
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
