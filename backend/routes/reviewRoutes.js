const express = require('express');
const c = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { userLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect, userLimiter);

router.post('/', c.create);
router.get('/user/:userId', c.forUser);

module.exports = router;
