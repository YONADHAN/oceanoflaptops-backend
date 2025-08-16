const Product = require('../../models/productSchema');

const filterOptions = async (req, res) => {
  try {
    const originalLink = [
      "brand",

      "processor.brand",
      "processor.model",
      "processor.generation",
      "ram.size",
      
      "storage.type",
      "storage.capacity",
      "graphics.model",

      "display.size",
      "display.resolution",
     
      "operatingSystem",
      "batteryLife",
      "weight", 

      "size",
      "color"
    ];

    const label = [
      "Brand",

      "Processor Brand",
      "Processor Model",
      "Processor Generation",
      "RAM Size",
      
      "Storage Type",
      "Storage Capacity",
      "Graphics Model",

      "Display Size",
      "Display Resolution",
     
      "Operating System",
      "Battery Life",
      "Weight",  

      "Size",
      "Color"
    ];


    const distinctValues = await Promise.all(
      originalLink.map(field => Product.distinct(field))
    );


    const grandMother = originalLink.map((field, index) => [
      label[index],
      field,
      distinctValues[index]
    ]);

   

    res.status(200).json({ success: true, message: "Filter is successfully fetched", fieldData: grandMother })
  } catch (error) {
    console.error(error);
  }
};





// const gettingData = async (req, res) => {
//   try {
//     const query = req.body.finalQuery;
//     const currentPage = req.body.currentPage;
//     const limit = req.body.limit || 9;
   
//     const selectedOrder = query.orderChange;
//     const selectedPriceRange = query.priceChange;
//     const selectedCategories = query.selectedCategories;
//     const selectedFields = Array.isArray(query.selectedFields) ? query.selectedFields : [];
//     const searchTerm = query.searchTerm;

//     const mongoQuery = { isBlocked: false };

//     if (selectedCategories.length > 0) {
//       mongoQuery["category"] = { $in: selectedCategories };
//     }
 
//     if (selectedPriceRange.length === 2) {
//       mongoQuery["salePrice"] = { $gte: selectedPriceRange[0], $lte: selectedPriceRange[1] };
//     }

//     const orConditions = selectedFields.map(([_, key, values]) => {
//       return { [key]: { $in: values } };
//     });

//     if (orConditions.length > 0) {
//       mongoQuery["$or"] = orConditions;
//     }

//     const sortOptions = {
//       "A to Z": { productName: 1 },
//       "Z to A": { productName: -1 },
//       "Price: Low to High": { regularPrice: 1 },
//       "Price: High to Low": { regularPrice: -1 },
//       "New Arrivals": { createdAt: -1 },
//     };

//     const sortQuery = sortOptions[selectedOrder] || { createdAt: -1 };

//     console.log("MongoQuery ->", JSON.stringify(mongoQuery, null, 2));
    
//     // Fetch products with optimizations
//     const products = await Product.find(mongoQuery).sort(sortQuery).lean();
  
//     console.log("Filtered Products Count:", products.length);
  
//     res.status(200).json({ success: true, products });

//   } catch (error) {
//     console.error("Error fetching data:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };
const gettingData = async (req, res) => {
  try {
    const { finalQuery, currentPage, limit = 9 } = req.body;
    const skip = (currentPage - 1) * limit;

    const {
      orderChange: selectedOrder,
      priceChange: selectedPriceRange,
      selectedCategories = [],
      selectedFields = [],
      searchTerm = ""
    } = finalQuery;

    console.log("------------------------------");

    // Base query
    const mongoQuery = { isBlocked: false };

    // Category filter
    if (selectedCategories.length > 0) {
      mongoQuery["category"] = { $in: selectedCategories };
    }

    // Price range filter
    if (selectedPriceRange.length === 2) {
      mongoQuery["salePrice"] = {
        $gte: selectedPriceRange[0],
        $lte: selectedPriceRange[1]
      };
    }

    // Selected fields filter (e.g., weight, color, etc.)
    let orConditions = selectedFields.map(([_, key, values]) => ({
      [key]: { $in: values }
    }));

    // Search filter - add to `$or` instead of overwriting it
    if (searchTerm) {
      orConditions.push(
        { productName: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } }
      );
    }

    // Apply `$or` only if conditions exist
    if (orConditions.length > 0) {
      mongoQuery["$or"] = orConditions;
    }

    // Sorting options (using `salePrice` for sorting consistency)
    const sortOptions = {
      "A to Z": { productName: 1 },
      "Z to A": { productName: -1 },
      "Price Low to High": { salePrice: 1 },
      "Price High to Low": { salePrice: -1 },
      "New Arrivals": { createdAt: -1 }
    };

    const sortQuery = sortOptions[selectedOrder] || { createdAt: -1 };

    console.log("Final MongoDB Query:", JSON.stringify(mongoQuery, null, 2));

    // Get total count for pagination
    const totalCount = await Product.countDocuments(mongoQuery);

    // Fetch paginated products
    const products = await Product.find(mongoQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      products,
      totalCount,
      currentPage,
      totalPages: Math.ceil(totalCount / limit)
    });
    console.log("The answer is ", totalCount)

  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};



module.exports = {
  filterOptions,
  gettingData
}
