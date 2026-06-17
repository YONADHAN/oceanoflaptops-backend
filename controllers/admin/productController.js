
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");
const mongoose = require("mongoose");


const salePriceCalculator = async (regularPrice, productId) => {
  try {
    const product = await Product.findByProductId(productId).populate('category');
    if (!product) {
      return false;
    }
    const maximumOffer = Math.max(product.offer, product.category.offer);
    const salePrice = regularPrice - (maximumOffer * regularPrice) / 100;
    return salePrice;
  } catch (error) {
    return false;
  }
}


const add_product = async (req, res) => {
  try {
    const { productSubmissionData } = req.body;
    console.log('Received Product Data:', productSubmissionData);

    const requiredFields = [
      'productName', 'brand', 'modelNumber', 'category',
      'regularPrice', 'quantity', 'processor', 'ram', 'storage'
    ];

    for (let field of requiredFields) {
      if (productSubmissionData[field] === undefined || productSubmissionData[field] === null || productSubmissionData[field] === "") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Missing required field: ${field}`
        });
      }
    }


    const productExists = await Product.findOne({

      productName: { $regex: new RegExp(`^${productSubmissionData.productName}$`, 'i') },
      modelNumber: { $regex: new RegExp(`^${productSubmissionData.modelNumber}$`, 'i') },
    });

    if (productExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Product already exists"
      });
    }

    //----------------------------


    // Product Name Validation
    if (productSubmissionData.productName.trim().length < 3) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_NAME_MUST_BE_AT_LEAST_3_CHARACTERS
      });
    }

    // Brand Validation
    if (productSubmissionData.brand.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.BRAND_NAME_MUST_BE_AT_LEAST_2_CHARACTERS
      });
    }

    // Model Number Validation
    if (productSubmissionData.modelNumber.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.MODEL_NUMBER_MUST_BE_AT_LEAST_2_CHARACTERS
      });
    }

    // Regular Price Validation
    if (
      isNaN(productSubmissionData.regularPrice) ||
      Number(productSubmissionData.regularPrice) <= 0
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.REGULAR_PRICE_MUST_BE_GREATER_THAN_ZERO
      });
    }

    // Quantity Validation
    if (
      isNaN(productSubmissionData.quantity) ||
      Number(productSubmissionData.quantity) < 0
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.QUANTITY_CANNOT_BE_NEGATIVE
      });
    }

    // Offer Validation
    const offerMeasure = Number(productSubmissionData.offer || 0);

    if (offerMeasure < 0 || offerMeasure > 80) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.OFFER_PERCENTAGE_MUST_BE_BETWEEN_0_AND_80
      });
    }

    // // Product Images Validation
    // if (
    //   !productSubmissionData.productImage ||
    //   !Array.isArray(productSubmissionData.productImage) ||
    //   productSubmissionData.productImage.length < 3
    // ) {
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({
    //     success: false,
    //     message: ERROR_MESSAGES. MINIMUM_3_PRODUCT_IMAGES_REQUIRED
    //   });
    // }

    if (!mongoose.Types.ObjectId.isValid(productSubmissionData.category)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CATEGORY
      });
    }
    //--------------------------

    const category = await Category.findById(productSubmissionData.category);
    if (!category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CATEGORY
      });
    }
    // const salePrice = await salePriceCalculator(productSubmissionData.regularPrice, productSubmissionData._id);
    // if (!salePrice) {
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({
    //     success: false, 
    //     message: ERROR_MESSAGES.FAILED_TO_CALCULATE_SALE_PRICE
    //   });
    // }

    const categoryOffer = category.offer || 0;
    const productOffer = productSubmissionData.offer || 0;
    const offer = Math.max(categoryOffer, productOffer);
    let salePrice = productSubmissionData.regularPrice;
    if (offer) {
      salePrice = (productSubmissionData.regularPrice - (offer * productSubmissionData.regularPrice) / 100).toFixed(0);
    }
    productSubmissionData.salePrice = salePrice;

    const newProduct = new Product(productSubmissionData);
    await newProduct.save();

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: SUCCESS_MESSAGES.PRODUCT_ADDED,
      product: newProduct
    });

  } catch (error) {
    //console.error("Error adding product:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: error.message
    });
  }
};



const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';


    const filter = search
      ? {
        $or: [
          { productName: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { modelNumber: { $regex: search, $options: 'i' } },
        ],
      }
      : {};

    if (search) {
      const categories = await Category.find({
        name: { $regex: search, $options: 'i' },
      });
      if (categories.length > 0) {
        const categoryIds = categories.map((category) => category._id);
        filter.$or.push({ category: { $in: categoryIds } });
      }
    }


    const products = await Product.find(filter)
      .populate('category')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });


    const total = await Product.countDocuments(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      products,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.PRODUCTS_FETCH_FAILED,
      error: error.message,
    });
  }
};



// Block/Unblock product



const toggleBlockProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_NOT_FOUND,
      });
    }

    product.isBlocked = !product.isBlocked;
    await product.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Product ${product.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      isBlocked: product.isBlocked,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Error toggling product block status",
      error: error.message,
    });
  }
};


// Update product
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;
    console.log("product data update", productId, updateData)
    console.log('Checking productName:', updateData.productName);

    // Validate required fields
    const requiredFields = [
      'productName', 'brand', 'modelNumber', 'category',
      'regularPrice', 'processor', 'ram', 'storage'
    ];

    for (let field of requiredFields) {
      if (!updateData[field]) {
        console.error(`Missing or undefined field: ${field}`, updateData[field]);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Missing required field: ${field}`
        });
      }
    }

    console.log('Received Product Data:', updateData);

    // Product Name Validation
    if (updateData.productName.trim().length < 3) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_NAME_MUST_BE_AT_LEAST_3_CHARACTERS
      });
    }

    // Brand Validation
    if (updateData.brand.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.BRAND_NAME_MUST_BE_AT_LEAST_2_CHARACTERS
      });
    }

    // Model Number Validation
    if (updateData.modelNumber.trim().length < 2) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.MODEL_NUMBER_MUST_BE_AT_LEAST_2_CHARACTERS
      });
    }

    // Regular Price Validation
    if (
      isNaN(updateData.regularPrice) ||
      Number(updateData.regularPrice) <= 0
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.REGULAR_PRICE_MUST_BE_GREATER_THAN_ZERO
      });
    }

    // Quantity Validation
    if (
      isNaN(updateData.quantity) ||
      Number(updateData.quantity) < 0
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.QUANTITY_CANNOT_BE_NEGATIVE
      });
    }

    // Offer Validation
    const productOfferMeasure = Number(updateData.offer || 0);

    if (productOfferMeasure < 0 || productOfferMeasure > 80) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.OFFER_PERCENTAGE_MUST_BE_BETWEEN_0_AND_80
      });
    }

    // Category Validation
    if (
      !mongoose.Types.ObjectId.isValid(
        updateData.category?._id || updateData.category
      )
    ) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_CATEGORY
      });
    }

    // Duplicate Product Validation
    const duplicateProduct = await Product.findOne({
      _id: { $ne: productId },
      productName: {
        $regex: new RegExp(`^${updateData.productName.trim()}$`, "i")
      },
      modelNumber: {
        $regex: new RegExp(`^${updateData.modelNumber.trim()}$`, "i")
      }
    });

    if (duplicateProduct) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_ALREADY_EXISTS
      });
    }

    // Product Images Validation (optional)
    // if (
    //   !updateData.productImage ||
    //   !Array.isArray(updateData.productImage) ||
    //   updateData.productImage.length < 3
    // ) {
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({
    //     success: false,
    //     message: ERROR_MESSAGES.MINIMUM_3_PRODUCT_IMAGES_REQUIRED
    //   });
    // }

    const category = await Category.findById(updateData.category._id);
    if (!category) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid category"
      });
    }


    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
      });
    }

    const categoryOffer = category.offer || 0;
    const productOffer = Number(updateData.offer || 0);

    const offer = Math.max(categoryOffer, productOffer);
    const salePrice = (updateData.regularPrice - (offer / 100) * updateData.regularPrice).toFixed(0);

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        productName: updateData.productName,
        brand: updateData.brand,
        modelNumber: updateData.modelNumber,
        processor: {
          brand: updateData.processor.brand || '',
          model: updateData.processor.model || '',
          generation: updateData.processor.generation || ''
        },
        ram: {
          size: updateData.ram.size || '',
          type: updateData.ram.type || ''
        },
        storage: {
          type: updateData.storage.type || '',
          capacity: updateData.storage.capacity || ''
        },
        graphics: {
          model: updateData.graphics?.model || '',
          vram: updateData.graphics?.vram || ''
        },
        display: {
          size: updateData.display?.size || '',
          resolution: updateData.display?.resolution || '',
          refreshRate: updateData.display?.refreshRate || ''
        },
        operatingSystem: updateData.operatingSystem || '',
        batteryLife: updateData.batteryLife || '',
        weight: updateData.weight || '',
        ports: updateData.ports || '',
        regularPrice: updateData.regularPrice,
        // salePrice: updateData.salePrice || updateData.regularPrice,
        salePrice: salePrice,
        quantity: updateData.quantity,
        description: updateData.description || '',
        category: category._id,
        size: updateData.size || '',
        color: updateData.color || '',
        productImage: updateData.productImage || [],
        offer: updateData.offer || 0,

        status: updateData.quantity > 0 ? 'Available' : 'Out of Stock',
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PRODUCT_UPDATED,
      product: updatedProduct
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: error.message
    });
  }
};



// Get a single product by ID
const get_product = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate('category');

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      product
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: error.message
    });
  }
};

const updateProductOffer = async (req, res) => {
  try {
    const productId = req.body.productId;
    const offer = req.body.offer;
    console.log("Product offer  :  ", productId, "  ", offer, "%")
    if (offer < 0 || offer > 80) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_OFFER_VALUE_MUST_BE_BETWEEN_0_AND_80 });
    }

    const product = await Product.findById(productId).populate('category');
    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
    }
    const maximumOffer = Math.max(offer, product.category.offer || 0);
    const salePrice = (product.regularPrice - (maximumOffer * product.regularPrice) / 100).toFixed(0)
    product.offer = offer;
    product.salePrice = salePrice;
    await product.save();

    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.OFFER_UPDATED, product });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.ERROR_UPDATING_OFFER, error: error.message });
  }
}

module.exports = {
  add_product,
  getProducts,
  toggleBlockProduct,
  updateProduct,
  get_product,
  updateProductOffer,
};

