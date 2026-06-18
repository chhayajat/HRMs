const Employee = require('../models/Employee');
const User = require('../models/User');
const LeaveBalance = require('../models/LeaveBalance');
const Tenant = require('../models/Tenant');
const ProfileEditRequest = require('../models/ProfileEditRequest');
const AuditLog = require('../models/AuditLog');
const { notifyUser, notifyUsers, notifyNewEmployee } = require('../services/notifyService');

// Helper to check circular reporting
const isCircularReporting = async (employeeId, managerId, tenantId) => {
  if (!managerId) return false;
  if (employeeId && employeeId.toString() === managerId.toString()) return true;

  let currentManagerId = managerId;
  const visited = new Set();

  while (currentManagerId) {
    if (employeeId && currentManagerId.toString() === employeeId.toString()) {
      return true;
    }
    if (visited.has(currentManagerId.toString())) {
      // Loop detected
      return true;
    }
    visited.add(currentManagerId.toString());

    const mgr = await Employee.findOne({ _id: currentManagerId, tenantId });
    if (!mgr || !mgr.employment.managerId) {
      break;
    }
    currentManagerId = mgr.employment.managerId;
  }

  return false;
};

// @desc    Create new employee (Onboarding)
// @route   POST /api/employees
// @access  Private (HR/Admin)
const createEmployee = async (req, res) => {
  const { employeeId, personal, contact, employment, bank, professional } = req.body;

  if (!employeeId || !personal?.name || !contact?.personalEmail || !contact?.phone || !employment?.department || !employment?.designation) {
    return res.status(400).json({ success: false, message: 'Please provide required employee details' });
  }

  try {
    // Check if employeeId already exists for this tenant
    const existingEmp = await Employee.findOne({ tenantId: req.tenantId, employeeId });
    if (existingEmp) {
      return res.status(400).json({ success: false, message: `Employee ID ${employeeId} already exists in this organization` });
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: contact.personalEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `Email ${contact.personalEmail} is already registered` });
    }

    // Verify manager circularity
    if (employment.managerId) {
      const isCircular = await isCircularReporting(null, employment.managerId, req.tenantId);
      if (isCircular) {
        return res.status(400).json({ success: false, message: 'Invalid reporting manager. Circular hierarchy detected.' });
      }
    }

    // Create Employee Profile
    const employee = await Employee.create({
      tenantId: req.tenantId,
      employeeId,
      personal,
      contact,
      employment,
      bank,
      professional,
      status: 'Active'
    });

    // Create User login account
    // Generate a default password for new users
    const defaultPassword = 'Welcome@123';
    const user = await User.create({
      email: contact.personalEmail,
      password: defaultPassword,
      role: req.body.role || 'Employee', // User role: Employee, Manager, HR, Leadership
      tenantId: req.tenantId,
      employeeProfileId: employee._id
    });

    // Get Tenant leave policy
    const tenant = await Tenant.findById(req.tenantId);
    const leavePolicies = tenant?.settings?.leavePolicies || [
      { leaveType: 'Casual', allocation: 12 },
      { leaveType: 'Sick', allocation: 10 },
      { leaveType: 'Earned', allocation: 15 }
    ];

    // Seed Leave Balance for the current year
    const currentYear = new Date().getFullYear();
    const balances = leavePolicies.map(policy => ({
      leaveType: policy.leaveType,
      allocated: policy.allocation,
      used: 0,
      pending: 0
    }));

    // Add Loss of Pay
    balances.push({ leaveType: 'Loss of Pay', allocated: 999, used: 0, pending: 0 });

    await LeaveBalance.create({
      tenantId: req.tenantId,
      employeeId: employee._id,
      year: currentYear,
      balances
    });

    // Audit Log
    await AuditLog.create({
      tenantId: req.tenantId,
      userId: req.user._id,
      action: 'EMPLOYEE_ONBOARDED',
      details: `Employee ${personal.name} (${employeeId}) onboarded. User login created.`,
      ipAddress: req.ip
    });

    // Notify new employee (credentials sent via email only)
    await notifyNewEmployee({
      tenantId: req.tenantId,
      userId: user._id,
      name: personal.name,
      email: user.email,
      defaultPassword
    });

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error onboarding employee', error: error.message });
  }
};

