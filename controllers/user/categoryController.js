const Category = require("../../models/categorySchema");

const get_category_id_from_name = async (req, res) => {
  try {
    const name = req.params.name;
    const category = await Category.find({ name });
    if (!category) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const id = category._id;
    res.status(200).json({ success: true, message: "category id found", id });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const get_category_list = async (req, res) => {
 //console.log("categroy list fetched for a times")
  try {
  
    const categories = await Category.find({ isBlocked: false }); 
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
    console.error("Error fetching categories:", error); 
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  get_category_id_from_name,
  get_category_list
};
