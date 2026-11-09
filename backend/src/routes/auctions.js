const r = require('express').Router();
const { z } = require('zod');
const { Auction, Bid, Product } = require('../models');
const { requireAuth, wrap, validate } = require('../auth');

const createAuctionSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  starting_price: z.coerce.number().positive('Starting price must be positive'),
  end_time: z.string().refine((val) => new Date(val) > new Date(), {
    message: 'End time must be in the future',
  }),
});

const bidSchema = z.object({
  amount: z.coerce.number().positive('Bid amount must be positive'),
});

r.get('/', wrap(async (req, res) =>
  res.json(
    await Auction.find({ status: 'active', end_time: { $gt: new Date() } })
      .sort('end_time')
      .populate('product_id', 'title images category description price')
      .populate('seller_id', 'name rating student_verified university')
      .populate('highest_bidder_id', 'name')
  )
));

r.get('/:id', wrap(async (req, res) => {
  const a = await Auction.findById(req.params.id)
    .populate('product_id')
    .populate('seller_id', 'name rating student_verified university')
    .populate('highest_bidder_id', 'name');
  if (!a) return res.status(404).json({ error: 'Auction not found' });
  const bids = await Bid.find({ auction_id: a._id })
    .sort('-bid_amount')
    .limit(30)
    .populate('bidder_id', 'name');
  res.json({ auction: a, bids });
}));

r.post('/', requireAuth, validate(createAuctionSchema), wrap(async (req, res) => {
  const { product_id, starting_price, end_time } = req.body;
  const p = await Product.findOneAndUpdate(
    { _id: product_id, seller_id: req.user.id, status: 'available', listing_type: 'auction' },
    { status: 'reserved' }
  );
  if (!p) throw new Error('Product must be yours, currently available, and listed as "auction"');
  const auction = await Auction.create({
    product_id,
    seller_id: req.user.id,
    starting_price,
    current_highest_bid: starting_price,
    end_time: new Date(end_time),
  });
  res.status(201).json(auction);
}));

// Atomic bid: ONE conditional update decides the winner
r.post('/:id/bid', requireAuth, validate(bidSchema), wrap(async (req, res) => {
  const amount = Number(req.body.amount);
  const a = await Auction.findOneAndUpdate(
    {
      _id: req.params.id,
      status: 'active',
      end_time: { $gt: new Date() },
      seller_id: { $ne: req.user.id },
      starting_price: { $lte: amount },
      current_highest_bid: { $lt: amount },
    },
    { $set: { current_highest_bid: amount, highest_bidder_id: req.user.id } },
    { new: true }
  ).populate('highest_bidder_id', 'name');

  if (!a) {
    return res.status(409).json({ error: 'Bid rejected: too low, auction closed, or you are the seller' });
  }

  await Bid.create({ auction_id: a._id, bidder_id: req.user.id, bid_amount: amount });
  req.app.get('io').to('auction:' + a._id).emit('bid', {
    auction_id: a._id,
    amount,
    bidder_id: req.user.id,
    bidder_name: a.highest_bidder_id?.name || 'A student',
  });
  res.json(a);
}));

module.exports = r;
