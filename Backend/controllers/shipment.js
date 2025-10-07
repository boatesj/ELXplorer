const mongoose = require("mongoose");
const Shipment = require("../models/Shipment");

// CREATE A SHIPMENT
const createShipment = async (req, res) => {
  try {
    const newShipment = new Shipment(req.body);
    const saved = await newShipment.save();
    return res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create shipment", error: error.message });
  }
};

// GET ALL SHIPMENTS
const getAllShipments = async (req, res) => {
  try {
    const shipments = await Shipment.find().sort({ createdAt: -1 });
    return res.status(200).json(shipments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch shipments", error: error.message });
  }
};

// GET A SHIPMENT
const getOneShipment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" });

    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });

    return res.status(200).json(shipment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch shipment", error: error.message });
  }
};

// UPDATE A SHIPMENT
const updateShipment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" });

    const updated = await Shipment.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ message: "Shipment not found" });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update shipment", error: error.message });
  }
};

// GET USER'S SHIPMENTS
const getUserShipment = async (req, res) => {
  try {
    const email = (req.user?.email || req.query.email || req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const shipments = await Shipment.find({ "shipper.email": email }).sort({ createdAt: -1 });
    return res.status(200).json(shipments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch user shipments", error: error.message });
  }
};

// DELETE A SHIPMENT
const deleteShipment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid ID" });

    const deleted = await Shipment.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Shipment not found" });

    return res.status(200).json({ message: "Shipment has been successfully deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete shipment", error: error.message });
  }
};

// Admin: add tracking event
const addTrackingEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ ok: false, message: "Shipment not found" });

    const { code, description, at, location, meta } = req.body;
    shipment.addTrackingEvent({ code, description, at: at ? new Date(at) : new Date(), location, meta });
    await shipment.save();

    return res.status(200).json({ ok: true, data: shipment.tracking });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Failed to add tracking", error: error.message });
  }
};

// Admin: attach document
const addDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ ok: false, message: "Shipment not found" });

    const { type, url } = req.body;
    shipment.documents.push({
      type,
      url,
      uploadedAt: new Date(),
      uploadedBy: req.user?.id || undefined,
    });
    await shipment.save();

    return res.status(200).json({ ok: true, data: shipment.documents });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Failed to add document", error: error.message });
  }
};

// Admin: update status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const shipment = await Shipment.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!shipment) return res.status(404).json({ ok: false, message: "Shipment not found" });

    return res.status(200).json({ ok: true, data: shipment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: "Failed to update status", error: error.message });
  }
};

module.exports = {
  createShipment,
  getAllShipments,
  getOneShipment,
  updateShipment,
  getUserShipment,
  deleteShipment,
  addTrackingEvent,
  addDocument,
  updateStatus,
};
