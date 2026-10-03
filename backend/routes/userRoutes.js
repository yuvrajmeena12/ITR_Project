const express = require('express');
const c = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploader } = require('../utils/upload');
const { userLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect, userLimiter);

router.put('/me', c.updateMe);
router.post('/me/avatar', uploader.single('avatar'), c.uploadAvatar);
router.delete('/me/avatar', c.removeAvatar);
router.get('/:id/avatar', c.avatar);
router.get('/:id', c.getProfile);

module.exports = router;
