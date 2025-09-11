const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { registerUser, loginUser } = require("../controllers/auth");

const router = express.Router();

/**
 * Simple JWT auth middleware
 * Looks for Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || process.env.JWT_SEC // fallback if env name differs
    );
    req.user = decoded; // { id, role, iat, exp }
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 */
router.post("/register", registerUser);

/**
 * @route   POST /auth/login
 * @desc    Login and get JWT
 */
router.post("/login", loginUser);

/**
 * @route   GET /auth/me
 * @desc    Get current user (requires Bearer token)
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    delete user.password;
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
