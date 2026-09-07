
const express = require("express");
const router = express.Router();
const {public_get_products_by_category} = require("../controllers/user/publicController");
const filterController = require('../controllers/user/filterController')

router.get("/public_get_products_by_category",public_get_products_by_category)
router.post("/get_available_filters",filterController.filterOptions);
router.post('/filter_apply_and_get_data',filterController.gettingData)

module.exports = router