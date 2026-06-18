const express = require('express');
const router = express.Router();
const { getDashboardSummary, getAnalyticsReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/dashboard-summary', protect, getDashboardSummary);
router.get('/analytics', protect, authorize('HR', 'Leadership'), getAnalyticsReport);

module.exports = router;
