const { rateLimit } = require('express-rate-limit');
const config = require('../config');

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' },
    });
  },
};

const make = (limit, windowMs = config.rate.windowMs, extra = {}) =>
  rateLimit({ ...base, limit, windowMs, ...extra });

const emailKey = (req) => {
  const e = req.body && typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `email:${e.slice(0, 254)}`;
};

module.exports = {
  // strict
  authLimiter: make(config.rate.auth),
  otpLimiter: make(config.rate.otp),
  // per-account (in addition to per-IP) for OTP and login endpoints
  otpAccountLimiter: make(config.rate.otp, config.rate.windowMs, { keyGenerator: emailKey, validate: { ip: false } }),
  loginAccountLimiter: make(config.rate.auth, config.rate.windowMs, { keyGenerator: emailKey, validate: { ip: false } }),
  // moderate
  publicLimiter: make(config.rate.publicApi),
  searchLimiter: make(config.rate.search),
  // authenticated operations
  userLimiter: make(config.rate.user),
  messageLimiter: make(config.rate.message, config.rate.messageWindowMs),
};
