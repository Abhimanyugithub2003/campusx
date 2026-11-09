const r = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, wrap } = require('../auth');

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for local fallback
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, cleanName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  } catch (err) {
    console.warn('[Upload] Cloudinary module not loaded, falling back to local file storage');
  }
}

// Upload endpoint
r.post('/', requireAuth, upload.single('image'), wrap(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  // If Cloudinary configured, stream to Cloudinary
  if (cloudinary) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'campusx/products',
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
      });
      // Optionally remove local file after cloudinary upload
      fs.unlink(req.file.path, () => {});
      return res.json({ url: result.secure_url, provider: 'cloudinary' });
    } catch (err) {
      console.error('[Cloudinary upload failed, falling back to local]', err);
    }
  }

  // Local storage fallback
  const host = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  const url = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ url, provider: 'local' });
}));

module.exports = r;

