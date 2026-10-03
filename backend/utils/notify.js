const Notification = require('../models/Notification');

/**
 * Creates a notification. If a dedupeKey is given, repeated events with the same key
 * are ignored (unique partial index), so retries never spam the recipient.
 * Failures never break the calling request.
 */
async function notify({ recipient, actor = null, type, message, link = '/', dedupeKey = null }) {
  try {
    if (!recipient || (actor && String(actor) === String(recipient))) return null;
    return await Notification.create({ recipient, actor, type, message, link, dedupeKey });
  } catch (err) {
    if (err && err.code === 11000) return null; // duplicate event
    console.error('notify failed:', err.message);
    return null;
  }
}

module.exports = notify;
