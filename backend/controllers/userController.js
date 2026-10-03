const fs = require('fs');
const User = require('../models/User');
const v = require('../validators');
const config = require('../config');
const { saveUpload, removeUpload, resolveUpload } = require('../utils/upload');
const { AVATAR_TYPES } = require('../utils/constants');
const { notFound } = require('../utils/errors');

function publicView(u, viewerId) {
  return {
    id: u._id,
    name: u.name,
    bio: u.bio,
    about: u.about,
    qualification: u.qualification,
    hobbies: u.hobbies,
    awards: u.awards,
    verified: u.verified,
    ratingAvg: u.ratingAvg,
    ratingCount: u.ratingCount,
    completedSwaps: u.completedSwaps,
    hasAvatar: Boolean(u.avatar && u.avatar.file),
    memberSince: u.createdAt,
    isMe: String(u._id) === String(viewerId),
  };
}

async function getProfile(req, res) {
  const id = v.objectId(req.params.id);
  const user = await User.findOne({ _id: id, emailVerified: true }).lean();
  if (!user) throw notFound('User not found');
  const profile = publicView(user, req.user._id);
  if (profile.isMe) {
    profile.verification = {
      threshold: config.verification.threshold,
      minAverage: config.verification.minAverage,
      ratedInteractions: user.ratingCount,
    };
  }
  res.json({ profile });
}

async function updateMe(req, res) {
  const b = req.body || {};
  // Explicit whitelist: nothing else (rating, verified, email, role...) can be mass-assigned.
  const update = {};
  if (b.name !== undefined) update.name = v.text(b.name, 'name', { required: true, min: 2, max: 60 });
  if (b.phone !== undefined) update.phone = v.phone(b.phone);
  if (b.bio !== undefined) update.bio = v.text(b.bio, 'bio', { max: 160 });
  if (b.about !== undefined) update.about = v.text(b.about, 'about', { max: 1500 });
  if (b.qualification !== undefined) update.qualification = v.text(b.qualification, 'qualification', { max: 120 });
  if (b.hobbies !== undefined) update.hobbies = v.stringList(b.hobbies, 'hobbies', { maxItems: 10, maxLen: 40 });
  if (b.awards !== undefined) update.awards = v.stringList(b.awards, 'awards', { maxItems: 10, maxLen: 80 });

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
  const cache = require('../utils/cache');
  cache.invalidate(`auth:user:${req.user._id}`);
  cache.invalidate(`dash:${req.user._id}`);
  res.json({ user: user.toPrivate() });
}

async function uploadAvatar(req, res) {
  const saved = await saveUpload(req.file, 'avatars', AVATAR_TYPES);
  const user = await User.findById(req.user._id);
  const old = user.avatar && user.avatar.file;
  user.avatar = { file: saved.file, mime: saved.mime };
  await user.save();
  if (old) await removeUpload('avatars', old);
  const cache = require('../utils/cache');
  cache.invalidate(`auth:user:${req.user._id}`);
  cache.invalidate(`dash:${req.user._id}`);
  cache.invalidate(`avatar:${req.user._id}`);
  res.json({ user: user.toPrivate() });
}

async function removeAvatar(req, res) {
  const user = await User.findById(req.user._id);
  const old = user.avatar && user.avatar.file;
  user.avatar = { file: null, mime: null };
  await user.save();
  if (old) await removeUpload('avatars', old);
  const cache = require('../utils/cache');
  cache.invalidate(`auth:user:${req.user._id}`);
  cache.invalidate(`dash:${req.user._id}`);
  cache.invalidate(`avatar:${req.user._id}`);
  res.json({ user: user.toPrivate() });
}

async function avatar(req, res) {
  const id = v.objectId(req.params.id);
  const user = await User.findById(id).select('avatar').lean();
  const file = user && user.avatar && user.avatar.file;
  const filePath = file && resolveUpload('avatars', file);
  if (!filePath || !fs.existsSync(filePath)) throw notFound('No avatar');
  res.set({
    'Content-Type': user.avatar.mime,
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  });
  fs.createReadStream(filePath).pipe(res);
}

module.exports = { getProfile, updateMe, uploadAvatar, removeAvatar, avatar, publicView };
