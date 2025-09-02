// models/shipment.js
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
    ownerType: { type: String, trim: true },     // "COC" (carrier owned) or "SOC" (shipper owned)
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
/** When a customer wants to BUY/own a container (SOC) and we then book that same box onto a vessel. */
const ContainerProcurementSchema = new mongoose.Schema(
  {
    required: { type: Boolean, default: false },     // if true, this shipment involves procurement
    status: {
      type: String,
      default: "not_required",                       // not_required -> sourcing -> reserved -> purchased -> released -> handed_over
      trim: true,
    },
    // what we’re sourcing
    requestedType: { type: String, trim: true },     // e.g., "20GP","40HC"
    grade: { type: String, trim: true },             // CW (cargo worthy), WWT, AS-IS, etc.
    // vendor + cost
    vendorName: { type: String, trim: true },
    vendorRef: { type: String, trim: true },
    procurementPrice: Money,                         // price we pay
    salePrice: Money,                                // price charged to customer
    // resulting asset
    containerNo: { type: String, trim: true, index: true }, // assigned once known
    conditionNotes: { type: String, trim: true },
    releaseLocation: { type: String, trim: true },   // depot location
    pickupBookedAt: { type: Date },                  // when pickup is scheduled
  },
  { _id: false }
);

/* ========== Main Schema ========== */
const ShipmentSchema = new mongoose.Schema(
  {
    // Human-friendly booking reference: ELX-YYYY-XXXX
    reference: { type: String, unique: true, index: true, trim: true },

    // Associations
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Front-door info
    bookingChannel: { type: String, enum: ["web", "admin", "agent"], default: "web" },

    // Mode (auto-aligned by validation guard)
    mode: { type: String, default: "RoRo", trim: true }, // "RoRo" | "Container" | "Air" (future)

    // Route / ports
    ports: {
      originPort: { type: String, required: true, trim: true },       // "Southampton" / "SOU"
      destinationPort: { type: String, required: true, trim: true },  // "Tema" / "TEM"
      originCountry: { type: String, trim: true },
      destinationCountry: { type: String, trim: true },
      inlandPickupRequired: { type: Boolean, default: false },
      pickupAddress: { type: String, trim: true },
      dropoffReference: { type: String, trim: true }, // gate ref, appointment no, etc.
    },

    // Carrier & voyage
    carrier: {
      line: { type: String, trim: true },     // "NMT", "Grimaldi", etc.
      vesselName: { type: String, trim: true },
      voyageNo: { type: String, trim: true },
      etd: { type: Date },                    // estimated departure
      eta: { type: Date },                    // estimated arrival
      atd: { type: Date },                    // actual departure
      ata: { type: Date },                    // actual arrival
    },

    // Status (string for flexibility; transitions enforced in service layer)
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

    /* -------- Container procurement (for-keep SOC) -------- */
    containerProcurement: ContainerProcurementSchema,

    // Commercials
    pricing: {
      base: Money,                           // base ocean/service
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
    shipper: PartySchema,       // delivering party
    consignee: PartySchema,     // receiver abroad
    notifyParty: PartySchema,   // optional

    // Docs & timeline
    documents: { type: [DocumentSchema], default: [] },
    tracking: { type: [TrackingEventSchema], default: [] },

    // Ops
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    meta: { type: Object },     // API payloads, debug, etc.
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
// Ensure exactly one cargo type and align mode accordingly.
// Keep logic flexible to avoid migrations later.
ShipmentSchema.pre("validate", function (next) {
  const present = [
    this.cargo?.vehicle ? "vehicle" : null,
    this.cargo?.container ? "container" : null,
    this.cargo?.lcl ? "lcl" : null,
  ].filter(Boolean);

  if (present.length !== 1) {
    return next(new Error("Exactly one cargo type must be provided (vehicle, container, or lcl)."));
  }

  // Keep mode consistent
  if (present[0] === "vehicle") this.mode = "RoRo";
  if (present[0] === "container" || present[0] === "lcl") this.mode = "Container";

  // If procurement is required, nudge ownerType to SOC on the booking
  if (this.containerProcurement?.required) {
    if (this.cargoType === "container") {
      this.cargo.container.ownerType = this.cargo.container.ownerType || "SOC";
    }
  }

  next();
});

// Simple reference generator (replace with counters collection if you want true sequences)
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
