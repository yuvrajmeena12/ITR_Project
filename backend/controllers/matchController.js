const Skill = require('../models/Skill');
const User = require('../models/User');
const v = require('../validators');
const { ownerView } = require('./skillController');
const cache = require('../utils/cache');

/**
 * Smart Match is computed from real skill data:
 *  - reciprocal: they teach something I want AND want something I teach (best)
 *  - one-way:    they teach something I want, or want something I teach
 * Each result carries the exact skills that explain why it matched.
 */
async function computeMatches(userId, { limitCandidates = 300 } = {}) {
  const cacheKey = `matches:${String(userId)}`;
  return cache.remember(cacheKey, 30_000, async () => {
    const mine = await Skill.find({ owner: userId }).select('type nameLower name').lean();
    const iTeach = mine.filter((s) => s.type === 'teach');
    const iLearn = mine.filter((s) => s.type === 'learn');
    const teachNames = iTeach.map((s) => s.nameLower);
    const learnNames = iLearn.map((s) => s.nameLower);
    if (!teachNames.length && !learnNames.length) return { matches: [], hasSkills: false };

    const [theyTeach, theyLearn] = await Promise.all([
    learnNames.length
      ? Skill.find({ type: 'teach', nameLower: { $in: learnNames }, owner: { $ne: userId } })
          .select('owner name nameLower level category')
          .limit(limitCandidates)
          .lean()
      : [],
    teachNames.length
      ? Skill.find({ type: 'learn', nameLower: { $in: teachNames }, owner: { $ne: userId } })
          .select('owner name nameLower')
          .limit(limitCandidates)
          .lean()
      : [],
  ]);

  const byUser = new Map();
  const slot = (id) => {
    const k = String(id);
    if (!byUser.has(k)) byUser.set(k, { userId: id, theyTeachMe: [], iTeachThem: [] });
    return byUser.get(k);
  };
  theyTeach.forEach((s) => slot(s.owner).theyTeachMe.push(s));
  theyLearn.forEach((s) => slot(s.owner).iTeachThem.push(s));

  const ids = [...byUser.values()].map((m) => m.userId);
  const users = await User.find({ _id: { $in: ids }, emailVerified: true })
    .select('name verified ratingAvg ratingCount completedSwaps avatar.file bio')
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const matches = [...byUser.values()]
    .filter((m) => userById.has(String(m.userId)))
    .map((m) => {
      const u = userById.get(String(m.userId));
      const reciprocal = m.theyTeachMe.length > 0 && m.iTeachThem.length > 0;
      const score =
        (reciprocal ? 100 : 40) +
        Math.min(m.theyTeachMe.length, 3) * 8 +
        Math.min(m.iTeachThem.length, 3) * 8 +
        (u.verified ? 6 : 0) +
        Math.min(u.ratingAvg || 0, 5);
      return {
        user: { ...ownerView(u), bio: u.bio },
        type: reciprocal ? 'reciprocal' : m.theyTeachMe.length ? 'they_teach_you' : 'you_teach_them',
        score: Math.round(score),
        theyTeachYou: m.theyTeachMe.map((s) => ({ id: s._id, name: s.name, level: s.level, category: s.category })),
        youTeachThem: m.iTeachThem.map((s) => ({ id: s._id, name: s.name })),
      };
    })
    .sort((a, b) => b.score - a.score);

    return { matches, hasSkills: true, hasTeach: iTeach.length > 0, hasLearn: iLearn.length > 0 };
  });
}

async function list(req, res) {
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 9, maxLimit: 24 });
  const only = v.oneOf(req.query.type, ['reciprocal', 'one_way'], 'type', { required: false });
  const { matches, hasSkills, hasTeach, hasLearn } = await computeMatches(req.user._id);
  const filtered = only === 'reciprocal' ? matches.filter((m) => m.type === 'reciprocal') : only === 'one_way' ? matches.filter((m) => m.type !== 'reciprocal') : matches;
  res.json({
    items: filtered.slice(skip, skip + limit),
    page,
    limit,
    total: filtered.length,
    hasMore: skip + limit < filtered.length,
    hasSkills,
    hasTeach,
    hasLearn,
  });
}

module.exports = { list, computeMatches };
