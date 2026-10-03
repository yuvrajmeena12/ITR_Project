const crypto = require('crypto');
const config = require('../config');
const Otp = require('../models/Otp');
const { sendOtpEmail } = require('./mailer');
const { ApiError, badRequest } = require('./errors');

const hmac = (value) => crypto.createHmac('sha256', config.jwtSecret).update(value).digest('hex');
const codeHash = (email, purpose, code) => hmac(`otp:${purpose}:${email}:${code}`);

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/**
 * Generates and emails a code. Returns { sent, retryAfterSec }.
 * Respects the resend cooldown; callers decide whether to reveal that to the client.
 */
async function issueOtp(email, purpose) {
  const existing = await Otp.findOne({ email, purpose });
  if (existing) {
    const elapsed = (Date.now() - existing.lastSentAt.getTime()) / 1000;
    if (elapsed < config.otp.resendCooldownSec) {
      return { sent: false, retryAfterSec: Math.ceil(config.otp.resendCooldownSec - elapsed) };
    }
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Otp.findOneAndUpdate(
    { email, purpose },
    {
      email,
      purpose,
      codeHash: codeHash(email, purpose, code),
      attempts: 0,
      lastSentAt: new Date(),
      expiresAt: new Date(Date.now() + config.otp.ttlMinutes * 60 * 1000),
      resetGrantHash: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await sendOtpEmail(email, code, purpose);
  return { sent: true, retryAfterSec: config.otp.resendCooldownSec, code: config.otp.devLog ? code : undefined };
}

/** Verifies and consumes a code (single use). Throws a safe ApiError on failure. */
async function consumeOtp(email, purpose, code) {
  const doc = await Otp.findOne({ email, purpose });
  const invalid = () => badRequest('That code is invalid or has expired', { otp: 'Invalid or expired code' });
  if (!doc || doc.expiresAt < new Date() || doc.codeHash === 'used') throw invalid();
  if (doc.attempts >= config.otp.maxAttempts) {
    throw new ApiError(429, 'Too many incorrect attempts. Request a new code.', { code: 'OTP_LOCKED' });
  }
  const ok = safeEqual(doc.codeHash, codeHash(email, purpose, code));
  if (!ok) {
    await Otp.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
    throw invalid();
  }
  // consume atomically so a code can never be reused
  const consumed = await Otp.findOneAndUpdate(
    { _id: doc._id, codeHash: doc.codeHash },
    { $set: { codeHash: 'used' } },
    { new: true }
  );
  if (!consumed) throw invalid();
  return consumed;
}

/** After a verified reset code: issue a one-time grant to set a new password. */
async function createResetGrant(email) {
  const token = crypto.randomBytes(32).toString('hex');
  await Otp.updateOne(
    { email, purpose: 'reset' },
    { $set: { resetGrantHash: hmac(`grant:${email}:${token}`), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } }
  );
  return token;
}

async function consumeResetGrant(email, token) {
  if (typeof token !== 'string' || token.length !== 64) throw badRequest('Reset session expired. Start again.');
  const doc = await Otp.findOneAndDelete({
    email,
    purpose: 'reset',
    resetGrantHash: hmac(`grant:${email}:${token}`),
    expiresAt: { $gt: new Date() },
  });
  if (!doc) throw badRequest('Reset session expired. Start again.');
}

module.exports = { issueOtp, consumeOtp, createResetGrant, consumeResetGrant };
