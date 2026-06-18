const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const User = require('../models/User');
const ProfileEditRequest = require('../models/ProfileEditRequest');

// @desc    Get dashboard summary cards
// @route   GET /api/reports/dashboard-summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  const role = req.user.role;
  const employeeId = req.user.employeeProfileId;

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // --- 1. EMPLOYEE DASHBOARD DATA ---
    if (role === 'Employee') {
      if (!employeeId) {
        return res.status(200).json({ success: true, data: { message: 'No employee profile' } });
      }

      // Leave Balance
      const balanceDoc = await LeaveBalance.findOne({
        tenantId: req.tenantId,
        employeeId,
        year: new Date().getFullYear()
      });
      const leaveBalances = balanceDoc ? balanceDoc.balances : [];

      // Attendance current month stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

      const attendanceList = await Attendance.find({
        tenantId: req.tenantId,
        employeeId,
        date: { $gte: startOfMonthStr, $lte: todayStr }
      });

      const stats = {
        present: 0,
        late: 0,
        halfDay: 0,
        absent: 0,
        onLeave: 0
      };

      attendanceList.forEach(rec => {
        if (rec.status === 'Present') stats.present++;
        else if (rec.status === 'Late') stats.late++;
        else if (rec.status === 'Half-Day') stats.halfDay++;
        else if (rec.status === 'Absent') stats.absent++;
        else if (rec.status === 'On Leave') stats.onLeave++;
      });

      // Recent Leave Requests
      const recentLeaves = await LeaveRequest.find({
        tenantId: req.tenantId,
        employeeId
      }).sort({ createdAt: -1 }).limit(5);

      return res.status(200).json({
        success: true,
        data: {
          role,
          leaveBalances,
          attendanceStats: stats,
          recentLeaves
        }
      });
    }

    // --- 2. MANAGER DASHBOARD DATA ---
    if (role === 'Manager') {
      // Find reporting employees
      const reportingEmployees = await Employee.find({
        tenantId: req.tenantId,
        'employment.managerId': employeeId
      });
      const teamIds = reportingEmployees.map(e => e._id);

      // Today's team attendance
      const teamAttendance = await Attendance.find({
        tenantId: req.tenantId,
        employeeId: { $in: teamIds },
        date: todayStr
      }).populate('employeeId', 'personal.name');

      const attendanceStats = {
        present: 0,
        late: 0,
        absent: teamIds.length, // initial absent count
        onLeave: 0
      };

      teamAttendance.forEach(rec => {
        if (rec.status === 'Present') {
          attendanceStats.present++;
          attendanceStats.absent--;
        } else if (rec.status === 'Late') {
          attendanceStats.late++;
          attendanceStats.absent--;
        } else if (rec.status === 'On Leave') {
          attendanceStats.onLeave++;
          attendanceStats.absent--;
        } else if (rec.status === 'Half-Day') {
          attendanceStats.present++; // count as present for quick summary
          attendanceStats.absent--;
        }
      });

      // Count of pending approvals (Leaves + Regularizations)
      const pendingLeavesCount = await LeaveRequest.countDocuments({
        tenantId: req.tenantId,
        employeeId: { $in: teamIds },
        status: 'Pending'
      });

      const pendingRegularizationsCount = await Attendance.countDocuments({
        tenantId: req.tenantId,
        employeeId: { $in: teamIds },
        'regularization.requested': true,
        'regularization.status': 'Pending'
      });

      return res.status(200).json({
        success: true,
        data: {
          role,
          teamSize: teamIds.length,
          todayAttendance: attendanceStats,
          pendingApprovals: pendingLeavesCount + pendingRegularizationsCount,
          teamList: reportingEmployees.map(e => ({
            id: e._id,
            name: e.personal.name,
            designation: e.employment.designation,
            department: e.employment.department
          }))
        }
      });
    }

    // --- 3. HR / LEADERSHIP DASHBOARD DATA ---
    if (['HR', 'Leadership'].includes(role)) {
      // Total Headcount
      const totalEmployees = await Employee.countDocuments({ tenantId: req.tenantId, status: 'Active' });

      // Today's attendance stats
      const totalAttendance = await Attendance.find({
        tenantId: req.tenantId,
        date: todayStr
      });

      const attendanceStats = {
        present: 0,
        late: 0,
        onLeave: 0,
        absent: totalEmployees
      };

      totalAttendance.forEach(rec => {
        if (rec.status === 'Present') {
          attendanceStats.present++;
          attendanceStats.absent--;
        } else if (rec.status === 'Late') {
          attendanceStats.late++;
          attendanceStats.absent--;
        } else if (rec.status === 'On Leave') {
          attendanceStats.onLeave++;
          attendanceStats.absent--;
        } else if (rec.status === 'Half-Day') {
          attendanceStats.present++;
          attendanceStats.absent--;
        }
      });
      if (attendanceStats.absent < 0) attendanceStats.absent = 0;

      // Pending tasks
      const pendingLeaves = await LeaveRequest.countDocuments({ tenantId: req.tenantId, status: 'Pending' });
      const pendingRegularize = await Attendance.countDocuments({ tenantId: req.tenantId, 'regularization.requested': true, 'regularization.status': 'Pending' });
      const pendingProfileEdits = await ProfileEditRequest.countDocuments({ tenantId: req.tenantId, status: 'Pending' });

      // Department breakdown
      const departmentData = await Employee.aggregate([
        { $match: { tenantId: req.tenantId, status: 'Active' } },
        { $group: { _id: '$employment.department', count: { $sum: 1 } } }
      ]);

      return res.status(200).json({
        success: true,
        data: {
          role,
          totalEmployees,
          todayAttendance: attendanceStats,
          pendingTasks: {
            leaves: pendingLeaves,
            regularizations: pendingRegularize,
            profileEdits: pendingProfileEdits,
            total: pendingLeaves + pendingRegularize + pendingProfileEdits
          },
          departmentStats: departmentData.map(d => ({ name: d._id || 'Unassigned', count: d.count }))
        }
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching dashboard stats', error: error.message });
  }
};

// @desc    Get detailed report metrics (For HR/Leadership)
// @route   GET /api/reports/analytics
// @access  Private (HR/Leadership)
const getAnalyticsReport = async (req, res) => {
  const { type, startDate, endDate } = req.query;

  try {
    let responseData = {};

    // 1. Headcount & Attrition stats
    if (type === 'headcount') {
      const activeCount = await Employee.countDocuments({ tenantId: req.tenantId, status: 'Active' });
      const probationCount = await Employee.countDocuments({ tenantId: req.tenantId, status: 'Probation' });
      const onboardingCount = await Employee.countDocuments({ tenantId: req.tenantId, status: 'Onboarding' });
      const terminatedCount = await Employee.countDocuments({ tenantId: req.tenantId, status: 'Terminated' });

      responseData = {
        activeCount,
        probationCount,
        onboardingCount,
        terminatedCount,
        total: activeCount + probationCount + onboardingCount
      };
    } 
    // 2. Attendance Summary
    else if (type === 'attendance') {
      const records = await Attendance.find({
        tenantId: req.tenantId,
        date: { $gte: startDate, $lte: endDate }
      }).populate('employeeId', 'personal.name employment.department');

      responseData = records;
    }
    // 3. Leave details
    else if (type === 'leaves') {
      const leaves = await LeaveRequest.find({
        tenantId: req.tenantId,
        startDate: { $gte: new Date(startDate) },
        endDate: { $lte: new Date(endDate) }
      }).populate('employeeId', 'personal.name employment.department');

      responseData = leaves;
    }

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error loading analytics report', error: error.message });
  }
};

module.exports = {
  getDashboardSummary,
  getAnalyticsReport
};
