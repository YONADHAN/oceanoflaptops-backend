const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");
const { jwtDecode } = require("jwt-decode");
const Cookies = require("js-cookie");
const HTTP_STATUS = require("../../utils/constants/httpStatus");
const SUCCESS_MESSAGES = require("../../utils/constants/successMessages");
const ERROR_MESSAGES = require("../../utils/constants/errorMessages");


const ShippingFee = 15;

const globalFieldUpdation = async (userId) => {
  // console.log("globalfieldupdation is worked with userId: " + userId);
  try {
    const cart = await Cart.findOne({ userId: userId }).populate(
      "items.productId"
    );
    if (!cart) {
      //console.log("cart not found from globalfieldupdation");
      return "cart not found";
    }

    let totalRegularPrice = 0; // Sum of regular prices
    let totalSalesPrice = 0; // Sum of sales prices
    let totalDiscount = 0; // Total discount applied
    let netTotal = 0; // Sales prices minus totalDiscount

    if (cart.items.length == 0) {
      //console.log("cart is empty from globalfieldupdation");
      totalRegularPrice = 0;
      totalSalesPrice = 0;
      totalDiscount = 0;
      netTotal = 0;
    } else {
      cart.items.forEach((item) => {
        if (item.productId.quantity > 0) {
          totalRegularPrice += item.regularPrice * item.quantity;
          totalSalesPrice += item.salePrice * item.quantity;
        }
      });
      totalDiscount = totalRegularPrice - totalSalesPrice;
      netTotal = totalSalesPrice;
    }

    cart.totalRegularPrice = totalRegularPrice;
    cart.totalSalesPrice = totalSalesPrice;
    cart.totalDiscount = totalDiscount;
    cart.netTotal = netTotal;

    //below will be changed
    cart.subTotal = totalRegularPrice;
    cart.globalTotal = totalSalesPrice;
    cart.globalDiscount = totalDiscount;
    cart.finalTotal = netTotal;
    await cart.save();
  } catch (error) {
    console.error("Error in globalFieldUpdation:", error);
    return null;
  }
};

const checkingBlockedProduct = async (userId) => {
  //console.log("checkingBlockedProduct is worked with userId: " + userId);

  let cart = await Cart.findOne({ userId }).populate({
    path: "items.productId",
    populate: {
      path: "category",
    },
  });
  if (!cart) {
    //console.log("cart not found from checkingBlockedProduct");
    return "cart not found";
  }
  const removedItems = [];

  const filteredItems = [];
  cart.items.forEach((item) => {
    if (!item.productId.isBlocked && !item.productId.category.isBlocked) {
      filteredItems.push(item);
    } else {
      removedItems.push(item);
    }
  });
  cart.items = filteredItems;
  await cart.save();
  return { success: true, removedItems, filteredItems };
};

const cartQuantityCheck = async (userId) => {
  const cart = await Cart.findOne({ userId: userId });
  if (!cart) {
    return { success: false, message: ERROR_MESSAGES.CART_NOT_FOUND };
  }
  if (cart.items.length === 0) {
    return { success: true, message: SUCCESS_MESSAGES.CART_IS_EMPTY };
  }
  let totalQuantity = 0;
  cart.items.forEach((item) => {
    totalQuantity += item.quantity;
    if (item.quantity === 0) {
      const itemName = item.productName;
      const id = item.productId;
      return {
        success: false,
        message: `Cannot use "${itemName}" . Item is not available.`,
        id: id,
        productName: itemName,
      };
    }
  });
  // if (totalQuantity > 100) {
  //   return { success: false, message: SUCCESS_MESSAGES.CART_QUANTITY_EXCEEDS_THE_LIMIT };
  // }
  return {
    success: true,
    message: SUCCESS_MESSAGES.CART_QUANTITY_IS_WITHIN_THE_LIMIT,
    totalQuantity: totalQuantity,
  };
};

