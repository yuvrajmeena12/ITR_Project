const express = require('express');
const c = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');
const { userLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect, userLimiter);

router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id/cancel', c.cancel);
router.patch('/:id/complete', c.complete);

module.exports = router;
