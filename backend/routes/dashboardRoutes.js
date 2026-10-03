const express = require('express');
const c = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { userLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.get('/', protect, userLimiter, c.summary);

module.exports = router;
