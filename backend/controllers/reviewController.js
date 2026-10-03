const Review = require('../models/Review');
const SwapRequest = require('../models/SwapRequest');
const v = require('../validators');
const notify = require('../utils/notify');
const { recomputeReputation } = require('../utils/reputation');
const { badRequest, notFound, conflict, forbidden } = require('../utils/errors');

async function create(req, res) {
  const swapId = v.objectId(req.body.swapId, 'swapId');
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw badRequest('Choose a rating from 1 to 5', { rating: 'Choose a rating from 1 to 5' });
  }
  const text = v.text(req.body.text, 'text', { max: 600 });

  const swap = await SwapRequest.findById(swapId);
  if (!swap) throw notFound('Swap not found');
  const me = String(req.user._id);
  const isRequester = String(swap.requester) === me;
  const isProvider = String(swap.provider) === me;
  if (!isRequester && !isProvider) throw notFound('Swap not found');
  // Only genuinely completed (both-confirmed) swaps are reviewable
  if (swap.status !== 'completed') throw forbidden('You can review a swap after it has been completed');

  const reviewee = isRequester ? swap.provider : swap.requester;
  let review;
  try {
    review = await Review.create({ swap: swap._id, reviewer: req.user._id, reviewee, rating, text });
  } catch (err) {
    if (err.code === 11000) throw conflict('You have already reviewed this swap');
    throw err;
  }

  await recomputeReputation(reviewee);
  await notify({
    recipient: reviewee,
    actor: req.user._id,
    type: 'review_received',
    message: `${req.user.name} rated you ${rating}/5`,
    link: '/profile',
    dedupeKey: `review:${review._id}`,
  });
  res.status(201).json({ review: { id: review._id, rating: review.rating, text: review.text } });
}

async function forUser(req, res) {
  const id = v.objectId(req.params.userId, 'userId');
  const { page, limit, skip } = v.pagination(req.query, { defaultLimit: 10, maxLimit: 30 });
  const [rows, total] = await Promise.all([
    Review.find({ reviewee: id })
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewer', 'name verified avatar.file')
      .lean(),
    Review.countDocuments({ reviewee: id }),
  ]);
  res.json({
    items: rows.map((r) => ({
      id: r._id,
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,
      reviewer: r.reviewer && {
        id: r.reviewer._id,
        name: r.reviewer.name,
        verified: r.reviewer.verified,
        hasAvatar: Boolean(r.reviewer.avatar && r.reviewer.avatar.file),
      },
    })),
    page,
    limit,
    total,
    hasMore: skip + rows.length < total,
  });
}

module.exports = { create, forUser };
