const Notification = require('../models/Notification');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { sendEmail, buildEmailHtml } = require('./emailService');

const resolveUserEmail = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let email = user.email;

  if (user.employeeProfileId) {
    const employee = await Employee.findById(user.employeeProfileId);
    if (employee?.contact?.officialEmail) {
      email = employee.contact.officialEmail;
    } else if (employee?.contact?.personalEmail) {
      email = employee.contact.personalEmail;
    }
  }

  return email;
};

/**
 * Creates an in-app notification and sends an email to the user.
 */
const notifyUser = async ({
  tenantId,
  userId,
  title,
  message,
  link,
  sendEmail: shouldSendEmail = true,
  emailHtml = null
}) => {
  await Notification.create({
    tenantId,
    userId,
    title,
    message,
    link
  });

  if (!shouldSendEmail) return;

  const to = await resolveUserEmail(userId);
  if (!to) return;

  sendEmail({ to, subject: title, message, link, html: emailHtml }).catch((err) => {
    console.error('[Notify] Email send error:', err.message);
  });
};

/**
 * Notify multiple users (e.g. all HR admins).
 */
const notifyUsers = async (users, notification) => {
  for (const user of users) {
    await notifyUser({
      tenantId: notification.tenantId,
      userId: user._id,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      sendEmail: notification.sendEmail
    });
  }
};

/**
 * Send email directly without creating an in-app notification (auth/security emails).
 */
const sendDirectEmail = async ({ to, subject, message, link, html }) => {
  return sendEmail({ to, subject, message, link, html });
};

/**
 * Welcome email for newly onboarded employees — credentials sent via email only.
 */
const notifyNewEmployee = async ({ tenantId, userId, name, email, defaultPassword }) => {
  const inAppMessage = `Welcome ${name}! Your account has been set up. Check your email for login credentials.`;
  const emailMessage = `Welcome ${name}!\n\nYour Gravity HRMS account has been created.\n\nLogin email: ${email}\nTemporary password: ${defaultPassword}\n\nPlease log in and change your password immediately.`;

  const emailHtml = buildEmailHtml({
    title: 'Welcome to the Team!',
    message: `Welcome ${name}!<br><br>Your Gravity HRMS account has been created.<br><br><strong>Login email:</strong> ${email}<br><strong>Temporary password:</strong> ${defaultPassword}<br><br>Please log in and change your password immediately.`,
    link: '/profile'
  });

  await notifyUser({
    tenantId,
    userId,
    title: 'Welcome to the Team!',
    message: inAppMessage,
    link: '/profile',
    emailHtml
  });
};

module.exports = {
  notifyUser,
  notifyUsers,
  sendDirectEmail,
  notifyNewEmployee,
  resolveUserEmail
};
