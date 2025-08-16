const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const get_orders = async (req, res) => {
  const { page = 1, limit = 10, searchQuery  } = req.query;
  try {
    const skip = (page - 1) * limit;

    //console.log(req.query);
    let query = Order.find();

    if (searchQuery && searchQuery.trim()) {
      const searchRegex = new RegExp(searchQuery.trim(), 'i');
      
      query = query.or([
        { orderId: searchRegex },       
        { orderStatus: searchRegex },
      
      ]);
    }
  
    
    const orders = await query
      .skip(skip)
      .limit(Number(limit))
      .populate("user")
      .sort({placedAt: -1})
   
    const totalOrders = await Order.countDocuments(query.getQuery());

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal Server Error",
    });
  }
};

const  order_details_for_salesReport = async (req, res) => {
 
  const { searchQuery = "", startDate, endDate, filterPeriod} = req.body;
  //console.log("searchQuery", searchQuery, " startDate", startDate, " endDate", endDate, " filteredPeriod", filterPeriod)
  try {
    let query = {};

    if(searchQuery) {
      query.$or = [
        {orderId: {$regex: searchQuery, $options: "i"}},
        {"shippingAddress.name": {$regex: searchQuery, $options: "i"}},
        {"shippingAddress.email": {$regex: searchQuery, $options: "i"}},
        {"shippingAddress.phone": {$regex: searchQuery, $options: "i"}}
      ];
    }
  
   
   
    if (startDate && endDate) {
      query.placedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }else if (filterPeriod) {
      const now = new Date();
      const startOfPeriod = new Date();

      switch (filterPeriod) {
        case "thisDay": 
          startOfPeriod.setHours(0, 0, 0, 0);
          break;
        case "thisWeek": 
          startOfPeriod.setDate(now.getDate() - now.getDay());
          break;
        case "thisMonth":
          startOfPeriod.setDate(1);
          break;
        case "thisYear": 
          startOfPeriod.setMonth(0, 1);
          break;
      }

      query.placedAt = {
        $gte: startOfPeriod,
        $lte: now
      };
    }

    //console.log("query is " + query)

    const orders = await Order.find(query).sort({placedAt: 1})


    res.status(200).json({
      success: true,
      orders,
    });
    
  } catch (error) {
     res.status(500).json({message: "Internal Server Error", error: error});
  }
}



const order_for_salesReport = async (req, res) => {
  const { page = 1, limit = 10, searchQuery = "", startDate, endDate, filterPeriod } = req.body;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
   
    let query = {};

    
    if (searchQuery) {
      query.$or = [
        { orderId: { $regex: searchQuery, $options: "i" } },
        { "shippingAddress.name": { $regex: searchQuery, $options: "i" } },
        { "shippingAddress.email": { $regex: searchQuery, $options: "i" } }
      ];
    }
   
   
    if (startDate && endDate) {
      query.placedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (filterPeriod) {
      const now = new Date();
      const startOfPeriod = new Date();

      switch (filterPeriod) {
        case "thisDay":
          startOfPeriod.setHours(0, 0, 0, 0);
          break;
        case "thisWeek":
          startOfPeriod.setDate(now.getDate() - now.getDay());
          break;
        case "thisMonth":
          startOfPeriod.setDate(1);
          break;
        case "thisYear":
          startOfPeriod.setMonth(0, 1);
          break;
      }

      query.placedAt = {
        $gte: startOfPeriod,
        $lte: now
      };
    }

  
    const orders = await Order.find(query)
      .sort({ placedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));


    const totalOrders = await Order.countDocuments(query);


    const aggregateResults = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalDiscounts: { $sum: "$totalDiscount" },
          couponDiscounts: { $sum: { $ifNull: ["$couponDiscount", 0] } },
          uniqueCustomers: { $addToSet: "$user" }
        }
      }
    ]);

    const metrics = aggregateResults.length > 0 ? {
      totalSales: aggregateResults[0].totalSales || 0,
      totalOrders: totalOrders,
      totalDiscounts: aggregateResults[0].totalDiscounts || 0,
      couponDiscounts: aggregateResults[0].couponDiscounts || 0,
      totalCustomers: aggregateResults[0].uniqueCustomers.length || 0
    } : {
      totalSales: 0,
      totalOrders: 0,
      totalDiscounts: 0,
      couponDiscounts: 0,
      totalCustomers: 0
    };

    res.status(200).json({
      success: true,
      orders,
      metrics,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / parseInt(limit)),
        totalItems: totalOrders,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Sales Report Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal Server Error"
    });
  }
};

