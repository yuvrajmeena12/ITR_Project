const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    swap: { type: mongoose.Schema.Types.ObjectId, ref: 'SwapRequest', required: true, index: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Always stored in UTC; clients render in the viewer's local time zone
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, min: 15, max: 480, default: 60 },
    details: { type: String, trim: true, maxlength: 500, default: '' },
    meetingLink: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionSchema.index({ participants: 1, scheduledAt: 1 });
sessionSchema.index({ swap: 1, status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
