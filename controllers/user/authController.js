const UnverifiedUser = require('../../models/unverifiedUserSchema')
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcryptjs = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const RefreshToken = require("../../models/refreshTokenSchema");
const storeToken = require("../../utils/JWT/storeCookies");
const mongoose = require("mongoose");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../utils/JWT/generateTokens");


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
    console.error("Error sending email", error);
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
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send email" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const existUnverifiedUser = await UnverifiedUser.findOne({email});
    if(existUnverifiedUser) {
      existUnverifiedUser.otp = otp;
      existUnverifiedUser.otpExpiresAt = otpExpiresAt;
      await existUnverifiedUser.save();
      return res.status(200).json({success: true, message: "OTP successfully sent. Verify within 2 minutes."})
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

    res.status(200).json({
      success: true,
      message: "OTP successfully sent. Verify within 2 minutes.",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60, //-----------------
  message: "Too many OTP attempts, please try again later.",
});

const verify_otp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const unverifiedUser = await UnverifiedUser.findOne({ email: email });
    if (!unverifiedUser) {
      return res
       .status(404)
       .json({ message: "User not found with this email " });
    }
    if (unverifiedUser.otp!== otp) {
      return res
       .status(400)
       .json({ message: "Invalid OTP. Please try again." });
    }
    if(!unverifiedUser.otpExpiresAt || unverifiedUser.otpExpiresAt < Date.now() ){
      unverifiedUser.otp = undefined;
      unverifiedUser.otpExpiresAt = undefined;
      await unverifiedUser.save();
      return res.status(400).json({message:  "OTP has expired. Please request a new one." })
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

    res.status(200).json({
      success: true,
      message: "OTP successfully verified. You can now sign in.",
    });

  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};




const resend_otp = async (req, res) => {
  try {
    const { email } = req.body;

    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address.",
      });
    }


    const user = await User.findOne({ email });
    if (user?.isVerified) {
      return res.status(400).json({
        success: false,
        message: "User is already verified.",
      });
    }
    const unverifiedUser = await UnverifiedUser.findOne({ email });
    if (!unverifiedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email.",
      });
    }

    const newOtp = generateOtp();
    const currentTime = Date.now();
    unverifiedUser.otp = newOtp;
    unverifiedUser.otpExpiresAt = new Date(currentTime + 2 * 60 * 1000); 

    const emailSent = await sendVerificationEmail(email, newOtp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again later.",
      });
    }
    await unverifiedUser.save();
    return res.status(200).json({
      success: true,
      message: "New OTP has been sent to your email.",
    });   
    
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred.",
    });
  }
};









const user_signin = async (req, res) => {
  const { email, password } = req.body;

  try {
  
  
    const user = await User.findOne({ email });
 
    if (!user) {
      return res
        .status(400)
        .json({ message: "User doesn't exist. Please sign up." });
    }

    if (user.isAdmin) {
      return res.status(404).json({ message: "You are not the user" });
    }


    if (!user.isVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email before signing in." });
    }

    if (user.isBlocked) {
      return res.status(400).json({
        message:
          "You are Blocked by the Admin, Please contact us for further information.",
      });
    }

    if(!user.password && user && user.googleId){
      return res.status(400).json({ message: "You have used google sign to login. Please try google or add password using forgot password" });
    }
    
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(404).json({ message: "Password does not match." });
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

   
      res.status(200).json({
        message: "User Logged In successfully",
        userData: userDetails,
        success: true,
        accessToken,
        role: "user",
      });
    }
  } catch (error) {
    console.error("Error signing in:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

const forget_password_email_entering = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await user.save();
    const sendEmail = sendVerificationEmail(email, otp);
    if (!sendEmail) {
      res.status(500).json({ message: "Email is not send" });
    }
    res.status(200).json({ message: "Email send successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

const forget_password_otp_verification = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Fetch user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    // Validate OTP
    if (otp !== user.otp) {
      return res.status(400).json({ message: "OTP is not valid" });
    }

    // Check if OTP has expired
    if (user.otpExpiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Mark user as verified and save changes
    user.isVerified = true;
    user.otp = null; // Clear OTP
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const reset_password = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: "Email verification required" });
    }

    // Hash the new password
    const hashedPassword = await bcryptjs.hash(password, 10);
    user.password = hashedPassword;

    // Save the new password
    await user.save();
    res.status(200).json({ message: "Password reset successfully completed" });
  } catch (error) {
    console.error("Error in reset_password:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const address_add = async (req, res) => {
  try {
    const { newAddress, userId } = req.body;
    console.log("Incoming address data:", newAddress);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    //     message: "This exact address already exists for this user"
    //   });
    // }

    await address.save();
    res.status(200).json({
      message: "Address added successfully",
      address
    });
  } catch (error) {
    console.error("Error during address creation:", error);
    res.status(500).json({
      message: "Internal server error",
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
      return res.status(404).json({ message: "No address found" });
    }

    // Sort addresses, putting the default address first
    const sortedAddresses = addresses.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return 0;
    });

    res.status(200).json({ addresses: sortedAddresses });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
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
      return res.status(404).json({ message: "Address not found" });
    }

    res.status(200).json({
      message: "Default address updated successfully",
      address
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({
      message: "Internal server error",
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
    res.status(200).json({ message: "Address updated successfully", address });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}
const addresses_remove = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findByIdAndDelete(id);
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
const user_details = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId); 
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log('user', user);
    res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const update_personal = async (req, res) => {
  const { userId, ...personalDetails } = req.body; // Destructure `userId` and other fields

  try {
      const updated = await User.findByIdAndUpdate(userId, personalDetails, { new: true });
      if (!updated) {
          return res.status(404).json({ message: "User not found" });
      }
      res.status(200).json({ message: "User updated successfully", updated });
  } catch (error) {
      res.status(500).json({ message: "Internal server error" });
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
