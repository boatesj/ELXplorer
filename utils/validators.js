const { body, param } = require("express-validator");

const validateLogin = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").isString().isLength({ min: 6 }).withMessage("Password required"),
];

const validateRegister = [
  body("fullname").isString().trim().notEmpty(),
  body("email").isEmail(),
  body("password").isString().isLength({ min: 8 }),
  body("country").isString().trim().notEmpty(),
  body("address").isString().trim().notEmpty(),
  body("age").optional().isInt({ min: 0, max: 130 }),
];

const validateObjectIdParam = (name = "id") => [
  param(name).isMongoId().withMessage(`${name} must be a valid ObjectId`),
];

const validateTrackingEvent = [
  body("code").isString().trim().notEmpty(),
  body("description").optional().isString().trim(),
  body("at").optional().isISO8601(),
  body("location").optional().isString().trim(),
  body("meta").optional().isObject(),
];

const validateDocument = [
  body("type").isString().trim().notEmpty(),
  body("url").isURL().withMessage("url must be a valid URL"),
];

const validateShipmentCreate = [
  body("customer").isMongoId(),
  body("ports.originPort").isString().trim().notEmpty(),
  body("ports.destinationPort").isString().trim().notEmpty(),
  body("cargoType").isIn(["vehicle", "container", "lcl"]),
  // One cargo block must be present; the model enforces exactly one.
];

module.exports = {
  validateLogin,
  validateRegister,
  validateObjectIdParam,
  validateTrackingEvent,
  validateDocument,
  validateShipmentCreate,
};
