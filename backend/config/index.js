const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set (32+ characters) in .env');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI must be set in .env');
  process.exit(1);
}

const threshold = Math.min(10, Math.max(5, int(process.env.VERIFIED_THRESHOLD, 5)));

module.exports = {
  isProd,
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresDays: int(process.env.JWT_EXPIRES_DAYS, 7),
  cookieName: 'skillswap_token',
  uploadDir: path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'),
  maxUploadBytes: int(process.env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
  verification: {
    threshold,
    minAverage: Number(process.env.VERIFIED_MIN_AVG || 3.5),
  },
  otp: {
    ttlMinutes: int(process.env.OTP_TTL_MINUTES, 10),
    maxAttempts: int(process.env.OTP_MAX_ATTEMPTS, 5),
    resendCooldownSec: int(process.env.OTP_RESEND_COOLDOWN_SEC, 60),
    devLog: !isProd && process.env.DEV_LOG_OTP === 'true',
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'SkillSwap <no-reply@skillswap.local>',
  },
  rate: {
    windowMs: int(process.env.RATE_WINDOW_MS, 15 * 60 * 1000),
    auth: int(process.env.RATE_AUTH_MAX, 20),
    otp: int(process.env.RATE_OTP_MAX, 8),
    publicApi: int(process.env.RATE_PUBLIC_MAX, 300),
    search: int(process.env.RATE_SEARCH_MAX, 120),
    user: int(process.env.RATE_USER_MAX, 600),
    message: int(process.env.RATE_MESSAGE_MAX, 60),
    messageWindowMs: int(process.env.RATE_MESSAGE_WINDOW_MS, 60 * 1000),
  },
  login: {
    freeAttempts: int(process.env.LOGIN_FREE_ATTEMPTS, 5),
    baseLockSec: int(process.env.LOGIN_BASE_LOCK_SEC, 30),
    maxLockSec: int(process.env.LOGIN_MAX_LOCK_SEC, 15 * 60),
  },
};
