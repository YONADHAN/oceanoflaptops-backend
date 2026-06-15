const User = require("../../models/userSchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


const get_customers = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const searchQuery = req.query.searchQuery || "";
  
     
      const skip = (page - 1) * limit;
  
      
      const filter = { isAdmin: false }; 
      if (searchQuery) {
        filter.$or = [
          { username: { $regex: searchQuery, $options: "i" } },
          { email: { $regex: searchQuery, $options: "i" } },
        { phone: { $regex: searchQuery, $options: "i" } },
         
        ];
      }
  

      const totalCustomers = await User.countDocuments(filter); 
      const customers = await User.find(filter) 
        .sort({createdAt: -1})
        .skip(skip) 
        .limit(limit);   
    
      const totalPages = Math.ceil(totalCustomers / limit);  
     
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: SUCCESS_MESSAGES.CUSTOMERS_FETCHED,
        customers,
        currentPage: page,
        totalPages,
        totalCustomers,
      });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
  };
  

const customer_unblock = async (req, res) => {
  try {
    let id = req.params.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: ERROR_MESSAGES.CUSTOMER_UNBLOCKED });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
const customer_block = async (req, res) => {
  try {
    let id = req.params.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: SUCCESS_MESSAGES.SUCCESSFULLY_BLOCKED_THE_USER });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  get_customers,
  customer_unblock,
  customer_block,
};
