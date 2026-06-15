const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/refreshTokenSchema");
require("dotenv").config();
const User = require("../models/userSchema")
const {generateAccessToken,generateRefreshToken} = require("../utils/JWT/generateTokens")
const { OAuth2Client } = require('google-auth-library');
const storeToken = require("../utils/JWT/storeCookies");
const HTTP_STATUS = require("../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../utils/constants/successMessages");
const ERROR_MESSAGES = require("../utils/constants/errorMessages");




const refreshAccessToken = async (req, res) => {
  console.log("~~~~~Refreshing Token~~~~~");

  try {
  

    const refreshToken = req?.cookies?.RefreshToken;

    if (!refreshToken) {
      console.log("~~~~~Refreshing Failed~~~~~");
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: SUCCESS_MESSAGES.REFRESH_TOKEN_EXPIRED_LOGIN_TO_YOUR_ACCOUNT,
        success: false,
      });
    }

    // Check if the refresh token exists in the database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      console.log("~~~~~Refreshing Failed~~~~~");
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: ERROR_MESSAGES.INVALID_REFRESH_TOKEN,
        success: false,
      });
    }

    const roleSecrets = {
      user: {
        refreshSecret: process.env.JWT_USER_REFRESH_TOKEN_SECRET,
        accessSecret: process.env.JWT_USER_ACCESS_TOKEN_SECRET,
      },
      admin: {
        refreshSecret: process.env.JWT_ADMIN_REFRESH_TOKEN_SECRET,
        accessSecret: process.env.JWT_ADMIN_ACCESS_TOKEN_SECRET,
      },
    };

    const { user: role, expiresAt } = tokenDoc;

    // Ensure the role in the token is valid
    if (!roleSecrets[role]) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: ERROR_MESSAGES.INVALID_ROLE_IN_REFRESH_TOKEN,
        success: false,
        role,
      });
    }

    const { refreshSecret, accessSecret } = roleSecrets[role];

    // Check if the refresh token has expired
    if (expiresAt <= new Date()) {
      await RefreshToken.deleteOne({ token: refreshToken });


      res.clearCookie(`RefreshToken`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        message: SUCCESS_MESSAGES.REFRESH_TOKEN_EXPIRED_LOGIN_TO_YOUR_ACCOUNT,
        success: false,
      });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, refreshSecret);

    console.log("Access Token Expiration:", process.env.JWT_ACCESS_TOKEN_EXPIRES);

    // Generate a new access token
    const newAccessToken = jwt.sign(
      {
        _id: decoded?.data?._id,
        email: decoded?.data?.email,
        role: decoded?.data?.role,
      },
      accessSecret,
      { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES }
    );

    console.log("New Access Token:", newAccessToken);
    console.log("~~~~~Refreshing Completed~~~~~");

    return res.status(HTTP_STATUS.OK).json({
      message: SUCCESS_MESSAGES.ACCESS_TOKEN_CREATED,
      success: true,
      access_token: newAccessToken,
      role,
    });
  } catch (error) {
    console.error("Error in Refresh Token:", error.message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: ERROR_MESSAGES.SOMETHING_WENT_WRONG,
      success: false,
      error: error.message,
    });
  }
};


const googleAuth = async (req, res) => {
  const { token, role } = req.body;
  console.log("At the googleAuth token : ",token," and role is : ",role);
  console.log("Received Google Auth request with token and role:", { token, role });

  if (!token || !role) {
      console.error("Missing token or role in the request");
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Token and role are required" });
  }

  if (!["user", "admin"].includes(role)) {
      console.error("Invalid role specified:", role);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Invalid role specified" });
  }

  try {
      console.log("Initializing Google OAuth2Client...");
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

      console.log("Verifying ID token...");
      const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      console.log("Token payload:", payload);

      if (!payload.email_verified) {
          console.warn("Unverified email:", payload.email);
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: ERROR_MESSAGES.EMAIL_NOT_VERIFIED });
      }

      const { name, email, sub, picture } = payload;
      console.log("Verified email:", email);

      console.log("Checking if the email exists in other roles...");
     

      console.log("Looking up the user in the database...");
      let user = await User.findOne({ email });

      if (user && user.isBlocked) {
          console.warn("Blocked user attempted to log in:", email);
          return res.status(HTTP_STATUS.UNAUTHORIZED).json({
              message: ERROR_MESSAGES.YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_THE_S,
          });
      }

      if (!user) {
          console.log("Creating a new user for:", email);
          user = new User({
              username: name,
              email,
              googleId: sub,
              avatar: picture,
              isVerified: true,
          });
      } else if (!user.googleId) {
          console.log("Updating existing user with Google ID:", email);
          user.googleId = sub;
          if (!user.avatar) {
              user.avatar = picture;
          }
      }

      console.log("Saving user data...");
      await user.save();

      const userDataToGenerateToken = {
          _id: user._id,
          email: user.email,
          role,
      };
      await RefreshToken.deleteMany({user_id: user._id})
      console.log("Generating access and refresh tokens...");
      const accessToken = generateAccessToken(role, userDataToGenerateToken);
      const refreshToken = generateRefreshToken(role, userDataToGenerateToken);

      console.log("Saving refresh token to the database...");
      const newRefreshToken = new RefreshToken({
          token: refreshToken,
          user: role,
          user_id: user._id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const savedToken = await newRefreshToken.save();
      console.log("Refresh token saved:", savedToken);

      const { password, ...userDetails } = user.toObject();

     
        
        if (savedToken) {
          console.log("Storing refresh token in cookies...");
          storeToken(
              `RefreshToken`,
              refreshToken,
              7 * 24 * 60 * 60 * 1000,
              res
          );
          

        console.log("Returning success response for:", email);
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in successfully`,
            userData: userDetails,
            accessToken,
            role,
        });
    }

      console.error("Failed to save the refresh token for:", email);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Failed to log in" });
  } catch (error) {
      console.error("Google Auth Error:", error.stack || error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const RemoveRefreshToken = async (req, res) => {
  const id = req.params.id;
  console.log("Decoded ID:", id);

  try {
    // Validate user ID
    if (!id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: ERROR_MESSAGES.USER_ID_IS_REQUIRED });
    }

    // Find and remove refresh token
    const refreshToken = await RefreshToken.findOneAndDelete({ user_id: id });
    if (!refreshToken) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: ERROR_MESSAGES.REFRESH_TOKEN_NOT_FOUND });
    }

    // Successfully deleted
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.THE_REFRESH_TOKEN_WAS_DELETED,
    });
  } catch (error) {
    // Log error and send server error response
    console.error("Error deleting refresh token:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};


module.exports = { refreshAccessToken ,googleAuth ,RemoveRefreshToken};
