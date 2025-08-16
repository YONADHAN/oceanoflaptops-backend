const Wishlist = require('../../models/wishlistSchema');    
const Product = require('../../models/productSchema');
const User = require('../../models/userSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require('mongoose');

async function add_to_wishlist(req, res) {
    try {
        const userId = req.body.userId;
        const productId = req.body.productId; 

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

      
        let wishlist = await Wishlist.findOne({ userId });

        if (wishlist) {
           
            const productExists = wishlist.products.some(
                (product) => product.productId.toString() === productId
            );

            if (productExists) {
                return res.status(400).json({ message: "Product already in wishlist" });
            }

            wishlist.products.push({ productId });
            await wishlist.save();
            return res.status(200).json({ message: "Product added to wishlist" });
        } else {
           
            const newWishlist = new Wishlist({
                userId,
                products: [{ productId }]
            });
            await newWishlist.save();
            return res.status(200).json({ message: "Wishlist created and product added" });
        }
    } catch (error) {
        console.error("Error adding product to wishlist:", error);
        return res.status(500).json({ message: "Server error", error });
    }
}

// const get_wishlists = async (req, res) => {
//     try {
//         const userId = req.body.userId;

//         // Find the wishlist by userId and populate the products
//         const wishlists = await Wishlist.findOne({ userId }).populate({
//             path: 'products.productId',
//             model: 'Product'
//         });

        

//         // If no wishlist is found, return a 404 error
//         if (!wishlists) {
//             return res.status(404).json({ success: false, message: "No wishlists found" });
//         }
//         console.log(wishlists);

//         const sortedProducts = wishlists.products.sort(
//             (a, b) => new Date(b.addedOn) - new Date(a.addedOn)
//         );

//         // Send the response with the products in the wishlist
//         res.status(200).json({ success: true, wishlists: sortedProducts});
//     } catch (error) {
//         console.error("Error getting wishlists:", error);
//         res.status(500).json({ success: false, message: "Internal server error" });
//     }
// };
const get_wishlists = async (req, res) => {
    try {
        const { userId, page = 1, limit = 10 } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid userId format." });
        }

       
        const skip = (page - 1) * limit;
        console.log(userId, page, skip, limit)
      
        const wishlists = await Wishlist.findOne({ userId }).populate({
            path: 'products.productId',
            model: 'Product'
        });

        if (!wishlists) {
            return res.status(404).json({ success: false, message: "No wishlists found" });
        }
        console.log(wishlists)
        // Sort and paginate products
        const sortedProducts = wishlists.products
            .sort((a, b) => new Date(b.addedOn) - new Date(a.addedOn))
            .slice(skip, skip + limit); 

        res.status(200).json({
            success: true,
            wishlists: sortedProducts,
            totalProducts: wishlists.products.length,
        });
    } catch (error) {
        console.error("Error getting wishlists:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



check_if_in_wishlist = async (req, res) => {
    try {
        const userId = req.body.userId;
        const productId = req.body.productId;
        
        const wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            return res.status(200).json({ success: true, message: "Wishlist not found", isInWishlist: false });
        }
    
        const productExists = wishlist.products.some(
            (product) => product.productId.toString() === productId
        );

        if (productExists) {
            return res.status(200).json({ success: true, message: "Product exists", isInWishlist: true });
        } else {
            return res.status(200).json({ success: true, message: "Product not in wishlist", isInWishlist: false });
        }
    } catch (error) {
        console.error("Error checking wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


const remove_from_wishlist = async (req, res) => {
    console.log("entered remove_from_wishlist")
    try {
        const userId = req.body.userId;
        const productId = req.body.productId;
       
        const existingWishlist = await Wishlist.findOne({ userId});
        
        if(!existingWishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found" });
        }
        
        existingWishlist.products = existingWishlist.products.filter((product) => product.productId.toString()!== productId);
        await existingWishlist.save();
        
        res.status(200).json({ success: true, message: "Product removed from wishlist successfully" });
    } catch (error) {
        console.error("Error removing product from wishlist:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        
    }
}

const add_to_cart = async (req, res) => {
    try {
        const { userId, productId } = req.body;
        const existingProduct = await Product.findById(productId);
        
        if(!existingProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        const existingCart = await Cart.findOne({ userId });
        
        if(!existingCart) {
            const newCart = new Cart({
                userId,
                products: [productId],
            })
            await newCart.save();
        }
        else {
            existingCart.products.push(productId);
            await existingCart.save();
        }
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
        
    }
}



module.exports = {
    add_to_wishlist,
    get_wishlists,
    remove_from_wishlist,
    add_to_cart,
    check_if_in_wishlist
}
