const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const v = require('../validators');
const notify = require('../utils/notify');
const { badRequest, notFound } = require('../utils/errors');

const userBrief = (u) =>
  u && { id: u._id, name: u.name, verified: u.verified, hasAvatar: Boolean(u.avatar && u.avatar.file) };

// Latest message per conversation + unread count, in one aggregation (no N+1).
async function conversations(req, res) {
  const me = req.user._id;
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 20, maxLimit: 40 });

  const rows = await Message.aggregate([
    { $match: { $or: [{ sender: me }, { recipient: me }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$conversationKey',
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$recipient', me] }, { $eq: ['$readAt', null] }] }, 1, 0] } },
      },
    },
    { $sort: { 'last.createdAt': -1 } },
    { $skip: skip },
    { $limit: limit + 1 },
  ]);

  const hasMore = rows.length > limit;
  const page_ = rows.slice(0, limit);
  const otherIds = page_.map((r) => (String(r.last.sender) === String(me) ? r.last.recipient : r.last.sender));
  const users = await User.find({ _id: { $in: otherIds } }).select('name verified avatar.file').lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  res.json({
    items: page_.map((r, i) => ({
      user: userBrief(byId.get(String(otherIds[i]))),
      lastMessage: {
        content: r.last.content.slice(0, 120),
        createdAt: r.last.createdAt,
        mine: String(r.last.sender) === String(me),
      },
      unread: r.unread,
    })),
    page,
    limit,
    hasMore,
  });
}

async function unreadCount(req, res) {
  const count = await Message.countDocuments({ recipient: req.user._id, readAt: null });
  res.json({ count });
}

async function thread(req, res) {
  const otherId = v.objectId(req.params.userId, 'userId');
  const other = await User.findOne({ _id: otherId, emailVerified: true }).select('name verified avatar.file');
  if (!other) throw notFound('User not found');
  const key = Message.keyFor(req.user._id, otherId);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 50);

  const filter = { conversationKey: key };
  if (req.query.before !== undefined) {
    const before = new Date(String(req.query.before));
    if (Number.isNaN(before.getTime())) throw badRequest('before is invalid');
    filter.createdAt = { $lt: before };
  }
  const rows = await Message.find(filter).sort({ createdAt: -1, _id: -1 }).limit(limit + 1).lean();
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).reverse();

  // mark received messages as read when the thread is opened (latest page only)
  if (req.query.before === undefined) {
    await Message.updateMany({ conversationKey: key, recipient: req.user._id, readAt: null }, { readAt: new Date() });
  }
  res.json({
    user: userBrief(other),
    items: items.map((m) => ({
      id: m._id,
      content: m.content,
      createdAt: m.createdAt,
      mine: String(m.sender) === String(req.user._id),
      read: Boolean(m.readAt),
    })),
    hasMore,
  });
}

async function send(req, res) {
  const recipientId = v.objectId(req.params.userId, 'userId');
  if (String(recipientId) === String(req.user._id)) throw badRequest('You cannot message yourself');
  const content = v.text(req.body.content, 'content', { required: true, max: 2000 });

  const recipient = await User.findOne({ _id: recipientId, emailVerified: true }).select('_id');
  if (!recipient) throw notFound('User not found');

  const msg = await Message.create({
    conversationKey: Message.keyFor(req.user._id, recipientId),
    sender: req.user._id,
    recipient: recipientId,
    content,
  });

  // One unread "new message" notification per sender until the recipient reads it
  await notify({
    recipient: recipientId,
    actor: req.user._id,
    type: 'message',
    message: `New message from ${req.user.name}`,
    link: `/messages/${req.user._id}`,
    dedupeKey: `message:${req.user._id}:${Math.floor(Date.now() / (10 * 60 * 1000))}`,
  });

  res.status(201).json({
    message: { id: msg._id, content: msg.content, createdAt: msg.createdAt, mine: true, read: false },
  });
}

module.exports = { conversations, unreadCount, thread, send };
