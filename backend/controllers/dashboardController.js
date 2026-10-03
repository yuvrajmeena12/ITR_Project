const User = require('../models/User');
const Skill = require('../models/Skill');
const SwapRequest = require('../models/SwapRequest');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const config = require('../config');
const { computeMatches } = require('./matchController');
const cache = require('../utils/cache');

async function summary(req, res) {
  const me = req.user._id;
  const cacheKey = `dash:${String(me)}`;
  const hit = cache.get(cacheKey);
  if (hit) return res.json(hit);

  const now = new Date();

  const [
    userData,
    teachCount,
    learnCount,
    incoming,
    outgoing,
    active,
    completed,
    completedSessions,
    upcoming,
    unreadMessages,
    unreadNotifications,
    recent,
    match,
    userSkills,
  ] = await Promise.all([
    User.findById(me).select('name email verified ratingAvg ratingCount completedSwaps avatar bio about').lean(),
    Skill.countDocuments({ owner: me, type: 'teach' }),
    Skill.countDocuments({ owner: me, type: 'learn' }),
    SwapRequest.countDocuments({ provider: me, status: 'pending' }),
    SwapRequest.countDocuments({ requester: me, status: 'pending' }),
    SwapRequest.countDocuments({
      $or: [{ requester: me }, { provider: me }],
      status: { $in: ['accepted', 'scheduled', 'in_progress'] },
    }),
    SwapRequest.countDocuments({ $or: [{ requester: me }, { provider: me }], status: 'completed' }),
    Session.find({ participants: me, status: 'completed' }).select('durationMinutes').lean(),
    Session.find({ participants: me, status: 'scheduled', scheduledAt: { $gte: now } })
      .sort({ scheduledAt: 1 })
      .limit(4)
      .populate({
        path: 'swap',
        select: 'requestedSkill requester provider',
        populate: [
          { path: 'requestedSkill', select: 'name' },
          { path: 'requester', select: 'name avatar' },
          { path: 'provider', select: 'name avatar' },
        ],
      })
      .lean(),
    Message.countDocuments({ recipient: me, readAt: null }),
    Notification.countDocuments({ recipient: me, readAt: null }),
    Notification.find({ recipient: me }).sort({ createdAt: -1 }).limit(6).lean(),
    computeMatches(me),
    Skill.find({ owner: me }).select('name type level category proof').sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  const totalMinutes = completedSessions.reduce((acc, s) => acc + (s.durationMinutes || 60), 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const userObj = userData || req.user;

  // Profile readiness checklist & percentage
  const checklist = [
    { id: 'email', label: 'Email Verified', done: true, to: null },
    { id: 'bio', label: 'Add Profile Bio', done: Boolean(userObj.bio && userObj.bio.trim().length > 0), to: '/profile' },
    { id: 'avatar', label: 'Upload Avatar', done: Boolean(userObj.avatar && userObj.avatar.file), to: '/profile' },
    { id: 'teach', label: 'List a Skill to Teach', done: teachCount > 0, to: '/skills' },
    { id: 'learn', label: 'List a Skill to Learn', done: learnCount > 0, to: '/skills?tab=learn' },
  ];
  const completedChecklistCount = checklist.filter((c) => c.done).length;
  const profileProgressPct = Math.round((completedChecklistCount / checklist.length) * 100);

  const payload = {
    stats: {
      teachCount,
      learnCount,
      incomingRequests: incoming,
      outgoingRequests: outgoing,
      totalPendingRequests: incoming + outgoing,
      activeSwaps: active,
      completedSwaps: completed,
      totalSwaps: incoming + outgoing + active + completed,
      unreadMessages,
      unreadNotifications,
      totalMinutesExchanged: totalMinutes,
      totalHoursExchanged: totalHours,
      ratingAvg: userObj.ratingAvg || 0,
      ratingCount: userObj.ratingCount || 0,
    },
    userProfile: {
      name: userObj.name,
      verified: Boolean(userObj.verified),
      ratingAvg: userObj.ratingAvg || 0,
      ratingCount: userObj.ratingCount || 0,
      completedSwaps: userObj.completedSwaps || completed,
      hasBio: Boolean(userObj.bio),
      hasAvatar: Boolean(userObj.avatar && userObj.avatar.file),
    },
    profileProgress: {
      percentage: profileProgressPct,
      completedCount: completedChecklistCount,
      totalMilestones: checklist.length,
      checklist,
    },
    mySkills: userSkills.map((s) => ({
      id: s._id,
      name: s.name,
      type: s.type,
      level: s.level,
      category: s.category,
      hasProof: Boolean(s.proof && s.proof.file),
    })),
    verification: {
      threshold: config.verification.threshold,
      rated: userObj.ratingCount || req.user.ratingCount || 0,
      isVerified: Boolean(userObj.verified),
    },
    upcoming: upcoming.map((s) => ({
      id: s._id,
      scheduledAt: s.scheduledAt,
      durationMinutes: s.durationMinutes,
      meetingLink: s.meetingLink,
      skill: s.swap && s.swap.requestedSkill ? s.swap.requestedSkill.name : null,
      with:
        s.swap && s.swap.requester
          ? String(s.swap.requester._id) === String(me)
            ? { id: s.swap.provider._id, name: s.swap.provider.name }
            : { id: s.swap.requester._id, name: s.swap.requester.name }
          : null,
    })),
    recentActivity: recent.map((n) => ({
      id: n._id,
      type: n.type,
      message: n.message,
      link: n.link,
      read: Boolean(n.readAt),
      createdAt: n.createdAt,
    })),
    topMatches: match.matches.slice(0, 3),
  };

  cache.set(cacheKey, payload, 15_000);
  res.json(payload);
}

module.exports = { summary };
