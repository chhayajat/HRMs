const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { notifyUser } = require('../services/notifyService');
const AuditLog = require('../models/AuditLog');

// Helper to count leave days excluding weekends
const calculateLeaveDays = (startDate, endDate, halfDay) => {
  if (halfDay) return 0.5;

  let start = new Date(startDate);
  let end = new Date(endDate);
  let count = 0;

  while (start <= end) {
    const day = start.getDay();
    if (day !== 0 && day !== 6) { // Skip Saturday and Sunday
      count++;
    }
    start.setDate(start.getDate() + 1);
  }

  return count;
};

// @desc    Get leave balances
// @route   GET /api/leaves/balances
// @access  Private
const getLeaveBalances = async (req, res) => {
  const employeeId = req.query.employeeId || req.user.employeeProfileId;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'Please provide employee profile ID' });
  }

  try {
    // Check permission
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employeeId.toString();
    const isHrOrLeadership = ['HR', 'Leadership'].includes(req.user.role);
    
    let isManager = false;
    if (req.user.role === 'Manager') {
      const emp = await Employee.findById(employeeId);
      if (emp && emp.employment.managerId && emp.employment.managerId.toString() === req.user.employeeProfileId?.toString()) {
        isManager = true;
      }
    }

    if (!isSelf && !isHrOrLeadership && !isManager) {
      return res.status(403).json({ success: false, message: 'Not authorized to view balances' });
    }

    const currentYear = new Date().getFullYear();
    let balance = await LeaveBalance.findOne({
      tenantId: req.tenantId,
      employeeId,
      year: currentYear
    });

    // If no balance exists, seed one
    if (!balance) {
      balance = await LeaveBalance.create({
        tenantId: req.tenantId,
        employeeId,
        year: currentYear,
        balances: [
          { leaveType: 'Casual', allocated: 12, used: 0, pending: 0 },
          { leaveType: 'Sick', allocated: 10, used: 0, pending: 0 },
          { leaveType: 'Earned', allocated: 15, used: 0, pending: 0 },
          { leaveType: 'Loss of Pay', allocated: 999, used: 0, pending: 0 }
        ]
      });
    }

    res.status(200).json({ success: true, data: balance.balances });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching leave balances', error: error.message });
  }
};

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
const applyLeave = async (req, res) => {
  const { leaveType, startDate, endDate, halfDay, reason } = req.body;
  const employeeId = req.user.employeeProfileId;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'No employee profile associated' });
  }

  if (!leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, message: 'Please provide all details: leaveType, startDate, endDate, reason' });
  }

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date' });
    }

    // Check for overlapping leaves
    const overlap = await LeaveRequest.findOne({
      tenantId: req.tenantId,
      employeeId,
      status: { $in: ['Pending', 'Approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ success: false, message: 'You have an overlapping leave request' });
    }

    // Calculate required days
    const leaveDays = calculateLeaveDays(startDate, endDate, halfDay);
    if (leaveDays <= 0) {
      return res.status(400).json({ success: false, message: 'Selected date range contains no working days' });
    }

    // Check Leave Balance
    if (leaveType !== 'Loss of Pay') {
      const balanceDoc = await LeaveBalance.findOne({
        tenantId: req.tenantId,
        employeeId,
        year: start.getFullYear()
      });

      if (!balanceDoc) {
        return res.status(400).json({ success: false, message: 'Leave balances not configured' });
      }

      const bal = balanceDoc.balances.find(b => b.leaveType === leaveType);
      if (!bal || (bal.allocated - bal.used - bal.pending) < leaveDays) {
        return res.status(400).json({ success: false, message: `Insufficient balance. Required: ${leaveDays}, Available: ${bal ? bal.allocated - bal.used - bal.pending : 0}` });
      }

      // Increment pending count in balance so they can't double-request
      bal.pending += leaveDays;
      await balanceDoc.save();
    }

    // Create Leave Request
    const leaveRequest = await LeaveRequest.create({
      tenantId: req.tenantId,
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      halfDay,
      reason,
      status: 'Pending'
    });

    // Notify Reporting Manager
    const employee = await Employee.findById(employeeId);
    let managerUser = null;
    if (employee?.employment?.managerId) {
      managerUser = await User.findOne({ employeeProfileId: employee.employment.managerId, tenantId: req.tenantId });
    }

    // Default to HR if manager is not setup
    const approverUserId = managerUser ? managerUser._id : (await User.findOne({ tenantId: req.tenantId, role: 'HR' }))?._id;

    if (approverUserId) {
      await notifyUser({
        tenantId: req.tenantId,
        userId: approverUserId,
        title: 'New Leave Request',
        message: `${employee.personal.name} requested ${leaveDays} day(s) of ${leaveType} leave`,
        link: '/approvals'
      });
    }

    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'LEAVE_APPLIED',
      details: `Applied for ${leaveDays} day(s) of ${leaveType} from ${startDate} to ${endDate}`,
      ipAddress: req.ip
    });

    res.status(201).json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error applying for leave', error: error.message });
  }
};

