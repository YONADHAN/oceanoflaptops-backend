const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Cookies = require("js-cookie");
const { jwtDecode } = require("jwt-decode");
const apply_coupon = async (req, res) => {
  try {
    const { couponCode, amount, userId } = req.body;

    const coupon = await Coupon.findOne({ couponCode });

    if (!coupon) {
      return res.status(400).json({ message: "Invalid coupon code." });
    }

    if (amount < coupon.minPurchaseAmount) {
      return res.status(400).json({
        message:
          "Invalid coupon code. Your purchase amount does not meet the minimum requirement.",
      });
    }

    if (coupon.startDate > Date.now() || coupon.endDate < Date.now()) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isCouponAlreadyApplied = user.appliedCoupons.some(
      (appliedCoupon) =>
        appliedCoupon.couponId.toString() === coupon._id.toString()
    );

    if (isCouponAlreadyApplied) {
      return res.status(400).json({ message: "Coupon already applied" });
    }

    let discountAmount = (coupon.discountPercentage / 100) * amount;
    let finalDiscount = Math.min(discountAmount, coupon.maxDiscountPrice);
    let totalAmount = amount - finalDiscount;

    res.status(200).json({
      message: "Successfully applied coupon",
      totalAmount,
      discountApplied: finalDiscount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
  }
};

const apply_coupon_ultimate = async (req, res) => {
  try {
    const { couponCode, userId } = req.body;
    const coupon = await Coupon.findOne({ couponCode });
    if (!coupon) {
      return res.status(400).json({ message: "Invalid coupon code." });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
      .status(500)
      .json({ message: "Internal Server error", error: error.message });
    console.log(error.message);
  }
};

// const apply_coupon_ultimate = async (req, res) => {
//     try {
//       const { couponCode, amount, userId } = req.body;
//       console.log(req.body);
//       const coupon = await Coupon.findOne({ couponCode });

//       if (!coupon) {
//         return res.status(400).json({ message: "Invalid coupon code." });
//       }
//       if(!(coupon.startDate <= Date.now() && coupon.endDate >= Date.now())) {
//         return res.status(400).json({ message: "Coupon expired" });
//       }

//       if (amount < coupon.minPurchaseAmount) {
//         return res.status(400).json({
//           message: "Invalid coupon code. Your purchase amount does not meet the minimum requirement.",
//         });
//       }

//       let discountAmount = (coupon.discountPercentage / 100) * amount;
//       let finalDiscount = Math.min(discountAmount, coupon.maxDiscountPrice);
//       let totalAmount = amount - finalDiscount;

//       const user = await User.findById(userId);
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       const isCouponAlreadyApplied = user.appliedCoupons.some(
//         (appliedCoupon) => appliedCoupon.couponId.toString() === coupon._id.toString()
//       );
//       if (isCouponAlreadyApplied) {
//         return res.status(400).json({ message: "Coupon already applied" });
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
//         message: "Successfully applied coupon",
//         totalAmount,
//         discountApplied: finalDiscount,
//       });
//     } catch (error) {
//       res.status(500).json({ message: "Internal Server error", error: error.message });
//       console.log(error.message)
//     }
//   };

const get_applied_coupons = async (req, res) => {
  try {
    const userId = req.body.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.appliedCoupons.length === 0) {
      return res.status(404).json({ message: "No coupons applied" });
    }
    res
      .status(200)
      .json({ message: "Applied coupons", coupons: user.appliedCoupons });
  } catch (error) {
    res.status(500).json({ message: "Internal Server error", error });
  }
};

const get_suitable_coupons = async (req, res) => {
  //console.log("get_suitable_coupons");
  try {
    const amount = req.body.amount;
    console.log(amount);
    const coupons = await Coupon.find({ minPurchaseAmount: { $lte: amount } });
    // if (coupons.length === 0) {
    //   return res.status(404).json({ message: "No suitable coupons found" });
    // }
    res.status(200).json({ message: "Suitable coupons", coupons });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports = {
  apply_coupon,
  get_applied_coupons,
  get_suitable_coupons,
  apply_coupon_ultimate
};