const refresh_cart = async (req, res) => {
  try {
    const userId = req.body.userId;
    const blockedResult = await checkingBlockedProduct(userId);
    await globalFieldUpdation(userId);
    res.json({
      success: true,
      messages: "Cart refreshed successfully",
      blockedProducts: blockedResult.removedItems,
      filteredItems: blockedResult.filteredItems,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const add_to_cart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    let decoded;
    try {
      decoded = jwtDecode(token);
    } catch (error) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ success: false, message: ERROR_MESSAGES.INVALID_TOKEN });
    }

    const userId = decoded._id;

    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.PRODUCT_NOT_FOUND });
    }
    if (product.isBlocked) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: SUCCESS_MESSAGES.PRODUCT_BLOCKED });
    }
    if (product.category.isBlocked) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: SUCCESS_MESSAGES.CATEGORY_BLOCKED });
    }

    if (product.quantity < quantity) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: ERROR_MESSAGES.PRODUCT_OUT_OF_STOCK });
    }

    if (product.status !== "Available") {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: SUCCESS_MESSAGES.PRODUCT_NOT_AVAILABLE });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({
        userId,
        items: [],
        globalTotal: 0,
        globalDiscount: 0,
        subTotal: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId && item.status !== "Cancelled"
    );
    if (!product.salePrice || !product.regularPrice) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.PRODUCT_PRICING_INFORMATION_IS_INCOMPLETE,
      });
    }

    let updatedCartTotal = cart.globalTotal || 0;
    let updatedSubTotal = cart.subTotal || 0;

    const productDiscount =
      ((product.regularPrice - product.salePrice) / product.regularPrice) * 100;

    if (existingItemIndex !== -1) {
      const existingItem = cart.items[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > product.quantity) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: ERROR_MESSAGES.PRODUCT_OUT_OF_STOCK });
      }

      if (newQuantity > 5) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: SUCCESS_MESSAGES.MAX_QUANTITY_EXCEEDED });
      }

      const newTotalPrice = newQuantity * product.salePrice;
      const newSubTotalPrice = newQuantity * product.regularPrice;
      // const name = product.productName;
      updatedCartTotal =
        updatedCartTotal - existingItem.totalPrice + newTotalPrice;
      updatedSubTotal =
        updatedSubTotal -
        existingItem.quantity * product.regularPrice +
        newSubTotalPrice;

      // cart.items[existingItemIndex].quantity = newQuantity;
      // cart.items[existingItemIndex].totalPrice = newTotalPrice;

      cart.items[existingItemIndex] = {
        ...existingItem._doc,

        quantity: newQuantity,
        totalPrice: newTotalPrice,
        price: product.salePrice,
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        discount: parseFloat(productDiscount.toFixed(2)),
      };
    } else {
      if (quantity > 5) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: SUCCESS_MESSAGES.MAX_QUANTITY_EXCEEDED });
      }

      const totalPrice = quantity * product.salePrice;
      const subTotalPrice = quantity * product.regularPrice;

      cart.items.push({
        productId,
        productName: product.productName,
        productImage: product.productImage[0],
        quantity,
        price: product.salePrice,
        totalPrice,
        status: "Placed",
        regularPrice: product.regularPrice,
        salePrice: product.salePrice,
        discount: productDiscount.toFixed(2),
      });

      updatedCartTotal += totalPrice;
      updatedSubTotal += subTotalPrice;
    }

    let globalDiscount = 0;
    if (updatedCartTotal > 50_000) {
      globalDiscount = updatedCartTotal * 0.1;
    }

    cart.globalTotal = updatedCartTotal;
    cart.globalDiscount = globalDiscount;
    cart.finalTotal = updatedCartTotal - globalDiscount;
    cart.subTotal = updatedSubTotal;

    // console.log("Updated SubTotal:", updatedSubTotal);
    // console.log("Updated Cart Total:", updatedCartTotal);
    // console.log("Global Discount:", globalDiscount);
    // console.log("Final Total:", cart.finalTotal);

    await cart.save();
    await globalFieldUpdation(userId);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: SUCCESS_MESSAGES.PRODUCT_ADDED_TO_CART,
      cart: {
        items: cart.items,
        subTotal: cart.subTotal,
        globalTotal: cart.globalTotal,
        globalDiscount: cart.globalDiscount,
        finalTotal: cart.finalTotal,
      },
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};









