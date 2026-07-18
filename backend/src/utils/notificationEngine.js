const prisma = require('../config/db');
const nodemailer = require('nodemailer');
const templates = require('./emailTemplates');

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

// ── Strip HTML to plain text ────────────────────────────────────
const htmlToPlainText = (html) => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// ── Send raw email via Gmail SMTP ──────────────────────────────
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    let subject = '';
    let message = '';
    let attachmentBase64 = null;
    let attachmentName = null;

    // Use the extracted templates
    const templateArgs = {
      companyName,
      firstName,
      frontendUrl,
      email: user.email,
      employeeId: user.employeeId,
      ...data // Spread data (like otp, password, month, netSalary, date)
    };

    switch (type) {
      case 'NEW_ACCOUNT_CREDENTIALS':
        ({ subject, message } = templates.getNewAccountCredentialsTemplate(templateArgs));
        break;

      case 'OTP_VERIFICATION':
        ({ subject, message } = templates.getOtpVerificationTemplate(templateArgs));
        break;

      case 'PASSWORD_CHANGED':
        ({ subject, message } = templates.getPasswordChangedTemplate(templateArgs));
        break;

      case 'WELCOME_VERIFIED':
        ({ subject, message } = templates.getWelcomeVerifiedTemplate(templateArgs));
        break;

      case 'PAYROLL_GENERATED':
        ({ subject, message } = templates.getPayrollGeneratedTemplate(templateArgs));
        
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

      case 'LEAVE_APPROVED':
        ({ subject, message } = templates.getLeaveApprovedTemplate(templateArgs));
        break;

      default:
        ({ subject, message } = templates.getDefaultTemplate(templateArgs));
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
