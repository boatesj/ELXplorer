const mongoose = require("mongoose");

/* ========== Common Subdocs ========== */
const Money = {
  amount: { type: Number, default: 0 }, // minor units (e.g., pence) recommended
  currency: { type: String, default: "GBP", trim: true },
};

const SurchargeSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },       // e.g., "DOC", "FUEL", "PORT"
    description: { type: String, trim: true },
    value: Money,
  },
  { _id: false }
);

const TrackingEventSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true },       // e.g., "GATE_IN", "SAILED", "ARRIVED"
    description: { type: String, trim: true },
    at: { type: Date, default: Date.now },
    location: { type: String, trim: true },   // free text or UN/LOCODE
    meta: { type: Object },
  },
  { _id: false }
);

const DocumentSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true },       // e.g., "V5C", "ID", "BOL", "INVOICE"
    url: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false }
);

const PartySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

/* ========== Cargo Subdocs ========== */
// Vehicles (RoRo)
const VehicleSchema = new mongoose.Schema(
  {
    vin: { type: String, trim: true, index: true },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    bodyType: { type: String, trim: true },     // car, van, SUV, motorcycle, plant, etc.
    running: { type: Boolean, default: true },
    lengthM: { type: Number, min: 0 },
    widthM: { type: Number, min: 0 },
    heightM: { type: Number, min: 0 },
    weightKg: { type: Number, min: 0 },
    extras: { type: [String], default: [] },    // tow bar, roof rack, etc.
  },
  { _id: false }
);

// FCL containers (bookings)
const ContainerBookingSchema = new mongoose.Schema(
  {
    containerType: { type: String, trim: true }, // "20GP","40HC","20FR","40OT", etc.
    ownerType: { type: String, trim: true },     // "COC" or "SOC"
    containerNo: { type: String, trim: true, index: true }, // e.g., MSKU1234567
    sealNo: { type: String, trim: true },
    vgmKg: { type: Number, min: 0 },             // Verified Gross Mass
    stuffingLocation: { type: String, trim: true },
    unstuffLocation: { type: String, trim: true },
    incoterm: { type: String, trim: true },      // EXW/FOB/CIF...
    commodity: { type: String, trim: true },
    hsCode: { type: String, trim: true },
    dangerousGoods: { type: Boolean, default: false },
    unNumber: { type: String, trim: true },
    // Optional dims/payload if needed beyond type defaults
    lengthM: { type: Number, min: 0 },
    widthM: { type: Number, min: 0 },
    heightM: { type: Number, min: 0 },
    payloadKg: { type: Number, min: 0 },
  },
  { _id: false }
);

// LCL / Loose pieces
const LclPieceSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    hsCode: { type: String, trim: true },
    packageType: { type: String, trim: true },   // pallet, crate, box…
    packages: { type: Number, min: 1, default: 1 },
    lengthM: { type: Number, min: 0 },
    widthM: { type: Number, min: 0 },
    heightM: { type: Number, min: 0 },
    weightKg: { type: Number, min: 0 },
    valueMinor: { type: Number, min: 0 },        // insurance valuation
    marks: { type: String, trim: true },
    dangerousGoods: { type: Boolean, default: false },
    unNumber: { type: String, trim: true },
  },
  { _id: false }
);

const LclSchema = new mongoose.Schema(
  {
    incoterm: { type: String, trim: true },
    commodity: { type: String, trim: true },
    pieces: { type: [LclPieceSchema], default: [] },
  },
  { _id: false }
);

/* ========== Container Procurement (for-keep SOC) ========== */
const ContainerProcurementSchema = new mongoose.Schema(
  {
    required: { type: Boolean, default: false },
    status: {
      type: String,
      default: "not_required", // not_required -> sourcing -> reserved -> purchased -> released -> handed_over
      trim: true,
    },
    requestedType: { type: String, trim: true }, // e.g., "20GP","40HC"
    grade: { type: String, trim: true },         // CW, WWT, AS-IS
    vendorName: { type: String, trim: true },
    vendorRef: { type: String, trim: true },
    procurementPrice: Money,
    salePrice: Money,
    containerNo: { type: String, trim: true, index: true },
    conditionNotes: { type: String, trim: true },
    releaseLocation: { type: String, trim: true },
    pickupBookedAt: { type: Date },
  },
  { _id: false }
);

