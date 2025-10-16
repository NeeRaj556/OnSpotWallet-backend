const router = require('express').Router();
const { getMe,UpdatePin,updatePreferredOffPrice} = require('../controllers/auth/auth.controller');
const { auth } = require("../middleware/auth.middleware");

router.get("/me", auth, getMe);
router.get("/update-pin", auth, UpdatePin);
router.get("/updatePreferredOffPrice", auth, updatePreferredOffPrice);

module.exports = router;