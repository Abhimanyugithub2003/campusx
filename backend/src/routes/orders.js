const r = require('express').Router();
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { z } = require('zod');
const { Order, Product, Receipt, User, Event } = require('../models');
const { requireAuth, wrap, validate } = require('../auth');
r.use(requireAuth);

const MOCK = !process.env.RAZORPAY_KEY_ID;
const rzp = MOCK
  ? null
  : new (require('razorpay'))({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

const party = (o, uid) => o.buyer_id.equals(uid) || o.seller_id.equals(uid);

// Fixed-price direct purchase
r.post('/buy/:productId', wrap(async (req, res) => {
  const p = await Product.findOneAndUpdate(
    { _id: req.params.productId, status: 'available', listing_type: 'fixed', seller_id: { $ne: req.user.id } },
    { status: 'reserved' }
  );
  if (!p) throw new Error('Not available for direct purchase');
  const order = await Order.create({
    product_id: p._id,
    buyer_id: req.user.id,
    seller_id: p.seller_id,
    amount: p.price,
    source: 'fixed',
  });
  res.status(201).json(order);
}));

// List user orders (as buyer or seller)
r.get('/', wrap(async (req, res) => {
  const orders = await Order.find({ $or: [{ buyer_id: req.user.id }, { seller_id: req.user.id }] })
    .sort('-created_at')
    .populate('product_id', 'title images price category condition')
    .populate('buyer_id', 'name email university')
    .populate('seller_id', 'name email university');
  res.json(orders);
}));

// Single order details
r.get('/:id', wrap(async (req, res) => {
  const o = await Order.findById(req.params.id)
    .populate('product_id', 'title images price category condition location')
    .populate('buyer_id', 'name email university')
    .populate('seller_id', 'name email university');
  if (!o || !party(o, req.user.id)) throw new Error('Order not found');
  const receipt = await Receipt.findOne({ order_id: o._id });
  res.json({ order: o, receipt });
}));

// Step 1: create a gateway payment order (amount is read strictly from DB)
r.post('/:id/pay', wrap(async (req, res) => {
  const o = await Order.findOne({ _id: req.params.id, buyer_id: req.user.id, status: 'pending_payment' });
  if (!o) throw new Error('Order not payable');
  if (MOCK) return res.json({ mock: true, order_id: o._id, amount: o.amount });
  const g = await rzp.orders.create({ amount: Math.round(o.amount * 100), currency: 'INR', receipt: String(o._id) });
  o.gateway_order_id = g.id;
  await o.save();
  res.json({ key: process.env.RAZORPAY_KEY_ID, gateway_order_id: g.id, amount: g.amount });
}));

// Step 2: verify signature server-side, then mark paid + issue receipt
r.post('/:id/verify', wrap(async (req, res) => {
  const o = await Order.findOne({ _id: req.params.id, buyer_id: req.user.id, status: 'pending_payment' });
  if (!o) throw new Error('Order not payable');
  let ref;
  if (MOCK) {
    ref = 'MOCK-PAY-' + Date.now();
  } else {
    const { razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(o.gateway_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    if (expected !== razorpay_signature) throw new Error('Payment signature mismatch');
    ref = razorpay_payment_id;
  }

  o.status = 'paid';
  o.payment_ref = ref;
  await o.save();

  await Product.findByIdAndUpdate(o.product_id, { status: 'sold' });
  await Event.create({ user_id: o.buyer_id, product_id: o.product_id, type: 'purchase' });

  const p = await Product.findById(o.product_id);
  const n = await Receipt.countDocuments();
  const receipt = await Receipt.create({
    receipt_no: `CX-${new Date().getFullYear()}-${String(n + 1).padStart(5, '0')}`,
    order_id: o._id,
    buyer_id: o.buyer_id,
    seller_id: o.seller_id,
    product: { id: p._id, title: p.title },
    amount: o.amount,
    payment_ref: ref,
  });

  req.app.get('io').to('user:' + o.seller_id).emit('order_paid', { order_id: o._id });
  res.json({ order: o, receipt });
}));

// Download PDF Receipt
r.get('/:id/receipt.pdf', wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || !party(o, req.user.id)) throw new Error('Order not found');
  const rc = await Receipt.findOne({ order_id: o._id });
  if (!rc) throw new Error('No receipt generated yet');
  const [b, s] = await Promise.all([User.findById(rc.buyer_id), User.findById(rc.seller_id)]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${rc.receipt_no}.pdf`);
  const d = new PDFDocument({ margin: 50 });
  d.pipe(res);

  // Styling PDF Receipt
  d.fontSize(22).fillColor('#1e40af').text('CampusX Marketplace', { align: 'center' });
  d.fontSize(12).fillColor('#64748b').text('Verified University Student Exchange', { align: 'center' });
  d.moveDown(1.5);

  d.fontSize(16).fillColor('#0f172a').text('Official Purchase Receipt');
  d.moveTo(50, d.y + 5).lineTo(550, d.y + 5).strokeColor('#cbd5e1').stroke();
  d.moveDown();

  d.fontSize(11).fillColor('#334155');
  d.text(`Receipt Number:   ${rc.receipt_no}`);
  d.text(`Date & Time:      ${new Date(rc.created_at).toLocaleString()}`);
  d.text(`Payment Ref:      ${rc.payment_ref}`);
  d.moveDown(0.5);

  d.text(`Product Name:     ${rc.product.title}`);
  d.text(`Buyer Name:       ${b ? b.name : 'Student'}`);
  d.text(`Seller Name:      ${s ? s.name : 'Student'}`);
  d.moveDown(0.5);

  d.fontSize(14).fillColor('#15803d').text(`Total Amount Paid: Rs. ${rc.amount.toLocaleString()}`);
  d.moveDown(1.5);

  d.fontSize(9).fillColor('#94a3b8').text('This is a verified digital payment receipt issued by CampusX.', { align: 'center' });
  d.text('Safe campus handover: inspect the item before confirming handover in your dashboard.', { align: 'center' });
  d.end();
}));

// JSON receipt endpoint for on-screen invoice modal
r.get('/:id/receipt', wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || !party(o, req.user.id)) throw new Error('Order not found');
  const rc = await Receipt.findOne({ order_id: o._id }).populate('buyer_id', 'name email').populate('seller_id', 'name email');
  if (!rc) throw new Error('No receipt available');
  res.json(rc);
}));

// Contact details are released ONLY after payment
r.get('/:id/contact', wrap(async (req, res) => {
  const o = await Order.findById(req.params.id);
  if (!o || !party(o, req.user.id) || o.status === 'pending_payment') {
    throw new Error('Contact details are released only after payment has been completed');
  }
  const otherId = o.buyer_id.equals(req.user.id) ? o.seller_id : o.buyer_id;
  const u = await User.findById(otherId).select('+phone name email university');
  res.json({ name: u.name, email: u.email, phone: u.phone, university: u.university });
}));

// Set meeting place and time
const meetingSchema = z.object({
  location: z.string().min(2, 'Meeting location required'),
  time: z.string().optional(),
});

r.post('/:id/meeting', validate(meetingSchema), wrap(async (req, res) => {
  const o = await Order.findOne({ _id: req.params.id, $or: [{ buyer_id: req.user.id }, { seller_id: req.user.id }] });
  if (!o) throw new Error('Order not found');
  o.meeting = { location: req.body.location, time: req.body.time ? new Date(req.body.time) : new Date() };
  await o.save();
  res.json(o);
}));

// Both sides confirm handover -> order completed
r.post('/:id/confirm', wrap(async (req, res) => {
  const o = await Order.findOne({ _id: req.params.id, status: 'paid', $or: [{ buyer_id: req.user.id }, { seller_id: req.user.id }] });
  if (!o) throw new Error('Order not found or not in paid status');
  if (o.buyer_id.equals(req.user.id)) {
    o.buyer_confirmed = true;
  } else {
    o.seller_confirmed = true;
  }
  if (o.buyer_confirmed && o.seller_confirmed) {
    o.status = 'completed';
    await User.findByIdAndUpdate(o.seller_id, { $inc: { 'stats.completed_sales': 1 } });
  }
  await o.save();
  res.json(o);
}));

module.exports = r;
