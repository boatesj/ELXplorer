const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

  const secret = process.env.JWT_SECRET || process.env.JWT_SEC;
  if (!secret) return res.status(500).json({ ok: false, message: "JWT secret not configured" });

  try {
    const payload = jwt.verify(token, secret); // { id, role, iat, exp }
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok: false, message: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "Forbidden: insufficient role" });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
