const Product = require('../models/Product');
const Category = require('../models/Category');

exports.filterProducts = async (req, res) => {
    try {
        // Destructure filter parameters from request query
        const {
            // Processor filters
            processorBrand,
            processorModel,
            processorGeneration,

            // RAM filters
            ramSize,
            ramType,

            // Storage filters
            storageType,
            storageCapacity,

            // Graphics filters
            graphicsModel,
            graphicsVram,

            // Display filters
            displaySize,
            displayResolution,
            displayRefreshRate,

            // Other specifications
            operatingSystem,
            brand,
            category,
            color,
            status,

            // Price filters
            minPrice,
            maxPrice,

            // Sorting and pagination
            sort = 'popularity',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        // Create a filter object
        const filter = {};

        // Processor filters
        if (processorBrand) filter['processor.brand'] = processorBrand;
        if (processorModel) filter['processor.model'] = processorModel;
        if (processorGeneration) filter['processor.generation'] = processorGeneration;

        // RAM filters
        if (ramSize) filter['ram.size'] = ramSize;
        if (ramType) filter['ram.type'] = ramType;

        // Storage filters
        if (storageType) filter['storage.type'] = storageType;
        if (storageCapacity) filter['storage.capacity'] = storageCapacity;

        // Graphics filters
        if (graphicsModel) filter['graphics.model'] = graphicsModel;
        if (graphicsVram) filter['graphics.vram'] = graphicsVram;

        // Display filters
        if (displaySize) filter['display.size'] = displaySize;
        if (displayResolution) filter['display.resolution'] = displayResolution;
        if (displayRefreshRate) filter['display.refreshRate'] = displayRefreshRate;

        // Other specification filters
        if (operatingSystem) filter.operatingSystem = operatingSystem;
        if (brand) filter.brand = brand;
        if (color) filter.color = color;
        if (status) filter.status = status;

        // Category filter (assuming category is passed as category ID)
        if (category) filter.category = category;

        // Price range filter
        if (minPrice || maxPrice) {
            filter.regularPrice = {};
            if (minPrice) filter.regularPrice.$gte = parseFloat(minPrice);
            if (maxPrice) filter.regularPrice.$lte = parseFloat(maxPrice);
        }

        // Sorting options
        const sortOptions = {};
        sortOptions[sort] = order === 'desc' ? -1 : 1;

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Find products with filters
        const products = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .populate('category'); // Populate category details if needed

        // Count total matching products for pagination
        const totalProducts = await Product.countDocuments(filter);

        res.json({
            products,
            totalProducts,
            totalPages: Math.ceil(totalProducts / limitNum),
            currentPage: pageNum
        });
    } catch (error) {
        console.error('Product filter error:', error);
        res.status(500).json({ 
            message: 'Error filtering products', 
            error: error.message 
        });
    }
};

// Additional helper method to get filter options
exports.getFilterOptions = async (req, res) => {
    try {
        const filterOptions = {
            processorBrands: await Product.distinct('processor.brand'),
            processorModels: await Product.distinct('processor.model'),
            processorGenerations: await Product.distinct('processor.generation'),
            
            ramSizes: await Product.distinct('ram.size'),
            ramTypes: await Product.distinct('ram.type'),
            
            storageTypes: await Product.distinct('storage.type'),
            storageCapacities: await Product.distinct('storage.capacity'),
            
            graphicsModels: await Product.distinct('graphics.model'),
            graphicsVrams: await Product.distinct('graphics.vram'),
            
            displaySizes: await Product.distinct('display.size'),
            displayResolutions: await Product.distinct('display.resolution'),
            displayRefreshRates: await Product.distinct('display.refreshRate'),
            
            operatingSystems: await Product.distinct('operatingSystem'),
            brands: await Product.distinct('brand'),
            colors: await Product.distinct('color'),
            statuses: await Product.distinct('status'),
            
            categories: await Category.find({ isListed: true, status: 'active' })
        };

        res.json(filterOptions);
    } catch (error) {
        console.error('Filter options error:', error);
        res.status(500).json({ 
            message: 'Error retrieving filter options', 
            error: error.message 
        });
    }
};