const router = require('express').Router();
const { registerUser, loginUser } = require('../controllers/user.controller');

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

module.exports = router;