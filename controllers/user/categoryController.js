const Category = require("../../models/categorySchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


const get_category_id_from_name = async (req, res) => {
  try {
    const name = req.params.name;
    const category = await Category.find({ name });
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.NOT_FOUND });
    }
    const id = category._id;
    res.status(HTTP_STATUS.OK).json({ success: true, message: SUCCESS_MESSAGES.CATEGORY_ID_FOUND, id });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const get_category_list = async (req, res) => {
 //console.log("categroy list fetched for a times")
  try {
  
    const categories = await Category.find({ isBlocked: false }); 
    if (!categories.length) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.CATEGORY_NOT_FOUND,
      });
    }
    res.status(HTTP_STATUS.OK).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error); 
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

module.exports = {
  get_category_id_from_name,
  get_category_list
};
