const prisma = require('../config/db');
const nodemailer = require('nodemailer');

/**
 * 0.7 Omnichannel Notification Engine
 * Handles dispatching professional email notifications via Gmail SMTP.
 */

// ── Gmail SMTP Transporter ──────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
};

// ── Email base template wrapper ─────────────────────────────────
const emailWrapper = (companyName, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Crew HRMS</title>
  <style>
    body { margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif; }
    .outer { background:#f4f6f9;padding:24px 0;width:100%; }
    .card  { max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);margin:0 auto; }
    .header { background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:28px 32px;text-align:center; }
    .header h1 { margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px; }
    .header p  { margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;letter-spacing:0.5px; }
    .body   { padding:32px; }
    .footer { background:#f8f9fc;padding:20px 32px;border-top:1px solid #e9ecef; }
    .otp-code { font-size:42px !important;letter-spacing:8px !important; }
    @media only screen and (max-width:480px) {
      .outer  { padding:12px 0; }
      .card   { border-radius:8px; }
      .header { padding:20px 16px; }
      .header h1 { font-size:18px; }
      .body   { padding:20px 16px; }
      .footer { padding:16px; }
      .otp-code { font-size:32px !important;letter-spacing:5px !important; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <h1>Crew HRMS</h1>
        <p>Human Resource Management System</p>
      </div>

      <!-- Body -->
      <div class="body">
        ${content}
      </div>

      <!-- Footer -->
      <div class="footer">
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
          This is an automated message from <strong>Crew HRMS</strong>. Please do not reply directly to this email.<br/>
          If you have any questions, please reach out to your HR administrator.
        </p>
        <p style="margin:16px 0 0;color:#374151;font-size:13px;font-weight:600;">
          Best regards,<br/>
          <span style="color:#4F46E5;">The Crew HRMS Team</span>${companyName && companyName !== 'Crew HRMS' ? `<br/><span style="color:#6b7280;font-weight:400;font-size:12px;">on behalf of ${companyName}</span>` : ''}
        </p>
        <p style="margin:16px 0 0;border-top:1px solid #e9ecef;padding-top:16px;color:#9ca3af;font-size:11px;">
          © ${new Date().getFullYear()} Crew HRMS. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
`;

// ── Reusable action button ──────────────────────────────────────
const actionButton = (text, href) => `
  <div style="text-align:center;margin:24px 0;">
    <a href="${href}" style="background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;letter-spacing:0.3px;max-width:100%;box-sizing:border-box;">
      ${text}
    </a>
  </div>
`;

// ── Send raw email via Gmail SMTP ──────────────────────────────
// ── Strip HTML to plain text ────────────────────────────────────
const htmlToPlainText = (html) => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const sendEmail = async (to, subject, body, attachmentBase64 = null, attachmentName = null) => {
  const { MAIL_FROM, GMAIL_APP_PASSWORD } = process.env;

  if (!GMAIL_APP_PASSWORD || GMAIL_APP_PASSWORD === 'your_16_char_app_password_here') {
    console.log(`[SIMULATED EMAIL DISPATCHED] To: ${to} | Subject: ${subject}`);
    return;
  }

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Crew HRMS" <${MAIL_FROM}>`,
      replyTo: MAIL_FROM,
      to,
      subject,
      // Plain text fallback — critical for inbox delivery, spam filters penalise HTML-only
      text: htmlToPlainText(body),
      html: body,
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'Crew HRMS Mailer',
        'X-Entity-Ref-ID': `crewhrms-${Date.now()}`,
        'Precedence': 'bulk'
      }
    };

    if (attachmentBase64 && attachmentName) {
      mailOptions.attachments = [{
        filename: attachmentName,
        content: attachmentBase64,
        encoding: 'base64'
      }];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL DISPATCHED] To: ${to} | Subject: ${subject} | MsgID: ${info.messageId}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, error.message);
  }
};