const order_details = async (req, res) => {
 
  const { id } = req.params;
 

  try {
    const order = await Order.findOne({orderId: id});
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    //console.log(order)
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const order_status = async function (req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

 
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot update status - order is already cancelled" 
      });
    }


    if (order.orderStatus === "Delivered" && status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot change status of delivered orders"
      });
    }

 
    order.orderItems = order.orderItems.map(item => {
      if (item.orderStatus !== "Cancelled") {
        return { ...item, orderStatus: status };
      }
      return item;
    });

    
    order.orderStatus = status;

    if (order && order.orderStatus) {
      if (order.orderStatus === "Cancelled" && order.paymentMethod === "Cash on Delivery") {
        order.paymentStatus = "Cancelled";
      } else if (order.orderStatus === "Delivered" && order.paymentMethod ==="Cash on Delivery") {
        order.paymentStatus = "Completed";
      }
    }
    await order.save();

    res.status(200).json({ 
      success: true, 
      message: `Order status updated to ${status} successfully`,
      order: order
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to update order status" 
    });
  }
}

// const return_request_management = async(req, res) => {
//   try {
//     const {
//       orderId,
//       itemId,
//       decision,
//       reason      
//     } = req.body;
   


//     const order = await Order.findOne({ orderId});
//     if(!order) {
//       return res.status(404).json({success: false, message: "Order not found"});
//     }
//     const item = order.orderItems.find(i => i._id == itemId);
//     if(!item) {
//       return res.status(404).json({success: false, message: "Item not found"});
//     }
//     if(item.returnRequest.requestStatus !== "Pending") {
//       return res.status(400).json({success: false, message: "Return request has already been processed"});
//     }
//     if(decision === "accepted") {
//       item.returnRequest.requestStatus = "Approved";
//     } else if(decision === "rejected") {
//       item.returnRequest.requestStatus = "Rejected";
//     }
//     item.returnRequest.reason = reason;
//     await order.save();
//     let amount = item.totalPrice
//     if(order.couponDiscount > 0) {
//         amount = item.totalPrice - Math.round(couponDiscount / item.length);
//     }
//     const wallet = await Wallet.findOne({userId: order.user});
//     if(!wallet) {
//       return res.status(404).json({success: false, message: "User wallet not found"});
//     }
//     if(decision === "accepted") {
//       wallet.balance += amount;  

//       const transactionItem = {
//         type: 'credit',
//         amount: amount,
//         description: `Refund for ${item.productName}`,
//         date: Date.now(),
//     };

//     wallet.transactions.push(transactionItem);
//     await wallet.save();  

//     const product = await Product.findById(item.product);
//     if(!product) {
//       return res.status(404).json({success: false, message: "Product not found"});
//     }
//     product.quantity += 1;
//     await product.save();

//     }


//     res.status(200).json({success: true, message: "Return request processed successfully"});
    

//     console.log("return request id is " , JSON.stringify(req.body));
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
//   }
// }

const return_request_management = async (req, res) => {
  try {
    const { orderId, itemId, decision, reason } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const item = order.orderItems.find(i => i._id == itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (item.returnRequest.requestStatus !== "Pending") {
      return res.status(400).json({ success: false, message: "Return request has already been processed" });
    }

    item.returnRequest.requestStatus = decision === "accepted" ? "Approved" : "Rejected";
    item.returnRequest.reason = reason;

    if (decision === "accepted" && order.paymentStatus === "Completed") {
      let amount = item.totalPrice;
      if (order.couponDiscount > 0) {
        amount = item.totalPrice - Math.round(order.couponDiscount / order.orderItems.length);
      }

      const wallet = await Wallet.findOne({ userId: order.user });
      if (!wallet) {
        return res.status(404).json({ success: false, message: "User wallet not found" });
      }

      wallet.balance += amount + order.shippingFee;

      const transactionItem = {
        type: "credit",
        amount: amount + order.shippingFee,
        description: `Refund for ${item.productName}`,
        date: Date.now(),
      };

      wallet.transactions.push(transactionItem);

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      product.quantity += 1;

      // Save wallet and product simultaneously
      await Promise.all([wallet.save(), product.save()]);

      item.paymentStatus = "Refunded";
    }

    // **Check if all items are refunded, then mark order as refunded**
    const allItemsRefunded = order.orderItems.every(i => i.paymentStatus === "Refunded");
    if (allItemsRefunded) {
      order.paymentStatus = "Refunded";
    }

    await order.save();

    res.status(200).json({ success: true, message: "Return request processed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};



module.exports = {
  get_orders,
  order_details,
  order_status,
  order_for_salesReport,
  order_details_for_salesReport,
  return_request_management
};
