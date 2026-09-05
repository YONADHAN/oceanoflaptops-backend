const express = require("express");
const router = express.Router();
const {
  refreshAccessToken,
  googleAuth,
  RemoveRefreshToken,
  getMe,
} = require("../controllers/authController");
const { verifyUser, verifyAdmin } = require("../middlewares/auth");

// Routes
router.post("/refresh-token", refreshAccessToken);
router.post("/google", googleAuth);
router.delete("/refresh-token/:id", RemoveRefreshToken);


router.get("/user/me", verifyUser, getMe);
router.get("/admin/me", verifyAdmin, getMe);

module.exports = router;
