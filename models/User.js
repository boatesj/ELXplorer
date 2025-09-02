const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // hidden by default
    country:  { type: String, required: true, trim: true },
    address:  { type: String, required: true, trim: true },
    age:      { type: Number, min: 0, max: 130 },

    // Keep flexible to avoid migrations; enforce allowed values in service code if needed.
    role:   { type: String, default: "user", trim: true },      // e.g., "user", "admin"
    status: { type: String, default: "pending", trim: true },   // e.g., "pending","active","suspended"

    // Future-proofing 
    isDeleted: { type: Boolean, default: false }, // soft delete
  },
  { timestamps: true }
);

// Index email for fast lookup (unique already adds an index).
UserSchema.index({ email: 1 });

// Hash password when it changes
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method for login checks
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", UserSchema);
