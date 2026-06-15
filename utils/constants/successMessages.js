const SUCCESS_MESSAGES = Object.freeze({
  //  General 
  NO_TOKEN_PROVIDED: "No token provided",

  //  Auth 
  LOGIN_SUCCESS: "Login successful",
  REGISTER_SUCCESS: "Registration successful",
  LOGOUT_SUCCESS: "Logout successful",
  PASSWORD_RESET_SUCCESS: "Password reset successful",
  PASSWORD_CHANGED_SUCCESS: "Password changed successfully",
  ADMIN_LOGGED_IN_SUCCESSFULLY: "Admin Logged In successfully",
  USER_LOGGED_IN_SUCCESSFULLY: "User Logged In successfully",
  ACCESS_TOKEN_CREATED_SUCCESSFULLY: "Access token created successfully.",
  REFRESH_TOKEN_EXPIRED_LOGIN_TO_YOUR_ACCOUNT: "Refresh token expired. Login to your account.",
  THE_REFRESH_TOKEN_WAS_SUCCESSFULLY_DELETED: "The refresh token was successfully deleted",

  //  Email & OTP
  A_VERIFICATION_EMAIL_HAS_BEEN_SENT_PLEASE_CHECK_YO: "A verification email has been sent. Please check your inbox.",
  EMAIL_SEND_SUCCESSFULLY: "Email send successfully",
  OTP_SUCCESSFULLY_SENT_VERIFY_WITHIN_2_MINUTES: "OTP successfully sent. Verify within 2 minutes.",
  TOO_MANY_OTP_ATTEMPTS_PLEASE_TRY_AGAIN_LATER: "Too many OTP attempts, please try again later.",
  OTP_SUCCESSFULLY_VERIFIED_YOU_CAN_NOW_SIGN_IN: "OTP successfully verified. You can now sign in.",
  OTP_VERIFIED_SUCCESSFULLY: "OTP verified successfully",
  NEW_OTP_HAS_BEEN_SENT_TO_YOUR_EMAIL: "New OTP has been sent to your email.",
  TOKEN_VERIFIED_SUCCESSFULLY: "Token verified successfully",

  //  Password
  PASSWORD_RESET_SUCCESSFULLY: "Password reset successfully",
  PASSWORD_RESET_SUCCESSFULLY_COMPLETED: "Password reset successfully completed",
  EMAIL_DOES_NOT_MATCH_YOUR_REGISTERED_EMAIL: "Email doesn't match your registered email",

  //  User 
  PROFILE_FETCHED: "Profile fetched successfully",
  PROFILE_UPDATED: "Profile updated successfully",
  USER_RETRIEVED_SUCCESSFULLY: "User retrieved successfully",
  USER_UPDATED_SUCCESSFULLY: "User updated successfully",
  USERS_FETCHED: "Users fetched successfully",
  CUSTOMERS_SUCCESSFULLY_FETCHED: "Customers successfully fetched",
  SUCCESSFULLY_BLOCKED_THE_USER: "Successfully blocked the User",
  USER_WITH_THIS_EMAIL_ALREADY_EXISTS: "User with this email already exists",
  USER_NOT_FOUND_WITH_THIS_EMAIL: "User not found with this email ",

  //  Address 
  ADDRESS_ADDED_SUCCESSFULLY: "Address added successfully",
  ADDRESS_UPDATED_SUCCESSFULLY: "Address updated successfully",
  ADDRESS_DELETED_SUCCESSFULLY: "Address deleted successfully",
  DEFAULT_ADDRESS_UPDATED_SUCCESSFULLY: "Default address updated successfully",

  //  Category
  CATEGORY_CREATED: "Category created successfully",
  CATEGORY_UPDATED: "Category updated successfully",
  CATEGORY_DELETED: "Category deleted successfully",
  CATEGORIES_SUCCESSFULLY_FETCHED: "Categories successfully fetched",
  CATEGORY_DATA_FETCHED_SUCCESSFULLY: "Category data fetched successfully",
  CATEGORY_BLOCKED_SUCCESSFULLY: "Category blocked successfully",
  CATEGORY_UNBLOCKED_SUCCESSFULLY: "Category unblocked successfully",
  CATEGORY_OFFER_UPDATED_SUCCESSFULLY: "Category offer updated successfully",
  CATEGORY_ID_FOUND: "category id found",

  //  Product 
  PRODUCT_CREATED: "Product created successfully",
  PRODUCT_UPDATED: "Product updated successfully",
  PRODUCT_DELETED: "Product deleted successfully",
  PRODUCT_FETCHED: "Product fetched successfully",
  PRODUCTS_FETCHED: "Products fetched successfully",
  PRODUCT_ADDED_SUCCESSFULLY: "Product added successfully",
  OFFER_UPDATED_SUCCESSFULLY: "Offer updated successfully",
  PRODUCT_SUCCESSFULLY_FETCHED: "Product successfully fetched",
  PRODUCTS_SUCCESSFULLY_FETCHED: "Products successfully fetched",
  FILTER_IS_SUCCESSFULLY_FETCHED: "Filter is successfully fetched",
  THIS_PRODUCT_HAS_BEEN_BLOCKED_BY_THE_ADMIN: "This product has been blocked by the admin.",
  THIS_PRODUCT_S_CATEGORY_HAS_BEEN_BLOCKED_BY_THE_AD: "This product's category has been blocked by the admin.",
  PRODUCT_IS_BLOCKED_BY_THE_ADMIN: "Product is blocked by the admin",
  PRODUCT_NOT_AVAILABLE: "Product not available",

  //  Cart 
  CART_FETCHED: "Cart fetched successfully",
  PRODUCT_ADDED_TO_CART: "Product added to cart",
  CART_UPDATED: "Cart updated successfully",
  PRODUCT_REMOVED_FROM_CART: "Product removed from cart",
  CART_IS_EMPTY: "Cart is empty",
  CART_ITEMS_WERE_SUCCESSFULLY_RETRIEVED: "Cart Items were successfully retrieved.",
  CART_QUANTITY_EXCEEDS_THE_LIMIT: "Cart quantity exceeds the limit",
  CART_QUANTITY_IS_WITHIN_THE_LIMIT: "Cart quantity is within the limit",
  MAXIMUM_5_QUANTITY_ALLOWED: "Maximum 5 quantity allowed",
  USERID_IS_REQUIRED: "userId is required",
  PRODUCT_NOT_FOUND_IN_CART: "Product not found in cart",
  SOME_ITEMS_WERE_REMOVED_BECAUSE_THEY_ARE_NO_LONGER: "Some items were removed because they are no longer available",

  //  Wishlist
  PRODUCT_ADDED_TO_WISHLIST: "Product added to wishlist",
  PRODUCT_REMOVED_FROM_WISHLIST: "Product removed from wishlist",
  PRODUCT_REMOVED_FROM_WISHLIST_SUCCESSFULLY: "Product removed from wishlist successfully",
  WISHLIST_CREATED_AND_PRODUCT_ADDED: "Wishlist created and product added",
  WISHLIST_NOT_FOUND: "Wishlist not found",
  PRODUCT_EXISTS: "Product exists",
  PRODUCT_NOT_IN_WISHLIST: "Product not in wishlist",

  //  Orders 
  ORDER_CREATED: "Order placed successfully",
  ORDER_FETCHED: "Order fetched successfully",
  ORDERS_FETCHED: "Orders fetched successfully",
  ORDER_CANCELLED: "Order cancelled successfully",
  ORDER_RETURNED: "Return request submitted successfully",
  ORDER_ITEMS_ARE_REQUIRED: "Order items are required",
  NO_ORDERS_FOUND: "No orders found",
  ORDER_HISTORY_FETCHED_SUCCESSFULLY: "Order History fetched successfully",
  ORDER_ID_FETCHED_SUCCESSFULLY: "Order ID fetched successfully",
  PRODUCT_CANCELLED_SUCCESSFULLY: "Product cancelled successfully",
  RETURN_REQUEST_PROCESSED_SUCCESSFULLY: "Return request processed successfully",

  //  Coupon
  COUPON_APPLIED: "Coupon applied successfully",
  COUPON_CREATED: "Coupon created successfully",
  COUPON_UPDATED: "Coupon updated successfully",
  COUPON_DELETED: "Coupon deleted successfully",
  COUPON_REMOVED_SUCCESSFULLY: "Coupon removed successfully",
  COUPONS_FETCHED_SUCCESSFULLY: "Coupons fetched successfully",
  NO_COUPON_SELECTED: "No coupon selected ",
  SUCCESSFULLY_APPLIED_COUPON: "Successfully applied coupon",
  APPLIED_COUPONS: "Applied coupons",
  SUITABLE_COUPONS: "Suitable coupons",

  //  Payment 
  PAYMENT_SUCCESS: "Payment successful",
  PAYMENT_VERIFIED: "Payment verified successfully",
  PAYMENT_VERIFIED_AND_UPDATED: "Payment verified and updated.",

  //  Wallet 
  WALLET_FETCHED: "Wallet fetched successfully",
  WALLET_UPDATED: "Wallet updated successfully",
  WALLET_RETRIEVED_SUCCESSFULLY: "Wallet retrieved successfully",
  WALLET_BALANCE_RETRIEVED_SUCCESSFULLY: "Wallet balance retrieved successfully",
  AMOUNT_ADDED_TO_WALLET_SUCCESSFULLY: "Amount added to wallet successfully",
  AMOUNT_WITHDRAWN_FROM_WALLET_SUCCESSFULLY: "Amount withdrawn from wallet successfully",
  NO_WALLET_FOUND_CREATE_WALLET: "No wallet found, create wallet",
  INSUFFICIENT_BALANCE_IN_WALLET: "Insufficient balance in wallet",

  //  Invoice 
  INVOICE_GENERATED: "Invoice generated successfully",

  //  Admin 
  DASHBOARD_FETCHED: "Dashboard data fetched successfully",
});

module.exports = SUCCESS_MESSAGES;