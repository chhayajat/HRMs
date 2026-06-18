const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Employee = require('../models/Employee');
const AuditLog = require('../models/AuditLog');
const { notifyUser, sendDirectEmail } = require('../services/notifyService');
const { buildEmailHtml } = require('../services/emailService');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const findUserByResetToken = async (token) => {
  const hashed = hashToken(token);
  const now = Date.now();

  if (process.env.USE_MOCK_DB === 'true') {
    const users = await User.find({});
    return users.find(
      (u) => u.resetPasswordToken === hashed && u.resetPasswordExpire && new Date(u.resetPasswordExpire).getTime() > now
    ) || null;
  }

  return User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: now }
  }).select('+password +resetPasswordToken +resetPasswordExpire');
};

// Generate Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_LIFETIME || '1d' }
  );
};

// @desc    Register a new tenant (Company) along with the initial HR Admin User
// @route   POST /api/auth/register-tenant
// @access  Public
const registerTenant = async (req, res) => {
  const { tenantName, email, password, name } = req.body;

  if (!tenantName || !email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Please provide all details: tenantName, email, password, name' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const tenant = await Tenant.create({ name: tenantName });

    const employee = await Employee.create({
      tenantId: tenant._id,
      employeeId: 'EMP-001',
      status: 'Active',
      personal: { name },
      contact: { personalEmail: email, phone: '0000000000' },
      employment: { department: 'Human Resources', designation: 'HR Administrator' }
    });

    const user = await User.create({
      email,
      password,
      role: 'Leadership',
      tenantId: tenant._id,
      employeeProfileId: employee._id
    });

    const token = generateToken(user);

    await AuditLog.create({
      tenantId: tenant._id,
      userId: user._id,
      action: 'TENANT_REGISTERED',
      details: `Company '${tenantName}' registered. HR Admin '${email}' created.`,
      ipAddress: req.ip
    });

    await notifyUser({
      tenantId: tenant._id,
      userId: user._id,
      title: 'Welcome to Gravity HRMS!',
      message: `Hello ${name}, your company "${tenantName}" has been registered successfully. You can log in with ${email} and start managing employees, attendance, and leaves.`,
      link: '/dashboard'
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        employeeProfileId: user.employeeProfileId
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error during Tenant registration', error: error.message });
  }
};

// @desc    Log in User
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    let user;
    if (process.env.USE_MOCK_DB === 'true') {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ email }).select('+password');
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.round((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account locked. Please try again after ${remainingMinutes} minutes`
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedAttempts += 1;

      if (user.failedAttempts >= 5) {
        user.lockUntil = Date.now() + 15 * 60 * 1000;
        user.failedAttempts = 0;
        await user.save();

        await AuditLog.create({
          tenantId: user.tenantId,
          userId: user._id,
          action: 'ACCOUNT_LOCKED',
          details: `User '${email}' locked due to 5 consecutive failed logins`,
          ipAddress: req.ip
        });

        sendDirectEmail({
          to: email,
          subject: 'Account Locked - Security Alert',
          message: `Your Gravity HRMS account (${email}) has been temporarily locked due to 5 consecutive failed login attempts.\n\nYour account will be unlocked automatically after 15 minutes.`,
          link: '/login',
          html: buildEmailHtml({
            title: 'Account Locked - Security Alert',
            message: `Your Gravity HRMS account (<strong>${email}</strong>) has been temporarily locked due to 5 consecutive failed login attempts.<br><br>Your account will be unlocked automatically after 15 minutes. If this wasn't you, contact your HR administrator immediately.`,
            link: '/login'
          })
        }).catch((err) => console.error('[Auth] Lock email error:', err.message));

        return res.status(403).json({
          success: false,
          message: 'Account locked due to 5 consecutive failed logins. Locked for 15 minutes.'
        });
      }

      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.failedAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const tenant = await Tenant.findById(user.tenantId);
    const token = generateToken(user);

    await AuditLog.create({
      tenantId: user.tenantId,
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      details: `User '${email}' logged in successfully`,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        employeeProfileId: user.employeeProfileId,
        tenantName: tenant ? tenant.name : ''
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error during login', error: error.message });
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide your email address' });
  }

  try {
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = hashToken(resetToken);
      user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

      await sendDirectEmail({
        to: email,
        subject: 'Password Reset Request',
        message: `You requested a password reset for your Gravity HRMS account.\n\nClick the link below to reset your password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
        link: `/reset-password/${resetToken}`,
        html: buildEmailHtml({
          title: 'Password Reset Request',
          message: `You requested a password reset for your Gravity HRMS account.<br><br>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.<br><br>If you did not request this, you can safely ignore this email.`,
          link: `/reset-password/${resetToken}`
        })
      });

      await AuditLog.create({
        tenantId: user.tenantId,
        userId: user._id,
        action: 'PASSWORD_RESET_REQUESTED',
        details: `Password reset email sent to '${email}'`,
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error processing password reset request', error: error.message });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  try {
    const user = await findUserByResetToken(token);

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (process.env.USE_MOCK_DB === 'true') {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    } else {
      user.password = password;
    }
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.failedAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await AuditLog.create({
      tenantId: user.tenantId,
      userId: user._id,
      action: 'PASSWORD_RESET_SUCCESS',
      details: `Password reset completed for '${user.email}'`,
      ipAddress: req.ip
    });

    sendDirectEmail({
      to: user.email,
      subject: 'Password Changed Successfully',
      message: `Your Gravity HRMS password was changed successfully. If this wasn't you, contact your HR administrator immediately.`,
      link: '/login',
      html: buildEmailHtml({
        title: 'Password Changed Successfully',
        message: `Your Gravity HRMS password was changed successfully.<br><br>If you did not make this change, contact your HR administrator immediately.`,
        link: '/login'
      })
    }).catch((err) => console.error('[Auth] Password changed email error:', err.message));

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error resetting password', error: error.message });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'employeeProfileId',
      populate: { path: 'employment.managerId', select: 'personal.name employeeId contact.officialEmail' }
    });

    const tenant = await Tenant.findById(req.user.tenantId);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        employeeProfileId: user.employeeProfileId,
        tenantName: tenant ? tenant.name : '',
        tenantSettings: tenant ? tenant.settings : {}
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error fetching user profile', error: error.message });
  }
};

module.exports = {
  registerTenant,
  login,
  forgotPassword,
  resetPassword,
  getMe
};
