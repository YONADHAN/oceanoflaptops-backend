const User = require('../../models/userSchema');
const RefreshToken = require("../../models/refreshTokenSchema");
const storeToken = require("../../utils/JWT/storeCookies")
const bcryptjs = require('bcryptjs');
const dotenv = require("dotenv")
const crypto = require('crypto');
const nodemailer = require("nodemailer");
const {generateAccessToken, generateRefreshToken} = require('../../utils/JWT/generateTokens')
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
            return res.status(400).json({ message: "User doesn't exist. Please sign up." });
        }

        // Check if the user is verified
        if (!user.isVerified) {
            return res.status(400).json({ message: "Please verify your email before signing in." });
        }

        // Compare provided password with stored hashed password
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            return res.status(404).json({ message: "Password does not match." });
        }

        if(!user.isAdmin) {
            return  res.status(404).json({message: "You are not authenticated"})
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

          res.status(200).json({
            message: "Admin Logged In successfully",
            adminData: adminDetails,
            success: true,
            accessToken,
            role:"admin",
          });
        }

    } catch (error) {
        console.error("Error signing in:", error.message);
        res.status(500).json({ message: "Server error." });
    }
}




const  requestPasswordResetFromSignin = async (req, res) => {
  try {
    
  
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
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

    res.status(200).json({
      success: true,
      message: "A verification email has been sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error in requestPasswordResetFromSignup:", error);
    res
      .status(500)
      .json({ success: false, message: "Error sending verification email" });
  }
  }



module.exports = {
    admin_signin,
    requestPasswordResetFromSignin
}
