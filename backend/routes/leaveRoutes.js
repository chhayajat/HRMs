const express = require('express');
const router = express.Router();
const { applyLeave, getLeaveBalances, getLeaves, cancelLeave } = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getLeaves)
  .post(protect, applyLeave);

router.get('/balances', protect, getLeaveBalances);
router.put('/:id/cancel', protect, cancelLeave);

module.exports = router;
