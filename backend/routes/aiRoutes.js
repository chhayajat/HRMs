const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getStatus,
  getModulesList,
  postSearch,
  getInsights,
  getAnomalies,
  getSummary,
  postScreenResume,
  getModuleInsights,
  getEmployeesList
} = require('../controllers/aiController');

router.use(protect, authorize('HR', 'Leadership'));

router.get('/status', getStatus);
router.get('/modules', getModulesList);
router.get('/employees', getEmployeesList);
router.post('/search', postSearch);
router.get('/workforce-insights', getInsights);
router.get('/attendance-anomalies', getAnomalies);
router.get('/employee/:id/summary', getSummary);
router.post('/recruitment/screen', postScreenResume);
router.get('/module/:moduleKey/insights', getModuleInsights);

module.exports = router;
