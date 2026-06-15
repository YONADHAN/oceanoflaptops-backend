const User = require('../../models/userSchema');
const RefreshToken = require("../../models/refreshTokenSchema");
const storeToken = require("../../utils/JWT/storeCookies")
const bcryptjs = require('bcryptjs');
const dotenv = require("dotenv")
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const {generateAccessToken, generateRefreshToken} = require('../../utils/JWT/generateTokens')
const HTTP_STATUS = require("../../utils/constants/httpStatus.js")
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;



// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASSWORD,
  },
});






const admin_signin = async (req,res) => {
  

    try {
        const {email,password}  = req.body;
        
        const user = await User.findOne({ email });
    
        if (!user) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.USER_NOT_FOUND });
        }

        // Check if the user is verified
        if (!user.isVerified) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: ERROR_MESSAGES.VERIFY_EMAIL_FIRST });
        }

        // Compare provided password with stored hashed password
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: ERROR_MESSAGES.PASSWORD_MISMATCH });
        }

        if(!user.isAdmin) {
            return  res.status(HTTP_STATUS.NOT_FOUND).json({message: ERROR_MESSAGES.YOU_ARE_NOT_AUTHENTICATED})
        }

        const adminDataToGenerateToken = {
          _id: user?._id,
          email: user?.email,
          role: "admin",
        }

        const accessToken = generateAccessToken("admin",adminDataToGenerateToken);
        //console.log("Access Token (signin) : ", accessToken);
        const refreshToken = generateRefreshToken(
          "admin",
          adminDataToGenerateToken
        );
       

        await RefreshToken.deleteMany({ user_id: adminDataToGenerateToken._id });

        const newRefreshToken = new RefreshToken({
          token: refreshToken,
          user: adminDataToGenerateToken?.role,
          user_id: adminDataToGenerateToken?._id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });
        const savedToken = await newRefreshToken.save();
  
        const {password: _,...adminDetails} = user.toObject();
        if(savedToken) {
          storeToken(            
            "RefreshToken",
            refreshToken,
            7 * 24 * 60 * 60 * 1000,
            res
          );

          res.status(HTTP_STATUS.OK).json({
            message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
            adminData: adminDetails,
            success: true,
            accessToken,
            role:"admin",
          });
        }

    } catch (error) {
        //console.error("Error signing in:", error.message);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    }
}




const  requestPasswordResetFromSignin = async (req, res) => {
  try {
    
  
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.USER_NOT_FOUND });
    }

  
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Update user with verification token
    user.resetPasswordToken = verificationToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create the reset password link
    const resetPasswordLink = `http://localhost:5173/admin/reset_password_signin?token=${verificationToken}`;

    // Send verification email
    await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h1>Password Reset Request</h1>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetPasswordLink}" target="_blank">${resetPasswordLink}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT,
    });
  } catch (error) {
    console.error("Error in requestPasswordResetFromSignup:", error);
    res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.EMAIL_SEND_FAILED });
  }
  }



module.exports = {
    admin_signin,
    requestPasswordResetFromSignin
}
