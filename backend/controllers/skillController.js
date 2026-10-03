const fs = require('fs');
const Skill = require('../models/Skill');
const SwapRequest = require('../models/SwapRequest');
const v = require('../validators');
const cache = require('../utils/cache');
const { CATEGORIES, LEVELS, MAX_SKILLS_PER_TYPE, PROOF_TYPES } = require('../utils/constants');
const { saveUpload, removeUpload, resolveUpload, safeOriginalName } = require('../utils/upload');
const { badRequest, notFound, forbidden, conflict } = require('../utils/errors');

const OWNER_FIELDS = 'name verified ratingAvg ratingCount avatar.file completedSwaps';

function ownerView(o) {
  if (!o) return null;
  return {
    id: o._id,
    name: o.name,
    verified: o.verified,
    ratingAvg: o.ratingAvg,
    ratingCount: o.ratingCount,
    completedSwaps: o.completedSwaps,
    hasAvatar: Boolean(o.avatar && o.avatar.file),
  };
}

function skillView(s, owner) {
  return {
    id: s._id,
    name: s.name,
    category: s.category,
    description: s.description,
    type: s.type,
    level: s.level,
    hasProof: Boolean(s.proof && s.proof.file),
    proofName: s.proof && s.proof.file ? s.proof.originalName : null,
    createdAt: s.createdAt,
    owner: owner !== undefined ? ownerView(owner) : undefined,
  };
}

function parseSkillBody(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.name !== undefined) out.name = v.text(body.name, 'name', { required: true, min: 2, max: 60 });
  if (!partial || body.category !== undefined) out.category = v.oneOf(body.category, CATEGORIES, 'category');
  if (!partial || body.description !== undefined) out.description = v.text(body.description, 'description', { max: 500 });
  if (!partial || body.level !== undefined) out.level = v.oneOf(body.level, LEVELS, 'level', { required: !partial });
  return out;
}

