const Product = require("../../models/productSchema")
const mongoose = require("mongoose");
const public_get_products_by_category = async (req, res) => {
    try {
      const { id, page = 1, limit = 4 } = req.query;
  
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category ID" });
      }
  
      const categoryId = new mongoose.Types.ObjectId(id); // Correct usage
      // No need for 'new'
      const skip = (page - 1) * limit;
  
      // Fetch products with pagination
      const products = await Product.find({ category: categoryId })
        .select(
          "productName salePrice rating productImage regularPrice description quantity status"
        )
        .skip(skip)
        .limit(parseInt(limit));
  
      const total = await Product.countDocuments({ category: categoryId });
  
      res.status(200).json({
        success: true,
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        message: "Products successfully fetched",
      });
    } catch (error) {
      console.error("Error fetching products:", error.message);
      res.status(500).json({ success: false, message: "Server Error" });
    }
  };

  module.exports = {
    public_get_products_by_category
  }