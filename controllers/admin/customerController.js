const User = require("../../models/userSchema");

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
     
      res.status(200).json({
        success: true,
        message: "Customers successfully fetched",
        customers,
        currentPage: page,
        totalPages,
        totalCustomers,
      });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
  

const customer_unblock = async (req, res) => {
  try {
    let id = req.params.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res
      .status(200)
      .json({ success: true, message: "Customer Successfully Unblocked" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error happened" });
  }
};
const customer_block = async (req, res) => {
  try {
    let id = req.params.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res
      .status(200)
      .json({ success: true, message: "Successfully blocked the User" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  get_customers,
  customer_unblock,
  customer_block,
};