async function categories(req, res) {
  const counts = await cache.remember('skills:categories', 60_000, async () => {
    const rows = await Skill.aggregate([
      { $match: { type: 'teach' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  });
  res.json({
    categories: CATEGORIES.map((name) => ({ name, count: counts[name] || 0 })),
    levels: LEVELS,
  });
}

// Public landing-page data: aggregate counts and anonymous recent teaching skills (no personal data)
async function overview(req, res) {
  const data = await cache.remember('skills:overview', 60_000, async () => {
    const User = require('../models/User');
    const [members, skills, completedSwaps, recent] = await Promise.all([
      User.countDocuments({ emailVerified: true }),
      Skill.countDocuments({ type: 'teach' }),
      SwapRequest.countDocuments({ status: 'completed' }),
      Skill.find({ type: 'teach' }).sort({ createdAt: -1 }).limit(6).select('name category level').lean(),
    ]);
    return {
      members,
      skills,
      completedSwaps,
      recent: recent.map((s) => ({ name: s.name, category: s.category, level: s.level })),
    };
  });
  res.json(data);
}

async function explore(req, res) {
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 12, maxLimit: 30 });
  const type = v.oneOf(req.query.type, ['teach', 'learn'], 'type', { required: false }) || 'teach';
  const search = v.text(req.query.search, 'search', { max: 60 });
  const category = v.oneOf(req.query.category, CATEGORIES, 'category', { required: false });
  const level = v.oneOf(req.query.level, LEVELS, 'level', { required: false });
  const sort = v.oneOf(req.query.sort, ['newest', 'oldest', 'name'], 'sort', { required: false }) || 'newest';

  const cacheKey = `skills:explore:${String(req.user._id)}:${type}:${search}:${category || ''}:${level || ''}:${sort}:${page}:${limit}`;
  const hit = cache.get(cacheKey);
  if (hit) return res.json(hit);

  const filter = { type, owner: { $ne: req.user._id } };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (search) {
    const re = new RegExp(v.escapeRegex(search.toLowerCase()));
    filter.$or = [{ nameLower: { $regex: re } }, { description: { $regex: new RegExp(v.escapeRegex(search), 'i') } }];
  }
  const sortSpec = sort === 'name' ? { nameLower: 1, _id: 1 } : sort === 'oldest' ? { createdAt: 1, _id: 1 } : { createdAt: -1, _id: -1 };

  const [rows, total] = await Promise.all([
    Skill.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select('-nameLower -proof.file -proof.mime')
      .populate('owner', OWNER_FIELDS)
      .lean(),
    Skill.countDocuments(filter),
  ]);

  const result = {
    items: rows.map((s) => skillView(s, s.owner)),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  };
  cache.set(cacheKey, result, 20_000);
  res.json(result);
}

async function mine(req, res) {
  const rows = await Skill.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(MAX_SKILLS_PER_TYPE * 2).lean();
  const items = rows.map((s) => skillView(s));
  res.json({
    teach: items.filter((s) => s.type === 'teach'),
    learn: items.filter((s) => s.type === 'learn'),
  });
}

async function ofUser(req, res) {
  const id = v.objectId(req.params.userId, 'userId');
  const rows = await Skill.find({ owner: id }).sort({ createdAt: -1 }).limit(MAX_SKILLS_PER_TYPE * 2).lean();
  const items = rows.map((s) => skillView(s));
  res.json({ teach: items.filter((s) => s.type === 'teach'), learn: items.filter((s) => s.type === 'learn') });
}

async function getOne(req, res) {
  const id = v.objectId(req.params.id);
  const s = await Skill.findById(id).populate('owner', OWNER_FIELDS).lean();
  if (!s) throw notFound('Skill not found');
  res.json({ skill: skillView(s, s.owner) });
}

async function create(req, res) {
  const type = v.oneOf(req.body.type, ['teach', 'learn'], 'type');
  const data = parseSkillBody(req.body);
  if (req.file && type !== 'teach') {
    throw badRequest('Proof can only be attached to skills you teach', { file: 'Proof is only for teaching skills' });
  }
  const count = await Skill.countDocuments({ owner: req.user._id, type });
  if (count >= MAX_SKILLS_PER_TYPE) throw conflict(`You can list up to ${MAX_SKILLS_PER_TYPE} skills of each type`);

  const nameLower = data.name.toLowerCase();
  if (await Skill.exists({ owner: req.user._id, nameLower, type })) {
    throw conflict(`You already have "${data.name}" in your ${type === 'teach' ? 'teaching' : 'learning'} list`);
  }

  const doc = { owner: req.user._id, type, nameLower, ...data };
  if (req.file) {
    const saved = await saveUpload(req.file, 'proofs', PROOF_TYPES);
    doc.proof = { ...saved, originalName: safeOriginalName(req.file.originalname), uploadedAt: new Date() };
  }
  let skill;
  try {
    skill = await Skill.create(doc);
  } catch (err) {
    if (doc.proof) await removeUpload('proofs', doc.proof.file);
    throw err;
  }
  cache.invalidate('skills:');
  cache.invalidate('dash:');
  cache.invalidate('matches:');
  res.status(201).json({ skill: skillView(skill) });
}

async function update(req, res) {
  const id = v.objectId(req.params.id);
  const skill = await Skill.findById(id);
  if (!skill) throw notFound('Skill not found');
  if (String(skill.owner) !== String(req.user._id)) throw forbidden();

  const data = parseSkillBody(req.body, { partial: true });
  if (data.name && data.name.toLowerCase() !== skill.nameLower) {
    if (await Skill.exists({ owner: skill.owner, nameLower: data.name.toLowerCase(), type: skill.type, _id: { $ne: skill._id } })) {
      throw conflict(`You already have "${data.name}" in this list`);
    }
    skill.nameLower = data.name.toLowerCase();
  }
  Object.assign(skill, data);

  if (req.file && skill.type !== 'teach') {
    throw badRequest('Proof can only be attached to skills you teach', { file: 'Proof is only for teaching skills' });
  }
  const oldProof = skill.proof && skill.proof.file;
  if (req.file) {
    const saved = await saveUpload(req.file, 'proofs', PROOF_TYPES);
    skill.proof = { ...saved, originalName: safeOriginalName(req.file.originalname), uploadedAt: new Date() };
  } else if (req.body.removeProof === 'true') {
    skill.proof = { file: null, mime: null, originalName: null, size: 0, uploadedAt: null };
  }
  await skill.save();
  if (oldProof && oldProof !== (skill.proof && skill.proof.file)) await removeUpload('proofs', oldProof);
  cache.invalidate('skills:');
  cache.invalidate('dash:');
  cache.invalidate('matches:');
  res.json({ skill: skillView(skill) });
}

async function remove(req, res) {
  const id = v.objectId(req.params.id);
  const skill = await Skill.findById(id);
  if (!skill) throw notFound('Skill not found');
  if (String(skill.owner) !== String(req.user._id)) throw forbidden();

  const open = await SwapRequest.exists({
    status: { $in: SwapRequest.ACTIVE },
    $or: [{ requestedSkill: skill._id }, { offeredSkill: skill._id }],
  });
  if (open) throw conflict('This skill is part of an open swap. Finish or cancel the swap first.');

  await skill.deleteOne();
  if (skill.proof && skill.proof.file) await removeUpload('proofs', skill.proof.file);
  cache.invalidate('skills:');
  cache.invalidate('dash:');
  cache.invalidate('matches:');
  res.json({ message: 'Skill removed' });
}

// Proof documents are visible to signed-in users, as part of a teaching skill's public profile.
async function proof(req, res) {
  const id = v.objectId(req.params.id);
  const skill = await Skill.findById(id).select('type proof').lean();
  if (!skill || skill.type !== 'teach' || !skill.proof || !skill.proof.file) throw notFound('No proof available');
  const filePath = resolveUpload('proofs', skill.proof.file);
  if (!filePath || !fs.existsSync(filePath)) throw notFound('No proof available');
  res.set({
    'Content-Type': skill.proof.mime,
    'Content-Disposition': 'inline; filename="proof"',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, max-age=300',
  });
  fs.createReadStream(filePath).pipe(res);
}

module.exports = { overview, categories, explore, mine, ofUser, getOne, create, update, remove, proof, skillView, ownerView };
