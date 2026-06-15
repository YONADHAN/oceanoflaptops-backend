const UnverifiedUser = require('../../models/unverifiedUserSchema')
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcryptjs = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const RefreshToken = require("../../models/refreshTokenSchema");
const storeToken = require("../../utils/JWT/storeCookies");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/JWT/generateTokens");
const HTTP_STATUS = require('../../utils/constants/httpStatus');
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");



async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    //console.error("Error sending email", error);
    return false;
  }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const userSignup = async (req, res) => {
  const { username, email, password, phone } = req.body;
  try {
    if (!username?.trim() || !email?.trim() || !password || !phone?.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.REQUIRED_FIELDS_MISSING });
    }

    if (!isValidEmail(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.INVALID_EMAIL_FORMAT });
    }

    if (password.length < 8) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.PASSWORD_MUST_BE_AT_LEAST_8_CHARACTERS });
    }
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: SUCCESS_MESSAGES.USER_ALREADY_EXISTS });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.FAILED_TO_SEND_EMAIL });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const existUnverifiedUser = await UnverifiedUser.findOne({email});
    if(existUnverifiedUser) {
      existUnverifiedUser.otp = otp;
      existUnverifiedUser.otpExpiresAt = otpExpiresAt;
      await existUnverifiedUser.save();
      return res.status(HTTP_STATUS.OK).json({success: true, message: SUCCESS_MESSAGES.OTP_SENT_VERIFY_WITHIN_2_MINUTES})
    }

    const newUser = new UnverifiedUser({
      username,
      email,
      password: hashedPassword,
      phone,
      otp,
      otpExpiresAt,
    });

  
    await newUser.save();

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.OTP_SENT_VERIFY_WITHIN_2_MINUTES,
    });
  } catch (error) {
    console.log(error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60, //-----------------
  message: SUCCESS_MESSAGES.TOO_MANY_OTP_ATTEMPTS_PLEASE_TRY_AGAIN_LATER,
});

const verify_otp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const unverifiedUser = await UnverifiedUser.findOne({ email: email });
    if (!unverifiedUser) {
      return res
       .status(HTTP_STATUS.NOT_FOUND)
       .json({ message: SUCCESS_MESSAGES.USER_NOT_FOUND });
    }
    if (unverifiedUser.otp!== otp) {
      return res
       .status(HTTP_STATUS.BAD_REQUEST)
       .json({ message: ERROR_MESSAGES.INVALID_OTP_PLEASE_TRY_AGAIN });
    }
    if(!unverifiedUser.otpExpiresAt || unverifiedUser.otpExpiresAt < Date.now() ){
      unverifiedUser.otp = undefined;
      unverifiedUser.otpExpiresAt = undefined;
      await unverifiedUser.save();
      return res.status(HTTP_STATUS.BAD_REQUEST).json({message:  ERROR_MESSAGES.OTP_HAS_EXPIRED_PLEASE_REQUEST_A_NEW_ONE })
    }

     const newUser = new User({
      username: unverifiedUser.username,
      email: unverifiedUser.email,
      password: unverifiedUser.password,
      phone: unverifiedUser.phone,
      isVerified: true,
      otp: undefined,
      otpExpiresAt: undefined,
    });

    await newUser.save();

    await UnverifiedUser.deleteOne({ email: unverifiedUser.email });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.OTP_VERIFIED_YOU_CAN_NOW_SIGN_IN,
    });

  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};




const resend_otp = async (req, res) => {
  try {
    const { email } = req.body;

    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_EMAIL_ADDRESS,
      });
    }


    const user = await User.findOne({ email });
    if (user?.isVerified) {
      return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
        success: false,
        message: ERROR_MESSAGES.USER_IS_ALREADY_VERIFIED,
      });
    }
    const unverifiedUser = await UnverifiedUser.findOne({ email });
    if (!unverifiedUser) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.USER_NOT_FOUND,
      });
    }

    const newOtp = generateOtp();
    const currentTime = Date.now();
    unverifiedUser.otp = newOtp;
    unverifiedUser.otpExpiresAt = new Date(currentTime + 2 * 60 * 1000); 

    const emailSent = await sendVerificationEmail(email, newOtp);
    if (!emailSent) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_SEND_OTP_EMAIL_PLEASE_TRY_AGAIN_LATER,
      });
    }
    await unverifiedUser.save();
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.NEW_OTP_SENT,
    });   
    
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};