// @desc    Get all employees (Scoped by permission)
// @route   GET /api/employees
// @access  Private
const getEmployees = async (req, res) => {
  try {
    let query = { tenantId: req.tenantId };

    // If role is Employee or Leadership, they can search the directory
    // If role is Manager, they might search directory
    // HR/Admin can see all details
    // We populate the user details (role)
    const employees = await Employee.find(query)
      .populate('employment.managerId', 'personal.name employeeId contact.officialEmail')
      .sort('personal.name');

    // Filter sensitive info if the requester is an ordinary Employee or Manager (unless they are HR or Leadership)
    const isHrOrLeadership = ['HR', 'Leadership'].includes(req.user.role);

    const formattedEmployees = employees.map(emp => {
      const empObj = emp.toObject();
      if (!isHrOrLeadership && empObj._id.toString() !== req.user.employeeProfileId?.toString()) {
        // Strip sensitive banking and statutory details for others
        delete empObj.bank;
        delete empObj.contact.permanentAddress;
        delete empObj.contact.currentAddress;
        delete empObj.contact.emergencyContact;
        delete empObj.personal.dob;
        delete empObj.personal.maritalStatus;
      }
      return empObj;
    });

    res.status(200).json({ success: true, count: formattedEmployees.length, data: formattedEmployees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching employees', error: error.message });
  }
};

// @desc    Get single employee details
// @route   GET /api/employees/:id
// @access  Private
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('employment.managerId', 'personal.name employeeId contact.officialEmail');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Access control:
    // HR / Leadership can see any employee profile in full.
    // Manager can see their team members.
    // Employee can only see their own profile in full. Others see restricted details.
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employee._id.toString();
    const isHrOrLeadership = ['HR', 'Leadership'].includes(req.user.role);
    
    let isManager = false;
    if (req.user.role === 'Manager') {
      // Check if this employee reports to the current user
      if (employee.employment.managerId && employee.employment.managerId._id.toString() === req.user.employeeProfileId?.toString()) {
        isManager = true;
      }
    }

    const empObj = employee.toObject();
    
    // Fetch associated user login for role configuration details
    const associatedUser = await User.findOne({ employeeProfileId: employee._id, tenantId: req.tenantId });
    empObj.role = associatedUser ? associatedUser.role : 'Employee';

    if (!isSelf && !isHrOrLeadership && !isManager) {
      // Strip sensitive details if not self, HR/Leadership or manager
      delete empObj.bank;
      delete empObj.contact.permanentAddress;
      delete empObj.contact.currentAddress;
      delete empObj.contact.emergencyContact;
      delete empObj.personal.dob;
      delete empObj.personal.maritalStatus;
    }

    res.status(200).json({ success: true, data: empObj });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching employee profile', error: error.message });
  }
};

