const express = require('express');
const router = express.Router();
const authController = require('../controllers/user/authController')
const ProductController = require('../controllers/user/productController')
const CartController = require('../controllers/user/cartController')
const OrderController = require('../controllers/user/orderController')
const categoryController = require('../controllers/user/categoryController')
const PasswordController  = require('../controllers/user/PasswordController');
const WishlistController = require('../controllers/user/wishlistController');
const WalletController = require('../controllers/user/walletController');
const CouponController = require('../controllers/user/couponController');
const PaymentController = require('../controllers/user/paymentController');
const downloadInvoiceController = require('../controllers/user/downloadInvoiceController');
const {verifyUser} = require("../middlewares/auth")

// const sampleController = require('../controllers/user/sampleController')

//authentication routes
router.post('/user_signup', authController.userSignup);
router.post('/verify_otp', authController.verify_otp);
router.post('/resent_otp',authController.resend_otp);
router.post('/user_signin',authController.user_signin);
router.post('/forget_password_email_entering',authController.forget_password_email_entering);
router.post('/forget_password_otp_verification',authController.forget_password_otp_verification);
router.post('/reset_password',authController.reset_password);
router.post('/user_details',authController.user_details);
router.post('/request-password-reset-from-signin',PasswordController.requestPasswordResetFromSignin)
router.post('/reset-password-from-signin',PasswordController.resetPasswordFromSignin)


//ProductController
router.get('/get_product_details/:id', ProductController.get_product_details);//public api from productDetailsPage
router.get('/get_products', verifyUser,ProductController.get_products)
router.get("/get_all_products_paginated",verifyUser, ProductController.get_all_products_paginated);
router.get("/get_filter_options", ProductController.get_filter_options);//public api from shop (FilterPage.jsx)
router.get('/filter_products', ProductController.filter_products);//public api from shop (ProductList.jsx)
router.post('/get_quantity' ,verifyUser, ProductController.get_quantity)
router.get('/search', ProductController.searchProducts)

//CategoryController
router.get('/get_category_id_from_name',verifyUser, categoryController.get_category_id_from_name)
router.get('/get_products_by_category',  ProductController.get_products_by_category)//public api from product collection
router.get('/get_category_list', categoryController.get_category_list)//public api from product collection


//address
router.post("/address_add",verifyUser, authController.address_add);
router.get("/addresses_get",verifyUser, authController.addresses_get);
router.put("/addresses_edit/:id",verifyUser, authController.addresses_edit);
router.delete("/addresses_remove/:id",verifyUser, authController.addresses_remove);
router.put("/addresses/:id/default", verifyUser, authController.setDefaultAddress); 

//account/personalInformation
router.post('/update_personal',authController.update_personal)

//forgot password routes
router.post('/request-password-reset', PasswordController.requestPasswordReset);
router.post('/verify-email', PasswordController.verifyEmailToken);
router.post('/reset-password', PasswordController.resetPassword);
router.post('/password-change', PasswordController.passwordChange);


//cart
//  router.post("/apply_coupon", CartController.apply_coupon);
//  router.post("/remove_coupon", CartController.remove_coupon);
router.post("/cart_data",verifyUser, CartController.cart_data);
router.post("/get_cart",verifyUser, CartController.get_cart);
router.post("/get_cart_items",verifyUser, CartController.get_cart_items);
router.post("/add_to_cart", verifyUser, CartController.add_to_cart);
router.post("/remove_from_cart", verifyUser, CartController.remove_from_cart);
router.post('/checkout',verifyUser, CartController.processCheckout);
router.get('/clear_cart',verifyUser, CartController.clear_cart);
router.post('/refresh_cart',verifyUser, CartController.refresh_cart);


//orders
router.get("/order_history",verifyUser, OrderController.order_history);
router.get("/get_order/:orderId",verifyUser, OrderController.get_order);
router.post("/cancel_order/:orderId",verifyUser, OrderController.cancel_order);
router.post("/cancel_product",verifyUser, OrderController.cancel_product);
router.post('/return_product',verifyUser, OrderController.return_product);
router.post('/get_order_id',verifyUser, OrderController.get_order_id)
router.get('/get_tax_invoice/:orderId', verifyUser, downloadInvoiceController.downloadInvoice)

//payment
router.post('/create_razorpay_order', verifyUser, PaymentController.create_razorpay_order);
router.post('/verify_razorpay_payment',verifyUser, PaymentController.verify_razorpay_payment);
router.post('/retry_payment',verifyUser, PaymentController.retry_payment);
router.post('/verify_retry_razorpay_payment',verifyUser, PaymentController.verify_retry_razorpay_payment)

//wishlist
router.post('/add_to_wishlist',verifyUser, WishlistController.add_to_wishlist);
router.post('/remove_from_wishlist',verifyUser, WishlistController.remove_from_wishlist);
router.post('/check_if_in_wishlist',verifyUser, WishlistController.check_if_in_wishlist);
router.post('/get_wishlists',verifyUser, WishlistController.get_wishlists)



//Wallet 
router.post('/get_wallet_history',verifyUser, WalletController.get_wallet_history);
router.post('/add_to_wallet', verifyUser, WalletController.add_to_wallet);
router.post('/wallet_balance', verifyUser, WalletController.wallet_balance);

//Coupons
router.post('/get_suitable_coupons',verifyUser, CouponController.get_suitable_coupons);
router.post('/apply_coupon', verifyUser, CouponController.apply_coupon);
router.post('/apply_coupon_ultimate', verifyUser, CouponController.apply_coupon_ultimate);

module.exports = router;