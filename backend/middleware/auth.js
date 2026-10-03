const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { unauthorized } = require('../utils/errors');
const cache = require('../utils/cache');

function signToken(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion }, config.jwtSecret, {
    expiresIn: `${config.jwtExpiresDays}d`,
    algorithm: 'HS256',
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: config.jwtExpiresDays * 24 * 60 * 60 * 1000,
  };
}

function setAuthCookie(res, user) {
  res.cookie(config.cookieName, signToken(user), cookieOptions());
}

function clearAuthCookie(res, userId) {
  if (userId) cache.invalidate(`auth:user:${userId}`);
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(config.cookieName, opts);
}

function invalidateAuthUser(userId) {
  if (userId) cache.invalidate(`auth:user:${userId}`);
}

async function loadUserFromRequest(req) {
  const token = req.cookies && req.cookies[config.cookieName];
  if (!token || typeof token !== 'string') return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch (_) {
    return null;
  }
  const cacheKey = `auth:user:${payload.sub}:${payload.tv}`;
  const user = await cache.remember(cacheKey, 60_000, async () => {
    return User.findById(payload.sub).select('name email tokenVersion emailVerified ratingCount').lean();
  });
  if (!user || user.tokenVersion !== payload.tv || !user.emailVerified) {
    cache.invalidate(`auth:user:${payload.sub}`);
    return null;
  }
  return user;
}

// Requires a valid session. Ownership/permission checks happen in controllers.
async function protect(req, res, next) {
  const user = await loadUserFromRequest(req);
  if (!user) {
    clearAuthCookie(res);
    throw unauthorized();
  }
  req.user = user;
  next();
}

// Attaches req.user when signed in but does not require it.
async function optionalAuth(req, res, next) {
  req.user = await loadUserFromRequest(req);
  next();
}

module.exports = { protect, optionalAuth, setAuthCookie, clearAuthCookie, invalidateAuthUser, signToken };
