


const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Coupon = require('../../models/couponSchema');

const generateReports = async (req, res) => {
    const { startDate, endDate, limit = 10, interval = "day" } = req.body;

    try {
        const query = {};
        if (startDate && endDate) {
            query.placedAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const categorySalesPromise = Order.aggregate([
            { $match: query },
            { $unwind: "$orderItems" },
            
            {
                $lookup: {
                    from: "products", 
                    localField: "orderItems.product",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" }, 
           
            {
                $lookup: {
                    from: "categories", 
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" }, 
         
            {
                $group: {
                    _id: "$categoryDetails.name",
                    totalSales: { $sum: "$orderItems.totalPrice" },
                    unitsSold: { $sum: "$orderItems.quantity" },
                    totalDiscount: { $sum: "$orderItems.discount" }
                }
            },
            { $sort: { totalSales: -1 } } ,
            { $limit: parseInt(limit) }
        ]);

        const brandSalesPromise = Order.aggregate([
            { $match: query },
            { $unwind: "$orderItems" },
            { $lookup: {
                from: "products",
                localField: "orderItems.product",
                foreignField: "_id",
                as: "product"
            }},
            { $unwind: "$product" },
            {
                $group: {
                    _id: "$product.brand",
                    totalSales: { $sum: "$orderItems.totalPrice" },
                    unitsSold: { $sum: "$orderItems.quantity" },
                    totalDiscount: { $sum: "$orderItems.discount" }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: parseInt(limit) }
        ]);

        const salesTrendsPromise = Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        day: { $dateToString: { format: "%Y-%m-%d", date: "$placedAt" } },
                        week: { $isoWeek: "$placedAt" },
                        month: { $dateToString: { format: "%Y-%m", date: "$placedAt" } }
                    }[interval],
                    totalSales: { $sum: "$totalAmount" },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const topProductsPromise = Order.aggregate([
            { $match: query },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.productName",
                    totalSales: { $sum: "$orderItems.totalPrice" },
                    unitsSold: { $sum: "$orderItems.quantity" }
                }
            },
            { $sort: { totalSales: -1 } },
            { $limit: parseInt(limit) }
           
        ]);

        const couponUsagePromise = Order.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$couponCode",
                    totalOrders: { $sum: 1 },
                    totalDiscount: { $sum: "$couponDiscount" },
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            { $sort: { totalOrders: -1 } }
        ]);

        // Execute all promises in parallel
        const [
            categorySales,
            brandSales,
            salesTrends,
            topProducts,
            couponUsage
        ] = await Promise.all([
            categorySalesPromise,
            brandSalesPromise,
            salesTrendsPromise,
            topProductsPromise,
            couponUsagePromise
        ]);

        // Send combined results
        res.status(200).json({
            success: true,
            reports: {
                categorySales,
                brandSales,
                salesTrends,
                topProducts,
                couponUsage
            }
        });

    } catch (error) {
        console.error("Error generating reports:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports = { generateReports };
