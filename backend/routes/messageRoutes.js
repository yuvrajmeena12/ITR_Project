const express = require('express');
const c = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const { userLimiter, messageLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect, userLimiter);

router.get('/conversations', c.conversations);
router.get('/unread-count', c.unreadCount);
router.get('/:userId', c.thread);
router.post('/:userId', messageLimiter, c.send);

module.exports = router;
