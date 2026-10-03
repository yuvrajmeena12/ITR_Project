const Notification = require('../models/Notification');
const v = require('../validators');
const { notFound } = require('../utils/errors');

const view = (n) => ({
  id: n._id,
  type: n.type,
  message: n.message,
  link: n.link,
  read: Boolean(n.readAt),
  createdAt: n.createdAt,
});

async function list(req, res) {
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.readAt = null;
  const [rows, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  res.json({ items: rows.map(view), page, limit, total, hasMore: skip + rows.length < total });
}

async function unreadCount(req, res) {
  const count = await Notification.countDocuments({ recipient: req.user._id, readAt: null });
  res.json({ count });
}

async function markRead(req, res) {
  const id = v.objectId(req.params.id);
  const n = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!n) throw notFound('Notification not found');
  res.json({ notification: view(n) });
}

async function markAllRead(req, res) {
  const r = await Notification.updateMany({ recipient: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ updated: r.modifiedCount });
}

module.exports = { list, unreadCount, markRead, markAllRead };
