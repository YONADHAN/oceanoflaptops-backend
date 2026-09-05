const HTTP_STATUS = require("../utils/constants/httpStatus");
const crypto = require("crypto");

const exemptedPaths = [
  '/api/user_signin',
  '/api/user_signup',
  '/api/verify_otp',
  '/api/resent_otp',
  '/api/forget_password_email_entering',
  '/api/forget_password_otp_verification',
  '/api/reset_password',
  '/api/request-password-reset-from-signin',
  '/api/reset-password-from-signin',
  '/api/verify-email',
  '/api/user_details',
  '/api/admin/admin_signin',
  '/api/admin/request-password-reset-from-signin',
  '/api/auth/google',
  '/api/auth/refresh-token'
];

const verifyCsrfToken = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt specific public POST endpoints
  if (exemptedPaths.includes(req.path)) {
    return next();
  }

  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "CSRF token missing."
    });
  }

  if (cookieToken.length !== headerToken.length) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "CSRF token mismatch."
    });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "CSRF token mismatch."
    });
  }

  next();
};

module.exports = { verifyCsrfToken };
