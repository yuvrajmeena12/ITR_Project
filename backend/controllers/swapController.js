const SwapRequest = require('../models/SwapRequest');
const Skill = require('../models/Skill');
const Session = require('../models/Session');
const Review = require('../models/Review');
const User = require('../models/User');
const v = require('../validators');
const notify = require('../utils/notify');
const cache = require('../utils/cache');
const { badRequest, notFound, forbidden, conflict } = require('../utils/errors');

const USER_FIELDS = 'name verified ratingAvg ratingCount avatar.file';
const SKILL_FIELDS = 'name category level type';

const TABS = {
  pending: ['pending'],
  active: ['accepted', 'scheduled', 'in_progress'],
  completed: ['completed'],
  closed: ['rejected', 'cancelled'],
};

const userView = (u) =>
  u && {
    id: u._id,
    name: u.name,
    verified: u.verified,
    ratingAvg: u.ratingAvg,
    ratingCount: u.ratingCount,
    hasAvatar: Boolean(u.avatar && u.avatar.file),
  };

const skillBrief = (s) => s && { id: s._id, name: s.name, category: s.category, level: s.level };

const sessionView = (s) =>
  s && {
    id: s._id,
    scheduledAt: s.scheduledAt,
    durationMinutes: s.durationMinutes,
    details: s.details,
    meetingLink: s.meetingLink,
    status: s.status,
  };

function allowedActions(swap, meId) {
  const isProvider = String(swap.provider._id || swap.provider) === String(meId);
  const isRequester = !isProvider;
  const s = swap.status;
  const confirmed = (swap.completionConfirmedBy || []).map(String).includes(String(meId));
  return {
    accept: isProvider && s === 'pending',
    reject: isProvider && s === 'pending',
    cancel: (isRequester && s === 'pending') || ['accepted', 'scheduled'].includes(s),
    schedule: ['accepted', 'scheduled'].includes(s),
    complete: ['scheduled', 'in_progress'].includes(s) && !confirmed,
    review: s === 'completed',
  };
}

function swapView(swap, meId, session, myReview) {
  const isProvider = String(swap.provider._id) === String(meId);
  return {
    id: swap._id,
    status: swap.status,
    direction: isProvider ? 'received' : 'sent',
    message: swap.message,
    createdAt: swap.createdAt,
    updatedAt: swap.updatedAt,
    completedAt: swap.completedAt,
    requester: userView(swap.requester),
    provider: userView(swap.provider),
    other: userView(isProvider ? swap.requester : swap.provider),
    requestedSkill: skillBrief(swap.requestedSkill),
    offeredSkill: skillBrief(swap.offeredSkill),
    session: sessionView(session),
    awaitingOther:
      swap.status === 'in_progress' && (swap.completionConfirmedBy || []).map(String).includes(String(meId)),
    myReview: myReview ? { rating: myReview.rating, text: myReview.text } : null,
    actions: allowedActions(swap, meId),
  };
}

async function loadParticipantSwap(id, meId) {
  const swap = await SwapRequest.findById(v.objectId(id));
  if (!swap) throw notFound('Swap not found');
  if (![String(swap.requester), String(swap.provider)].includes(String(meId))) throw notFound('Swap not found');
  return swap;
}

async function create(req, res) {
  const skillId = v.objectId(req.body.skillId, 'skillId');
  const offeredId = req.body.offeredSkillId ? v.objectId(req.body.offeredSkillId, 'offeredSkillId') : null;
  const message = v.text(req.body.message, 'message', { max: 500 });

  const skill = await Skill.findById(skillId);
  if (!skill || skill.type !== 'teach') throw notFound('That skill is not available');
  if (String(skill.owner) === String(req.user._id)) throw badRequest('You cannot request a swap with yourself');

  const provider = await User.findOne({ _id: skill.owner, emailVerified: true }).select('_id');
  if (!provider) throw notFound('That skill is not available');

  if (offeredId) {
    const offered = await Skill.findOne({ _id: offeredId, owner: req.user._id, type: 'teach' }).select('_id');
    if (!offered) throw badRequest('Choose one of your own teaching skills to offer', { offeredSkillId: 'Invalid skill' });
  }

  if (await SwapRequest.exists({ requester: req.user._id, requestedSkill: skillId, status: { $in: SwapRequest.ACTIVE } })) {
    throw conflict('You already have an open request for this skill');
  }

  const swap = await SwapRequest.create({
    requester: req.user._id,
    provider: skill.owner,
    requestedSkill: skillId,
    offeredSkill: offeredId,
    message,
  });

  await notify({
    recipient: skill.owner,
    actor: req.user._id,
    type: 'swap_request',
    message: `${req.user.name} requested a swap for ${skill.name}`,
    link: '/swaps?tab=pending',
    dedupeKey: `swap_request:${swap._id}`,
  });
  cache.invalidate('dash:');
  res.status(201).json({ id: swap._id, status: swap.status });
}

