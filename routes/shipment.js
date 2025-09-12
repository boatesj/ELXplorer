const express = require("express");
const router = express.Router();
const {
  createShipment,
  getAllShipments,
  updateShipment,
  getOneShipment,
  getUserShipment,
  deleteShipment,
  addTrackingEvent,
  addDocument,
  updateStatus,
} = require("../controllers/shipments");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/validate");
const {
  validateObjectIdParam,
  validateTrackingEvent,
  validateDocument,
  validateShipmentCreate,
} = require("../utils/validators");

// CREATE
router.post("/", requireAuth, validateShipmentCreate, handleValidation, createShipment);

// LIST
router.get("/", requireAuth, getAllShipments);

// READ
router.get("/:id", requireAuth, validateObjectIdParam("id"), handleValidation, getOneShipment);

// UPDATE
router.put("/:id", requireAuth, validateObjectIdParam("id"), handleValidation, updateShipment);

// USER'S SHIPMENTS
router.get("/me/list", requireAuth, getUserShipment);

// DELETE
router.delete("/:id", requireAuth, validateObjectIdParam("id"), handleValidation, deleteShipment);

// Admin-only ops
router.post(
  "/:id/tracking",
  requireAuth,
  requireRole("admin"),
  validateObjectIdParam("id"),
  validateTrackingEvent,
  handleValidation,
  addTrackingEvent
);

router.post(
  "/:id/documents",
  requireAuth,
  requireRole("admin"),
  validateObjectIdParam("id"),
  validateDocument,
  handleValidation,
  addDocument
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("admin"),
  validateObjectIdParam("id"),
  handleValidation,
  updateStatus
);

module.exports = router;
