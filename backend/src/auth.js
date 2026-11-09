const jwt = require('jsonwebtoken');
exports.sign = (u) => jwt.sign({ id: u._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
exports.requireAuth = (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
};
exports.wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => res.status(400).json({ error: e.message }));

exports.validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err.errors) {
      const msg = err.errors.map(e => `${e.path.join('.') || 'body'}: ${e.message}`).join(', ');
      return res.status(400).json({ error: msg });
    }
    return res.status(400).json({ error: err.message });
  }
};
