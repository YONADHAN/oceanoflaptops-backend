const ERROR_MESSAGES = Object.freeze({
  // General 
  SOMETHING_WENT_WRONG: "Something went wrong",
  INTERNAL_SERVER_ERROR: "Internal server error",
  INTERNAL_SERVER_ERROR_PLEASE_TRY_AGAIN: "Internal server error. Please try again.",
  SERVER_ERROR: "Server error.",
  NOT_FOUND: "Not found",

  // Auth 
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User not found",
  USER_ALREADY_EXISTS: "User already exists",
  UNAUTHORIZED_ACCESS: "Unauthorized access",
  UNAUTHORIZED: "Unauthorized",
  ACCESS_DENIED: "Access denied",
  INVALID_TOKEN: "Invalid token",
  TOKEN_EXPIRED: "Token expired",
  INVALID_REFRESH_TOKEN: "Invalid refresh token.",
  INVALID_ROLE_IN_REFRESH_TOKEN: "Invalid role in refresh token.",
  REFRESH_TOKEN_NOT_FOUND: "Refresh token not found",
  INVALID_OR_EXPIRED_TOKEN: "Invalid or expired token",
  INVALID_SIGNATURE: "Invalid signature",
  YOU_ARE_NOT_AUTHENTICATED: "You are not authenticated",
  YOU_ARE_NOT_THE_USER: "You are not the user",
  EMAIL_NOT_VERIFIED: "Email not verified",
  EMAIL_VERIFICATION_REQUIRED: "Email verification required",

  // User 
  USER_NOT_FOUND_WITH_THIS_EMAIL: "User not found with this email.",
  USER_DOESN_T_EXIST_PLEASE_SIGN_UP: "User doesn't exist. Please sign up.",
  USER_DOES_NOT_EXIST: "User does not exist",
  USER_IS_ALREADY_VERIFIED: "User is already verified.",
  USER_ID_IS_REQUIRED: "User ID is required",
  INVALID_USERID_FORMAT: "Invalid userId format",
  PLEASE_VERIFY_YOUR_EMAIL_BEFORE_SIGNING_IN: "Please verify your email before signing in.",
  YOUR_ACCOUNT_HAS_BEEN_BLOCKED_PLEASE_CONTACT_THE_S: "Your account has been blocked. Please contact the support team.",
  YOU_ARE_BLOCKED_BY_THE_ADMIN_PLEASE_CONTACT_US_FOR: "You are Blocked by the Admin, Please contact us for further information.",
  YOU_HAVE_USED_GOOGLE_SIGN_TO_LOGIN_PLEASE_TRY_GOOG: "You have used google sign to login. Please try google or add password using forgot password",
  CUSTOMER_SUCCESSFULLY_UNBLOCKED: "Customer Successfully Unblocked",

  // Password 
  PASSWORD_MISMATCH: "Passwords do not match",
  INCORRECT_PASSWORD: "Incorrect password",
  OLD_PASSWORD_INCORRECT: "Old password is incorrect",
  PASSWORD_DOES_NOT_MATCH: "Password does not match.",
  PASSWORD_MUST_BE_AT_LEAST_8_CHARACTERS: "Password must be at least 8 characters",
  ERROR_RESETTING_PASSWORD: "Error resetting password",
  ERROR_RESETTING_PASSWORD_1: "Error resetting password",

  // Email & OTP 
  INVALID_EMAIL_FORMAT: "Invalid email format",
  INVALID_EMAIL_ADDRESS: "Invalid email address.",
  EMAIL_DOESN_T_MATCH_YOUR_REGISTERED_EMAIL: "Email doesn't match your registered email",
  EMAIL_IS_NOT_SEND: "Email is not send",
  ERROR_SENDING_VERIFICATION_EMAIL: "Error sending verification email",

  FAILED_TO_SEND_EMAIL: "Failed to send email",
  FAILED_TO_SEND_OTP_EMAIL_PLEASE_TRY_AGAIN_LATER: "Failed to send OTP email. Please try again later.",
  ERROR_VERIFYING_TOKEN: "Error verifying token",
  INVALID_OTP_PLEASE_TRY_AGAIN: "Invalid OTP. Please try again.",
  OTP_HAS_EXPIRED_PLEASE_REQUEST_A_NEW_ONE: "OTP has expired. Please request a new one.",
  OTP_IS_NOT_VALID: "OTP is not valid",
  OTP_HAS_EXPIRED: "OTP has expired",

  // Validation 
  REQUIRED_FIELDS_MISSING: "Required fields are missing",
  INVALID_INPUT: "Invalid input provided",
  ALL_FIELDS_ARE_REQUIRED: "All fields are required.",
  ALL_FIELDS_ARE_REQUIRED_1: "All fields are required",

  // File Upload 
  FILE_REQUIRED: "File is required",
  INVALID_FILE_TYPE: "Invalid file type",

  // Admin 
  ADMIN_NOT_FOUND: "Admin not found",

  // Category 
  CATEGORY_NOT_FOUND: "Category not found",
  CATEGORY_ALREADY_EXISTS: "Category already exists",
  INVALID_CATEGORY: "Invalid category",
  INVALID_CATEGORY_ID: "Invalid category ID",
  CATEGORY_IS_BLOCKED_BY_THE_ADMIN: "Category is blocked by the admin",
  NO_CATEGORIES_FOUND: "No categories found.",
  ERROR_UPDATING_CATEGORY: "Error updating category",
  ERROR_BLOCKING_CATEGORY: "Error blocking category",
  ERROR_UNBLOCKING_CATEGORY: "Error unblocking category",

  // Product 
  PRODUCT_NOT_FOUND: "Product not found",
  PRODUCT_OUT_OF_STOCK: "Product out of stock",
  PRODUCT_ID_IS_REQUIRED: "Product ID is required.",
  INVALID_PRODUCT_ID: "Invalid product ID",
  PRODUCT_DETAILS_NOT_FOUND: "Product details not found",
  PRODUCT_PRICING_INFORMATION_IS_INCOMPLETE: "Product pricing information is incomplete",
  FAILED_TO_CALCULATE_SALE_PRICE: "Failed to calculate sale price",
  INVALID_OFFER_VALUE_MUST_BE_BETWEEN_0_AND_80: "Invalid offer value (must be between 0 and 80)",
  ERROR_UPDATING_OFFER: "Error updating offer",
  ERROR_FETCHING_PRODUCTS: "Error fetching products",
  AN_ERROR_OCCURRED_WHILE_FETCHING_PRODUCT_QUANTITY: "An error occurred while fetching product quantity.",
  ERROR_RETRIEVING_FILTER_OPTIONS: "Error retrieving filter options",
  ERROR_FILTERING_PRODUCTS: "Error filtering products",
  PRODUCT_NAME_MUST_BE_AT_LEAST_3_CHARACTERS:
    "Product name must be at least 3 characters",
  BRAND_NAME_MUST_BE_AT_LEAST_2_CHARACTERS:
    "Brand name must be at least 2 characters",
  MODEL_NUMBER_MUST_BE_AT_LEAST_2_CHARACTERS:
    "Model number must be at least 2 characters",
  REGULAR_PRICE_MUST_BE_GREATER_THAN_ZERO:
    "Regular price must be greater than 0",
  QUANTITY_CANNOT_BE_NEGATIVE:
    "Quantity cannot be negative",
  OFFER_PERCENTAGE_MUST_BE_BETWEEN_0_AND_80:
    "Offer percentage must be between 0 and 80",
  MINIMUM_3_PRODUCT_IMAGES_REQUIRED:
    "Minimum 3 product images are required",
  PRODUCT_ALREADY_EXISTS:
    "Product already exists",
  INVALID_CATEGORY:
    "Invalid category",

  // Cart 
  CART_NOT_FOUND: "Cart not found",
  PRODUCT_ALREADY_IN_CART: "Product already exists in cart",
  NO_ITEMS_IN_CART: "No items in cart",
  CART_IS_EMPTY_OR_SOME_PRODUCTS_MAY_GET_UNAVAILABLE: "Cart is empty, or some products may get unavailable, add something before checkout...",
  CART_IS_EMPTY_ADD_SOMETHING_BEFORE_CHECKOUT: "Cart is empty, add something before checkout...",

  // Wishlist 
  PRODUCT_ALREADY_IN_WISHLIST: "Product already exists in wishlist",
  NO_WISHLISTS_FOUND: "No wishlists found",
  WISHLIST_NOT_FOUND: "Wishlist not found",

  // Orders ─
  ORDER_NOT_FOUND: "Order not found",
  ORDER_ALREADY_CANCELLED: "Order already cancelled",
  ORDER_CANNOT_BE_CANCELLED: "Order cannot be cancelled",
  ORDER_IS_ALREADY_DELIVERED: "Order is already delivered",
  ORDER_ITEM_NOT_FOUND: "Order item not found",
  ITEM_NOT_FOUND: "Item not found",
  CANNOT_UPDATE_STATUS_ORDER_IS_ALREADY_CANCELLED: "Cannot update status - order is already cancelled",
  CANNOT_CHANGE_STATUS_OF_DELIVERED_ORDERS: "Cannot change status of delivered orders",
  RETURN_REQUEST_HAS_ALREADY_BEEN_PROCESSED: "Return request has already been processed",
  INVOICE_CAN_ONLY_BE_DOWNLOADED_FOR_DELIVERED_ORDER: "Invoice can only be downloaded for delivered orders",

  //Coupon 
  COUPON_NOT_FOUND: "Coupon not found",
  COUPON_EXPIRED: "Coupon expired",
  COUPON_ALREADY_USED: "Coupon already used",
  INVALID_COUPON: "Invalid coupon",
  INVALID_COUPON_CODE: "Invalid coupon code.",
  INVALID_COUPON_CODE_YOUR_PURCHASE_AMOUNT_DOES_NOT: "Invalid coupon code. Your purchase amount does not meet the minimum requirement.",
  COUPON_ALREADY_APPLIED: "Coupon already applied",
  COUPON_CODE_ALREADY_EXISTS: "Coupon code already exists.",
  COUPON_CODE_MUST_CONTAIN_ONLY_LETTERS_AND_NUMBERS: "Coupon code must contain only letters and numbers.",
  NO_COUPON_SELECTED_TO_DELETE: "No coupon selected to delete",
  COUPON_NOT_FOUND_TO_DELETE: "Coupon not found to delete",
  ERROR_DELETING_COUPON: "Error deleting coupon",
  COUPON_NOT_FOUND_TO_UPDATE: "Coupon not found to update",
  ERROR_UPDATING_COUPON: "Error updating coupon",
  NO_COUPONS_APPLIED: "No coupons applied",
  NO_SUITABLE_COUPONS_FOUND: "No suitable coupons found",
  DESCRIPTION_CANNOT_BE_EMPTY: "Description cannot be empty.",
  MINIMUM_PURCHASE_AMOUNT_MUST_BE_GREATER_THAN_0: "Minimum purchase amount must be greater than 0.",
  MAXIMUM_DISCOUNT_PRICE_CANNOT_BE_NEGATIVE: "Maximum discount price cannot be negative.",
  DISCOUNT_PERCENTAGE_MUST_BE_BETWEEN_1_AND_80: "Discount percentage must be between 1 and 80.",
  START_DATE_CANNOT_BE_IN_THE_PAST: "Start date cannot be in the past.",
  END_DATE_MUST_BE_GREATER_THAN_THE_START_DATE: "End date must be greater than the start date.",
  MAXIMUM_DISCOUNT_PRICE_SHOULD_BE_LESS_THAN_MIN_PURCHASE_AMOUNT:"Maximum discount price should be less than min purchase amount.",
  COUPON_CODE_MUST_BE_WITHIN_4_TO_20_CHARACTERS:"Coupon code must be between 4 and 20 characters",

  



  // Payment 
  PAYMENT_FAILED: "Payment failed",
  PAYMENT_VERIFICATION_FAILED: "Payment verification failed",
  RAZORPAY_PAYMENT_ID_IS_REQUIRED_FOR_RAZOR_PAY_PAYM: "Razorpay payment ID is required for Razor pay payments",

  // Wallet ─
  WALLET_NOT_FOUND: "Wallet not found",
  USER_WALLET_NOT_FOUND: "User wallet not found",
  INSUFFICIENT_BALANCE_IN_WALLET: "Insufficient balance in wallet",
  INVALID_AMOUNT: "Invalid amount",
  ERROR_GETTING_WALLET: "Error getting wallet",
  ERROR_ADDING_TO_WALLET: "Error adding to wallet",
  ERROR_WITHDRAWING_FROM_WALLET: "Error withdrawing from wallet",
  ERROR_GETTING_WALLET_BALANCE: "Error getting wallet balance",

  // Address 
  THIS_EXACT_ADDRESS_ALREADY_EXISTS_FOR_THIS_USER: "This exact address already exists for this user",
  NO_ADDRESS_FOUND: "No address found",
  ADDRESS_NOT_FOUND: "Address not found",

});

module.exports = ERROR_MESSAGES;