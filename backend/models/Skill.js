const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    nameLower: { type: String, required: true, index: true },
    category: { type: String, required: true, trim: true, maxlength: 40, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    type: { type: String, enum: ['teach', 'learn'], required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate',
    },
    proof: {
      file: { type: String, default: null },
      mime: { type: String, default: null },
      originalName: { type: String, default: null },
      size: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// A user cannot list the same skill twice under the same type
skillSchema.index({ owner: 1, nameLower: 1, type: 1 }, { unique: true });
// Explore: browse teaching skills newest first, optionally by category
skillSchema.index({ type: 1, createdAt: -1 });
skillSchema.index({ type: 1, category: 1, createdAt: -1 });
skillSchema.index({ type: 1, nameLower: 1 });

module.exports = mongoose.model('Skill', skillSchema);
