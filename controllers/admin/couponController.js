const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");


const remove_coupon = async (req, res) => {
  try {
    const userId = req.body.userId;
    const couponId = req.body.couponId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const appliedCoupons = user.appliedCoupons.filter(
      (appliedCoupon) => appliedCoupon.couponId !== couponId
    );
    user.appliedCoupons = appliedCoupons;
    await user.save();

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    const usersAppliedCoupon = coupon.users.filter(
      (userCoupon) => userCoupon.userId !== userId
    );
    coupon.users = usersAppliedCoupon;
    await coupon.save();
    res
      .status(200)
      .json({
        message: "Coupon removed successfully",
        coupons: user.appliedCoupons,
      });
  } catch (error) {
    res.status(500).json({ message: "Internal Server error", error });
  }
};

const get_coupons_for_admin = async (req, res) => {
  //console.log("get_coupons_for_admin");
  try {
    const { page = 1, limit = 10, searchQuery = "" } = req.body;
    let filter = {};
    if (searchQuery.trim().length > 0) {
      filter = { $text: { $search: searchQuery } };
      page = 1;
    }

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalCount = await Coupon.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      message: "Coupons fetched successfully",
      coupons,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};const create_coupon = async (req, res) => {
  try {
    const { couponCode, description, discountPercentage, startDate, endDate, minPurchaseAmount, maxDiscountPrice } = req.body.formData;

    // Validate required fields
    if (!couponCode || !description || !discountPercentage || !startDate || !endDate) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Format and validate coupon code
    const formattedCouponCode = couponCode.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(formattedCouponCode)) {
      return res.status(400).json({ message: "Coupon code must contain only letters and numbers." });
    }

    if (!description.trim()) {
      return res.status(400).json({ message: "Description cannot be empty." });
    }

    if (minPurchaseAmount == null || minPurchaseAmount <= 0) {
      return res.status(400).json({ message: "Minimum purchase amount must be greater than 0." });
    }

    if (maxDiscountPrice == null || maxDiscountPrice < 0) {
      return res.status(400).json({ message: "Maximum discount price cannot be negative." });
    }

    if (discountPercentage <= 0 || discountPercentage > 100) {
      return res.status(400).json({ message: "Discount percentage must be between 1 and 100." });
    }

    // Check for existing coupon
    const couponExists = await Coupon.findOne({ couponCode: formattedCouponCode });
    if (couponExists) {
      return res.status(400).json({ message: "Coupon code already exists." });
    }

    // Date handling
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < now) {
      return res.status(400).json({ message: "Start date cannot be in the past." });
    }

    if (end <= start) {
      return res.status(400).json({ message: "End date must be greater than the start date." });
    }

  
    const coupon = new Coupon({
      couponCode: formattedCouponCode,
      description: description.trim(),
      discountPercentage,
      startDate: start,
      endDate: end,
      minPurchaseAmount,
      maxDiscountPrice,
      users: [],
    });

    await coupon.save();
    return res.status(200).json({ message: "Coupon created successfully", coupon });

  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


const delete_coupon = async (req, res) => {
  console.log("delete_coupon");
  try {
    const couponCode = req.body.couponCode
    if (!couponCode) {
      return res.status(400).json({ message: "No coupon selected to delete" });
    }
    const coupon = await Coupon.deleteOne({couponCode: couponCode})
  
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found to delete" });
    }
    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting coupon", error: error });
  }
};

const update_coupon = async (req, res) => {
  try {
    const formData =  req.body.formData
    const selectedCouponId = formData.couponCode
    if (!selectedCouponId ) {
      return res
        .status(400)
        .json({
          message: "No coupon selected ",
        });
    }
   
    const coupon = await Coupon.findOne({couponCode: formData.couponCode});
   
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found to update" });
    }

    coupon.couponCode = formData.couponCode
    coupon.description = formData.description
    coupon.discountPercentage = formData.discountPercentage;
    coupon.startDate = new Date(formData.startDate);
    coupon.endDate = new Date(formData.endDate);
    coupon.minPurchaseAmount = formData.minPurchaseAmount;
    coupon.maxDiscountPrice = formData.maxDiscountPrice;

    await coupon.save();

    res.status(200).json({ message: "Coupon updated successfully", coupon });
  } catch (error) {
    res.status(500).json({ message: "Error updating coupon", error: error });
  }
};

module.exports = {

  remove_coupon,
  delete_coupon,
  get_coupons_for_admin,
  create_coupon,
  update_coupon,
};
