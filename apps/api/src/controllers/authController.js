const jwt = require('jsonwebtoken');

function login(req, res) {
  const { email, password } = req.body || {};

  if (
    email !== process.env.ADMIN_EMAIL ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ message: 'Credenciais inválidas.' });
  }

  const user = {
    id: 'admin-1',
    name: 'Alex Rivera',
    role: 'admin',
    title: 'General Manager',
    email: process.env.ADMIN_EMAIL,
  };

  const token = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  return res.json({ token, user });
}

function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { login, me };
