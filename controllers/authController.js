const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/refreshTokenSchema");
require("dotenv").config();
const User = require("../models/userSchema")
const {generateAccessToken,generateRefreshToken} = require("../utils/JWT/generateTokens")
const { OAuth2Client } = require('google-auth-library');
const storeToken = require("../utils/JWT/storeCookies")



const refreshAccessToken = async (req, res) => {
  console.log("~~~~~Refreshing Token~~~~~");

  try {
  

    const refreshToken = req?.cookies?.RefreshToken;

    if (!refreshToken) {
      console.log("~~~~~Refreshing Failed~~~~~");
      return res.status(403).json({
        message: "Refresh token expired. Login to your account.",
        success: false,
      });
    }

    // Check if the refresh token exists in the database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    if (!tokenDoc) {
      console.log("~~~~~Refreshing Failed~~~~~");
      return res.status(403).json({
        message: "Invalid refresh token.",
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
      return res.status(403).json({
        message: "Invalid role in refresh token.",
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

      return res.status(403).json({
        message: "Refresh token expired. Login to your account.",
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

    return res.status(200).json({
      message: "Access token created successfully.",
      success: true,
      access_token: newAccessToken,
      role,
    });
  } catch (error) {
    console.error("Error in Refresh Token:", error.message);
    return res.status(500).json({
      message: "Something went wrong.",
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
      return res.status(400).json({ error: "Token and role are required" });
  }

  if (!["user", "admin"].includes(role)) {
      console.error("Invalid role specified:", role);
      return res.status(400).json({ error: "Invalid role specified" });
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
          return res.status(401).json({ message: "Email not verified" });
      }

      const { name, email, sub, picture } = payload;
      console.log("Verified email:", email);

      console.log("Checking if the email exists in other roles...");
     

      console.log("Looking up the user in the database...");
      let user = await User.findOne({ email });

      if (user && user.isBlocked) {
          console.warn("Blocked user attempted to log in:", email);
          return res.status(401).json({
              message: "Your account has been blocked. Please contact the support team.",
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
        return res.status(200).json({
            success: true,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} logged in successfully`,
            userData: userDetails,
            accessToken,
            role,
        });
    }

      console.error("Failed to save the refresh token for:", email);
      res.status(500).json({ message: "Failed to log in" });
  } catch (error) {
      console.error("Google Auth Error:", error.stack || error);
      res.status(500).json({
          message: "Internal server error. Please try again.",
      });
  }
};

const RemoveRefreshToken = async (req, res) => {
  const id = req.params.id;
  console.log("Decoded ID:", id);

  try {
    // Validate user ID
    if (!id) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Find and remove refresh token
    const refreshToken = await RefreshToken.findOneAndDelete({ user_id: id });
    if (!refreshToken) {
      return res.status(404).json({ success: false, message: "Refresh token not found" });
    }

    // Successfully deleted
    return res.status(200).json({
      success: true,
      message: "The refresh token was successfully deleted",
    });
  } catch (error) {
    // Log error and send server error response
    console.error("Error deleting refresh token:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


module.exports = { refreshAccessToken ,googleAuth ,RemoveRefreshToken};
