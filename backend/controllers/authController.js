const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const v = require('../validators');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { issueOtp, consumeOtp, createResetGrant, consumeResetGrant } = require('../utils/otp');
const { ApiError, badRequest, conflict } = require('../utils/errors');

const COST = 12;
// Used to keep response time similar when the account does not exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 10);

const GENERIC_SENT = 'If that account exists, a code has been sent.';

function validateRegistration(body) {
  const fields = {};
  const out = {};
  const attempt = (key, fn) => {
    try {
      out[key] = fn();
    } catch (e) {
      if (e.fields) Object.assign(fields, e.fields);
      else fields[key] = e.message;
    }
  };
  attempt('name', () => v.text(body.name, 'name', { required: true, min: 2, max: 60 }));
  attempt('email', () => v.email(body.email));
  attempt('phone', () => v.phone(body.phone));
  attempt('password', () => v.password(body.password));
  if (!fields.password && body.password !== body.confirmPassword) fields.confirmPassword = 'Passwords do not match';
  if (Object.keys(fields).length) throw badRequest('Please fix the highlighted fields', fields);
  return out;
}

async function register(req, res) {
  const data = validateRegistration(req.body || {});
  const passwordHash = await bcrypt.hash(data.password, COST);

  const existing = await User.findOne({ email: data.email }).select('emailVerified');
  if (existing && existing.emailVerified) {
    throw conflict('An account with this email already exists. Try signing in instead.');
  }
  if (existing) {
    // Unverified registration: let the owner of the email restart it
    await User.updateOne({ _id: existing._id }, { name: data.name, phone: data.phone, passwordHash });
  } else {
    await User.create({ name: data.name, email: data.email, phone: data.phone, passwordHash });
  }
  const otp = await issueOtp(data.email, 'signup');
  res.status(201).json({
    email: data.email,
    verificationRequired: true,
    resendInSec: otp.retryAfterSec,
    ...(otp.code ? { devOtp: otp.code } : {}),
  });
}

async function verifySignupOtp(req, res) {
  const email = v.email(req.body && req.body.email);
  const code = v.otpCode(req.body && req.body.otp);
  await consumeOtp(email, 'signup', code);
  const user = await User.findOneAndUpdate({ email }, { emailVerified: true }, { new: true });
  if (!user) throw badRequest('That code is invalid or has expired');
  setAuthCookie(res, user);
  res.json({ user: user.toPrivate() });
}

// Resend for signup / login / reset. Always responds the same to avoid account enumeration.
async function resendOtp(req, res) {
  const email = v.email(req.body && req.body.email);
  const purpose = v.oneOf(req.body && req.body.purpose, ['signup', 'login', 'reset'], 'purpose');
  const user = await User.findOne({ email }).select('emailVerified');
  let retry = config.otp.resendCooldownSec;
  let devCode = undefined;
  if (user && ((purpose === 'signup' && !user.emailVerified) || (purpose !== 'signup' && user.emailVerified))) {
    const r = await issueOtp(email, purpose);
    retry = r.retryAfterSec;
    devCode = r.code;
  }
  res.json({ message: GENERIC_SENT, resendInSec: retry, ...(devCode ? { devOtp: devCode } : {}) });
}

async function login(req, res) {
  const email = v.email(req.body && req.body.email);
  const pw = req.body && req.body.password;
  if (typeof pw !== 'string' || !pw) throw badRequest('Password is required', { password: 'Password is required' });

  const user = await User.findOne({ email }).select('+passwordHash');
  if (user && user.lockUntil && user.lockUntil > new Date()) {
    const wait = Math.ceil((user.lockUntil - Date.now()) / 1000);
    throw new ApiError(429, `Too many failed attempts. Try again in ${wait}s.`, { code: 'LOCKED' });
  }

  const ok = await bcrypt.compare(pw.slice(0, 200), user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    if (user) {
      const failed = user.failedLogins + 1;
      const over = failed - config.login.freeAttempts;
      const update = { failedLogins: failed };
      if (over >= 0) {
        const sec = Math.min(config.login.maxLockSec, config.login.baseLockSec * 2 ** over);
        update.lockUntil = new Date(Date.now() + sec * 1000);
      }
      await User.updateOne({ _id: user._id }, update);
    }
    throw new ApiError(401, 'Incorrect email or password', { code: 'INVALID_CREDENTIALS' });
  }

  if (!user.emailVerified) {
    const otp = await issueOtp(email, 'signup');
    return res.status(403).json({
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email to continue. We sent you a code.',
        email,
        resendInSec: otp.retryAfterSec,
        ...(otp.code ? { devOtp: otp.code } : {}),
      },
    });
  }

  await User.updateOne({ _id: user._id }, { failedLogins: 0, lockUntil: null });
  setAuthCookie(res, user);
  res.json({ user: user.toPrivate() });
}

