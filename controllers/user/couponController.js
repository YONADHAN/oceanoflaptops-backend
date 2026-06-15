
const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");

const apply_coupon = async (req, res) => {
  try {
    const { couponCode, amount, userId } = req.body;

    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_COUPON });
    }

    if (amount < coupon.minPurchaseAmount) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message:
          ERROR_MESSAGES.MIN_PURCHASE_NOT_MET,
      });
    }

    if (coupon.startDate > Date.now() || coupon.endDate < Date.now()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.COUPON_EXPIRED });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    const isCouponAlreadyApplied = user.appliedCoupons.some(
      (appliedCoupon) =>
        appliedCoupon.couponId.toString() === coupon._id.toString()
    );

    if (isCouponAlreadyApplied) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.COUPON_ALREADY_USED });
    }

    let discountAmount = (coupon.discountPercentage / 100) * amount;
    let finalDiscount = Math.min(discountAmount, coupon.maxDiscountPrice);
    let totalAmount = amount - finalDiscount;

    res.status(HTTP_STATUS.OK).json({
      message: SUCCESS_MESSAGES.SUCCESSFULLY_APPLIED_COUPON,
      totalAmount,
      discountApplied: finalDiscount,
    });
  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error: error.message });
  }
};

const apply_coupon_ultimate = async (req, res) => {
  try {
    const { couponCode, userId } = req.body;
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_COUPON });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }
    coupon.users.push({
      userId,
      appliedOn: new Date(),
    });
    await coupon.save();

    user.appliedCoupons.push({
      couponId: coupon._id,
      appliedOn: new Date(),
    });
    await user.save();

  } catch (error) {
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error: error.message });
    console.log(error.message);
  }
};

// const apply_coupon_ultimate = async (req, res) => {
//     try {
//       const { couponCode, amount, userId } = req.body;
//       console.log(req.body);
//       const coupon = await Coupon.findOne({ couponCode });

//       if (!coupon) {
//         return res.status(400).json({ message: ERROR_MESSAGES.INVALID_COUPON });
//       }
//       if(!(coupon.startDate <= Date.now() && coupon.endDate >= Date.now())) {
//         return res.status(400).json({ message: ERROR_MESSAGES.COUPON_EXPIRED });
//       }

//       if (amount < coupon.minPurchaseAmount) {
//         return res.status(400).json({
//           message: ERROR_MESSAGES.MIN_PURCHASE_NOT_MET,
//         });
//       }

//       let discountAmount = (coupon.discountPercentage / 100) * amount;
//       let finalDiscount = Math.min(discountAmount, coupon.maxDiscountPrice);
//       let totalAmount = amount - finalDiscount;

//       const user = await User.findById(userId);
//       if (!user) {
//         return res.status(404).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
//       }

//       const isCouponAlreadyApplied = user.appliedCoupons.some(
//         (appliedCoupon) => appliedCoupon.couponId.toString() === coupon._id.toString()
//       );
//       if (isCouponAlreadyApplied) {
//         return res.status(400).json({ message: ERROR_MESSAGES.COUPON_ALREADY_USED });
//       }

//       coupon.users.push({
//         userId,
//         appliedOn: new Date(),
//       });
//       await coupon.save();

//       user.appliedCoupons.push({
//         couponId: coupon._id,
//         appliedOn: new Date(),
//       });
//       await user.save();

//       res.status(200).json({
//         message: SUCCESS_MESSAGES.SUCCESSFULLY_APPLIED_COUPON,
//         totalAmount,
//         discountApplied: finalDiscount,
//       });
//     } catch (error) {
//       res.status(500).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error: error.message });
//       console.log(error.message)
//     }
//   };

const get_applied_coupons = async (req, res) => {
  try {
    const userId = req.body.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }
    if (user.appliedCoupons.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.NO_COUPONS_APPLIED });
    }
    res
      .status(HTTP_STATUS.OK)
      .json({ message: SUCCESS_MESSAGES.APPLIED_COUPONS, coupons: user.appliedCoupons });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error });
  }
};

const get_suitable_coupons = async (req, res) => {
  //console.log("get_suitable_coupons");
  try {
    const amount = req.body.amount;
    console.log(amount);
    const coupons = await Coupon.find({ minPurchaseAmount: { $lte: amount } });
    // if (coupons.length === 0) {
    //   return res.status(404).json({ message: ERROR_MESSAGES.NO_SUITABLE_COUPONS_FOUND });
    // }
    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.SUITABLE_COUPONS, coupons });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR, error });
  }
};

module.exports = {
  apply_coupon,
  get_applied_coupons,
  get_suitable_coupons,
  apply_coupon_ultimate
};
