const express = require("express");
const router = express.Router();
const authController = require("../controllers/admin/authController");
const customerController = require("../controllers/admin/customerController");
const CategoryController = require("../controllers/admin/categoryController");
const ProductController = require("../controllers/admin/productController");
const OrderController = require("../controllers/admin/orderController");
const CouponController = require('../controllers/admin/couponController');
const dashboardController = require('../controllers/admin/dashboardController');
const {verifyAdmin} = require('../middlewares/auth')

//authController
router.post("/admin_signin", authController.admin_signin);
router.post("/request-password-reset-from-signin",authController.requestPasswordResetFromSignin);

//customerController
router.get("/get_customers", verifyAdmin, customerController.get_customers);
router.patch("/customer_unblock/:id", verifyAdmin, customerController.customer_unblock);
router.patch("/customer_block/:id", verifyAdmin, customerController.customer_block);

//CategoryController
router.post("/add_category", verifyAdmin, CategoryController.addCategory);
router.get("/get_category", verifyAdmin, CategoryController.getCategory); 
router.get("/get_category/:id", verifyAdmin, CategoryController.getOneCategory);
router.patch("/update_category/:id", verifyAdmin, CategoryController.update_category);
router.patch("/category_block/:id", verifyAdmin, CategoryController.category_block);
router.patch("/category_unblock/:id",verifyAdmin, CategoryController.category_unblock);
router.get("/get_category_list", verifyAdmin, CategoryController.get_category_list);
router.post('/update_category_offer', verifyAdmin, CategoryController.update_category_offer)
//ProductController
router.post("/add_product",verifyAdmin, ProductController.add_product);
router.get("/get_products",verifyAdmin, ProductController.getProducts);
router.put("/toggle_block/:id", verifyAdmin, ProductController.toggleBlockProduct);
router.put("/update_product/:id", verifyAdmin, ProductController.updateProduct);
router.get("/get_product/:id", verifyAdmin, ProductController.get_product);
router.post('/update_product_offer', verifyAdmin, ProductController.updateProductOffer);

//OrderController
router.get("/get_orders", verifyAdmin, OrderController.get_orders);
router.get("/order_details/:id",verifyAdmin, OrderController.order_details);
router.post("/order_status/:orderId",verifyAdmin, OrderController.order_status)
router.post("/order_for_salesReport", verifyAdmin, OrderController.order_for_salesReport);
router.post("/full_order_details_for_salesReport", verifyAdmin, OrderController.order_details_for_salesReport);
router.post('/return_request_management', verifyAdmin, OrderController.return_request_management);



//Coupons
router.post('/get_coupons_for_admin', verifyAdmin, CouponController.get_coupons_for_admin )
router.post('/create_coupon', verifyAdmin, CouponController.create_coupon)
router.post('/delete_coupon', verifyAdmin, CouponController.delete_coupon)
router.post('/update_coupon', verifyAdmin, CouponController.update_coupon)

//dashboard 
router.post('/dashboard', verifyAdmin, dashboardController.generateReports);


module.exports = router;
