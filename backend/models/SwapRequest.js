const mongoose = require('mongoose');

const ACTIVE = ['pending', 'accepted', 'scheduled', 'in_progress'];

const swapSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The provider's teaching skill being requested
    requestedSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
    // Optional: one of the requester's teaching skills offered in exchange
    offeredSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },
    message: { type: String, trim: true, maxlength: 500, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // Participants who have confirmed the session took place
    completionConfirmedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    completedAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

swapSchema.index({ requester: 1, updatedAt: -1 });
swapSchema.index({ provider: 1, updatedAt: -1 });
// Only one open request per requester/skill pair
swapSchema.index(
  { requester: 1, requestedSkill: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE } } }
);

swapSchema.statics.ACTIVE = ACTIVE;

module.exports = mongoose.model('SwapRequest', swapSchema);
