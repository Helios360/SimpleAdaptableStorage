function adminOnly(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ message: 'Forbbiden: Insufficient rights' });
  }
  next();
}

module.exports = adminOnly;