/* ========== Main Schema ========== */
const ShipmentSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true, index: true, trim: true },

    // Associations
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Front-door info
    bookingChannel: { type: String, enum: ["web", "admin", "agent"], default: "web" },

    // Mode
    mode: { type: String, default: "RoRo", trim: true }, // "RoRo" | "Container" | "Air" (future)

    // Route / ports
    ports: {
      originPort: { type: String, required: true, trim: true },
      destinationPort: { type: String, required: true, trim: true },
      originCountry: { type: String, trim: true },
      destinationCountry: { type: String, trim: true },
      inlandPickupRequired: { type: Boolean, default: false },
      pickupAddress: { type: String, trim: true },
      dropoffReference: { type: String, trim: true },
    },

    // Carrier & voyage
    carrier: {
      line: { type: String, trim: true },     // "NMT", "Grimaldi", etc.
      vesselName: { type: String, trim: true },
      voyageNo: { type: String, trim: true },
      etd: { type: Date },
      eta: { type: Date },
      atd: { type: Date },
      ata: { type: Date },
    },

    // Status
    status: {
      type: String,
      default: "quote", // quote -> booked -> gate_in -> sailed -> arrived -> released -> delivered | cancelled | on_hold
      trim: true,
    },

    /* -------- Cargo (exactly one of) -------- */
    cargoType: { type: String, enum: ["vehicle", "container", "lcl"], required: true },
    cargo: {
      vehicle: VehicleSchema,                // RoRo
      container: ContainerBookingSchema,     // FCL
      lcl: LclSchema,                        // LCL
    },

    /* -------- Container procurement -------- */
    containerProcurement: ContainerProcurementSchema,

    // Commercials
    pricing: {
      base: Money,
      surcharges: { type: [SurchargeSchema], default: [] },
      insurance: Money,
      vat: Money,
      discount: Money,
      currency: { type: String, default: "GBP", trim: true },
    },

    // Payments (optional MVP)
    payments: [
      {
        provider: { type: String, trim: true },   // "Stripe", "Bank", "PayPal"
        amount: Money,
        status: { type: String, trim: true },     // authorized/captured/refunded
        reference: { type: String, trim: true },
        paidAt: { type: Date },
        meta: { type: Object },
      },
    ],

    // Parties
    shipper: PartySchema,
    consignee: PartySchema,
    notifyParty: PartySchema,

    // Docs & timeline
    documents: { type: [DocumentSchema], default: [] },
    tracking: { type: [TrackingEventSchema], default: [] },

    // Ops
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    meta: { type: Object },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

/* ========== Virtuals ========== */
// total = base + surcharges + insurance + vat - discount
ShipmentSchema.virtual("pricing.total").get(function () {
  const base = this.pricing?.base?.amount || 0;
  const insurance = this.pricing?.insurance?.amount || 0;
  const vat = this.pricing?.vat?.amount || 0;
  const discount = this.pricing?.discount?.amount || 0;
  const sur = (this.pricing?.surcharges || []).reduce((sum, s) => sum + (s.value?.amount || 0), 0);
  return base + sur + insurance + vat - discount;
});

/* ========== Indexes ========== */
ShipmentSchema.index({ customer: 1, createdAt: -1 });
ShipmentSchema.index({ status: 1, "ports.originPort": 1, "ports.destinationPort": 1 });
ShipmentSchema.index({ "cargo.vehicle.vin": 1 });
ShipmentSchema.index({ "cargo.container.containerNo": 1 });
ShipmentSchema.index({ "containerProcurement.containerNo": 1 });

/* ========== Guards & Helpers ========== */
ShipmentSchema.pre("validate", function (next) {
  const present = [
    this.cargo?.vehicle ? "vehicle" : null,
    this.cargo?.container ? "container" : null,
    this.cargo?.lcl ? "lcl" : null,
  ].filter(Boolean);

  if (present.length !== 1) {
    return next(new Error("Exactly one cargo type must be provided (vehicle, container, or lcl)."));
  }

  if (present[0] === "vehicle") this.mode = "RoRo";
  if (present[0] === "container" || present[0] === "lcl") this.mode = "Container";

  if (this.containerProcurement?.required) {
    if (this.cargoType === "container") {
      this.cargo.container.ownerType = this.cargo.container.ownerType || "SOC";
    }
  }

  next();
});

ShipmentSchema.pre("save", function (next) {
  if (this.reference) return next();
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  this.reference = `ELX-${year}-${rand}`;
  next();
});

// Convenience helpers
ShipmentSchema.methods.addSurcharge = function (code, description, amount, currency = "GBP") {
  this.pricing = this.pricing || {};
  this.pricing.surcharges = this.pricing.surcharges || [];
  this.pricing.surcharges.push({ code, description, value: { amount, currency } });
  return this;
};

ShipmentSchema.methods.addTrackingEvent = function ({ code, description, at = new Date(), location, meta }) {
  this.tracking = this.tracking || [];
  this.tracking.push({ code, description, at, location, meta });
  return this;
};

module.exports = mongoose.model("Shipment", ShipmentSchema);
