const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    console.warn('Missing token in cookies');
    return res.redirect('/signin');
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
function adminOnly(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: 'Forbbiden: Insufficient rights' });
  }
  next();
}
module.exports = { authMiddleware, adminOnly };
