const path = require("path");
const sharp = require("sharp");
const Product = require("../../models/productSchema"); 
const Category = require("../../models/categorySchema"); 


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
      if (!productSubmissionData[field]) {
        return res.status(400).json({
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
      return res.status(400).json({
        success: false, 
        message: "Product already exists"
      });
    }

  
    const category = await Category.findById(productSubmissionData.category);
    if (!category) {
      return res.status(400).json({
        success: false, 
        message: "Invalid category"
      });
    }
    // const salePrice = await salePriceCalculator(productSubmissionData.regularPrice, productSubmissionData._id);
    // if (!salePrice) {
    //   return res.status(400).json({
    //     success: false, 
    //     message: "Failed to calculate sale price"
    //   });
    // }

    const categoryOffer = category.offer || 0;
    const productOffer = productSubmissionData.offer;
    const offer = Math.max(categoryOffer, productOffer);
    let salePrice = productSubmissionData.regularPrice;
    if(offer){
      salePrice = (productSubmissionData.regularPrice - (offer * productSubmissionData.regularPrice) / 100).toFixed(0);
    }
    productSubmissionData.salePrice = salePrice;

    const newProduct = new Product(productSubmissionData);
    await newProduct.save();

    res.status(201).json({
      success: true, 
      message: "Product added successfully",
      product: newProduct
    });

  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({
      success: false, 
      message: "Server error",
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
          { modelNumber: { $regex: search, $options: 'i'}},
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

    res.status(200).json({
      success: true,
      products,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};



// Block/Unblock product



const toggleBlockProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.isBlocked = !product.isBlocked;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${product.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      isBlocked: product.isBlocked,
    });
  } catch (error) {
    res.status(500).json({
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
      'regularPrice',  'processor', 'ram', 'storage'
    ];

    for (let field of requiredFields) {
      if (!updateData[field]) {
        console.error(`Missing or undefined field: ${field}`, updateData[field]);
        return res.status(400).json({
          success: false, 
          message: `Missing required field: ${field}`
        });
      }
    }
    
    console.log('Received Product Data:', updateData); 
   
    const category = await Category.findById(updateData.category._id);
    if (!category) {
      return res.status(400).json({
        success: false, 
        message: "Invalid category"
      });
    }

 
      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }
  
    const productOffer = updateData.offer;
    const categoryOffer = category.offer;
    const offer = Math.max(categoryOffer, productOffer);
    const salePrice = (updateData.regularPrice - (offer/100)*updateData.regularPrice).toFixed(0);
   
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
        
        status: updateData.quantity > 0 ? 'Available' : 'Out of Stock',
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct
    });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

const updateProductOffer = async (req, res) => {
  try {
    const productId = req.body.productId;
    const offer = req.body.offer;
    console.log("Product offer  :  ", productId,"  ", offer,"%")
    if(offer<0 || offer>100) {
      return res.status(400).json({message: "Invalid offer value (must be between 0 and 100)"});
    }  

    const product = await Product.findById(productId).populate('category');
    if (!product) {
      return res.status(404).json({message: "Product not found"});
    }
    const maximumOffer = Math.max(offer, product.category.offer||0);
    const salePrice = (product.regularPrice - (maximumOffer * product.regularPrice) / 100).toFixed(0)
    product.offer = offer;
    product.salePrice = salePrice;
    await product.save();
   
    res.status(200).json({message: "Offer updated successfully", product});
  } catch (error) {
    res.status(500).json({message: "Error updating offer", error: error.message});
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

