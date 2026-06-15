const ERROR_MESSAGES = Object.freeze({
  // General
  SOMETHING_WENT_WRONG: "Something went wrong",
  INTERNAL_SERVER_ERROR: "Internal server error",

  // Auth
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User already exists",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  ACCESS_DENIED: "Access denied",
  INVALID_TOKEN: "Invalid token",
  TOKEN_EXPIRED: "Token expired",

  // Password
  PASSWORD_MISMATCH: "Passwords do not match",
  INCORRECT_PASSWORD: "Incorrect password",
  OLD_PASSWORD_INCORRECT: "Old password is incorrect",

  // Product
  PRODUCT_NOT_FOUND: "Product not found",
  PRODUCT_OUT_OF_STOCK: "Product out of stock",

  // Category
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_ALREADY_EXISTS: "Category already exists",

  // Cart
  CART_NOT_FOUND: "Cart not found",
  PRODUCT_ALREADY_IN_CART: "Product already exists in cart",

  // Wishlist
  PRODUCT_ALREADY_IN_WISHLIST: "Product already exists in wishlist",

  // Orders
  ORDER_NOT_FOUND: "Order not found",
  ORDER_ALREADY_CANCELLED: "Order already cancelled",
  ORDER_CANNOT_BE_CANCELLED: "Order cannot be cancelled",

  // Coupon
  COUPON_NOT_FOUND: "Coupon not found",
  COUPON_EXPIRED: "Coupon expired",
  COUPON_ALREADY_USED: "Coupon already used",
  INVALID_COUPON: "Invalid coupon",

  // Payment
  PAYMENT_FAILED: "Payment failed",
  PAYMENT_VERIFICATION_FAILED: "Payment verification failed",

  // Validation
  REQUIRED_FIELDS_MISSING: "Required fields are missing",
  INVALID_INPUT: "Invalid input provided",

  // File Upload
  FILE_REQUIRED: "File is required",
  INVALID_FILE_TYPE: "Invalid file type",

  // Admin
  ADMIN_NOT_FOUND: "Admin not found",
});
module.exports = ERROR_MESSAGES;