const config = require('../config');
const { ApiError, badRequest, forbidden } = require('../utils/errors');

// Recursively rejects keys that could be interpreted as MongoDB operators or paths.
function hasUnsafeKeys(value, depth = 0) {
  if (depth > 6) return true;
  if (Array.isArray(value)) return value.some((v) => hasUnsafeKeys(v, depth + 1));
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') return true;
      if (hasUnsafeKeys(value[key], depth + 1)) return true;
    }
  }
  return false;
}

// NoSQL-injection guard for body and query. Rejects instead of silently rewriting input.
function rejectOperators(req, res, next) {
  if (hasUnsafeKeys(req.body) || hasUnsafeKeys(req.query)) {
    throw badRequest('Invalid request');
  }
  next();
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const normOrigin = origin.replace(/\/$/, '');
  const normClient = config.clientOrigin ? config.clientOrigin.replace(/\/$/, '') : '';
  if (normOrigin === normClient) return true;
  if (!config.isProd) {
    try {
      const parsed = new URL(origin);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

// CSRF defence in depth for cookie auth: state-changing requests must come from our own origin.
function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && !isAllowedOrigin(origin)) throw forbidden('Request origin not allowed');
  next();
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// Consistent error responses. Never leaks stack traces, paths, or database details.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code || 'ERROR', message: err.message, fields: err.fields || undefined },
    });
  }
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : 'Upload failed';
    return res.status(400).json({ error: { code: 'UPLOAD', message, fields: { file: message } } });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed request body' } });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request body is too large' } });
  }
  if (err && err.name === 'ValidationError') {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Some fields are invalid' } });
  }
  if (err && err.name === 'CastError') {
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid identifier' } });
  }
  if (err && err.code === 11000) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'That already exists' } });
  }

  console.error(`[error] ${req.method} ${req.originalUrl.split('?')[0]} -> ${err && err.stack ? err.stack : err}`);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' } });
}

module.exports = { rejectOperators, sameOrigin, isAllowedOrigin, notFoundHandler, errorHandler };