const cart_data = async (req, res) => {
  try {
    //console.log("cart_data endpoint called");
    const userId = req.body.userId;
    if (!userId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ success: false, message: SUCCESS_MESSAGES.USER_ID_REQUIRED });
    }
    // console.log(userId)
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.CART_NOT_FOUND });
    }
    //console.log("cart data:", cart);
    res.status(HTTP_STATUS.OK).json({ success: true, cart });
  } catch (error) {
    console.error("Error in cart_data:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const get_cart = async (req, res) => {
  try {
    const userId = req.body.userId;

    // Input validation
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.USER_ID_REQUIRED,
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_USER_ID,
      });
    }

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: {
        path: "category",
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message:
          ERROR_MESSAGES.CART_IS_EMPTY_OR_SOME_PRODUCTS_MAY_GET_UNAVAILABLE,
      });
    }

    // Filter out blocked products and categories
    const filteredItems = cart.items.filter(
      (item) =>
        item.productId &&
        !item.productId.isBlocked &&
        item.productId.category &&
        !item.productId.category.isBlocked
    );

    // console.log("Filtered items: ", filteredItems);

    // Update cart if items were filtered out
    if (filteredItems.length < cart.items.length) {
      const subTotal = filteredItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      const finalTotal = subTotal - cart.globalDiscount;

      cart = await Cart.findOneAndUpdate(
        { userId },
        {
          items: filteredItems,
          subTotal: subTotal,
          finalTotal: finalTotal,
        },
        { new: true }
      ).populate({
        path: "items.productId",
        populate: {
          path: "category",
        },
      });
    }
    if (cart.items.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.CART_IS_EMPTY_ADD_SOMETHING_BEFORE_CHECKOUT,
      });
    }
    // console.log("*********************filtered Items****************",filteredItems);
    await globalFieldUpdation(userId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      cart: {
        items: filteredItems,
        subTotal: cart.subTotal,
        finalTotal: cart.finalTotal,
      },
      message:
        filteredItems.length < cart.items.length
          ? "Some items were removed because they are no longer available"
          : "Cart retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting cart:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

const get_cart_items = async (req, res) => {
  try {
    const userId = req.body.userId;

    // Best practice: Add input validation
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.USER_ID_REQUIRED,
      });
    }
    await globalFieldUpdation(userId);
    // Add proper error handling for invalid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: ERROR_MESSAGES.INVALID_USER_ID,
      });
    }

    let cart = await Cart.findOne({ userId }).populate({
      path: "items.productId",
      populate: {
        path: "category",
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: ERROR_MESSAGES.NO_ITEMS_IN_CART,
      });
    }
    // console.log("cart is ", cart)
    // Filter out blocked products
    const filteredItems = cart.items.filter(
      (item) =>
        item.productId &&
        !item.productId.isBlocked &&
        item.productId.category &&
        !item.productId.category.isBlocked
    );
    // console.log("filtered items: " + filteredItems);
    // Update cart if items were filtered out
    if (filteredItems.length < cart.items.length) {
      const subTotal = filteredItems.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      const finalTotal = subTotal - cart.globalDiscount;

      cart = await Cart.findOneAndUpdate(
        { userId },
        {
          items: filteredItems,
          subTotal: subTotal,
          finalTotal: finalTotal,
        },
        { new: true }
      ).populate({
        path: "items.productId",
        populate: {
          path: "category",
        },
      });
      await globalFieldUpdation(userId);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        cartItems: filteredItems,
        message: SUCCESS_MESSAGES.SOME_ITEMS_WERE_REMOVED_BECAUSE_THEY_ARE_NO_LONGER,
      });
    }
    await globalFieldUpdation(userId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      cartItems: filteredItems,
      message: SUCCESS_MESSAGES.CART_ITEMS_WERE_SUCCESSFULLY_RETRIEVED,
    });
  } catch (error) {
    console.error("Error getting cart items:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    });
  }
};

