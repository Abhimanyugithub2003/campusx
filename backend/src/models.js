const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

const User = model('User', new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true, select: false },
  university: String,
  student_verified: { type: Boolean, default: false },
  phone: { type: String, select: false },
  profile_image: String,
  rating: { average: { type: Number, default: 0 }, total_reviews: { type: Number, default: 0 } },
  stats: { completed_sales: { type: Number, default: 0 }, offers_received: { type: Number, default: 0 }, offers_replied: { type: Number, default: 0 } },
  flags: { type: [String], default: [] },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } }));

const productSchema = new Schema({
  seller_id: { ...ref('User'), required: true, index: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  subcategory: String,
  price: { type: Number, required: true, min: 0 },
  minimum_price: { type: Number, select: false }, // private: seller + backend only
  condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair'], default: 'Good' },
  images: [String],
  attributes: { type: Schema.Types.Mixed, default: {} }, // flexible per category
  listing_type: { type: String, enum: ['fixed', 'negotiable', 'auction'], default: 'negotiable' },
  location: String,
  status: { type: String, enum: ['available', 'reserved', 'sold'], default: 'available' },
  views: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ title: 'text', description: 'text' });
const Product = model('Product', productSchema);

const negSchema = new Schema({
  product_id: { ...ref('Product'), required: true },
  seller_id: ref('User'), buyer_id: ref('User'),
  offers: [{ offered_by: ref('User'), amount: Number, status: { type: String, default: 'pending' }, at: { type: Date, default: Date.now } }],
  negotiation_status: { type: String, enum: ['active', 'accepted', 'rejected'], default: 'active' },
  agreed_amount: Number,
});
negSchema.index({ buyer_id: 1, seller_id: 1 });
const Negotiation = model('Negotiation', negSchema);

const Chat = model('Chat', new Schema({
  negotiation_id: { ...ref('Negotiation'), index: true }, sender_id: ref('User'), text: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } }));

const auctionSchema = new Schema({
  product_id: ref('Product'), seller_id: ref('User'),
  starting_price: Number, current_highest_bid: { type: Number, default: 0 }, highest_bidder_id: ref('User'),
  start_time: { type: Date, default: Date.now }, end_time: { type: Date, required: true },
  status: { type: String, enum: ['active', 'ended', 'no_bids'], default: 'active' },
});
auctionSchema.index({ status: 1, end_time: 1 });
const Auction = model('Auction', auctionSchema);

const bidSchema = new Schema({ auction_id: ref('Auction'), bidder_id: ref('User'), bid_amount: Number },
  { timestamps: { createdAt: 'created_at', updatedAt: false } });
bidSchema.index({ auction_id: 1, bid_amount: -1 });
const Bid = model('Bid', bidSchema);

const orderSchema = new Schema({
  product_id: ref('Product'), buyer_id: ref('User'), seller_id: ref('User'),
  amount: Number, source: { type: String, enum: ['fixed', 'negotiation', 'auction'] },
  status: { type: String, enum: ['pending_payment', 'paid', 'completed', 'cancelled'], default: 'pending_payment' },
  gateway_order_id: String, payment_ref: String,
  buyer_confirmed: { type: Boolean, default: false }, seller_confirmed: { type: Boolean, default: false },
  meeting: { location: String, time: Date },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
orderSchema.index({ buyer_id: 1, created_at: -1 });
const Order = model('Order', orderSchema);

// Only gateway reference ids are stored; never card data
const Receipt = model('Receipt', new Schema({
  receipt_no: { type: String, unique: true }, order_id: ref('Order'), buyer_id: ref('User'), seller_id: ref('User'),
  product: { id: ref('Product'), title: String }, amount: Number, payment_ref: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } }));

const reviewSchema = new Schema({
  order_id: ref('Order'), reviewer_id: ref('User'), reviewed_user_id: { ...ref('User'), index: true }, product_id: ref('Product'),
  seller_rating: { type: Number, min: 1, max: 5, required: true },
  product_quality_rating: { type: Number, min: 1, max: 5 },
  communication_rating: { type: Number, min: 1, max: 5 },
  comment: String, verified_purchase: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
reviewSchema.index({ order_id: 1, reviewer_id: 1 }, { unique: true }); // one review per order
const Review = model('Review', reviewSchema);

const Event = model('Event', new Schema({
  user_id: { ...ref('User'), index: true }, product_id: ref('Product'),
  type: { type: String, enum: ['view', 'search', 'wishlist', 'purchase'] }, query: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false }, collection: 'user_events' }));

const otpSchema = new Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
  purpose: { type: String, enum: ['register', 'login', 'reset'], default: 'register' },
  expires_at: { type: Date, required: true, expires: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
const Otp = model('Otp', otpSchema);

module.exports = { User, Product, Negotiation, Chat, Auction, Bid, Order, Receipt, Review, Event, Otp };