const user_signin = async (req, res) => {
  const { email, password } = req.body;

  try {
  
  
    const user = await User.findOne({ email });
 
    if (!user) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: SUCCESS_MESSAGES.USER_NOT_FOUND });
    }

    if (user.isAdmin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.YOU_ARE_NOT_THE_USER });
    }


    if (!user.isVerified) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: SUCCESS_MESSAGES.VERIFY_EMAIL_FIRST });
    }

    if (user.isBlocked) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message:
          ERROR_MESSAGES.YOU_ARE_BLOCKED_BY_THE_ADMIN_PLEASE_CONTACT_US_FOR,
      });
    }

    if(!user.password && user && user.googleId){
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.YOU_HAVE_USED_GOOGLE_SIGN_TO_LOGIN_PLEASE_TRY_GOOG });
    }
    
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(HTTP_STATUS.CONFLICT).json({ message: ERROR_MESSAGES.PASSWORD_MISMATCH });
    }   

    const userDataToGenerateToken = {
      _id: user?._id,
      email: user?.email,
      role: "user",
    };

    const accessToken = generateAccessToken("user", userDataToGenerateToken);
    const refreshToken = generateRefreshToken("user", userDataToGenerateToken);
    const newRefreshToken = new RefreshToken({
      token: refreshToken,
      user: userDataToGenerateToken?.role,
      user_id: userDataToGenerateToken?._id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await RefreshToken.deleteMany({ user_id: userDataToGenerateToken._id });


    const savedToken = await newRefreshToken.save();

    const { password: _, ...userDetails } = user.toObject();
    if (savedToken) {
      storeToken(      
        "RefreshToken",
        refreshToken,
        7 * 24 * 60 * 60 * 1000,
        res
      );
      // console.log("RefreshRoken is , : ", savedToken);

   
      res.status(HTTP_STATUS.OK).json({
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        userData: userDetails,
        success: true,
        accessToken,
        role: "user",
      });
    }
  } catch (error) {
    console.error("Error signing in:", error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const forget_password_email_entering = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await user.save();
    const sendEmail = sendVerificationEmail(email, otp);
    if (!sendEmail) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.EMAIL_IS_NOT_SEND });
    }
    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.EMAIL_SEND_SUCCESSFULLY });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const forget_password_otp_verification = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Fetch user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    // Validate OTP
    if (otp !== user.otp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.OTP_IS_NOT_VALID });
    }

    // Check if OTP has expired
    if (user.otpExpiresAt < Date.now()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.OTP_HAS_EXPIRED });
    }

    // Mark user as verified and save changes
    user.isVerified = true;
    user.otp = null; // Clear OTP
    user.otpExpiresAt = null;
    await user.save();

    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.OTP_VERIFIED });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const reset_password = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.EMAIL_VERIFICATION_REQUIRED });
    }

    // Hash the new password
    const hashedPassword = await bcryptjs.hash(password, 10);
    user.password = hashedPassword;

    // Save the new password
    await user.save();
    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.PASSWORD_RESET_COMPLETED });
  } catch (error) {
    console.error("Error in reset_password:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};



const address_add = async (req, res) => {
  try {
    const { newAddress, userId } = req.body;
    console.log("Incoming address data:", newAddress);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }

    // If this is set as default address, unset any existing default
    if (newAddress.isDefault) {
      await Address.updateMany(
        { userId: userId },
        { $set: { isDefault: false } }
      );
    }
    // If this is the first address, make it default
    else {
      const addressCount = await Address.countDocuments({ userId });
      if (addressCount === 0) {
        newAddress.isDefault = true;
      }
    }

    const address = new Address({
      ...newAddress,
      userId
    });

    // const isDuplicate = await Address.findOne({
    //   userId,
    //   country: newAddress.country,
    //   pincode: newAddress.pincode,
    //   flatHouseNo: newAddress.flatHouseNo,
    //   areaStreet: newAddress.areaStreet,
    //   townCity: newAddress.townCity,
    //   state: newAddress.state
    // });

    // if (isDuplicate) {
    //   return res.status(400).json({
    //     message: ERROR_MESSAGES.THIS_EXACT_ADDRESS_ALREADY_EXISTS_FOR_THIS_USER
    //   });
    // }

    await address.save();
    res.status(HTTP_STATUS.CREATED).json({
      message: SUCCESS_MESSAGES.ADDRESS_ADDED,
      address
    });
  } catch (error) {
    console.error("Error during address creation:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: error.message
    });
  }
};

const addresses_get = async (req, res) => {
  try {
    const { userId } = req.query;

    // Fetch addresses from the database
    const addresses = await Address.find({ userId });

    if (!addresses || addresses.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.NO_ADDRESS_FOUND });
    }

    // Sort addresses, putting the default address first
    const sortedAddresses = addresses.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });

    res.status(HTTP_STATUS.OK).json({ addresses: sortedAddresses });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};



const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id; // Assuming you have user info from verifyUser middleware

    // First, unset all default addresses for this user
    await Address.updateMany(
      { userId },
      { $set: { isDefault: false } }
    );

    // Then set the selected address as default
    const address = await Address.findByIdAndUpdate(
      id,
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.ADDRESS_NOT_FOUND });
    }

    res.status(HTTP_STATUS.OK).json({
      message: SUCCESS_MESSAGES.DEFAULT_ADDRESS_UPDATED,
      address
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      error: error.message
    });
  }
};

const  addresses_edit = async(req, res) => {
  try {
    const { id } = req.params;
    const { updatedAddress } = req.body;
    // console.log("Incoming updated address data:", updatedAddress);
    const address = await Address.findByIdAndUpdate(id,updatedAddress,{new:true});
    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.ADDRESS_UPDATED, address });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
}
const addresses_remove = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findByIdAndDelete(id);
    if (!address) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.ADDRESS_NOT_FOUND });
    }
    res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.ADDRESS_DELETED });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};
const user_details = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId); 
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
    }
    // console.log('user', user);
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.USER_FETCHED,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const update_personal = async (req, res) => {
  const { userId, ...personalDetails } = req.body; // Destructure `userId` and other fields

  try {
      const updated = await User.findByIdAndUpdate(userId, personalDetails, { new: true });
      if (!updated) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
      }
      res.status(HTTP_STATUS.OK).json({ message: SUCCESS_MESSAGES.USER_UPDATED, updated });
  } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


module.exports = {
  userSignup,
  otpLimiter,
  verify_otp,
  resend_otp,
  user_signin,
  forget_password_email_entering,
  forget_password_otp_verification,
  reset_password,
  address_add,
  setDefaultAddress,
  addresses_get,
  addresses_edit,
  addresses_remove,
  user_details,
  update_personal,
};
