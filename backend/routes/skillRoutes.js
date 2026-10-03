const express = require('express');
const c = require('../controllers/skillController');
const { protect } = require('../middleware/auth');
const { uploader } = require('../utils/upload');
const { searchLimiter, userLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect);

router.get('/categories', searchLimiter, c.categories);
router.get('/explore', searchLimiter, c.explore);
router.get('/mine', userLimiter, c.mine);
router.get('/user/:userId', userLimiter, c.ofUser);
router.get('/:id/proof', userLimiter, c.proof);
router.get('/:id', userLimiter, c.getOne);
router.post('/', userLimiter, uploader.single('proof'), c.create);
router.put('/:id', userLimiter, uploader.single('proof'), c.update);
router.delete('/:id', userLimiter, c.remove);

module.exports = router;
