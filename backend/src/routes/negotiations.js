const r = require('express').Router();
const { z } = require('zod');
const { Negotiation, Product, Order, Chat } = require('../models');
const { requireAuth, wrap, validate } = require('../auth');
r.use(requireAuth);

const mine = (id, uid) =>
  Negotiation.findOne({ _id: id, $or: [{ buyer_id: uid }, { seller_id: uid }] })
    .populate('product_id', 'title price images category status')
    .populate('buyer_id', 'name rating student_verified university')
    .populate('seller_id', 'name rating student_verified university');

const openNegotiationSchema = z.object({
  product_id: z.string().min(1, 'Product ID required'),
  amount: z.coerce.number().positive('Offer amount must be positive'),
});

const offerSchema = z.object({
  amount: z.coerce.number().positive('Offer amount must be positive'),
});

// Buyer opens a negotiation with the first offer
r.post('/', validate(openNegotiationSchema), wrap(async (req, res) => {
  const { product_id, amount } = req.body;
  const p = await Product.findOne({ _id: product_id, status: 'available', listing_type: 'negotiable' });
  if (!p) throw new Error('Product not negotiable or no longer available');
  if (p.seller_id.equals(req.user.id)) throw new Error('You cannot negotiate on your own product');

  // Check if active negotiation already exists between this buyer and product
  let n = await Negotiation.findOne({ product_id, buyer_id: req.user.id, negotiation_status: 'active' });
  if (n) {
    return res.json(await mine(n._id, req.user.id));
  }

  n = await Negotiation.create({
    product_id,
    seller_id: p.seller_id,
    buyer_id: req.user.id,
    offers: [{ offered_by: req.user.id, amount }],
  });

  req.app.get('io').to('user:' + p.seller_id).emit('offer', { negotiation_id: n._id, amount });
  res.status(201).json(await mine(n._id, req.user.id));
}));

// Offer / counter-offer: parties must alternate turns
r.post('/:id/offer', validate(offerSchema), wrap(async (req, res) => {
  const n = await mine(req.params.id, req.user.id);
  if (!n || n.negotiation_status !== 'active') throw new Error('Negotiation not active');
  const last = n.offers[n.offers.length - 1];
  if (last && last.offered_by.equals(req.user.id)) throw new Error('Wait for the other party to respond');
  
  if (last) last.status = 'countered';
  n.offers.push({ offered_by: req.user.id, amount: req.body.amount });
  await n.save();

  const other = n.buyer_id._id.equals(req.user.id) ? n.seller_id._id : n.buyer_id._id;
  req.app.get('io').to('user:' + other).emit('offer', { negotiation_id: n._id, amount: req.body.amount });
  res.json(await mine(n._id, req.user.id));
}));

// Accept the other party's latest offer -> creates the order and reserves the product
r.post('/:id/accept', wrap(async (req, res) => {
  const n = await mine(req.params.id, req.user.id);
  if (!n || n.negotiation_status !== 'active') throw new Error('Negotiation not active');
  const last = n.offers[n.offers.length - 1];
  if (!last) throw new Error('No offer found');
  if (last.offered_by.equals(req.user.id)) throw new Error('You cannot accept your own offer');

  const reserved = await Product.findOneAndUpdate({ _id: n.product_id._id, status: 'available' }, { status: 'reserved' });
  if (!reserved) throw new Error('Product is no longer available');

  last.status = 'accepted';
  n.negotiation_status = 'accepted';
  n.agreed_amount = last.amount;
  await n.save();

  const order = await Order.create({
    product_id: n.product_id._id,
    buyer_id: n.buyer_id._id,
    seller_id: n.seller_id._id,
    amount: last.amount,
    source: 'negotiation',
  });

  res.json({ negotiation: n, order });
}));

r.post('/:id/reject', wrap(async (req, res) => {
  const n = await mine(req.params.id, req.user.id);
  if (!n) throw new Error('Negotiation not found');
  n.negotiation_status = 'rejected';
  await n.save();
  res.json(n);
}));

r.get('/:id', wrap(async (req, res) => {
  const n = await mine(req.params.id, req.user.id);
  if (!n) throw new Error('Negotiation not found');
  res.json(n);
}));

r.get('/:id/chat', wrap(async (req, res) => {
  if (!(await mine(req.params.id, req.user.id))) throw new Error('Negotiation not found');
  res.json(await Chat.find({ negotiation_id: req.params.id }).populate('sender_id', 'name').sort('created_at'));
}));

r.post('/:id/chat', wrap(async (req, res) => {
  const n = await mine(req.params.id, req.user.id);
  if (!n) throw new Error('Negotiation not found');
  const text = String(req.body.text || '').trim();
  if (!text) throw new Error('Message cannot be empty');
  const m = await Chat.create({ negotiation_id: n._id, sender_id: req.user.id, text });
  const populated = await Chat.findById(m._id).populate('sender_id', 'name');
  req.app.get('io').to('chat:' + n._id).emit('chat', populated);
  res.status(201).json(populated);
}));

r.get('/', wrap(async (req, res) =>
  res.json(
    await Negotiation.find({ $or: [{ buyer_id: req.user.id }, { seller_id: req.user.id }] })
      .populate('product_id', 'title price images category status')
      .populate('buyer_id', 'name')
      .populate('seller_id', 'name')
      .sort('-updatedAt')
  )
));

module.exports = r;