const remove_from_cart = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: ERROR_MESSAGES.CART_NOT_FOUND });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: SUCCESS_MESSAGES.PRODUCT_NOT_FOUND_IN_CART });
    }

    // Remove the item from the items array
    cart.items.splice(itemIndex, 1);
    await cart.save();
    await globalFieldUpdation(userId);
    return res
      .status(HTTP_STATUS.OK)
      .json({ success: true, message: SUCCESS_MESSAGES.PRODUCT_REMOVED_FROM_CART });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const processCheckout = async (req, res) => {
  try {
    const {
      user,
      orderItems,
      orderedAmount,
      totalAmount,
      shippingAddress,
      paymentMethod,
      shippingFee,
      totalDiscount,
      couponDiscount,
      paymentStatus,
      razorpayPaymentId = "NIL",
    } = req.body;

    // console.log("OrderData: ", JSON.stringify(req.body));
    // console.log("Payment method is : ", paymentMethod);
    // console.log("payment status is : ", paymentStatus);
    // console.log("Razor pay payment id is : ", razorpayPaymentId);
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies.user_access_token;
    if (!token) {
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ success: false, message: SUCCESS_MESSAGES.NO_TOKEN_PROVIDED });
    }

    // Validate order items and calculate prices
    if (!orderItems?.length) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ success: false, message: SUCCESS_MESSAGES.ORDER_ITEMS_ARE_REQUIRED });
    }
    // console.log(
    //   "payament status just before paymentStatusUpdated is : ",
    //   paymentStatus
    // );
    let paymentStatusUpdated = paymentStatus;
    if (paymentMethod === "Cash on Delivery") {
      paymentStatusUpdated = "Pending";
    } else if (paymentMethod === "Razor pay") {
      if (!razorpayPaymentId) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: ERROR_MESSAGES.RAZORPAY_PAYMENT_ID_IS_REQUIRED_FOR_RAZOR_PAY_PAYM,
        });
      }
      paymentStatusUpdated = paymentStatus;
    } else if (paymentMethod === "wallet") {
      // console.log("User i have got is : ", user);
      const wallet = await Wallet.findOne({ userId: user });
      if (!wallet) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: SUCCESS_MESSAGES.NO_WALLET_FOUND_CREATE_WALLET });
      }
      if (wallet.balance < totalAmount+shippingFee) {
        return res
          .status(HTTP_STATUS.BAD_REQUEST)
          .json({ success: false, message: SUCCESS_MESSAGES.INSUFFICIENT_BALANCE_IN_WALLET });
      }
      wallet.balance -= totalAmount+shippingFee;

      const transactionItem = {
        type: "debit",
        amount: totalAmount+shippingFee,
        description: "Withdrawn from wallet",
        date: Date.now(),
      };

      wallet.transactions.push(transactionItem);

      await wallet.save();
      paymentStatusUpdated = "Completed";
    }

    const processedItems = orderItems.map((item) => ({
      product: item.product,
      productName: item.productName,
      productImage: item.productImage,
      quantity: item.quantity,
      price: item.price,
      discount: item.discount || 0,
      orderStatus: "Pending",
      paymentStatus: paymentStatusUpdated,
      totalPrice: Number(item.price) * Number(item.quantity),
    }));

    // Reduce stock in Product schema
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          // message: `Product with ID ${item.product} not found`,
          message: `Product not found`,
        });
      }

      // Check stock availability
      if (product.quantity < item.quantity) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: `Insufficient stock for ${product.productName}`,
        });
      }

      // Reduce the stock
      product.quantity -= item.quantity;
      await product.save();
    }

    // console.log("Final Order Data before saving:", {
    //   user,
    //   orderItems: processedItems,
    //   orderedAmount,
    //   totalAmount,
    //   payableAmount: totalAmount,
    //   shippingAddress,
    //   orderStatus: "Pending",
    //   paymentMethod,
    //   paymentStatus: paymentStatusUpdated,
    //   razorpayPaymentId, 
    //   totalDiscount,
    //   couponDiscount,
    //   shippingFee,
    //   deliveryBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    // });

  

    const newOrder = new Order({
      user,
      orderItems: processedItems,
      orderedAmount,
      totalAmount,
      payableAmount: totalAmount,
      shippingAddress: {
        name: shippingAddress.name,
        email: shippingAddress.email,
        phone: shippingAddress.phone,
        landmark: shippingAddress.landmark || "",
        pincode: shippingAddress.pincode,
        city: shippingAddress.city,
        district: shippingAddress.district,
        state: shippingAddress.state,
      },
      orderStatus: "Pending",
      paymentMethod,
      paymentStatus: paymentStatusUpdated,
      // Explicitly set razorpayPaymentId with a conditional
      razorpayPaymentId : razorpayPaymentId || "NIL",
      totalDiscount: totalDiscount || 0,
      couponDiscount: couponDiscount || 0,
      shippingFee,
      deliveryBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // console.log(
    //   "New order object before save:",
    //   JSON.stringify(newOrder.toObject(), null, 2)
    // );
    
    const savedOrder = await newOrder.save();
    // console.log(
    //   "Saved order object:",
    //   JSON.stringify(savedOrder.toObject(), null, 2)
    // );

    const result = await Cart.findOneAndDelete({ userId: user });
    if (result) {
      console.log("Cart deleted successfully:", result);
    } else {
      console.log("No cart found for this user.");
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      orderId: savedOrder.orderId,
      orderData: {
        _id: savedOrder._id,
        orderId: savedOrder.orderId,
        orderedAmount: savedOrder.orderedAmount,
        totalAmount: savedOrder.totalAmount,
        shippingAddress: savedOrder.shippingAddress,
        paymentMethod: savedOrder.paymentMethod,
        orderStatus: "Pending",
        //razorpayPaymentId: savedOrder.razorpayPaymentId,
        paymentStatus:
          paymentMethod === "Cash on Delivery" ? "Pending" : "Processing",
        razorpayPaymentId,
      },
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message || "Failed to process checkout",
    });
  }
};

const clear_cart = async (req, res) => {
  // console.log("clear cart is working....");
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies.user_access_token;
    const decoded = jwtDecode(token);
    const user = decoded._id;
    //console.log("user is now", user);
    const result = await Cart.findOneAndDelete({ userId: user });
    if (result) {
      console.log("Cart deleted successfully:", result);
    } else {
      console.log("No cart found for this user.");
    }
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  add_to_cart,
  cart_data,
  get_cart,
  get_cart_items,
  remove_from_cart,
  processCheckout,
  refresh_cart,
  clear_cart,
};
