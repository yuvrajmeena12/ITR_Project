const express = require('express');
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, otpLimiter, otpAccountLimiter, loginAccountLimiter, userLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, c.register);
router.post('/verify-email', otpLimiter, otpAccountLimiter, c.verifySignupOtp);
router.post('/resend-otp', otpLimiter, otpAccountLimiter, c.resendOtp);
router.post('/login', authLimiter, loginAccountLimiter, c.login);
router.post('/login-otp/request', otpLimiter, otpAccountLimiter, c.requestLoginOtp);
router.post('/login-otp/verify', otpLimiter, otpAccountLimiter, c.verifyLoginOtp);
router.post('/forgot-password', otpLimiter, otpAccountLimiter, c.forgotPassword);
router.post('/forgot-password/verify', otpLimiter, otpAccountLimiter, c.verifyResetOtp);
router.post('/reset-password', authLimiter, c.resetPassword);

router.post('/logout', c.logout);
router.get('/me', protect, userLimiter, c.me);
router.post('/change-password', protect, authLimiter, c.changePassword);

module.exports = router;
