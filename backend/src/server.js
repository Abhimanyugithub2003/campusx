require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { Auction, Order, Product, Chat, Negotiation } = require('./models');

const app = express();

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again in a few minutes' },
});

app.use(globalLimiter);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/negotiations', require('./routes/negotiations'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/upload', require('./routes/upload'));

// ---- Socket.IO: authenticated live bidding + negotiation chat ----
io.use((s, next) => {
  try {
    const token = s.handshake.auth.token || s.handshake.query.token;
    s.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (s) => {
  s.join('user:' + s.user.id);
  s.on('join_auction', (id) => s.join('auction:' + id));
  s.on('join_chat', async (nid) => {
    const n = await Negotiation.findOne({ _id: nid, $or: [{ buyer_id: s.user.id }, { seller_id: s.user.id }] });
    if (n) s.join('chat:' + nid);
  });
  s.on('chat', async ({ negotiation_id, text }) => {
    if (!s.rooms.has('chat:' + negotiation_id) || !text) return;
    const m = await Chat.create({ negotiation_id, sender_id: s.user.id, text: String(text).slice(0, 1000) });
    io.to('chat:' + negotiation_id).emit('chat', m);
  });
});

// ---- Auction settlement: close expired auctions, create order for the winner ----
async function settleAuctions() {
  const due = await Auction.find({ status: 'active', end_time: { $lte: new Date() } });
  for (const a of due) {
    const closed = await Auction.findOneAndUpdate(
      { _id: a._id, status: 'active' },
      { status: a.highest_bidder_id ? 'ended' : 'no_bids' },
      { new: true }
    );
    if (!closed) continue; // another instance already settled it
    if (closed.highest_bidder_id) {
      await Order.create({
        product_id: a.product_id,
        buyer_id: closed.highest_bidder_id,
        seller_id: a.seller_id,
        amount: closed.current_highest_bid,
        source: 'auction',
      });
      io.to('user:' + closed.highest_bidder_id).emit('auction_won', { auction_id: a._id });
    } else {
      await Product.findByIdAndUpdate(a.product_id, { status: 'available' });
    }
    io.to('auction:' + a._id).emit('auction_closed', { auction_id: a._id });
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI).then(() => {
  setInterval(() => settleAuctions().catch(console.error), 10_000);
  server.listen(PORT, () => console.log(`CampusX API running on :${PORT}`));
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
