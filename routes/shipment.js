const express = require("express");
const router = express.Router();

const {
  createShipment,
  getAllShipments,
  updateShipment,
  getOneShipment,
  getUserShipment,
  deleteShipment,
} = require("../controllers/shipments"); // note the 's'

// ADD SHIPMENT
router.post("/", createShipment);

// GET ALL SHIPMENTS
router.get("/", getAllShipments);

// UPDATE SHIPMENT
router.put("/:id", updateShipment);

// GET ONE SHIPMENT
router.get("/find/:id", getOneShipment);

// GET USER'S SHIPMENTS
router.post("/me", getUserShipment);

// DELETE SHIPMENT
router.delete("/:id", deleteShipment);

module.exports = router;
