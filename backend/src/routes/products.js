const r = require('express').Router();
const { z } = require('zod');
const { Product, Event } = require('../models');
const { requireAuth, wrap, validate } = require('../auth');
const jwt = require('jsonwebtoken');

const createProductSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  category: z.string().min(2, 'Category is required'),
  subcategory: z.string().optional(),
  price: z.coerce.number().positive('Price must be greater than 0'),
  minimum_price: z.coerce.number().positive().optional(),
  condition: z.enum(['New', 'Like New', 'Good', 'Fair']).default('Good'),
  images: z.array(z.string()).default([]),
  attributes: z.record(z.any()).default({}),
  listing_type: z.enum(['fixed', 'negotiable', 'auction']).default('negotiable'),
  location: z.string().optional(),
});

r.get('/', wrap(async (req, res) => {
  const { q, category, min, max, condition, sort = '-created_at', page = 1 } = req.query;
  const f = { status: 'available' };
  if (q) f.$text = { $search: q };
  if (category && category !== 'All') f.category = category;
  if (condition) f.condition = condition;
  if (min || max) f.price = { ...(min && { $gte: +min }), ...(max && { $lte: +max }) };
  const items = await Product.find(f)
    .sort(sort)
    .skip((page - 1) * 30)
    .limit(30)
    .populate('seller_id', 'name rating student_verified university');
  res.json(items);
}));

r.get('/:id', wrap(async (req, res) => {
  const p = await Product.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true })
    .populate('seller_id', 'name rating student_verified university stats created_at');
  if (!p) return res.status(404).json({ error: 'Not found' });
  try {
    const u = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    await Event.create({ user_id: u.id, product_id: p._id, type: 'view' });
  } catch {}
  res.json(p);
}));

r.post('/', requireAuth, validate(createProductSchema), wrap(async (req, res) => {
  const { title, description, category, subcategory, price, minimum_price, condition, images, attributes, listing_type, location } = req.body;
  const p = await Product.create({
    seller_id: req.user.id,
    title,
    description,
    category,
    subcategory,
    price,
    minimum_price,
    condition,
    images: images && images.length ? images : ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop'],
    attributes,
    listing_type,
    location,
  });
  res.status(201).json(p);
}));

r.patch('/:id', requireAuth, wrap(async (req, res) => {
  const allowed = ['title', 'description', 'price', 'minimum_price', 'condition', 'images', 'attributes', 'location'];
  const upd = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const p = await Product.findOneAndUpdate({ _id: req.params.id, seller_id: req.user.id, status: 'available' }, upd, { new: true });
  if (!p) return res.status(404).json({ error: 'Not found or not yours' });
  res.json(p);
}));

r.delete('/:id', requireAuth, wrap(async (req, res) => {
  const p = await Product.findOneAndDelete({ _id: req.params.id, seller_id: req.user.id, status: 'available' });
  if (!p) return res.status(404).json({ error: 'Not found, active in order, or not yours' });
  res.json({ success: true, message: 'Listing removed' });
}));

r.get('/mine/private', requireAuth, wrap(async (req, res) =>
  res.json(await Product.find({ seller_id: req.user.id }).select('+minimum_price'))));

module.exports = r;
