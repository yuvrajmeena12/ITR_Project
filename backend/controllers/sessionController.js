const Session = require('../models/Session');
const SwapRequest = require('../models/SwapRequest');
const Skill = require('../models/Skill');
const v = require('../validators');
const notify = require('../utils/notify');
const { recomputeReputation } = require('../utils/reputation');
const { loadParticipantSwap } = require('./swapController');
const { badRequest, notFound, conflict, forbidden } = require('../utils/errors');

const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * 60 * 60 * 1000;

function parseSchedule(body) {
  const raw = body.scheduledAt;
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    throw badRequest('Choose a valid date and time', { scheduledAt: 'Choose a valid date and time' });
  }
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) {
    throw badRequest('Choose a valid date and time', { scheduledAt: 'Choose a valid date and time' });
  }
  const lead = when.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) {
    throw badRequest('Pick a time at least 5 minutes from now', { scheduledAt: 'Pick a time in the future' });
  }
  if (lead > MAX_LEAD_MS) {
    throw badRequest('Pick a time within the next year', { scheduledAt: 'Too far in the future' });
  }
  const durationMinutes = body.durationMinutes === undefined ? 60 : Number(body.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 480) {
    throw badRequest('Duration must be 15-480 minutes', { durationMinutes: 'Duration must be 15-480 minutes' });
  }
  const details = v.text(body.details, 'details', { max: 500 });
  const meetingLink = v.text(body.meetingLink, 'meetingLink', {
    max: 300,
    pattern: /^https:\/\/[^\s]+$/i,
    patternMessage: 'Meeting link must start with https://',
  });
  return { scheduledAt: when, durationMinutes, details, meetingLink };
}

const view = (s) => ({
  id: s._id,
  swapId: s.swap,
  scheduledAt: s.scheduledAt,
  durationMinutes: s.durationMinutes,
  details: s.details,
  meetingLink: s.meetingLink,
  status: s.status,
});

async function skillName(swap) {
  const s = await Skill.findById(swap.requestedSkill).select('name').lean();
  return s ? s.name : 'a skill';
}

async function create(req, res) {
  const swap = await loadParticipantSwap(req.body.swapId, req.user._id);
  if (!['accepted', 'scheduled'].includes(swap.status)) {
    throw conflict('Sessions can only be scheduled for accepted swaps');
  }
  const data = parseSchedule(req.body);

  // Rescheduling replaces the existing upcoming session
  await Session.updateMany({ swap: swap._id, status: 'scheduled' }, { status: 'cancelled' });
  const session = await Session.create({
    swap: swap._id,
    participants: [swap.requester, swap.provider],
    scheduledBy: req.user._id,
    ...data,
  });
  const updated = await SwapRequest.findOneAndUpdate(
    { _id: swap._id, status: { $in: ['accepted', 'scheduled'] } },
    { status: 'scheduled', completionConfirmedBy: [] },
    { new: true }
  );
  if (!updated) {
    await session.deleteOne();
    throw conflict('This swap can no longer be scheduled');
  }

  const other = String(swap.requester) === String(req.user._id) ? swap.provider : swap.requester;
  await notify({
    recipient: other,
    actor: req.user._id,
    type: 'session_scheduled',
    message: `${req.user.name} scheduled a session for ${await skillName(swap)}`,
    link: '/swaps?tab=active',
    dedupeKey: `session_scheduled:${session._id}`,
  });
  res.status(201).json({ session: view(session) });
}

async function list(req, res) {
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 10, maxLimit: 30 });
  const scope = v.oneOf(req.query.scope, ['upcoming', 'completed', 'cancelled'], 'scope', { required: false }) || 'upcoming';
  const filter = { participants: req.user._id };
  let sort = { scheduledAt: 1 };
  if (scope === 'upcoming') filter.status = 'scheduled';
  else if (scope === 'completed') {
    filter.status = 'completed';
    sort = { scheduledAt: -1 };
  } else {
    filter.status = 'cancelled';
    sort = { scheduledAt: -1 };
  }
  const [rows, total] = await Promise.all([
    Session.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'swap',
        select: 'requestedSkill requester provider',
        populate: [
          { path: 'requestedSkill', select: 'name' },
          { path: 'requester', select: 'name' },
          { path: 'provider', select: 'name' },
        ],
      })
      .lean(),
    Session.countDocuments(filter),
  ]);
  res.json({
    items: rows.map((s) => ({
      ...view({ ...s, swap: s.swap && s.swap._id }),
      skill: s.swap && s.swap.requestedSkill ? s.swap.requestedSkill.name : null,
      with:
        s.swap && s.swap.requester
          ? String(s.swap.requester._id) === String(req.user._id)
            ? s.swap.provider.name
            : s.swap.requester.name
          : null,
    })),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  });
}

