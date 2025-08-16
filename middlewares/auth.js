
const jwt = require("jsonwebtoken");
const RefreshToken = require("../models/refreshTokenSchema");
const User = require("../models/userSchema");

const SECRET_KEY = {
  user: process.env.JWT_USER_ACCESS_TOKEN_SECRET,
  admin: process.env.JWT_ADMIN_ACCESS_TOKEN_SECRET,
};

const verifyToken = (role) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers["authorization"];
    
      if (!authHeader) {       
        return res.status(403).json({ message: "No token provided.", role });
      }

      const token = authHeader.split(" ")[1];
      if (!token || token.split(".").length !== 3) {
        return res.status(400).json({ message: "Invalid token format." });
      }
      // console.log(role)
      const secretKey = SECRET_KEY[role];
      if (!secretKey) {
        return res.status(400).json({ message: "Invalid role specified.", role });
      }

      
     
      const decoded = jwt.verify(token, secretKey);
      
      if(!decoded) {
        res.status(401).json({message:"Token is invalid or expired.", role })
      }

      const refreshTokenFromDatabase = await RefreshToken.findOne({ user_id: decoded._id });
      if (!refreshTokenFromDatabase) {
        return res.status(404).json({ message: "Refresh token not found.", role });
      }

      
      if (refreshTokenFromDatabase.expires_at < Date.now()) {
        await RefreshToken.deleteOne({ userId: decoded._id });
        res.clearCookie(`RefreshToken`);
        res.clearCookie(`access_token`)
        return res.status(401).json({ message: "Refresh token expired.", role });
      }

      // Validate user existence
      const user = await User.findById(decoded._id);
     
      if (!user) {
        return res.status(404).json({ message: "User not found.", role });
      }

   
      if (user.isBlocked) {
        res.clearCookie(`RefreshToken`);
        res.clearCookie(`access_token`)
        return res.status(403).json({ message: "User is blocked.", role });
      }

    
      req.user = decoded;
      next();
    } catch (err) {
      console.error("Token verification error:", err);
      return res
        .status(401)
        .json({ message: "Token is invalid or expired.", role });
    }
  };
};

module.exports = {
  verifyUser: verifyToken("user"),
  verifyAdmin: verifyToken("admin"),
};
