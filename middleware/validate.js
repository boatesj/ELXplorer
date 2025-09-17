const { validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(400).json({ ok: false, message: "Validation error", errors: result.array() });
}

module.exports = { handleValidation };
