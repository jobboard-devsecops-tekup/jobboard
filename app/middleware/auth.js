const jwt = require('jsonwebtoken');
const config = require('../config');

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(token, config.JWT_SECRET); // pas d'expiration (jeton éternel)
    next();
  } catch (e) {
    res.status(401).json({ error: 'Jeton invalide' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Accès interdit' });
    next();
  };
}

module.exports = { auth, requireRole };
