/* I don't remember if I use this or not, if it breaks, try to uncomment ...
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/authController');

router.get('/', (req, res) => {
  res.sendFile('profile.html', { root: './views' });
});

router.get('/api/profile', authMiddleware, profileController.getProfile);

module.exports = router;
*/