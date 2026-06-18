require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Employee = require('./models/Employee');
const LeaveBalance = require('./models/LeaveBalance');
const Attendance = require('./models/Attendance');
const LeaveRequest = require('./models/LeaveRequest');
const AuditLog = require('./models/AuditLog');
const Notification = require('./models/Notification');
const ProfileEditRequest = require('./models/ProfileEditRequest');

const seedData = async () => {
  try {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2000
      });
      console.log('Connected to MongoDB to seed...');
      process.env.USE_MOCK_DB = 'false';
    } catch (dbError) {
      console.warn(`\n⚠️ MongoDB connection failed for seeding: ${dbError.message}`);
      console.warn('⚠️ Seeding persistent file-based JSON Database (backend/data/db.json) instead...\n');
      process.env.USE_MOCK_DB = 'true';
    }

    // Clear existing data
    await Tenant.deleteMany({});
    await User.deleteMany({});
    await Employee.deleteMany({});
    await LeaveBalance.deleteMany({});
    await Attendance.deleteMany({});
    await LeaveRequest.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});
    await ProfileEditRequest.deleteMany({});
    console.log('Cleared existing database records.');

    // 1. Create Tenants
    const tenant1 = await Tenant.create({
      name: 'Antigravity Corp',
      domain: 'antigravity.com'
    });
    const tenant2 = await Tenant.create({
      name: 'Beta Systems',
      domain: 'betasystems.com'
    });
    console.log('Tenants created.');

    // 2. Create Employee Profiles for Tenant 1
    // HR Admin
    const hrEmp = await Employee.create({
      tenantId: tenant1._id,
      employeeId: 'AG-001',
      status: 'Active',
      personal: { name: 'Rita Sharma', gender: 'Female', nationality: 'Indian' },
      contact: { personalEmail: 'hr@antigravity.com', phone: '9876543210' },
      employment: { department: 'Human Resources', designation: 'HR Lead', location: 'Mumbai' }
    });

    // Manager
    const managerEmp = await Employee.create({
      tenantId: tenant1._id,
      employeeId: 'AG-002',
      status: 'Active',
      personal: { name: 'Vikram Singh', gender: 'Male', nationality: 'Indian' },
      contact: { personalEmail: 'manager@antigravity.com', phone: '9876543211' },
      employment: { department: 'Engineering', designation: 'Engineering Manager', location: 'Bengaluru', managerId: hrEmp._id }
    });

    // Regular Employee
    const regularEmp = await Employee.create({
      tenantId: tenant1._id,
      employeeId: 'AG-003',
      status: 'Active',
      personal: { name: 'Amit Patel', gender: 'Male', nationality: 'Indian' },
      contact: { personalEmail: 'employee@antigravity.com', phone: '9876543212' },
      employment: { department: 'Engineering', designation: 'Software Engineer', location: 'Bengaluru', managerId: managerEmp._id }
    });

    // Leadership
    const leaderEmp = await Employee.create({
      tenantId: tenant1._id,
      employeeId: 'AG-004',
      status: 'Active',
      personal: { name: 'Suresh Mehta', gender: 'Male', nationality: 'Indian' },
      contact: { personalEmail: 'leader@antigravity.com', phone: '9876543213' },
      employment: { department: 'Leadership', designation: 'VP Engineering', location: 'Mumbai' }
    });

    // HR Admin for Tenant 2 (Isolation Check)
    const hrEmpTenant2 = await Employee.create({
      tenantId: tenant2._id,
      employeeId: 'BETA-001',
      status: 'Active',
      personal: { name: 'Rahul Verma', gender: 'Male', nationality: 'Indian' },
      contact: { personalEmail: 'hr@betasystems.com', phone: '9811122233' },
      employment: { department: 'HR Operations', designation: 'HR Manager', location: 'Delhi' }
    });

    console.log('Employee profiles created.');

    // 3. Create User Login Accounts (Password is 'Welcome@123' for all)
    const password = 'Welcome@123';

    const users = [
      { email: 'hr@antigravity.com', password, role: 'HR', tenantId: tenant1._id, employeeProfileId: hrEmp._id },
      { email: 'manager@antigravity.com', password, role: 'Manager', tenantId: tenant1._id, employeeProfileId: managerEmp._id },
      { email: 'employee@antigravity.com', password, role: 'Employee', tenantId: tenant1._id, employeeProfileId: regularEmp._id },
      { email: 'leader@antigravity.com', password, role: 'Leadership', tenantId: tenant1._id, employeeProfileId: leaderEmp._id },
      { email: 'hr@betasystems.com', password, role: 'HR', tenantId: tenant2._id, employeeProfileId: hrEmpTenant2._id }
    ];

    for (const u of users) {
      await User.create(u);
    }
    console.log('User login credentials seeded.');

    // 4. Seed Leave Balances
    const employees = [hrEmp, managerEmp, regularEmp, leaderEmp, hrEmpTenant2];
    const currentYear = new Date().getFullYear();

    for (const emp of employees) {
      await LeaveBalance.create({
        tenantId: emp.tenantId,
        employeeId: emp._id,
        year: currentYear,
        balances: [
          { leaveType: 'Casual', allocated: 12, used: 0, pending: 0 },
          { leaveType: 'Sick', allocated: 10, used: 0, pending: 0 },
          { leaveType: 'Earned', allocated: 15, used: 0, pending: 0 },
          { leaveType: 'Loss of Pay', allocated: 999, used: 0, pending: 0 }
        ]
      });
    }
    console.log('Leave balances initialized.');

    // 5. Seed Mock Attendance (Punches for last 5 days for Amit Patel - regularEmp)
    const today = new Date();
    for (let i = 5; i > 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const day = d.getDay();

      if (day !== 0 && day !== 6) { // Skip weekends
        // Punch In at 9:00 AM (Present) or 9:20 AM (Late)
        const punchInHour = i === 2 ? 9 : 8; // i=2 is late
        const punchInMin = i === 2 ? 25 : 50; 
        const punchInTime = new Date(d);
        punchInTime.setHours(punchInHour, punchInMin, 0, 0);

        const punchOutTime = new Date(d);
        punchOutTime.setHours(18, 0, 0, 0);

        await Attendance.create({
          tenantId: tenant1._id,
          employeeId: regularEmp._id,
          date: dateStr,
          punches: [
            { type: 'In', time: punchInTime, ipAddress: '192.168.1.55', location: 'Office' },
            { type: 'Out', time: punchOutTime, ipAddress: '192.168.1.55', location: 'Office' }
          ],
          totalHours: i === 2 ? 8.58 : 9.17,
          status: i === 2 ? 'Late' : 'Present'
        });
      }
    }
    console.log('Mock attendance logs seeded.');

    // 6. Create one pending Leave Request for Amit Patel (regularEmp)
    const leaveStart = new Date(today);
    leaveStart.setDate(today.getDate() + 2);
    const leaveEnd = new Date(today);
    leaveEnd.setDate(today.getDate() + 4);

    await LeaveRequest.create({
      tenantId: tenant1._id,
      employeeId: regularEmp._id,
      leaveType: 'Casual',
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: 'Family emergency trip',
      status: 'Pending'
    });

    // Update pending balance
    const regularBal = await LeaveBalance.findOne({ tenantId: tenant1._id, employeeId: regularEmp._id });
    if (regularBal) {
      const casualBal = regularBal.balances.find(b => b.leaveType === 'Casual');
      if (casualBal) {
        casualBal.pending = 3;
        await regularBal.save();
      }
    }

    // Create a pending regularization request for Amit Patel (for yesterday or 1 day ago)
    const regularizeDate = new Date(today);
    regularizeDate.setDate(today.getDate() - 1);
    const regDateStr = regularizeDate.toISOString().split('T')[0];

    const inTime = new Date(regularizeDate);
    inTime.setHours(9, 5, 0, 0);
    const outTime = new Date(regularizeDate);
    outTime.setHours(18, 5, 0, 0);

    await Attendance.create({
      tenantId: tenant1._id,
      employeeId: regularEmp._id,
      date: regDateStr,
      punches: [],
      status: 'Absent',
      regularization: {
        requested: true,
        reason: 'Forget card/System issue',
        status: 'Pending',
        originalStatus: 'Absent',
        requestedPunches: [
          { type: 'In', time: inTime },
          { type: 'Out', time: outTime }
        ]
      }
    });

    // Create initial audit log
    await AuditLog.create({
      tenantId: tenant1._id,
      action: 'SYSTEM_SEED',
      details: 'Database seeded with default testing environment data.'
    });

    console.log('Seeding process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