async function list(req, res) {
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 10, maxLimit: 30 });
  const tab = v.oneOf(req.query.tab, [...Object.keys(TABS), 'all'], 'tab', { required: false }) || 'all';
  const direction = v.oneOf(req.query.direction, ['sent', 'received'], 'direction', { required: false });

  const me = req.user._id;
  const filter = {};
  if (direction === 'sent') filter.requester = me;
  else if (direction === 'received') filter.provider = me;
  else filter.$or = [{ requester: me }, { provider: me }];
  if (tab !== 'all') filter.status = { $in: TABS[tab] };

  const [swaps, total] = await Promise.all([
    SwapRequest.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('requester', USER_FIELDS)
      .populate('provider', USER_FIELDS)
      .populate('requestedSkill', SKILL_FIELDS)
      .populate('offeredSkill', SKILL_FIELDS)
      .lean(),
    SwapRequest.countDocuments(filter),
  ]);

  // batch related data (no per-swap queries)
  const ids = swaps.map((s) => s._id);
  const [sessions, reviews] = await Promise.all([
    Session.find({ swap: { $in: ids }, status: { $ne: 'cancelled' } }).sort({ scheduledAt: -1 }).lean(),
    Review.find({ swap: { $in: ids }, reviewer: me }).select('swap rating text').lean(),
  ]);
  const sessionBySwap = new Map();
  sessions.forEach((s) => {
    if (!sessionBySwap.has(String(s.swap))) sessionBySwap.set(String(s.swap), s);
  });
  const reviewBySwap = new Map(reviews.map((r) => [String(r.swap), r]));

  res.json({
    items: swaps.map((s) => swapView(s, me, sessionBySwap.get(String(s._id)), reviewBySwap.get(String(s._id)))),
    page,
    limit,
    total,
    hasMore: skip + swaps.length < total,
  });
}

async function counts(req, res) {
  const me = req.user._id;
  const rows = await SwapRequest.aggregate([
    { $match: { $or: [{ requester: me }, { provider: me }] } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const sum = (arr) => arr.reduce((n, k) => n + (by[k] || 0), 0);
  const out = Object.fromEntries(Object.entries(TABS).map(([k, statuses]) => [k, sum(statuses)]));
  out.all = Object.values(by).reduce((a, b) => a + b, 0);
  const incoming = await SwapRequest.countDocuments({ provider: me, status: 'pending' });
  res.json({ counts: out, incomingPending: incoming });
}

async function transition(req, res, { from, to, who, note }) {
  const swap = await loadParticipantSwap(req.params.id, req.user._id);
  const isProvider = String(swap.provider) === String(req.user._id);
  if (who === 'provider' && !isProvider) throw forbidden('Only the skill provider can do this');

  const updated = await SwapRequest.findOneAndUpdate(
    { _id: swap._id, status: { $in: from } },
    { status: to, respondedAt: new Date() },
    { new: true }
  );
  if (!updated) throw conflict('This swap can no longer be changed that way');

  const skill = await Skill.findById(swap.requestedSkill).select('name').lean();
  cache.invalidate('dash:');
  return { swap: updated, skillName: skill ? skill.name : 'a skill', isProvider, note };
}

async function accept(req, res) {
  const { swap, skillName } = await transition(req, res, { from: ['pending'], to: 'accepted', who: 'provider' });
  await notify({
    recipient: swap.requester,
    actor: req.user._id,
    type: 'swap_accepted',
    message: `${req.user.name} accepted your request for ${skillName}`,
    link: '/swaps?tab=active',
    dedupeKey: `swap_accepted:${swap._id}`,
  });
  res.json({ status: swap.status });
}

async function reject(req, res) {
  const { swap, skillName } = await transition(req, res, { from: ['pending'], to: 'rejected', who: 'provider' });
  await notify({
    recipient: swap.requester,
    actor: req.user._id,
    type: 'swap_rejected',
    message: `${req.user.name} declined your request for ${skillName}`,
    link: '/swaps?tab=closed',
    dedupeKey: `swap_rejected:${swap._id}`,
  });
  res.json({ status: swap.status });
}

async function cancel(req, res) {
  const existing = await loadParticipantSwap(req.params.id, req.user._id);
  const isRequester = String(existing.requester) === String(req.user._id);
  // The provider uses "decline" while pending; once accepted either side may cancel.
  if (existing.status === 'pending' && !isRequester) throw forbidden('Decline this request instead');

  const { swap, skillName } = await transition(req, res, { from: ['pending', 'accepted', 'scheduled'], to: 'cancelled' });
  await Session.updateMany({ swap: swap._id, status: 'scheduled' }, { status: 'cancelled' });
  const other = isRequester ? swap.provider : swap.requester;
  await notify({
    recipient: other,
    actor: req.user._id,
    type: 'swap_cancelled',
    message: `${req.user.name} cancelled the swap for ${skillName}`,
    link: '/swaps?tab=closed',
    dedupeKey: `swap_cancelled:${swap._id}`,
  });
  res.json({ status: swap.status });
}

module.exports = { create, list, counts, accept, reject, cancel, swapView, loadParticipantSwap, USER_FIELDS, SKILL_FIELDS };
