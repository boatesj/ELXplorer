const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Helper to sign JWT
 */
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || process.env.JWT_SEC, // fallback if env name differs
    { expiresIn: process.env.JWT_EXPIRES || "10d" }
  );
}

/**
 * REGISTER
 */
const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, country, address, age } = req.body;

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
      password, // bcrypt pre-save hook will hash this
      country,
      address,
      age,
    });

    const { password: _pw, ...safe } = user.toObject();
    const accessToken = signToken(user);

    return res.status(201).json({ ...safe, accessToken });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

/**
 * LOGIN
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      "+password"
    );
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials." });

    const accessToken = signToken(user);
    const { password: _pw, ...safe } = user.toObject();

    return res.status(200).json({ ...safe, accessToken });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

module.exports = { registerUser, loginUser };
