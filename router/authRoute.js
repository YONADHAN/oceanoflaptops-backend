const express = require("express");
const router = express.Router();
const {
  refreshAccessToken,
  googleAuth,
  RemoveRefreshToken,
} = require("../controllers/authController");


// Routes
router.post("/refresh-token", refreshAccessToken); 
router.post("/google", googleAuth);               
router.delete("/refresh-token/:id", RemoveRefreshToken);

module.exports = router;
