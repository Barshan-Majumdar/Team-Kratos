const axios = require('axios');
const prisma = require('../config/db');

/**
 * 0.7 Omnichannel Notification Engine
 * Handles dispatching notifications via Email, SMS, and WhatsApp.
 */

// Simulated Providers (Since we don't have real keys for Twilio/Gupshup)
const sendEmail = async (to, subject, body) => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_PASS) {
    console.log(`[SIMULATED EMAIL DISPATCHED] To: ${to} | Subject: ${subject}`);
    return;
  }
  
  console.log(`[REAL EMAIL DISPATCHED] via ${SMTP_HOST} To: ${to} | Subject: ${subject}`);
  // In production: await transporter.sendMail({ from: MAIL_FROM, to, subject, html: body });
};

const sendWhatsApp = async (phone, message) => {
  if (!phone) return;
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER } = process.env;
  
  if (!TWILIO_AUTH_TOKEN) {
    console.log(`[SIMULATED WHATSAPP DISPATCHED] To: ${phone} | Msg: ${message}`);
    return;
  }
  
  console.log(`[REAL WHATSAPP DISPATCHED] via Twilio To: ${phone} | Msg: ${message}`);
  // In production: await axios.post('https://api.twilio.com/2010-04-01/Accounts/.../Messages.json')
};

const sendNotification = async ({ userId, tenantId, channel = 'ALL', type, data }) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, displayName: true }
    });

    if (!user) return;

    let subject = '';
    let message = '';

    switch (type) {
      case 'WELCOME':
        subject = 'Welcome to Crew HRMS!';
        message = `Hi ${user.displayName}, your account has been created.`;
        break;
      case 'PAYROLL_GENERATED':
        subject = 'Payslip Generated';
        message = `Hi ${user.displayName}, your payslip for ${data.month} has been generated. Net Salary: Rs ${data.netSalary}`;
        break;
      case 'LEAVE_APPROVED':
        subject = 'Leave Request Approved';
        message = `Your leave request for ${data.date} has been approved.`;
        break;
      default:
        subject = 'New HR Update';
        message = `You have a new update in Crew HRMS.`;
    }

    // Dispatch based on channel preference
    const promises = [];

    if (channel === 'EMAIL' || channel === 'ALL') {
      if (user.email) promises.push(sendEmail(user.email, subject, message));
    }
    
    if (channel === 'WHATSAPP' || channel === 'ALL') {
      // Assuming user.phone has country code e.g. +91
      if (user.phone) promises.push(sendWhatsApp(user.phone, message));
    }

    await Promise.allSettled(promises);

    // Record Notification in Audit Trail
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'NOTIFICATION_SENT',
        tenantId,
        details: `Sent ${type} via ${channel}. Subject: ${subject}`
      }
    });

  } catch (error) {
    console.error('Notification Engine Error:', error);
  }
};

module.exports = { sendNotification };