// @desc    Update employee profile
// @route   PUT /api/employees/:id
// @access  Private
const updateEmployee = async (req, res) => {
  const { personal, contact, employment, bank, professional, role } = req.body;

  try {
    let employee = await Employee.findOne({ _id: req.params.id, tenantId: req.tenantId });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const isHr = req.user.role === 'HR';
    const isSelf = req.user.employeeProfileId && req.user.employeeProfileId.toString() === employee._id.toString();

    if (!isHr && !isSelf) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
    }

    // If HR is updating, allow everything and update role if requested
    if (isHr) {
      // Validate circular reporting if manager changes
      if (employment?.managerId && employment.managerId !== employee.employment.managerId?.toString()) {
        const isCircular = await isCircularReporting(employee._id, employment.managerId, req.tenantId);
        if (isCircular) {
          return res.status(400).json({ success: false, message: 'Circular manager assignment blocked' });
        }
      }

      // Perform direct update
      employee = await Employee.findByIdAndUpdate(
        req.params.id,
        { $set: { personal, contact, employment, bank, professional } },
        { new: true, runValidators: true }
      );

      // If role is changing, update the User document
      if (role) {
        await User.findOneAndUpdate(
          { employeeProfileId: employee._id, tenantId: req.tenantId },
          { $set: { role } }
        );
      }

      await AuditLog.create({
        tenantId: req.tenantId,
        userId: req.user._id,
        action: 'EMPLOYEE_UPDATED_BY_HR',
        details: `Employee profile ${employee.personal.name} (${employee.employeeId}) updated by HR`,
        ipAddress: req.ip
      });

      return res.status(200).json({ success: true, message: 'Profile updated successfully', data: employee });
    }

    // If Employee is updating their own profile
    if (isSelf) {
      // Personal & Contact fields can be updated directly (except official email)
      const allowedPersonal = {
        name: personal?.name || employee.personal.name,
        dob: personal?.dob || employee.personal.dob,
        gender: personal?.gender || employee.personal.gender,
        photo: personal?.photo || employee.personal.photo,
        maritalStatus: personal?.maritalStatus || employee.personal.maritalStatus,
        nationality: personal?.nationality || employee.personal.nationality
      };

      const allowedContact = {
        personalEmail: contact?.personalEmail || employee.contact.personalEmail,
        phone: contact?.phone || employee.contact.phone,
        currentAddress: contact?.currentAddress || employee.contact.currentAddress,
        permanentAddress: contact?.permanentAddress || employee.contact.permanentAddress,
        emergencyContact: contact?.emergencyContact || employee.contact.emergencyContact,
        officialEmail: employee.contact.officialEmail // cannot change official email
      };

      // Bank & Statutory fields are sensitive and require approval
      const sensitiveUpdates = {};
      let hasSensitiveChanges = false;

      if (bank) {
        const fields = ['accountName', 'accountNumber', 'bankName', 'ifscCode', 'panNumber', 'aadhaarNumber', 'pfNumber', 'esiNumber', 'uanNumber'];
        fields.forEach(field => {
          if (bank[field] !== undefined && bank[field] !== employee.bank[field]) {
            sensitiveUpdates[`bank.${field}`] = bank[field];
            hasSensitiveChanges = true;
          }
        });
      }

      // Apply non-sensitive changes directly
      employee.personal = allowedPersonal;
      employee.contact = allowedContact;
      if (professional) {
        employee.professional = professional;
      }
      await employee.save();

      // Handle sensitive edits
      if (hasSensitiveChanges) {
        // Create ProfileEditRequest
        await ProfileEditRequest.create({
          tenantId: req.tenantId,
          employeeId: employee._id,
          sensitiveFields: sensitiveUpdates
        });

        // Notify HR Admins
        const hrUsers = await User.find({ tenantId: req.tenantId, role: 'HR' });
        await notifyUsers(hrUsers, {
          tenantId: req.tenantId,
          title: 'Profile Edit Request',
          message: `${employee.personal.name} requested sensitive banking/statutory updates`,
          link: '/approvals'
        });

        await AuditLog.create({
          tenantId: req.tenantId,
          userId: req.user._id,
          action: 'PROFILE_EDIT_REQUESTED',
          details: `User ${employee.personal.name} requested bank/statutory updates`,
          ipAddress: req.ip
        });

        return res.status(200).json({
          success: true,
          message: 'Profile updated. Sensitive banking/statutory changes submitted to HR for approval.',
          data: employee
        });
      }

      await AuditLog.create({
        tenantId: req.tenantId,
        userId: req.user._id,
        action: 'EMPLOYEE_SELF_UPDATED',
        details: `User ${employee.personal.name} self-updated profile`,
        ipAddress: req.ip
      });

      return res.status(200).json({ success: true, message: 'Profile updated successfully', data: employee });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error updating employee profile', error: error.message });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee
};
