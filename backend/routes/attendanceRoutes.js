const express = require('express');
const router = express.Router();
const { punch, getAttendance, requestRegularization } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAttendance);

router.post('/punch', protect, punch);
router.post('/regularize', protect, requestRegularization);

module.exports = router;
