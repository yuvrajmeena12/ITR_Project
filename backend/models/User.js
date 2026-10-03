const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    emailVerified: { type: Boolean, default: false },

    avatar: {
      file: { type: String, default: null },
      mime: { type: String, default: null },
    },
    bio: { type: String, trim: true, maxlength: 160, default: '' },
    about: { type: String, trim: true, maxlength: 1500, default: '' },
    qualification: { type: String, trim: true, maxlength: 120, default: '' },
    hobbies: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
    awards: { type: [{ type: String, trim: true, maxlength: 80 }], default: [] },

    // Reputation. Derived exclusively from reviews tied to completed swaps.
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedSwaps: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },

    // Auth hardening
    tokenVersion: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ name: 1 });

userSchema.methods.toPrivate = function toPrivate() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    emailVerified: this.emailVerified,
    hasAvatar: Boolean(this.avatar && this.avatar.file),
    bio: this.bio,
    about: this.about,
    qualification: this.qualification,
    hobbies: this.hobbies,
    awards: this.awards,
    ratingAvg: this.ratingAvg,
    ratingCount: this.ratingCount,
    completedSwaps: this.completedSwaps,
    verified: this.verified,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
