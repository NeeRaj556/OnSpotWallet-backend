const router = require('express').Router();
const { registerUser, loginUser, UpdatePin, verifyOtp, resendOtp } = require('../controllers/auth/auth.controller');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 * @body {name, email, password}
 */
router.post('/register', registerUser);
 /**
 * @route POST /api/auth/login
 * @desc Login a user and get token
 * @access Public
 * @body {email, password}
 */
router.post('/login', loginUser);

/**
 * @route POST /api/auth/verify
 * @desc Verify OTP sent to email
 * @access Public
 * @body {email, otp}
 */
router.post('/verify', verifyOtp);
router.post('/resend-otp', resendOtp);

module.exports = router;