const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const { jwtDecode } = require("jwt-decode");
const Cookies = require("js-cookie");



const order_history = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    const decode = jwtDecode(token);
    const userId = decode._id;
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get total count of orders for pagination
    const total = await Order.countDocuments({ user: userId });
    
    // Fetch paginated orders for the user
    const orders = await Order.find({ user: userId })
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No orders found" });
    }
    
    res.status(200).json({
      success: true,
      message: "Order History fetched successfully",
      orders,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const get_order = async (req, res) => {
  
  const orderId = req.params.orderId;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.status(200).json({ success: true, message: "Order fetched successfully", order });
  } catch (error) {
    res.status(500).json({ success: false, message:"Internal Server Error" });
  }
}



const cancel_order = async (req, res) => {
  const orderId = req.params.orderId;
  const reason = req.body.reason
  try {
      const order = await Order.findById(orderId);
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }
      if(order.orderStatus === "Delivered"){
        return res.status(400).json({ success: false, message: "Order is already delivered" });
      }

     
      await Promise.all(order.orderItems.map(async (item) => {
          item.orderStatus = "Cancelled";
          item.cancellationReason = reason;
          const product = await Product.findById(item.product);
          if (product) {
              product.quantity += item.quantity;
              await product.save();
          }
      }));

      if ((order.paymentMethod === "Razor pay" ||order.paymentMethod === "wallet") && order.paymentStatus === "Completed") {
        const userId = order.user;
        let wallet = await Wallet.findOne({ userId });
      
        if (!wallet) {
          wallet = new Wallet({
            userId,
            balance: 0, 
            transactions: [],
          });
        }
              
        wallet.balance += order.payableAmount+order.shippingFee;
      
        const transactionItem = {
          type: "credit",
          amount: order.payableAmount+order.shippingFee,
          description: `Amount retrieved from cancelled order ${orderId}`,
          date: new Date(),
        };
      
        wallet.transactions.push(transactionItem);
        await wallet.save();
         order.paymentStatus = "Refunded"
      }
      
      if(order.paymentMethod ==="Cash on Delivery"){
        order.paymentStatus = "Cancelled";
      }

      order.orderStatus = "Cancelled";
      
      order.payableAmount = 0;
      await order.save();

      return res.status(200).json({
          success: true,
          message: "Order cancelled successfully",
      });

  } catch (error) {
      console.error("Error in cancel_order:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const cancel_product = async (req, res) => {
  const { productId, orderId, quantity, reason } = req.body;
  // console.log(productId, orderId, quantity, " product cancelled");

  try {
      
      const order = await Order.findById(orderId);
      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }

  
      const orderItem = order.orderItems.find(item => item._id.toString() === productId);
      if (!orderItem) {
          return res.status(404).json({ success: false, message: "Order item not found" });
      }

    
      const product = await Product.findById(orderItem.product);
      if (!product) {
          return res.status(404).json({ success: false, message: "Product not found" });
      }

      // console.log("Original product quantity", product.quantity);
     
      product.quantity += quantity;
      await product.save();

      let amountReduced = 0;
     
      let flag = true;
      order.orderItems.forEach(item => {
          if (item._id.toString() === productId) {
              item.orderStatus = "Cancelled";
              if(order.paymentStatus === "Completed"){
                item.paymentStatus = "Refunded";
              }
              item.cancellationReason = reason
              amountReduced += item.totalPrice
          }
          if (item.orderStatus !== "Cancelled") {
              flag = false;
          }
      });

      if (flag ) {
          order.orderStatus = "Cancelled";
          if(order.paymentMethod === "Cash on Delivery"){
            order.paymentStatus = "Cancelled";
          }         
      }
      const noOfItems = order.orderItems.length;
      const averageCouponDiscount = Math.floor(order.couponDiscount / noOfItems);
    
      order.payableAmount-=(amountReduced - averageCouponDiscount);
      let amountGetAddedToTheWallet = (amountReduced - averageCouponDiscount)+(flag?order.shippingFee:0)

      if ((order.paymentMethod === "Razor pay" || order.paymentMethod === "wallet" ) && order.paymentStatus === "Completed") {
        const userId = order.user;
        let wallet = await Wallet.findOne({ userId });
      
        if (!wallet) {
          wallet = new Wallet({
            userId,
            balance: 0, 
            transactions: [],
          });
        }
              
        wallet.balance += amountGetAddedToTheWallet;
      
        const transactionItem = {
          type: "credit",
          amount: amountGetAddedToTheWallet,
          description: `Amount retrieved from cancelled order ${orderId} for the cancelled product ${product.productName}`,
          date: new Date(),
        };
      
        wallet.transactions.push(transactionItem);
        await wallet.save();
        if(flag ) {
          order.paymentStatus = "Refunded";
        }
      }   
     
      await order.save();
      res.status(200).json({ success: true, message: "Product cancelled successfully" });

  } catch (error) {
      //console.error("Error in cancel_product:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


const return_product = async (req, res) => {
  const { productId, orderId, reason } = req.body;
 
  try {
    const order = await Order.findById(orderId);
    if(!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    const orderItem = order.orderItems.find(item => item._id.toString() === productId);
    orderItem.returnRequest.requestStatus = 'Pending';
    orderItem.returnRequest.reason = reason;
    order.isReturnReq = true;
    order.save();
    res.status(200).json({ success: true, message: "Return request submitted successfully" });
    
  } catch (error) {
    res.status(500).json({success: false, message: "Internal Server Error"})
  }
}


const get_order_id = async (req, res) => {
  const orderId = req.body.orderId;
  try {
    const order = await Order.findOne({orderId: orderId});
    if(!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    res.status(200).json({ success: true, message: "Order ID fetched successfully", orderDatabaseId: order._id });
  } catch (error) {
    res.status(500).json({message: "Internal Server Error", error: error});
  }
}



module.exports = {
  order_history,
  get_order,
  cancel_order,
  cancel_product,
  return_product,
  get_order_id,
};
