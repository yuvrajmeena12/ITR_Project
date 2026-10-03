const mongoose = require('mongoose');

const TYPES = [
  'swap_request',
  'swap_accepted',
  'swap_rejected',
  'swap_cancelled',
  'message',
  'session_scheduled',
  'session_cancelled',
  'swap_completed',
  'review_received',
  'badge_earned',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: TYPES, required: true },
    message: { type: String, required: true, maxlength: 240 },
    link: { type: String, default: '/' },
    // Prevents duplicate notifications for the same event
    dedupeKey: { type: String, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });
notificationSchema.index(
  { recipient: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
// Keep notifications for 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

notificationSchema.statics.TYPES = TYPES;

module.exports = mongoose.model('Notification', notificationSchema);
