const express = require('express');
const router = express.Router();
const { getPendingApprovals, actionLeave, actionRegularization, actionProfileEdit } = require('../controllers/approvalController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .get(protect, authorize('HR', 'Manager'), getPendingApprovals);

router.route('/leave/:id')
  .put(protect, authorize('HR', 'Manager'), actionLeave);

router.route('/regularize/:id')
  .put(protect, authorize('HR', 'Manager'), actionRegularization);

router.route('/profile-edit/:id')
  .put(protect, authorize('HR'), actionProfileEdit);

module.exports = router;