async function cancel(req, res) {
  const session = await Session.findById(v.objectId(req.params.id));
  if (!session || !session.participants.map(String).includes(String(req.user._id))) throw notFound('Session not found');
  if (session.status !== 'scheduled') throw conflict('Only upcoming sessions can be cancelled');

  const flipped = await Session.findOneAndUpdate({ _id: session._id, status: 'scheduled' }, { status: 'cancelled' });
  if (!flipped) throw conflict('Only upcoming sessions can be cancelled');
  const swap = await SwapRequest.findOneAndUpdate(
    { _id: session.swap, status: { $in: ['scheduled', 'in_progress'] } },
    { status: 'accepted', completionConfirmedBy: [] },
    { new: true }
  );
  if (swap) {
    const other = session.participants.find((p) => String(p) !== String(req.user._id));
    await notify({
      recipient: other,
      actor: req.user._id,
      type: 'session_cancelled',
      message: `${req.user.name} cancelled the session for ${await skillName(swap)}`,
      link: '/swaps?tab=active',
      dedupeKey: `session_cancelled:${session._id}`,
    });
  }
  res.json({ message: 'Session cancelled' });
}

// Both participants must confirm the session took place before it counts as completed.
async function complete(req, res) {
  const session = await Session.findById(v.objectId(req.params.id));
  if (!session || !session.participants.map(String).includes(String(req.user._id))) throw notFound('Session not found');
  if (session.status !== 'scheduled') throw conflict('This session is not awaiting completion');
  if (session.scheduledAt.getTime() > Date.now()) {
    throw forbidden('You can mark a session complete once its start time has passed');
  }

  // $addToSet makes confirmation idempotent
  const swap = await SwapRequest.findOneAndUpdate(
    { _id: session.swap, status: { $in: ['scheduled', 'in_progress'] } },
    { $addToSet: { completionConfirmedBy: req.user._id } },
    { new: true }
  );
  if (!swap) throw conflict('This swap is not awaiting completion');

  const other = session.participants.find((p) => String(p) !== String(req.user._id));
  const confirmedBoth = [String(swap.requester), String(swap.provider)].every((id) =>
    swap.completionConfirmedBy.map(String).includes(id)
  );

  if (!confirmedBoth) {
    await SwapRequest.updateOne({ _id: swap._id, status: 'scheduled' }, { status: 'in_progress' });
    await notify({
      recipient: other,
      actor: req.user._id,
      type: 'swap_completed',
      message: `${req.user.name} marked the session done. Confirm to finish the swap.`,
      link: '/swaps?tab=active',
      dedupeKey: `confirm_request:${session._id}:${req.user._id}`,
    });
    return res.json({ swapStatus: 'in_progress', awaitingOther: true });
  }

  const done = await SwapRequest.findOneAndUpdate(
    { _id: swap._id, status: { $in: ['scheduled', 'in_progress'] } },
    { status: 'completed', completedAt: new Date() },
    { new: true }
  );
  if (done) {
    await Session.updateOne({ _id: session._id }, { status: 'completed', completedAt: new Date() });
    await Promise.all([recomputeReputation(swap.requester), recomputeReputation(swap.provider)]);
    const name = await skillName(swap);
    await Promise.all(
      [swap.requester, swap.provider].map((recipient) =>
        notify({
          recipient,
          type: 'swap_completed',
          message: `Swap completed: ${name}. Leave a review to build trust.`,
          link: '/swaps?tab=completed',
          dedupeKey: `swap_done:${swap._id}`,
        })
      )
    );
  }
  res.json({ swapStatus: 'completed', awaitingOther: false });
}

module.exports = { create, list, cancel, complete };
