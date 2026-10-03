const express = require('express');
const c = require('../controllers/skillController');
const { publicLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.get('/overview', publicLimiter, c.overview);

module.exports = router;
