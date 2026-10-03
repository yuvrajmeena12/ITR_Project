const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { badRequest } = require('./errors');

// Detect the real file type from its leading bytes. Extensions and client MIME types are never trusted.
function sniff(buf) {
  if (buf.length >= 5 && buf.slice(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (
    buf.length >= 12 &&
    buf.slice(0, 4).toString('latin1') === 'RIFF' &&
    buf.slice(8, 12).toString('latin1') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}

const storage = multer.memoryStorage();

const uploader = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

function ensureDir(sub) {
  const dir = path.join(config.uploadDir, sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Validates an in-memory upload and writes it under a random server-generated name.
 * allowed: array of extensions e.g. ['pdf','png','jpg','webp']
 */
async function saveUpload(file, sub, allowed) {
  if (!file) throw badRequest('No file received', { file: 'Choose a file to upload' });
  const type = sniff(file.buffer);
  if (!type || !allowed.includes(type.ext)) {
    throw badRequest('Unsupported file type', { file: `Allowed types: ${allowed.join(', ').toUpperCase()}` });
  }
  const name = `${crypto.randomBytes(16).toString('hex')}.${type.ext}`;
  const dir = ensureDir(sub);
  await fs.promises.writeFile(path.join(dir, name), file.buffer, { mode: 0o640 });
  return { file: name, mime: type.mime, size: file.size };
}

function resolveUpload(sub, name) {
  // names are always 32 hex chars + known extension; reject anything else (path traversal)
  if (typeof name !== 'string' || !/^[a-f0-9]{32}\.(pdf|png|jpg|webp)$/.test(name)) return null;
  return path.join(config.uploadDir, sub, name);
}

async function removeUpload(sub, name) {
  const p = resolveUpload(sub, name);
  if (!p) return;
  try {
    await fs.promises.unlink(p);
  } catch (_) {
    /* already gone */
  }
}

function safeOriginalName(name) {
  const base = path.basename(String(name || 'proof')).replace(/[^\w.\- ]/g, '_');
  return base.slice(0, 80) || 'proof';
}

module.exports = { uploader, saveUpload, resolveUpload, removeUpload, safeOriginalName };
