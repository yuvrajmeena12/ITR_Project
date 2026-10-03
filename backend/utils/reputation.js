const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const Review = require('../models/Review');
const SwapRequest = require('../models/SwapRequest');
const notify = require('./notify');

/**
 * Recomputes a user's reputation purely from reviews tied to completed swaps.
 * Verified Badge = enough completed-and-rated interactions with a healthy average.
 * Certificates and uploads never influence this.
 */
async function recomputeReputation(userId) {
  const id = new mongoose.Types.ObjectId(String(userId));
  const [agg] = await Review.aggregate([
    { $match: { reviewee: id } },
    { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
  ]);
  const ratingCount = agg ? agg.count : 0;
  const ratingAvg = agg ? Math.round(agg.avg * 100) / 100 : 0;
  const completedSwaps = await SwapRequest.countDocuments({
    status: 'completed',
    $or: [{ requester: id }, { provider: id }],
  });

  const verified =
    ratingCount >= config.verification.threshold && ratingAvg >= config.verification.minAverage;

  const before = await User.findById(id).select('verified');
  const update = { ratingCount, ratingAvg, completedSwaps, verified };
  if (verified && !(before && before.verified)) update.verifiedAt = new Date();
  await User.updateOne({ _id: id }, update);

  if (verified && before && !before.verified) {
    await notify({
      recipient: id,
      type: 'badge_earned',
      message: 'Congratulations! You earned the SkillSwap Verified badge.',
      link: '/profile',
      dedupeKey: 'badge_earned',
    });
  }
  return { ratingCount, ratingAvg, completedSwaps, verified };
}

module.exports = { recomputeReputation };
