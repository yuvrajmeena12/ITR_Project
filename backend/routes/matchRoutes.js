const express = require('express');
const c = require('../controllers/matchController');
const { protect } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.get('/', protect, searchLimiter, c.list);

module.exports = router;
