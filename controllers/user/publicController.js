const Product = require("../../models/productSchema")
const mongoose = require("mongoose");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const public_get_products_by_category = async (req, res) => {
    try {
      const { id, page = 1, limit = 4 } = req.query;
  
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: "Invalid category ID" });
      }
  
      const categoryId = new mongoose.Types.ObjectId(id); 
    
      const skip = (page - 1) * limit;
  
     
      const products = await Product.find({ category: categoryId })
        .select(
          "productName salePrice rating productImage regularPrice description quantity status"
        )
        .skip(skip)
        .limit(parseInt(limit));
  
      const total = await Product.countDocuments({ category: categoryId });
  
      res.status(HTTP_STATUS.OK).json({
        success: true,
        products,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        message: "Products successfully fetched",
      });
    } catch (error) {
      console.error("Error fetching products:", error.message);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server Error" });
    }
  };

  module.exports = {
    public_get_products_by_category
  }