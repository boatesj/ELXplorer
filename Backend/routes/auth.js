const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/auth");
const { validateLogin, validateRegister } = require("../utils/validators");
const { handleValidation } = require("../middleware/validate");

const router = express.Router();

/** JWT auth middleware */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

  const secret = process.env.JWT_SECRET || process.env.JWT_SEC;
  if (!secret) {
    return res.status(500).json({ ok: false, message: "JWT secret not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret); // { id, role, iat, exp }
    req.user = decoded;
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}

/** POST /auth/register */
router.post("/register", validateRegister, handleValidation, registerUser);

/** POST /auth/login */
router.post("/login", validateLogin, handleValidation, loginUser);

/** GET /auth/me (protected) */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -__v")
      .lean();
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
});

/** GET /auth/reset-password/:token (verify token) */
router.get("/reset-password/:token", requestPasswordReset);

/** POST /auth/reset-password/:token (set new password) */
router.post("/reset-password/:token", resetPassword);

module.exports = router;
