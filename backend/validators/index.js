const mongoose = require('mongoose');
const { badRequest } = require('../utils/errors');

// Strings only: rejects objects/arrays so operators like {"$ne": null} never reach a query.
function text(value, field, { min = 0, max = 200, required = false, pattern, patternMessage } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field} is required`, { [field]: `${field} is required` });
    return '';
  }
  if (typeof value !== 'string') throw badRequest(`${field} is invalid`, { [field]: `${field} is invalid` });
  // strip control characters, collapse nothing else (React escapes output)
  const v = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (required && v.length === 0) throw badRequest(`${field} is required`, { [field]: `${field} is required` });
  if (v.length > 0 && v.length < min) {
    throw badRequest(`${field} must be at least ${min} characters`, { [field]: `At least ${min} characters` });
  }
  if (v.length > max) {
    throw badRequest(`${field} must be at most ${max} characters`, { [field]: `At most ${max} characters` });
  }
  if (pattern && v && !pattern.test(v)) {
    throw badRequest(patternMessage || `${field} is invalid`, { [field]: patternMessage || `${field} is invalid` });
  }
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function email(value, field = 'email') {
  const v = text(value, field, { required: true, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw badRequest('Enter a valid email address', { [field]: 'Enter a valid email address' });
  return v;
}

function phone(value, field = 'phone') {
  const raw = text(value, field, { required: true, max: 24 });
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(cleaned)) {
    throw badRequest('Enter a valid phone number', { [field]: 'Enter a valid phone number (7-15 digits)' });
  }
  return cleaned;
}

function password(value, field = 'password') {
  if (typeof value !== 'string' || value.length === 0) {
    throw badRequest('Password is required', { [field]: 'Password is required' });
  }
  const msg = 'Use 8-72 characters with at least one letter and one number';
  if (value.length < 8 || value.length > 72 || !/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    throw badRequest(msg, { [field]: msg });
  }
  return value;
}

function otpCode(value, field = 'otp') {
  if (typeof value !== 'string' || !/^[0-9]{6}$/.test(value.trim())) {
    throw badRequest('Enter the 6-digit code', { [field]: 'Enter the 6-digit code' });
  }
  return value.trim();
}

function objectId(value, field = 'id') {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value) || !/^[a-f0-9]{24}$/i.test(value)) {
    throw badRequest(`${field} is invalid`, { [field]: `${field} is invalid` });
  }
  return value;
}

function oneOf(value, allowed, field, { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw badRequest(`${field} is required`, { [field]: `${field} is required` });
    return undefined;
  }
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw badRequest(`${field} is invalid`, { [field]: `${field} must be one of: ${allowed.join(', ')}` });
  }
  return value;
}

function stringList(value, field, { maxItems = 10, maxLen = 60 } = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`${field} must be a list`, { [field]: `${field} must be a list` });
  if (value.length > maxItems) {
    throw badRequest(`${field} allows at most ${maxItems} items`, { [field]: `At most ${maxItems} items` });
  }
  const out = [];
  for (const item of value) {
    const v = text(item, field, { max: maxLen });
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out;
}

function pagination(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || page > 10000) throw badRequest('page is invalid', { page: 'Invalid page' });
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw badRequest('limit is invalid', { limit: `limit must be 1-${maxLimit}` });
  }
  return { page, limit, skip: (page - 1) * limit };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  text,
  email,
  phone,
  password,
  otpCode,
  objectId,
  oneOf,
  stringList,
  pagination,
  escapeRegex,
};
