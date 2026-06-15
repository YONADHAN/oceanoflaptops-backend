const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");



const remove_coupon = async (req, res) => {
  try {
    const userId = req.body.userId;
    const couponId = req.body.couponId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }
    const appliedCoupons = user.appliedCoupons.filter(
      (appliedCoupon) => appliedCoupon.couponId !== couponId
    );
    user.appliedCoupons = appliedCoupons;
    await user.save();

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.COUPON_NOT_FOUND });
    }
    const usersAppliedCoupon = coupon.users.filter(
      (userCoupon) => userCoupon.userId !== userId
    );
    coupon.users = usersAppliedCoupon;
    await coupon.save();
    res
      .status(HTTP_STATUS.OK)
      .json({
        message: SUCCESS_MESSAGES.COUPON_REMOVED,
        coupons: user.appliedCoupons,
      });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error });
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

    res.status(HTTP_STATUS.OK).json({
      message: SUCCESS_MESSAGES.COUPONS_FETCHED,
      coupons,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: error.message,
    });
  }
};const create_coupon = async (req, res) => {
  try {
    const { couponCode, description, discountPercentage, startDate, endDate, minPurchaseAmount, maxDiscountPrice } = req.body.formData;

    // Validate required fields
    if (!couponCode || !description || !discountPercentage || !startDate || !endDate) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.REQUIRED_FIELDS_MISSING });
    }

    // Format and validate coupon code
    const formattedCouponCode = couponCode.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(formattedCouponCode)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.COUPON_CODE_MUST_CONTAIN_ONLY_LETTERS_AND_NUMBERS });
    }

    if (!description.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.DESCRIPTION_CANNOT_BE_EMPTY });
    }

    if (minPurchaseAmount == null || minPurchaseAmount <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.MINIMUM_PURCHASE_AMOUNT_MUST_BE_GREATER_THAN });
    }

    if (maxDiscountPrice == null || maxDiscountPrice < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.MAXIMUM_DISCOUNT_PRICE_CANNOT_BE_NEGATIVE });
    }

    if (discountPercentage <= 0 || discountPercentage > 100) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.DISCOUNT_PERCENTAGE_MUST_BE_BETWEEN_1_AND });
    }

    // Check for existing coupon
    const couponExists = await Coupon.findOne({ couponCode: formattedCouponCode });
    if (couponExists) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.COUPON_CODE_ALREADY_EXISTS });
    }

    // Date handling
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start < now) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.START_DATE_CANNOT_BE_IN_THE_PAST });
    }

    if (end <= start) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.END_DATE_MUST_BE_GREATER_THAN_THE_START_DATE });
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
    return res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.COUPON_CREATED, coupon });

  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error: error.message });
  }
};


const delete_coupon = async (req, res) => {
  console.log("delete_coupon");
  try {
    const couponCode = req.body.couponCode
    if (!couponCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.NO_COUPON_SELECTED_TO_DELETE });
    }
    const coupon = await Coupon.deleteOne({couponCode: couponCode})
  
    if (!coupon) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.COUPON_NOT_FOUND_TO_DELETE });
    }
    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.COUPON_DELETED });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.ERROR_DELETING_COUPON, error: error });
  }
};

const update_coupon = async (req, res) => {
  try {
    const formData =  req.body.formData
    const selectedCouponId = formData.couponCode
    if (!selectedCouponId ) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({
          message: SUCCESS_MESSAGES.NO_COUPON_SELECTED,
        });
    }
   
    const coupon = await Coupon.findOne({couponCode: formData.couponCode});
   
    if (!coupon) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.COUPON_NOT_FOUND_TO_UPDATE });
    }

    coupon.couponCode = formData.couponCode
    coupon.description = formData.description
    coupon.discountPercentage = formData.discountPercentage;
    coupon.startDate = new Date(formData.startDate);
    coupon.endDate = new Date(formData.endDate);
    coupon.minPurchaseAmount = formData.minPurchaseAmount;
    coupon.maxDiscountPrice = formData.maxDiscountPrice;

    await coupon.save();

    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.COUPON_UPDATED, coupon });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.ERROR_UPDATING_COUPON, error: error });
  }
};

module.exports = {

  remove_coupon,
  delete_coupon,
  get_coupons_for_admin,
  create_coupon,
  update_coupon,
};
