const r = require('express').Router();
const { z } = require('zod');
const { Review, Order, User } = require('../models');
const { requireAuth, wrap, validate } = require('../auth');

const createReviewSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  seller_rating: z.coerce.number().min(1).max(5),
  product_quality_rating: z.coerce.number().min(1).max(5).optional(),
  communication_rating: z.coerce.number().min(1).max(5).optional(),
  comment: z.string().optional(),
});

r.post('/', requireAuth, validate(createReviewSchema), wrap(async (req, res) => {
  const { order_id, seller_rating, product_quality_rating, communication_rating, comment } = req.body;
  const o = await Order.findOne({ _id: order_id, buyer_id: req.user.id, status: 'completed' }); // verified purchase only
  if (!o) throw new Error('Only completed purchases can be reviewed');

  const existing = await Review.findOne({ order_id, reviewer_id: req.user.id });
  if (existing) throw new Error('You have already submitted a review for this order');

  const rv = await Review.create({
    order_id,
    reviewer_id: req.user.id,
    reviewed_user_id: o.seller_id,
    product_id: o.product_id,
    seller_rating,
    product_quality_rating: product_quality_rating || seller_rating,
    communication_rating: communication_rating || seller_rating,
    comment,
  });

  const [agg] = await Review.aggregate([
    { $match: { reviewed_user_id: o.seller_id } },
    { $group: { _id: null, avg: { $avg: '$seller_rating' }, n: { $sum: 1 } } },
  ]);
  if (agg) {
    await User.findByIdAndUpdate(o.seller_id, {
      'rating.average': +agg.avg.toFixed(2),
      'rating.total_reviews': agg.n,
    });
  }

  res.status(201).json(rv);
}));

r.get('/user/:id', wrap(async (req, res) => {
  const reviews = await Review.find({ reviewed_user_id: req.params.id })
    .populate('reviewer_id', 'name')
    .populate('product_id', 'title')
    .sort('-created_at')
    .limit(50);
  res.json(reviews);
}));

module.exports = r;
