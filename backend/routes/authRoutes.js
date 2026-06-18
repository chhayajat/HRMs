const express = require('express');
const router = express.Router();
const { registerTenant, login, forgotPassword, resetPassword, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-tenant', registerTenant);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