async function requestLoginOtp(req, res) {
  const email = v.email(req.body && req.body.email);
  const user = await User.findOne({ email }).select('emailVerified');
  let retry = config.otp.resendCooldownSec;
  let devCode = undefined;
  if (user && user.emailVerified) {
    const r = await issueOtp(email, 'login');
    retry = r.retryAfterSec;
    devCode = r.code;
  }
  res.json({ message: GENERIC_SENT, resendInSec: retry, ...(devCode ? { devOtp: devCode } : {}) });
}

async function verifyLoginOtp(req, res) {
  const email = v.email(req.body && req.body.email);
  const code = v.otpCode(req.body && req.body.otp);
  await consumeOtp(email, 'login', code);
  const user = await User.findOne({ email, emailVerified: true });
  if (!user) throw badRequest('That code is invalid or has expired', { otp: 'Invalid or expired code' });
  await User.updateOne({ _id: user._id }, { failedLogins: 0, lockUntil: null });
  setAuthCookie(res, user);
  res.json({ user: user.toPrivate() });
}

async function forgotPassword(req, res) {
  const email = v.email(req.body && req.body.email);
  const user = await User.findOne({ email }).select('emailVerified');
  let retry = config.otp.resendCooldownSec;
  let devCode = undefined;
  if (user && user.emailVerified) {
    const r = await issueOtp(email, 'reset');
    retry = r.retryAfterSec;
    devCode = r.code;
  }
  res.json({ message: GENERIC_SENT, resendInSec: retry, ...(devCode ? { devOtp: devCode } : {}) });
}

async function verifyResetOtp(req, res) {
  const email = v.email(req.body && req.body.email);
  const code = v.otpCode(req.body && req.body.otp);
  await consumeOtp(email, 'reset', code);
  const resetToken = await createResetGrant(email);
  res.json({ resetToken });
}

async function resetPassword(req, res) {
  const email = v.email(req.body && req.body.email);
  const pw = v.password(req.body && req.body.password);
  if (pw !== (req.body && req.body.confirmPassword)) {
    throw badRequest('Passwords do not match', { confirmPassword: 'Passwords do not match' });
  }
  await consumeResetGrant(email, req.body && req.body.resetToken);
  const passwordHash = await bcrypt.hash(pw, COST);
  const user = await User.findOneAndUpdate(
    { email, emailVerified: true },
    { passwordHash, failedLogins: 0, lockUntil: null, $inc: { tokenVersion: 1 } },
    { new: true }
  );
  if (!user) throw badRequest('Reset session expired. Start again.');
  clearAuthCookie(res);
  res.json({ message: 'Password updated. You can sign in now.' });
}

async function changePassword(req, res) {
  const current = req.body && req.body.currentPassword;
  const next = v.password(req.body && req.body.newPassword, 'newPassword');
  if (typeof current !== 'string' || !current) {
    throw badRequest('Current password is required', { currentPassword: 'Current password is required' });
  }
  if (next !== (req.body && req.body.confirmPassword)) {
    throw badRequest('Passwords do not match', { confirmPassword: 'Passwords do not match' });
  }
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(current.slice(0, 200), user.passwordHash))) {
    throw new ApiError(400, 'Current password is incorrect', {
      code: 'VALIDATION',
      fields: { currentPassword: 'Current password is incorrect' },
    });
  }
  user.passwordHash = await bcrypt.hash(next, COST);
  user.tokenVersion += 1; // signs out every other device
  await user.save();
  setAuthCookie(res, user);
  res.json({ message: 'Password changed' });
}

async function me(req, res) {
  const user = await User.findById(req.user._id);
  res.json({ user: user.toPrivate() });
}

function logout(req, res) {
  clearAuthCookie(res);
  res.json({ message: 'Signed out' });
}

module.exports = {
  register,
  verifySignupOtp,
  resendOtp,
  login,
  requestLoginOtp,
  verifyLoginOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  me,
  logout,
};