// ── Main Notification Dispatcher ───────────────────────────────
const sendNotification = async ({ userId, tenantId, type, data }) => {
  try {
    const user = await prisma.basePrisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, displayName: true, employeeId: true }
    });

    console.log(`[NOTIFICATION] type=${type} | userId=${userId} | email=${user?.email || 'NOT FOUND'}`);

    if (!user) return;
    if (!user.email) {
      console.error(`[NOTIFICATION ERROR] User ${userId} has no email address in DB!`);
      return;
    }

    // Fetch company name if tenantId is provided
    let companyName = 'Crew HRMS';
    if (tenantId) {
      try {
        const tenant = await prisma.basePrisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true }
        });
        if (tenant?.name) companyName = tenant.name;
      } catch (_) { /* Non-critical, fallback to default */ }
    }

    const firstName = (user.displayName || 'there').split(' ')[0];

    let subject = '';
    let message = '';
    let attachmentBase64 = null;
    let attachmentName = null;

    switch (type) {

      // ── New Account Credentials ───────────────────────────
      case 'NEW_ACCOUNT_CREDENTIALS':
        subject = `Welcome to ${companyName} — Your Login Credentials`;
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Welcome aboard, ${firstName}! 🎉</h2>
          <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">We're thrilled to have you join <strong>${companyName}</strong>. Your employee account has been successfully created and is ready to use.</p>
          
          <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:24px 0;">
            <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Your Login Details</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Login Email</td>
                <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${data.email}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;">Temp Password</td>
                <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;font-family:monospace;letter-spacing:1px;">${data.password}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-size:14px;">Employee ID</td>
                <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${user.employeeId || 'Assigned upon first login'}</td>
              </tr>
            </table>
          </div>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
            <p style="margin:0;color:#92400e;font-size:13px;">⚠️ <strong>Important:</strong> This is a temporary password. You will be asked to set a new, secure password upon your first login. Please do not share these credentials with anyone.</p>
          </div>

          ${actionButton('Log In to Crew HRMS →', process.env.FRONTEND_URL || 'http://localhost:5173')}

          <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">If you have any trouble logging in or have questions about your account, please don't hesitate to contact your HR administrator. We're here to help!</p>
        `);
        break;

      // ── OTP Verification ─────────────────────────────────
      case 'OTP_VERIFICATION':
        subject = `${data.otp} is your Crew HRMS verification code`;
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Verify Your Identity</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, please use the one-time password below to complete your login. This code confirms that it's really you.</p>

          <div style="background:#f5f3ff;border:2px dashed #c4b5fd;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Your One-Time Password</p>
            <h1 class="otp-code" style="margin:0;color:#4F46E5;font-size:48px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;">${data.otp}</h1>
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
            <p style="margin:0;color:#166534;font-size:13px;">✅ This code is valid for <strong>15 minutes</strong> and can only be used once. Never share this code with anyone — Crew HRMS will never ask for it.</p>
          </div>

          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">If you did not attempt to log in, please ignore this email. Your account remains secure. Consider changing your password if you believe someone else is trying to access your account.</p>
        `);
        break;

      // ── Password Changed Confirmation ─────────────────────
      case 'PASSWORD_CHANGED':
        subject = 'Your Crew HRMS Password Has Been Changed';
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Password Changed Successfully ✓</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, this is a confirmation that the password for your <strong>${companyName}</strong> account was successfully changed.</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="color:#6b7280;font-size:14px;width:140px;">Account</td>
                <td style="color:#166534;font-size:14px;font-weight:600;">${user.email}</td>
              </tr>
              <tr>
                <td style="color:#6b7280;font-size:14px;padding-top:8px;">Changed On</td>
                <td style="color:#166534;font-size:14px;font-weight:600;padding-top:8px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long', timeStyle: 'short' })} IST</td>
              </tr>
            </table>
          </div>

          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
            <p style="margin:0;color:#9a3412;font-size:13px;">🔒 <strong>Wasn't you?</strong> If you did not make this change, your account may be compromised. Please contact your HR administrator or system admin immediately.</p>
          </div>

          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">For your security, you will be required to verify your identity via OTP upon your next login. If you have any concerns, please reach out to your administrator right away.</p>
        `);
        break;

      // ── Welcome After First Verified Login ────────────────
      case 'WELCOME_VERIFIED':
        subject = `Welcome to ${companyName} — You're All Set! 🎉`;
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">You're officially in, ${firstName}! 🚀</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Congratulations! Your identity has been verified and your <strong>${companyName}</strong> account is now fully activated. We're so excited to have you as part of the team.</p>

          <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #c4b5fd;border-radius:12px;padding:28px;margin:0 0 24px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🎊</div>
            <h3 style="margin:0 0 8px;color:#4F46E5;font-size:18px;font-weight:700;">Welcome to ${companyName}</h3>
            <p style="margin:0;color:#6b7280;font-size:14px;">Your account is verified, secure, and ready to use.</p>
          </div>

          <p style="margin:0 0 16px;color:#374151;font-size:15px;font-weight:600;">Here's what you can do in Crew HRMS:</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#6b7280;font-size:14px;line-height:2;">
            <li>View your attendance and apply for leave</li>
            <li>Access your payslips and salary details</li>
            <li>Update your personal profile and KYC documents</li>
            <li>Stay connected with your team</li>
          </ul>

          ${actionButton('Go to My Dashboard →', process.env.FRONTEND_URL || 'http://localhost:5173')}

          <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">Once again, welcome to the team! If you need any help getting started, please reach out to your HR administrator. We wish you great success in your new role. 💼</p>
        `);
        break;

      // ── Payroll Generated (with PDF) ──────────────────────
      case 'PAYROLL_GENERATED':
        subject = `Your Payslip for ${data.month} is Ready — ${companyName}`;
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Your Payslip is Ready 📄</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, your salary has been processed and your official payslip for <strong>${data.month}</strong> is now available. Please find it attached to this email.</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
            <p style="margin:0 0 12px;color:#166534;font-size:14px;font-weight:600;">Payslip Summary</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;">Pay Period</td>
                <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${data.month}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6b7280;font-size:14px;">Net Salary</td>
                <td style="padding:6px 0;color:#16a34a;font-size:18px;font-weight:700;">₹ ${data.netSalary}</td>
              </tr>
            </table>
          </div>

          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">Your detailed payslip PDF is attached to this email. Please review it carefully. If you notice any discrepancies, kindly contact your HR administrator within 7 days of receipt.</p>
        `);

        try {
          const payroll = await prisma.basePrisma.payroll.findUnique({
            where: { userId_month: { userId, month: data.month } }
          });

          if (payroll) {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            await new Promise((resolve, reject) => {
              doc.on('data', buffers.push.bind(buffers));
              doc.on('end', () => {
                attachmentBase64 = Buffer.concat(buffers).toString('base64');
                attachmentName = `Payslip-${data.month}.pdf`;
                resolve();
              });
              doc.on('error', reject);

              doc.fontSize(20).text('Payslip', { align: 'center' });
              doc.moveDown();
              doc.fontSize(12).text(`Month: ${payroll.month}`);
              doc.text(`Employee: ${user.displayName}`);
              doc.text(`Emp ID: ${user.employeeId || 'N/A'}`);
              doc.moveDown();
              doc.text(`Payable Days: ${payroll.payableDays}`);
              doc.text(`Basic Salary: Rs ${payroll.basicSalary.toFixed(2)}`);
              doc.text(`HRA: Rs ${payroll.hra.toFixed(2)}`);
              doc.text(`Standard Allowance: Rs ${payroll.standardAllowance.toFixed(2)}`);
              doc.text(`Performance Bonus: Rs ${payroll.performanceBonus.toFixed(2)}`);
              doc.text(`LTA: Rs ${payroll.lta.toFixed(2)}`);
              doc.text(`Fixed Allowance: Rs ${payroll.fixedAllowance.toFixed(2)}`);
              doc.moveDown();
              doc.text(`Gross Salary: Rs ${payroll.grossSalary.toFixed(2)}`, { stroke: true });
              doc.moveDown();
              doc.text(`Deductions:`);
              doc.text(`PF Employee: Rs ${payroll.pfEmployee.toFixed(2)}`);
              doc.text(`Professional Tax: Rs ${payroll.professionalTax.toFixed(2)}`);
              doc.moveDown();
              doc.fontSize(14).text(`Net Salary: Rs ${payroll.netSalary.toFixed(2)}`, { underline: true });
              doc.end();
            });
          }
        } catch (pdfErr) {
          console.error('Error generating PDF attachment:', pdfErr);
        }
        break;

      // ── Leave Approved ────────────────────────────────────
      case 'LEAVE_APPROVED':
        subject = `Your Leave Request Has Been Approved — ${companyName}`;
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Leave Request Approved ✓</h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, we're pleased to inform you that your leave request has been reviewed and approved.</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="color:#6b7280;font-size:14px;width:120px;">Leave Date</td>
                <td style="color:#166534;font-size:14px;font-weight:600;">${data.date}</td>
              </tr>
              <tr>
                <td style="color:#6b7280;font-size:14px;padding-top:8px;">Status</td>
                <td style="color:#16a34a;font-size:14px;font-weight:700;padding-top:8px;">✅ Approved</td>
              </tr>
            </table>
          </div>

          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Please ensure all pending tasks are delegated before your leave begins. If you need to make any changes to this request, kindly contact your HR administrator in advance. Enjoy your time off!</p>
        `);
        break;

      // ── Default fallback ──────────────────────────────────
      default:
        subject = `New Notification from ${companyName}`;
        message = emailWrapper(companyName, `
          <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">You have a new update</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Hi ${firstName}, you have a new update in Crew HRMS. Please log in to your dashboard to view the details.</p>
          ${actionButton('Go to Dashboard →', process.env.FRONTEND_URL || 'http://localhost:5173')}
        `);
    }

    // Stagger email delivery to avoid anti-spam filters (like Brevo)
    let delayMs = 0;
    if (type === 'PASSWORD_CHANGED') delayMs = 15000; // 15 seconds
    else if (type === 'WELCOME_VERIFIED') delayMs = 35000; // 35 seconds

    // Dispatch Email
    if (user.email) {
      if (delayMs > 0) {
        console.log(`[STAGGER] Queued ${type} to ${user.email} with ${delayMs}ms delay...`);
        setTimeout(async () => {
          await sendEmail(user.email, subject, message, attachmentBase64, attachmentName);
        }, delayMs);
      } else {
        await sendEmail(user.email, subject, message, attachmentBase64, attachmentName);
      }
    }

    // Record in Audit Trail
    if (tenantId) {
      await prisma.basePrisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'NOTIFICATION_SENT',
          tenantId,
          details: `Sent ${type} via EMAIL. Subject: ${subject}`
        }
      });
    }

  } catch (error) {
    console.error('Notification Engine Error:', error);
  }
};

module.exports = { sendNotification };
