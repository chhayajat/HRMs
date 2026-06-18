const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Attendance = require('../models/Attendance');
const ProfileEditRequest = require('../models/ProfileEditRequest');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { notifyUser } = require('../services/notifyService');
const AuditLog = require('../models/AuditLog');
const { calculateLeaveDays } = require('./leaveController');

// @desc    Get all pending approvals for Manager/HR
// @route   GET /api/approvals
// @access  Private (Manager/HR)
const getPendingApprovals = async (req, res) => {
  const isHr = req.user.role === 'HR';
  const isManager = req.user.role === 'Manager';

  if (!isHr && !isManager) {
    return res.status(403).json({ success: false, message: 'Not authorized to access the approval center' });
  }

  try {
    let employeeIds = [];

    // If Manager, find all reporting employees
    if (isManager) {
      const reportingEmployees = await Employee.find({
        tenantId: req.tenantId,
        'employment.managerId': req.user.employeeProfileId
      });
      employeeIds = reportingEmployees.map(e => e._id);
    }

    // --- 1. Leave Requests ---
    let leaveQuery = { tenantId: req.tenantId, status: 'Pending' };
    if (isManager) {
      leaveQuery.employeeId = { $in: employeeIds };
    }
    const leaves = await LeaveRequest.find(leaveQuery)
      .populate('employeeId', 'personal.name employeeId employment.department employment.designation')
      .sort({ createdAt: 1 });

    // --- 2. Regularizations ---
    let regularizeQuery = { tenantId: req.tenantId, 'regularization.requested': true, 'regularization.status': 'Pending' };
    if (isManager) {
      regularizeQuery.employeeId = { $in: employeeIds };
    }
    const regularizations = await Attendance.find(regularizeQuery)
      .populate('employeeId', 'personal.name employeeId employment.department employment.designation')
      .sort({ date: 1 });

    // --- 3. Profile Edits (HR only) ---
    let profileEdits = [];
    if (isHr) {
      profileEdits = await ProfileEditRequest.find({ tenantId: req.tenantId, status: 'Pending' })
        .populate('employeeId', 'personal.name employeeId employment.department employment.designation')
        .sort({ createdAt: 1 });
    }

    res.status(200).json({
      success: true,
      data: {
        leaves,
        regularizations,
        profileEdits
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching approvals list', error: error.message });
  }
};

// @desc    Process leave approval
// @route   PUT /api/approvals/leave/:id
// @access  Private (Manager/HR)
const actionLeave = async (req, res) => {
  const { status, comments } = req.body; // Approved / Rejected

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Please provide valid action status: Approved or Rejected' });
  }

  try {
    const leave = await LeaveRequest.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('employeeId');

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'Pending') {
      return res.status(400).json({ success: false, message: `Request already processed: ${leave.status}` });
    }

    // Role check: Manager must be reporting manager of the requester
    if (req.user.role === 'Manager') {
      const isReporting = leave.employeeId.employment.managerId?.toString() === req.user.employeeProfileId?.toString();
      if (!isReporting) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve this request' });
      }
    } else if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Update leave request
    leave.status = status;
    leave.approvals.push({
      approverId: req.user._id,
      role: req.user.role,
      status,
      comments,
      actionedAt: Date.now()
    });
    await leave.save();

    // Adjust leave balance
    const leaveDays = calculateLeaveDays(leave.startDate, leave.endDate, leave.halfDay);
    const balanceDoc = await LeaveBalance.findOne({
      tenantId: req.tenantId,
      employeeId: leave.employeeId._id,
      year: new Date(leave.startDate).getFullYear()
    });

    if (balanceDoc && leave.leaveType !== 'Loss of Pay') {
      const bal = balanceDoc.balances.find(b => b.leaveType === leave.leaveType);
      if (bal) {
        bal.pending = Math.max(0, bal.pending - leaveDays);
        if (status === 'Approved') {
          bal.used += leaveDays;
        }
        await balanceDoc.save();
      }
    }

    // If approved, create/update attendance records for those dates
    if (status === 'Approved') {
      let current = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const day = current.getDay();

        // Check if weekend (optional skip, let's skip Saturday/Sunday)
        if (day !== 0 && day !== 6) {
          await Attendance.findOneAndUpdate(
            { tenantId: req.tenantId, employeeId: leave.employeeId._id, date: dateStr },
            {
              $set: {
                status: 'On Leave',
                punches: [],
                totalHours: 0,
                'regularization.requested': false // cancel any pending regularizations
              }
            },
            { upsert: true, new: true }
          );
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // Notify requester
    const requesterUser = await User.findOne({ employeeProfileId: leave.employeeId._id, tenantId: req.tenantId });
    if (requesterUser) {
      await notifyUser({
        tenantId: req.tenantId,
        userId: requesterUser._id,
        title: `Leave Request ${status}`,
        message: `Your request for ${leave.leaveType} leave from ${leave.startDate.toISOString().split('T')[0]} has been ${status.toLowerCase()}`,
        link: '/leaves'
      });
    }

    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: `LEAVE_ACTION_${status.toUpperCase()}`,
      details: `Leave request for ${leave.employeeId.personal.name} ${status.toLowerCase()}. Comments: ${comments || 'None'}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: leave });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error during leave approval action', error: error.message });
  }
};

// @desc    Process regularization approval
// @route   PUT /api/approvals/regularize/:id
// @access  Private (Manager/HR)
const actionRegularization = async (req, res) => {
  const { status, comments } = req.body; // Approved / Rejected

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Please provide valid action status: Approved or Rejected' });
  }

  try {
    const attendance = await Attendance.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('employeeId');

    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    if (!attendance.regularization.requested || attendance.regularization.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'No pending regularization request on this record' });
    }

    // Role check
    if (req.user.role === 'Manager') {
      const isReporting = attendance.employeeId.employment.managerId?.toString() === req.user.employeeProfileId?.toString();
      if (!isReporting) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve this request' });
      }
    } else if (req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (status === 'Approved') {
      // Apply the requested punches
      attendance.punches = attendance.regularization.requestedPunches;

      // Calculate total hours worked
      const inPunches = attendance.punches.filter(p => p.type === 'In');
      const outPunches = attendance.punches.filter(p => p.type === 'Out');

      let durationMs = 0;
      for (let i = 0; i < Math.min(inPunches.length, outPunches.length); i++) {
        durationMs += new Date(outPunches[i].time) - new Date(inPunches[i].time);
      }
      attendance.totalHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

      // Recalculate status
      let finalStatus = 'Present';
      if (attendance.totalHours < 4) {
        finalStatus = 'Half-Day';
      } else {
        // If punch In is after shift start + grace, mark as Late
        const tenant = await Tenant.findById(req.tenantId);
        const shift = tenant?.settings?.shifts?.find(s => s.id === attendance.employeeId.employment.shiftId);
        
        if (inPunches.length > 0) {
          const punchInTime = inPunches[0].time;
          if (shift) {
            const [shHour, shMin] = shift.startTime.split(':').map(Number);
            const grace = shift.gracePeriod || 15;
            const shiftStart = new Date(punchInTime);
            shiftStart.setHours(shHour, shMin, 0, 0);

            if (new Date(punchInTime) > new Date(shiftStart.getTime() + grace * 60 * 1000)) {
              finalStatus = 'Late';
            }
          }
        }
      }

      attendance.status = finalStatus;
    }

    attendance.regularization.status = status;
    attendance.regularization.requested = false;
    attendance.regularization.approvedBy = req.user._id;
    attendance.regularization.comments = comments;

    await attendance.save();

    // Notify requester
    const requesterUser = await User.findOne({ employeeProfileId: attendance.employeeId._id, tenantId: req.tenantId });
    if (requesterUser) {
      await notifyUser({
        tenantId: req.tenantId,
        userId: requesterUser._id,
        title: `Regularization request ${status}`,
        message: `Your attendance regularization request for ${attendance.date} has been ${status.toLowerCase()}`,
        link: '/attendance'
      });
    }

    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: `ATTENDANCE_REGULARIZATION_${status.toUpperCase()}`,
      details: `Attendance for ${attendance.employeeId.personal.name} on ${attendance.date} regularized to ${status.toLowerCase()}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error during regularization approval action', error: error.message });
  }
};

// @desc    Process sensitive profile edits approval
// @route   PUT /api/approvals/profile-edit/:id
// @access  Private (HR only)
const actionProfileEdit = async (req, res) => {
  const { status, comments } = req.body; // Approved / Rejected

  if (req.user.role !== 'HR') {
    return res.status(403).json({ success: false, message: 'Only HR Admins can process profile edit requests' });
  }

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Please provide valid action status: Approved or Rejected' });
  }

  try {
    const request = await ProfileEditRequest.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('employeeId');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Profile edit request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    if (status === 'Approved') {
      const employee = request.employeeId;
      
      // Apply changes from sensitiveFields Map to Employee banking details
      const updates = request.sensitiveFields;
      updates.forEach((val, key) => {
        // e.g. key: "bank.accountNumber", val: "12345"
        const parts = key.split('.');
        if (parts[0] === 'bank' && parts[1]) {
          employee.bank[parts[1]] = val;
        }
      });

      await employee.save();
    }

    request.status = status;
    request.approvedBy = req.user._id;
    request.comments = comments;
    await request.save();

    // Notify requester
    const requesterUser = await User.findOne({ employeeProfileId: request.employeeId._id, tenantId: req.tenantId });
    if (requesterUser) {
      await notifyUser({
        tenantId: req.tenantId,
        userId: requesterUser._id,
        title: `Profile Update Request ${status}`,
        message: `Your sensitive profile details update request has been ${status.toLowerCase()}`,
        link: '/profile'
      });
    }

    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: `PROFILE_EDIT_${status.toUpperCase()}`,
      details: `Profile update request for ${request.employeeId.personal.name} has been ${status.toLowerCase()}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error during profile edit approval action', error: error.message });
  }
};

module.exports = {
  getPendingApprovals,
  actionLeave,
  actionRegularization,
  actionProfileEdit
};