// @desc    Get leaves history (All for HR, team for Manager, own for Employee)
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
  try {
    const { employeeId } = req.query;
    let query = { tenantId: req.tenantId };

    const isHrOrLeadership = ['HR', 'Leadership'].includes(req.user.role);

    if (employeeId) {
      const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employeeId;
      
      let isManager = false;
      if (req.user.role === 'Manager') {
        const emp = await Employee.findById(employeeId);
        if (emp && emp.employment.managerId && emp.employment.managerId.toString() === req.user.employeeProfileId?.toString()) {
          isManager = true;
        }
      }

      if (!isSelf && !isHrOrLeadership && !isManager) {
        return res.status(403).json({ success: false, message: 'Not authorized to view leaves' });
      }
      query.employeeId = employeeId;
    } else {
      if (req.user.role === 'Employee') {
        query.employeeId = req.user.employeeProfileId;
      } else if (req.user.role === 'Manager') {
        // Manager views team + own
        const teamEmployees = await Employee.find({
          tenantId: req.tenantId,
          $or: [
            { 'employment.managerId': req.user.employeeProfileId },
            { _id: req.user.employeeProfileId }
          ]
        });
        const teamIds = teamEmployees.map(e => e._id);
        query.employeeId = { $in: teamIds };
      }
    }

    const leaves = await LeaveRequest.find(query)
      .populate('employeeId', 'personal.name employeeId employment.department employment.designation')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching leaves history', error: error.message });
  }
};

// @desc    Cancel leave request
// @route   PUT /api/leaves/:id/cancel
// @access  Private
const cancelLeave = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === leaveRequest.employeeId.toString();
    if (!isSelf) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request' });
    }

    if (leaveRequest.status === 'Cancelled' || leaveRequest.status === 'Rejected') {
      return res.status(400).json({ success: false, message: `Request already ${leaveRequest.status}` });
    }

    const originalStatus = leaveRequest.status;
    leaveRequest.status = 'Cancelled';
    await leaveRequest.save();

    // Revert leave balance
    const leaveDays = calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate, leaveRequest.halfDay);
    const balanceDoc = await LeaveBalance.findOne({
      tenantId: req.tenantId,
      employeeId: leaveRequest.employeeId,
      year: new Date(leaveRequest.startDate).getFullYear()
    });

    if (balanceDoc && leaveRequest.leaveType !== 'Loss of Pay') {
      const bal = balanceDoc.balances.find(b => b.leaveType === leaveRequest.leaveType);
      if (bal) {
        if (originalStatus === 'Pending') {
          bal.pending = Math.max(0, bal.pending - leaveDays);
        } else if (originalStatus === 'Approved') {
          bal.used = Math.max(0, bal.used - leaveDays);
        }
        await balanceDoc.save();
      }
    }

    // If cancelled after approval, delete corresponding attendance mark
    if (originalStatus === 'Approved') {
      let current = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        await Attendance.findOneAndDelete({
          tenantId: req.tenantId,
          employeeId: leaveRequest.employeeId,
          date: dateStr,
          status: 'On Leave'
        });
        current.setDate(current.getDate() + 1);
      }
    }

    // Notify manager if a pending leave was cancelled
    if (originalStatus === 'Pending') {
      const employee = await Employee.findById(leaveRequest.employeeId);
      let managerUser = null;
      if (employee?.employment?.managerId) {
        managerUser = await User.findOne({
          employeeProfileId: employee.employment.managerId,
          tenantId: req.tenantId
        });
      }
      const notifyUserId = managerUser
        ? managerUser._id
        : (await User.findOne({ tenantId: req.tenantId, role: 'HR' }))?._id;

      if (notifyUserId && employee) {
        await notifyUser({
          tenantId: req.tenantId,
          userId: notifyUserId,
          title: 'Leave Request Cancelled',
          message: `${employee.personal.name} cancelled their pending ${leaveRequest.leaveType} leave request`,
          link: '/approvals'
        });
      }
    }

    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'LEAVE_CANCELLED',
      details: `Cancelled leave request ${leaveRequest._id}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Leave request cancelled', data: leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error cancelling leave request', error: error.message });
  }
};

module.exports = {
  applyLeave,
  getLeaveBalances,
  getLeaves,
  cancelLeave,
  calculateLeaveDays // exported for approvals
};
