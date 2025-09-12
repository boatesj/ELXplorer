const jwt = require("jsonwebtoken");
const User = require("../models/User");

/** Helper to sign JWT */
function signToken(user) {
  const secret = process.env.JWT_SECRET || process.env.JWT_SEC;
  if (!secret) throw new Error("JWT secret not configured");
  return jwt.sign(
    { id: user._id, role: user.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES || "10d" }
  );
}

/** REGISTER */
const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, country, address, age } = req.body;

    if (!fullname || !email || !password || !country || !address) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const user = await User.create({
      fullname: fullname.trim(),
      email: normalizedEmail,
      password, // pre-save hook hashes
      country: country.trim(),
      address: address.trim(),
      age,
    });

    const { password: _pw, ...safe } = user.toObject();
    const accessToken = signToken(user);
    return res.status(201).json({ ...safe, accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

/** LOGIN */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials." });

    const accessToken = signToken(user);
    const { password: _pw, ...safe } = user.toObject();
    return res.status(200).json({ ...safe, accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { registerUser, loginUser };
