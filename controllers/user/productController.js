const path = require("path");
const sharp = require("sharp");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");
const Cookies = require("js-cookie");
const { isValidObjectId } = require('mongoose');

const  get_product_details = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Input validation
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid product ID" 
      });
    }

    const productDetails = await Product.findById(id)
      .populate('category')
      .select('-__v'); // Exclude version key
    
    if (!productDetails) {
      return res.status(404).json({ 
        success: false, 
        message: "Product details not found" 
      });
    }

    // Check both product and category status
    if (productDetails.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: "Product is blocked by the admin" 
      });
    }

    if (productDetails.category?.isBlocked) {
      return res.status(403).json({ 
        success: false, 
        message: "Category is blocked by the admin" 
      });
    }

    return res.status(200).json({
      success: true,
      productDetails,
      message: "Product successfully fetched"
    });

  } catch (error) {
    console.error('Product details fetch error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};
const get_products_by_category = async (req, res) => {
  try {
    const { id, page = 1, limit = 4 } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }

    const categoryId = id;
    const skip = (page - 1) * limit;

    // Check if the category exists and is not blocked
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (category.isBlocked) {
      return res.status(400).json({ success: false, message: "Category is blocked by the admin" });
    }

    // Fetch products with pagination
    const products = await Product.find({ isBlocked: false, category: categoryId })
      .select(
        "productName salePrice rating productImage regularPrice description status quantity"
      )
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({ isBlocked: false, category: categoryId });

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      message: "Products successfully fetched",
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Get products with pagination
const get_products = async (req, res) => {
  try {
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .populate('category')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments();

    res.status(200).json({
      success: true,
      products,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

const get_all_products_paginated = async (req, res) => {
  // console.log("worked with8888888888888888888")
  try {
    const { page = 1, limit = 9 } = req.query; // Default to 9 products per page
    const skip = (page - 1) * limit;

    // Fetch products with pagination
    const products = await Product.find()
      .select("productName salePrice rating productImage regularPrice description")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 }); // Sorting by most recently added products

    const total = await Product.countDocuments();

    res.status(200).json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching products:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const get_quantity = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required." });
    }

    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    if (product.isBlocked) {
      return res.status(403).json({ success: false, message: "This product has been blocked by the admin." });
    }

    if (product.category.isBlocked) {
      return res.status(403).json({ success: false, message: "This product's category has been blocked by the admin." });
    }

    res.status(200).json({ success: true, quantity: product.quantity });
  } catch (error) {
    console.error("Error fetching product quantity:", error.message);
    res.status(500).json({ success: false, message: "An error occurred while fetching product quantity." });
  }
};


// Backend route (Express.js example)
const get_filter_options = async (req, res) => {
  try {
    // Fetch distinct filter options from your database
    const filterOptions = {
      processorBrands: await Product.distinct('processor.brand'),
      processorModels: await Product.distinct('processor.model'),
      processorGenerations: await Product.distinct('processor.generation'),
      ramSizes: await Product.distinct('ram.size'),
      ramTypes: await Product.distinct('ram.type'),
      storageTypes: await Product.distinct('storage.type'),
      storageCapacities: await Product.distinct('storage.capacity'),
      graphicsModels: await Product.distinct('graphics.model'),
      graphicsVrams: await Product.distinct('graphics.vram'),
      displaySizes: await Product.distinct('display.size'),
      displayResolutions: await Product.distinct('display.resolution'),
      displayRefreshRates: await Product.distinct('display.refreshRate'),
      operatingSystems: await Product.distinct('operatingSystem'),
      brands: await Product.distinct('brand'),
      colors: await Product.distinct('color'),
      statuses: await Product.distinct('status'),
      categories: await Category.find({ 
        isBlocked: false,
        // isListed: true, 
        // status: 'active' 
      }).select('name _id')
    };

    res.json(filterOptions);
  } catch (error) {
    console.error('Filter options error:', error);
    res.status(500).json({ 
      message: 'Error retrieving filter options', 
      error: error.message 
    });
  }
 };




const filter_products = async (req, res) => {
  try {
   //console.log(req.query, "%%%%%%%%%%%%%%");

    
    const filter = { isBlocked: false };

    if (req.query.searchQuery) {
      const searchTerm = req.query.searchQuery.trim();
      if (searchTerm) {
        filter.$or = [
          { productName: { $regex: searchTerm, $options: "i" } }, // Match product name
          { description: { $regex: searchTerm, $options: "i" } }, // Match description
        ];
      }
    }
    


    const categoryIds = [];

    // Get all blocked categories
    const blockedCategories = await Category.find({ isBlocked: true }, { _id: 1 });
    const blockedCategoryIds = blockedCategories.map(cat => cat._id);

    // Iterate through query parameters to handle nested objects
    for (const [key, value] of Object.entries(req.query)) {
      // Handle nested objects for multi-select filters
      if (typeof value === 'object' && value !== null) {
        for (const [subKey, subValue] of Object.entries(value)) {
          if (subValue === 'true') {
            switch (key) {
              case 'categories': {
                console.log("Categories filter applied:", subKey);
                const category = await Category.findOne({ 
                  name: new RegExp(`^${subKey}$`, 'i'), 
                  isBlocked: false 
                });
                if (category) {
                  const categoryId = typeof category._id === 'string' ? 
                    new mongoose.Types.ObjectId(category._id) : 
                    category._id;
                  categoryIds.push(categoryId);
                  console.log("Category selected:", category.name, "->", categoryId);
                }
                break;
              }
              case 'processorBrands':
                filter['processor.brand'] = subKey;
                break;
              case 'processorModels':
                filter['processor.model'] = subKey;
                break;
              case 'processorGenerations':
                filter['processor.generation'] = subKey;
                break;
              case 'ramSizes':
                filter['ram.size'] = subKey;
                break;
              case 'ramTypes':
                filter['ram.type'] = subKey;
                break;
              case 'storageTypes':
                filter['storage.type'] = subKey;
                break;
              case 'storageCapacities':
                filter['storage.capacity'] = subKey;
                break;
              case 'graphicsModels':
                filter['graphics.model'] = subKey;
                break;
              case 'graphicsVrams':
                filter['graphics.vram'] = subKey;
                break;
              case 'displaySizes':
                filter['display.size'] = subKey;
                break;
              case 'displayResolutions':
                filter['display.resolution'] = subKey;
                break;
              case 'displayRefreshRates':
                filter['display.refreshRate'] = subKey;
                break;
              case 'operatingSystems':
                filter.operatingSystem = subKey;
                break;
              case 'brands':
                filter.brand = subKey;
                break;
              case 'colors':
                filter.color = subKey;
                break;
              case 'statuses':
                filter.status = subKey;
                break;
              case 'minPrices':
              case 'maxPrices':
                filter.regularPrice = filter.regularPrice || {};
                if (key === 'minPrices') filter.regularPrice.$gte = parseFloat(subKey);
                if (key === 'maxPrices') filter.regularPrice.$lte = parseFloat(subKey);
                break;
            }
          }
        }
      } else {
        // Handle flat fields
        switch (key) {
          case 'categories': {
            const category = await Category.findOne({ 
              name: new RegExp(`^${value}$`, 'i'), 
              isBlocked: false 
            });
            if (category) {
              const categoryId = typeof category._id === 'string' ? 
                new mongoose.Types.ObjectId(category._id) : 
                category._id;
              categoryIds.push(categoryId);
              console.log("Category selected:", category.name, "->", categoryId);
            }
            break;
          }
          case 'processorBrand':
            filter['processor.brand'] = value;
            break;
          case 'processorModel':
            filter['processor.model'] = value;
            break;
          case 'processorGeneration':
            filter['processor.generation'] = value;
            break;
          case 'ramSize':
            filter['ram.size'] = value;
            break;
          case 'ramType':
            filter['ram.type'] = value;
            break;
          case 'storageType':
            filter['storage.type'] = value;
            break;
          case 'storageCapacity':
            filter['storage.capacity'] = value;
            break;
          case 'graphicsModel':
            filter['graphics.model'] = value;
            break;
          case 'graphicsVram':
            filter['graphics.vram'] = value;
            break;
          case 'displaySize':
            filter['display.size'] = value;
            break;
          case 'displayResolution':
            filter['display.resolution'] = value;
            break;
          case 'displayRefreshRate':
            filter['display.refreshRate'] = value;
            break;
          case 'operatingSystem':
            filter.operatingSystem = value;
            break;
          case 'brand':
            filter.brand = value;
            break;
          case 'color':
            filter.color = value;
            break;
          case 'status':
            filter.status = value;
            break;
          case 'minPrice':
            filter.regularPrice = filter.regularPrice || {};
            filter.regularPrice.$gte = parseFloat(value);
            break;
          case 'maxPrice':
            filter.regularPrice = filter.regularPrice || {};
            filter.regularPrice.$lte = parseFloat(value);
            break;
        }
      }
    }

    // Add category filter only if categories were selected
    if (categoryIds.length > 0) {
      filter.category = {
        $in: categoryIds,
        $nin: blockedCategoryIds
      };
    } else {
      // If no categories selected, just exclude blocked categories
      filter.category = {
        $nin: blockedCategoryIds
      };
    }

    //console.log("The entire filter is", JSON.stringify(filter, null, 2));

    const sortOptions = {
      'price:asc': { regularPrice: 1 },
      'price:desc': { regularPrice: -1 },
      'rating:desc': { averageRating: -1 },
      'createdAt:desc': { createdAt: -1 },
      'name:asc': { productName: 1 },
      'name:desc': { productName: -1 },
    };
    const sortParam = req.query.sort || "createdAt:desc";
    const sortQuery = sortOptions[sortParam] || sortOptions['createdAt:desc'];

    // Handle pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const query = Product.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate('category');

    // Execute query and count total products
    const [products, totalProducts] = await Promise.all([
      query.exec(),
      Product.countDocuments(filter),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

    res.json({
      products,
      totalProducts,
      totalPages,
      currentPage: page,
      sortParam,
    });
  } catch (error) {
    console.error('Product filter error:', error);
    res.status(500).json({
      message: 'Error filtering products',
      error: error.message,
    });
  }
};

const get_cart_items = async(req,res) => {
  //need to do this after schema is created
}




const searchProducts = async (req, res) => {
  try {
    const { term, brand, minPrice, maxPrice, category, status } = req.query;
    
    const query = {};
    
    // Search term matching
    if (term) {
      query.$or = [
        { productName: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { 'processor.model': { $regex: term, $options: 'i' } }
      ];
    }

    // Additional filters
    if (brand) query.brand = brand;
    if (category) query.category = category;
    if (status) query.status = status;
    if (minPrice || maxPrice) {
      query.salePrice = {};
      if (minPrice) query.salePrice.$gte = Number(minPrice);
      if (maxPrice) query.salePrice.$lte = Number(maxPrice);
    }

    const products = await Product.find(query)
      .populate('category')
      .select('-isBlocked')
      .limit(10)
      .sort({ createdAt: -1 });

      res.json(Array.isArray(products) ? products : []);
  } catch (error) {
    res.status(500).json({ error: "Error searching products: " + error.message });
  }
}



module.exports = {
  filter_products,
  get_product_details,
  get_quantity,
  get_products_by_category,
  get_products,
  get_all_products_paginated,
  get_filter_options,
  get_cart_items,
  searchProducts,
};
