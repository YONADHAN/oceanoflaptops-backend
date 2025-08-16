
const express = require("express");
const router = express.Router();
const {public_get_products_by_category} = require("../controllers/user/publicController");
const sampleController = require('../controllers/user/sampleController')

router.get("/public_get_products_by_category",public_get_products_by_category)
router.post("/get_available_filters",sampleController.filterOptions);
router.post('/filter_apply_and_get_data',sampleController.gettingData)

module.exports = router