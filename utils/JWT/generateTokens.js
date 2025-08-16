const jwt = require("jsonwebtoken");

const generateAccessToken = (role, data) => {
  if (role === "user") {
    return jwt.sign(
      {
        _id: data?._id,
        email: data?.email,
        role: data?.role,
        
      },
      process.env.JWT_USER_ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES,
      }
    );
  } else if (role === "admin") {
    return jwt.sign(
      { _id: data?._id, email: data?.email, role: data?.role },
      process.env.JWT_ADMIN_ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES,
      }
    );
  }
};

const generateRefreshToken = (role, data) => {
  if (role === "user") {
    return jwt.sign({ data }, process.env.JWT_USER_REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES,
    });
  } else if (role === "admin") {
    return jwt.sign({ data }, process.env.JWT_ADMIN_REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES,
    });
  }
};

module.exports = { generateAccessToken, generateRefreshToken };
