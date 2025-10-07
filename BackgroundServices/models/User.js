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

    role:   { type: String, default: "user", trim: true },      // "user", "admin"
    status: { type: String, default: "pending", trim: true },   // "pending","active","suspended"

    isDeleted: { type: Boolean, default: false }, // soft delete
    welcomeMailSent: { type: Boolean, default: false }
  },
  { timestamps: true }
);

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
