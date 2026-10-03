const express = require('express');
const c = require('../controllers/swapController');
const { protect } = require('../middleware/auth');
const { userLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect, userLimiter);

router.get('/', c.list);
router.get('/counts', c.counts);
router.post('/', c.create);
router.patch('/:id/accept', c.accept);
router.patch('/:id/reject', c.reject);
router.patch('/:id/cancel', c.cancel);

module.exports = router;
