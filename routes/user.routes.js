const router = require('express').Router();
const { getMe } = require('../controllers/auth/auth.controller');
const { protect } = require("../middleware/auth.middleware");

router.get("/me", protect, getMe);

module.exports = router;