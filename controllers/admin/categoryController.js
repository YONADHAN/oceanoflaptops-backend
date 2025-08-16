const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
// console.log(Category);

const addCategory = async (req, res) => {
  try {
   
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: "Name and description are required." });
    }
    
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists." });
    }
    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();
    return res.json({ message: "Category added Suceessfully" });
  } catch (error) {}
};

const getCategory = async (req, res) => {
  try {
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;


    const categories = await Category.find({}).sort({createdAt:-1}).skip(skip).limit(limit)

  
    const totalCategories = await Category.countDocuments({});

    const totalPages = Math.ceil(totalCategories / limit);

 
    res.status(200).json({
      success: true,
      message: "Categories successfully fetched",
      categories,
      currentPage: page,
      totalPages,
      totalCategories,
    });
  } catch (error) {

    console.error("Error fetching categories:", error.stack || error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOneCategory = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }

    const data = await Category.findById(id);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Category data fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching category data:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const update_category = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    // Find category by ID and update
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res
      .status(200)
      .json({
        message: "Category updated successfully",
        category: updatedCategory,
      });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating category", error: error.message });
  }
};

const category_block = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res
      .status(200)
      .json({ message: "Category blocked successfully", category });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error blocking category", error: error.message });
  }
};

const category_unblock = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndUpdate(
      id,
      { isBlocked: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res
      .status(200)
      .json({ message: "Category unblocked successfully", category });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error unblocking category", error: error.message });
  }
};

const get_category_list = async (req, res) => {
  try {
    const categories = await Category.find({ isBlocked: false }, "name"); // Fetch unblocked categories with only 'name'
    if (!categories.length) {
      return res.status(404).json({
        success: false,
        message: "No categories found.",
      });
    }
    res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error); // Logs detailed error for debugging
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};



const  update_category_offer = async (req, res) => {
  try {
    const { offer, categoryId } = req.body;

    // Validate offer percentage
    if (offer < 0 || offer > 100) {
      return res.status(400).json({ success: false, message: "Offer should be between 0 and 100" });
    }

    // Find and update category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    category.categoryOffer = offer;  
    category.offer = offer;
    await category.save();

    // Update discounted prices for products in the category
    const products = await Product.find({ category: categoryId }).populate('category').select("regularPrice offer discountedPrice");

    await Promise.all(
      products.map(async (product) => {
        const finalOffer = Math.max(offer, product.offer || 0);
        product.salePrice= product.regularPrice - (product.regularPrice * finalOffer / 100);
        await product.save();
      })
    );

    res.status(200).json({ success: true, message: "Category offer updated successfully", category });
    
  } catch (error) {
    console.error("Error updating category offer:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports = {
  addCategory,
  getCategory,
  update_category,
  category_block,
  category_unblock,
  get_category_list,
  getOneCategory,
  update_category_offer,
};
