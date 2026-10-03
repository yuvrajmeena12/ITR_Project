const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Deterministic key: smaller id + ':' + larger id
    conversationKey: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversationKey: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, readAt: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

messageSchema.statics.keyFor = (a, b) => [String(a), String(b)].sort().join(':');

module.exports = mongoose.model('Message', messageSchema);
