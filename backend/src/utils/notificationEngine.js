const axios = require('axios');
const prisma = require('../config/db');
const nodemailer = require('nodemailer');

/**
 * 0.7 Omnichannel Notification Engine
 * Handles dispatching notifications via Email.
 */

// Simulated Providers (Since we don't have real keys for Twilio/Gupshup)
const sendEmail = async (to, subject, body, attachmentBase64 = null, attachmentName = null) => {
  const { BREVO_API_KEY, BREVO_SMTP_PASS, MAIL_FROM } = process.env;
  if (!BREVO_API_KEY) {
    console.log(`[SIMULATED EMAIL DISPATCHED] To: ${to} | Subject: ${subject}`);
    return;
  }
  
  try {
    const payload = {
      sender: {
        name: 'Crew HRMS',
        email: MAIL_FROM || 'noreply@crewhrms.com'
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: body
    };

    if (attachmentBase64 && attachmentName) {
      payload.attachment = [
        {
          content: attachmentBase64,
          name: attachmentName
        }
      ];
    }

    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    console.log(`[REAL EMAIL DISPATCHED] via Brevo API To: ${to} | Subject: ${subject} | MsgID: ${response.data.messageId}`);
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.response?.data || error.message);
  }
};

const sendNotification = async ({ userId, tenantId, type, data }) => {
  try {
    const user = await prisma.basePrisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, displayName: true, employeeId: true }
    });

    if (!user) return;

    let subject = '';
    let message = '';
    let attachmentBase64 = null;
    let attachmentName = null;

    switch (type) {
      case 'WELCOME':
        subject = 'Welcome to Crew HRMS!';
        message = `Hi ${user.displayName}, your account has been created.`;
        break;
      case 'NEW_ACCOUNT_CREDENTIALS':
        subject = 'Your Crew HRMS Login Credentials';
        message = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4F46E5;">Welcome to Crew HRMS!</h2>
            <p>Hi ${user.displayName},</p>
            <p>An administrator has created an account for you.</p>
            <p><strong>Login Email:</strong> ${data.email}</p>
            <p><strong>Temporary Password:</strong> ${data.password}</p>
            <p style="color: #DC2626; margin-top: 20px;">Please log in and change your password immediately.</p>
          </div>
        `;
        break;
      case 'OTP_VERIFICATION':
        subject = 'Your Crew HRMS Verification Code';
        message = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4F46E5;">Verify Your Email</h2>
            <p>Hi ${user.displayName},</p>
            <p>Your one-time password (OTP) for verifying your email address is:</p>
            <h1 style="background: #F3F4F6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; color: #1F2937; border-radius: 8px;">${data.otp}</h1>
            <p style="color: #6B7280; font-size: 14px;">This code is valid for 15 minutes. Please do not share it with anyone.</p>
          </div>
        `;
        break;
      case 'PAYROLL_GENERATED':
        subject = 'Payslip Generated';
        message = `Hi ${user.displayName}, your payslip for ${data.month} has been generated. Net Salary: Rs ${data.netSalary}. Please find your official payslip attached to this email.`;
        
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
          console.error("Error generating PDF attachment:", pdfErr);
        }
        break;
      case 'LEAVE_APPROVED':
        subject = 'Leave Request Approved';
        message = `Your leave request for ${data.date} has been approved.`;
        break;
      default:
        subject = 'New HR Update';
        message = `You have a new update in Crew HRMS.`;
    }

    // Dispatch Email Notification
    if (user.email) {
      await sendEmail(user.email, subject, message, attachmentBase64, attachmentName);
    }

    // Record Notification in Audit Trail (only if associated with a tenant)
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
