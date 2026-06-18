/**
 * End-to-end email system test for Gravity HRMS
 * Run: node scripts/test-email-system.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { verifyConnection, sendEmail, isEmailEnabled } = require('../services/emailService');
const { notifyUser, notifyNewEmployee } = require('../services/notifyService');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Notification = require('../models/Notification');

const RECIPIENT = process.env.SMTP_USER;

const results = [];

const pass = (name, detail = '') => {
  results.push({ name, ok: true, detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ''}`);
};

const fail = (name, detail = '') => {
  results.push({ name, ok: false, detail });
  console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
};

async function connectDb() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  process.env.USE_MOCK_DB = 'false';
}

async function testConfig() {
  console.log('\n[1] Configuration');
  if (isEmailEnabled()) {
    pass('Email enabled', `SMTP_USER=${process.env.SMTP_USER}`);
  } else {
    fail('Email enabled', 'SMTP env vars missing or disabled');
  }
}

async function testSmtpConnection() {
  console.log('\n[2] SMTP connection');
  const ok = await verifyConnection();
  if (ok) pass('SMTP verify');
  else fail('SMTP verify', 'Could not connect to Gmail SMTP');
}

async function testDirectEmail() {
  console.log('\n[3] Direct email send');
  const r = await sendEmail({
    to: RECIPIENT,
    subject: 'Direct Email Test',
    message: 'This confirms emailService.sendEmail() works correctly.',
    link: '/dashboard'
  });
  if (r.success) pass('Direct send', r.messageId);
  else fail('Direct send', r.error || 'unknown error');
}

async function testNotifyUser() {
  console.log('\n[4] notifyUser (in-app + email)');
  const user = await User.findOne({ email: RECIPIENT });
  if (!user) {
    console.log('  SKIP  No user with SMTP_USER email in DB — testing with first available user');
    const anyUser = await User.findOne({});
    if (!anyUser) {
      fail('notifyUser', 'No users in database');
      return;
    }
    const before = await Notification.countDocuments({ userId: anyUser._id });
    await notifyUser({
      tenantId: anyUser.tenantId,
      userId: anyUser._id,
      title: 'Notify Service Test',
      message: 'This confirms notifyUser creates in-app notification and sends email.',
      link: '/dashboard'
    });
    await new Promise((r) => setTimeout(r, 3000));
    const after = await Notification.countDocuments({ userId: anyUser._id });
    if (after > before) pass('In-app notification created', `user=${anyUser.email}`);
    else fail('In-app notification created');
    pass('Email dispatched via notifyUser', `sent to ${anyUser.email}`);
    return;
  }

  const before = await Notification.countDocuments({ userId: user._id });
  await notifyUser({
    tenantId: user.tenantId,
    userId: user._id,
    title: 'Notify Service Test',
    message: 'This confirms notifyUser creates in-app notification and sends email to your registered account.',
    link: '/dashboard'
  });
  await new Promise((r) => setTimeout(r, 3000));
  const after = await Notification.countDocuments({ userId: user._id });
  if (after > before) pass('In-app notification created');
  else fail('In-app notification created');
  pass('Email dispatched via notifyUser', `sent to ${RECIPIENT}`);
}

async function testWelcomeEmailTemplate() {
  console.log('\n[5] Welcome email template (notifyNewEmployee)');
  const user = await User.findOne({ email: RECIPIENT });
  if (!user) {
    console.log('  SKIP  No matching user for welcome email test');
    return;
  }
  await notifyNewEmployee({
    tenantId: user.tenantId,
    userId: user._id,
    name: 'Test User',
    email: RECIPIENT,
    defaultPassword: 'TestPass@123'
  });
  await new Promise((r) => setTimeout(r, 2000));
  pass('Welcome email sent', `credentials email to ${RECIPIENT}`);
}

async function main() {
  console.log('=== Gravity HRMS Email System Test ===');
  console.log(`Recipient: ${RECIPIENT}`);

  try {
    await testConfig();
    await testSmtpConnection();
    await testDirectEmail();
    await connectDb();
    await testNotifyUser();
    await testWelcomeEmailTemplate();
  } catch (err) {
    console.error('\nUnexpected error:', err.message);
    fail('Test runner', err.message);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  if (failed > 0) process.exit(1);
  console.log('\nCheck your inbox at', RECIPIENT, 'for test emails.');
}

main();
