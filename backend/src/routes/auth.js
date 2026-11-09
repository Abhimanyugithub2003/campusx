const r = require('express').Router();
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { User, Otp } = require('../models');
const { sign, requireAuth, wrap, validate } = require('../auth');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  university: z.string().optional(),
  phone: z.string().optional(),
  otp: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const otpSchema = z.object({
  email: z.string().email('Invalid email address'),
  purpose: z.enum(['register', 'login', 'reset']).default('register'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().min(4).max(8),
  purpose: z.enum(['register', 'login', 'reset']).default('register'),
});

// Send Email OTP
r.post('/send-otp', validate(otpSchema), wrap(async (req, res) => {
  const { email, purpose } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  // Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Replace any previous OTP for this email & purpose
  await Otp.deleteMany({ email: normalizedEmail, purpose });
  await Otp.create({ email: normalizedEmail, otp: otpCode, purpose, expires_at: expiresAt });

  console.log(`[CampusX OTP] ${purpose.toUpperCase()} code for ${normalizedEmail}: ${otpCode}`);

  res.json({
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    dev_otp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
  });
}));

// Verify Email OTP
r.post('/verify-otp', validate(verifyOtpSchema), wrap(async (req, res) => {
  const { email, otp, purpose } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const record = await Otp.findOne({ email: normalizedEmail, otp, purpose });
  if (!record || record.expires_at < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired OTP verification code' });
  }

  await Otp.deleteOne({ _id: record._id });
  res.json({ success: true, message: 'Email successfully verified' });
}));

// Register (Any personal or university email allowed)
r.post('/register', validate(registerSchema), wrap(async (req, res) => {
  const { name, email, password, university, phone, otp } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  // Check if it's an official university domain to award student_verified badge
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map((d) => d.trim()).filter(Boolean);
  const okDomain = domains.some((d) => normalizedEmail.endsWith('@' + d));

  // If OTP was provided, verify it
  let otpVerified = false;
  if (otp) {
    const record = await Otp.findOne({ email: normalizedEmail, otp, purpose: 'register' });
    if (!record || record.expires_at < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }
    await Otp.deleteOne({ _id: record._id });
    otpVerified = true;
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    university: university || (okDomain ? domains[0].toUpperCase() : 'General Campus / Student'),
    phone,
    student_verified: okDomain || otpVerified,
    password_hash: await bcrypt.hash(password, 12),
  });

  res.status(201).json({
    token: sign(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      university: user.university,
      student_verified: user.student_verified,
      rating: user.rating,
    },
  });
}));

// Login
r.post('/login', validate(loginSchema), wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password_hash');
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({
    token: sign(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      university: user.university,
      student_verified: user.student_verified,
      rating: user.rating,
    },
  });
}));

// Current authenticated user
r.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}));

// Public seller info
r.get('/sellers/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id).select('name university rating student_verified stats created_at');
  if (!user) return res.status(404).json({ error: 'Seller not found' });
  res.json(user);
}));

module.exports = r;
