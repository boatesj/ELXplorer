const mongoose = require("mongoose");

// ------------------ SUBSCHEMAS ------------------

// Tracking history (status progression)
const TrackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true, trim: true }, // e.g., "Booked", "At Port", "Loaded", etc.
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
    eventAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Uploaded documents (BOL, ID, Invoice, etc.)
const DocumentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ------------------ MAIN SCHEMA ------------------

const ShipmentSchema = new mongoose.Schema(
  {
    // Owner / creator (registered user)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Unique business reference number
    referenceNo: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    // Shipper / Exporter
    shipper: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, required: true, trim: true },
    },

    // Consignee / Receiver
    consignee: {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },

    // Notify party
    notify: {
      name: { type: String, trim: true },
      address: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },

    // Transport mode
    mode: {
      type: String,
      enum: ["RoRo", "Container"],
      default: "RoRo",
    },

    // Cargo / Goods information
    cargo: {
      description: { type: String, trim: true },
      weight: { type: String, trim: true },
      vehicle: {
        make: { type: String, trim: true },
        model: { type: String, trim: true },
        year: { type: String, trim: true },
        vin: { type: String, trim: true },
      },
      container: {
        containerNo: { type: String, trim: true },
        size: { type: String, trim: true },
        sealNo: { type: String, trim: true },
      },
    },

    // Origin and Destination ports
    ports: {
      originPort: { type: String, required: true, trim: true },
      destinationPort: { type: String, required: true, trim: true },
    },

    // Vessel info (optional)
    vessel: {
      name: { type: String, trim: true },
      voyage: { type: String, trim: true },
    },

    // Shipping & arrival estimates
    shippingDate: { type: Date },
    eta: { type: Date },

    // Status progression
    status: {
      type: String,
      enum: [
        "pending",
        "booked",
        "at_origin_yard",
        "loaded",
        "sailed",
        "arrived",
        "cleared",
        "delivered",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // BackgroundService tracking
    notifications: {
      pending: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
    },

    trackingEvents: [TrackingEventSchema],
    documents: [DocumentSchema],

    // Logical deletion (for soft deletes)
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ------------------ INDEXES ------------------
ShipmentSchema.index({ "cargo.vehicle.vin": 1 }, { sparse: true });
ShipmentSchema.index({ "cargo.container.containerNo": 1 }, { sparse: true });
ShipmentSchema.index({ customer: 1, createdAt: -1 });
ShipmentSchema.index({
  status: 1,
  "ports.originPort": 1,
  "ports.destinationPort": 1,
});

// ------------------ PRE-SAVE LOGIC ------------------
ShipmentSchema.pre("save", function (next) {
  if (this.referenceNo && !this.referenceNo.startsWith("ELX-UK-")) {
    this.referenceNo = `ELX-UK-${this.referenceNo}`;
  }
  next();
});

module.exports = mongoose.model("Shipment", ShipmentSchema);
