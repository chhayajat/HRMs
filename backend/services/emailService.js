const nodemailer = require('nodemailer');

let transporter = null;

const isEmailEnabled = () => {
  return (
    process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false' &&
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

const getTransporter = () => {
  if (!isEmailEnabled()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
};

const buildEmailHtml = ({ title, message, link }) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const actionUrl = link ? `${frontendUrl}${link}` : frontendUrl;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; color: #fff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; }
    .content { padding: 32px 24px; }
    .content p { margin: 0 0 16px; }
    .btn { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 8px; }
    .footer { padding: 16px 24px; background: #f9fafb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>Gravity HRMS</h1></div>
    <div class="content">
      <h2 style="margin-top:0;color:#111827;">${title}</h2>
      <p>${message.replace(/\n/g, '<br>')}</p>
      ${link ? `<a href="${actionUrl}" class="btn">View in App</a>` : ''}
    </div>
    <div class="footer">
      <p>This is an automated notification from Gravity HRMS. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
};

const sendEmail = async ({ to, subject, message, link, html }) => {
  if (!isEmailEnabled()) {
    console.warn('[Email] Skipped — SMTP not configured or disabled');
    return { skipped: true };
  }

  if (!to) {
    console.warn('[Email] Skipped — no recipient address');
    return { skipped: true };
  }

  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || `Gravity HRMS <${process.env.SMTP_USER}>`;

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: `[Gravity HRMS] ${subject}`,
      text: link
        ? `${message}\n\nView in app: ${process.env.FRONTEND_URL || 'http://localhost:5173'}${link}`
        : message,
      html: html || buildEmailHtml({ title: subject, message, link })
    });
    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

const verifyConnection = async () => {
  if (!isEmailEnabled()) {
    console.warn('[Email] SMTP not configured — email notifications disabled');
    return false;
  }

  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('[Email] SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error.message);
    return false;
  }
};

module.exports = {
  isEmailEnabled,
  sendEmail,
  buildEmailHtml,
  verifyConnection
};
