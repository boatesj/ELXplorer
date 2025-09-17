// Backend/models/shipment.js
const mongoose = require("mongoose");

const TrackingEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true, trim: true }, // e.g., "Booked", "At Port", "Loaded", "Sailed", "Arrived"
    location: { type: String, trim: true },
    notes: { type: String, trim: true },
    eventAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true }, // e.g., "Invoice", "BL", "ID", "V5"
    url: { type: String, required: true, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ShipmentSchema = new mongoose.Schema(
  {
    // who owns/created this shipment
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    referenceNo: { type: String, trim: true }, // your internal reference
    origin: { type: String, trim: true },
    destination: { type: String, trim: true },

    mode: { type: String, enum: ["RoRo", "Container"], default: "RoRo" },

    cargo: {
      // Vehicle section (RoRo)
      vehicle: {
        vin: { type: String, trim: true },
        make: { type: String, trim: true },
        model: { type: String, trim: true },
        year: { type: Number },
        bookingNo: { type: String, trim: true },
      },
      // Container section (FCL/LCL)
      container: {
        containerNo: { type: String, trim: true },
        size: { type: String, trim: true }, // e.g., "20GP", "40HC"
        sealNo: { type: String, trim: true },
      },
    },

    // procurement path (in case you secure a container number before stuffing)
    containerProcurement: {
      containerNo: { type: String, trim: true },
      supplier: { type: String, trim: true },
    },

    // operational status
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

    eta: { type: Date }, // estimated time of arrival
    etd: { type: Date }, // estimated time of departure

    trackingEvents: [TrackingEventSchema],
    documents: [DocumentSchema],

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/**
 * Declare indexes ONCE here to avoid duplicates.
 * Remove any inline `{ index: true }` for these same paths elsewhere.
 * Use `sparse: true` so shipments without those fields don't get blocked.
 */
ShipmentSchema.index({ "cargo.vehicle.vin": 1 }, { sparse: true });
ShipmentSchema.index({ "cargo.container.containerNo": 1 }, { sparse: true });
ShipmentSchema.index({ "containerProcurement.containerNo": 1 }, { sparse: true });
ShipmentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Shipment", ShipmentSchema);
