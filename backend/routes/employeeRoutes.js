const express = require('express');
const router = express.Router();
const { createEmployee, getEmployees, getEmployeeById, updateEmployee } = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.route('/')
  .post(protect, authorize('HR'), createEmployee)
  .get(protect, getEmployees);

router.route('/:id')
  .get(protect, getEmployeeById)
  .put(protect, updateEmployee);

module.exports = router;
