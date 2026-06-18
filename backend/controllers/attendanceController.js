const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const { notifyUser } = require('../services/notifyService');
const AuditLog = require('../models/AuditLog');

// Helper: Calculate late mark and status
const calculatePunchStatus = (punchInTime, shift) => {
  if (!shift) return 'Present';

  const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number);
  const graceMinutes = shift.gracePeriod || 15;

  const punchTime = new Date(punchInTime);
  const shiftStart = new Date(punchTime);
  shiftStart.setHours(shiftHour, shiftMin, 0, 0);

  const lateLimit = new Date(shiftStart.getTime() + graceMinutes * 60 * 1000);

  if (punchTime > lateLimit) {
    return 'Late';
  }
  return 'Present';
};

// @desc    Punch In / Out
// @route   POST /api/attendance/punch
// @access  Private
const punch = async (req, res) => {
  const { type, time, ipAddress, location } = req.body;
  const employeeId = req.user.employeeProfileId;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'User does not have an employee profile associated' });
  }

  if (!type || !time) {
    return res.status(400).json({ success: false, message: 'Please provide punch type (In/Out) and time' });
  }

  const punchDate = new Date(time).toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const tenant = await Tenant.findById(req.tenantId);
    const shift = tenant?.settings?.shifts?.find(s => s.id === employee.employment.shiftId) || {
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15
    };

    let record = await Attendance.findOne({
      tenantId: req.tenantId,
      employeeId,
      date: punchDate
    });

    if (!record) {
      if (type === 'Out') {
        return res.status(400).json({ success: false, message: 'Cannot punch out without punching in first' });
      }

      // Create new record for today
      const punchStatus = calculatePunchStatus(time, shift);
      record = await Attendance.create({
        tenantId: req.tenantId,
        employeeId,
        date: punchDate,
        punches: [{ type, time: new Date(time), ipAddress, location }],
        status: punchStatus
      });
    } else {
      // Check duplicate punch type (prevent double In or double Out without matching pairs, though we can allow multiple)
      const lastPunch = record.punches[record.punches.length - 1];
      if (lastPunch && lastPunch.type === type) {
        return res.status(400).json({ success: false, message: `Already punched ${type} last` });
      }

      record.punches.push({ type, time: new Date(time), ipAddress, location });

      // If punching out, calculate hours
      if (type === 'Out') {
        // Find matching In punch (usually the one right before, or first punch)
        const inPunches = record.punches.filter(p => p.type === 'In');
        const outPunches = record.punches.filter(p => p.type === 'Out');

        let totalDurationMs = 0;
        for (let i = 0; i < Math.min(inPunches.length, outPunches.length); i++) {
          totalDurationMs += new Date(outPunches[i].time) - new Date(inPunches[i].time);
        }

        const totalHours = totalDurationMs / (1000 * 60 * 60);
        record.totalHours = parseFloat(totalHours.toFixed(2));

        // Adjust status if they worked less than 4 hours (Half-Day) or 8 hours, etc.
        if (record.totalHours < 4) {
          record.status = 'Half-Day';
        }
      }

      await record.save();
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error processing punch', error: error.message });
  }
};

// @desc    Get attendance history (Filtered by user role)
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    let query = { tenantId: req.tenantId };

    const isHrOrLeadership = ['HR', 'Leadership'].includes(req.user.role);

    if (employeeId) {
      // If employeeId is specified, check access permissions
      const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employeeId;
      
      let isManager = false;
      if (req.user.role === 'Manager') {
        const emp = await Employee.findById(employeeId);
        if (emp && emp.employment.managerId && emp.employment.managerId.toString() === req.user.employeeProfileId?.toString()) {
          isManager = true;
        }
      }

      if (!isSelf && !isHrOrLeadership && !isManager) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this employee\'s attendance' });
      }
      query.employeeId = employeeId;
    } else {
      // If no employeeId specified, limit queries
      if (req.user.role === 'Employee') {
        query.employeeId = req.user.employeeProfileId;
      } else if (req.user.role === 'Manager') {
        // Manager sees team + own
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
      // HR/Leadership see everyone, query stays scoped by tenantId only
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('employeeId', 'personal.name employeeId employment.department employment.designation')
      .sort({ date: -1 });

    res.status(200).json({ success: true, count: attendanceRecords.length, data: attendanceRecords });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching attendance history', error: error.message });
  }
};

// @desc    Request attendance regularization
// @route   POST /api/attendance/regularize
// @access  Private
const requestRegularization = async (req, res) => {
  const { date, reason, requestedPunches } = req.body;
  const employeeId = req.user.employeeProfileId;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'No employee profile' });
  }

  if (!date || !reason || !requestedPunches || !requestedPunches.length) {
    return res.status(400).json({ success: false, message: 'Please provide date, reason, and requested punches' });
  }

  try {
    let attendance = await Attendance.findOne({
      tenantId: req.tenantId,
      employeeId,
      date
    });

    const originalStatus = attendance ? attendance.status : 'Absent';

    if (!attendance) {
      // Create a temporary placeholder attendance record to attach regularization to
      attendance = new Attendance({
        tenantId: req.tenantId,
        employeeId,
        date,
        punches: [],
        status: 'Absent'
      });
    }

    // Attach regularization details
    attendance.regularization = {
      requested: true,
      reason,
      status: 'Pending',
      originalStatus,
      requestedPunches: requestedPunches.map(p => ({
        type: p.type,
        time: new Date(p.time)
      }))
    };

    await attendance.save();

    // Notify Manager or HR
    const emp = await Employee.findById(employeeId);
    let managerUser = null;
    if (emp?.employment?.managerId) {
      managerUser = await User.findOne({ employeeProfileId: emp.employment.managerId, tenantId: req.tenantId });
    }

    // Default to notifying HR if no manager
    const notifyUserId = managerUser ? managerUser._id : (await User.findOne({ tenantId: req.tenantId, role: 'HR' }))?._id;

    if (notifyUserId) {
      await notifyUser({
        tenantId: req.tenantId,
        userId: notifyUserId,
        title: 'Attendance Regularization Request',
        message: `${emp.personal.name} requested correction for date: ${date}`,
        link: '/approvals'
      });
    }

    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'ATTENDANCE_REGULARIZATION_REQUESTED',
      details: `Regularization requested for ${date}`,
      ipAddress: req.ip
    });

    res.status(200).json({ success: true, message: 'Regularization request submitted successfully', data: attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error requesting regularization', error: error.message });
  }
};

module.exports = {
  punch,
  getAttendance,
  requestRegularization
};
