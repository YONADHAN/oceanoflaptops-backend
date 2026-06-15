const SUCCESS_MESSAGES = Object.freeze({
  // Auth
  LOGIN_SUCCESS: "Login successful",
  REGISTER_SUCCESS: "Registration successful",
  LOGOUT_SUCCESS: "Logout successful",
  PASSWORD_RESET_SUCCESS: "Password reset successful",
  PASSWORD_CHANGED_SUCCESS: "Password changed successfully",

  // User
  PROFILE_FETCHED: "Profile fetched successfully",
  PROFILE_UPDATED: "Profile updated successfully",

  // Product
  PRODUCT_CREATED: "Product created successfully",
  PRODUCT_UPDATED: "Product updated successfully",
  PRODUCT_DELETED: "Product deleted successfully",
  PRODUCT_FETCHED: "Product fetched successfully",
  PRODUCTS_FETCHED: "Products fetched successfully",

  // Category
  CATEGORY_CREATED: "Category created successfully",
  CATEGORY_UPDATED: "Category updated successfully",
  CATEGORY_DELETED: "Category deleted successfully",

  // Cart
  CART_FETCHED: "Cart fetched successfully",
  PRODUCT_ADDED_TO_CART: "Product added to cart",
  CART_UPDATED: "Cart updated successfully",
  PRODUCT_REMOVED_FROM_CART: "Product removed from cart",

  // Wishlist
  PRODUCT_ADDED_TO_WISHLIST: "Product added to wishlist",
  PRODUCT_REMOVED_FROM_WISHLIST: "Product removed from wishlist",

  // Orders
  ORDER_CREATED: "Order placed successfully",
  ORDER_FETCHED: "Order fetched successfully",
  ORDERS_FETCHED: "Orders fetched successfully",
  ORDER_CANCELLED: "Order cancelled successfully",
  ORDER_RETURNED: "Return request submitted successfully",

  // Payment
  PAYMENT_SUCCESS: "Payment successful",
  PAYMENT_VERIFIED: "Payment verified successfully",

  // Coupon
  COUPON_APPLIED: "Coupon applied successfully",
  COUPON_CREATED: "Coupon created successfully",
  COUPON_UPDATED: "Coupon updated successfully",
  COUPON_DELETED: "Coupon deleted successfully",

  // Wallet
  WALLET_FETCHED: "Wallet fetched successfully",
  WALLET_UPDATED: "Wallet updated successfully",

  // Invoice
  INVOICE_GENERATED: "Invoice generated successfully",

  // Admin
  USERS_FETCHED: "Users fetched successfully",
  DASHBOARD_FETCHED: "Dashboard data fetched successfully",
});
module.exports = SUCCESS_MESSAGES;