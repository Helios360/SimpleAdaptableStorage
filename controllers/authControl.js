const jwt = require('jsonwebtoken');
require('dotenv').config();
const SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    console.warn('Missing token in cookies');
    return res.status(401).json({ message: 'Missing token' });
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      console.warn('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = decoded;
    next();
  });
}

module.exports = authMiddleware;
