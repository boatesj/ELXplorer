const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

/**
 * Helper to sign JWT
 */
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,               // e.g. "supersecret"
    { expiresIn: process.env.JWT_EXPIRES || "10d" }
  );
}

/**
 * REGISTER
 * Expects: { fullname, email, password, country, address, age }
 * The User pre-save hook will hash the password with bcrypt.
 */
router.post("/register", async (req, res) => {
  try {
    const { fullname, email, password, country, address, age } = req.body;

    // Basic required checks (add Joi/Zod later)
    if (!fullname || !email || !password || !country || !address) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const user = await User.create({
      fullname,
      email,
      password,       // plain text here; bcrypt hook will hash
      country,
      address,
      age
    });

    // Hide sensitive fields
    const { password: _pw, ...safe } = user.toObject();

    // Optionally sign token on register
    const accessToken = signToken(user);

    return res.status(201).json({ ...safe, accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * LOGIN
 * Expects: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Need +password because it's select:false in the schema
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const accessToken = signToken(user);
    const { password: _pw, ...safe } = user.toObject();

    return res.status(200).json({ ...safe, accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
