const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { registerUser, loginUser } = require("../controllers/auth");

const router = express.Router();

/** JWT auth middleware */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

  const secret = process.env.JWT_SECRET || process.env.JWT_SEC;
  if (!secret) {
    // Misconfiguration — better 500 than 401
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
router.post("/register", registerUser);

/** POST /auth/login */
router.post("/login", loginUser);

/** GET /auth/me (protected) */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -__v") // be explicit
      .lean();

    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    return res.json({ ok: true, data: user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
});

module.exports = router;
