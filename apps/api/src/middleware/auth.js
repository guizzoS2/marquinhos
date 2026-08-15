const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token ausente ou inválido.' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ message: 'Token expirado ou inválido.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permissão insuficiente.' });
    }
    return next();
  };
}

module.exports = { authenticateToken, requireRole };
