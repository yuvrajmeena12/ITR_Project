const mongoose = require('mongoose');

// Stores hashed one-time codes. Documents expire automatically.
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  purpose: { type: String, enum: ['signup', 'login', 'reset'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  // Short-lived proof that a reset OTP was verified; allows setting a new password once
  resetGrantHash: { type: String, default: null },
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
