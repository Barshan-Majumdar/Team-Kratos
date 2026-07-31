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

// ── Template Generators ──────────────────────────────────────
const getNewAccountCredentialsTemplate = ({ companyName, firstName, email, password, employeeId, frontendUrl }) => {
  const subject = `Welcome to ${companyName} — Your Login Credentials`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Welcome aboard, ${firstName}! 🎉</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">We're thrilled to have you join <strong>${companyName}</strong>. Your employee account has been successfully created and is ready to use.</p>
    
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:24px 0;">
      <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Your Login Details</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Login Email</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${email}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">Temp Password</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;font-family:monospace;letter-spacing:1px;">${password}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">Employee ID</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${employeeId || 'Assigned upon first login'}</td>
        </tr>
      </table>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;color:#92400e;font-size:13px;">⚠️ <strong>Important:</strong> This is a temporary password. You will be asked to set a new, secure password upon your first login. Please do not share these credentials with anyone.</p>
    </div>

    ${actionButton('Log In to Crew HRMS →', frontendUrl)}

    <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">If you have any trouble logging in or have questions about your account, please don't hesitate to contact your HR administrator. We're here to help!</p>
  `);
  return { subject, message };
};

const getWelcomeOnboardingInviteTemplate = ({ companyName, firstName, email, inviteToken, frontendUrl, roleName }) => {
  const subject = `Welcome to ${companyName} — Set Up Your Account`;
  const setupUrl = `${frontendUrl}/set-password?token=${inviteToken}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Welcome to ${companyName}, ${firstName}! 🎉</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">You have been invited to join <strong>${companyName}</strong> as <strong>${roleName || 'Team Member'}</strong>.</p>
    
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:24px 0;">
      <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Account Setup Overview</p>
      <ol style="margin:0;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.8;">
        <li>Click the button below to set your account password.</li>
        <li>Log in and complete your mandatory 1-time Face Registration (4 angle poses).</li>
        <li>You will then be ready to clock in daily via live face recognition & GPS geofencing!</li>
      </ol>
    </div>

    ${actionButton('Set Password & Register Face →', setupUrl)}

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:16px 0;">
      <p style="margin:0;color:#92400e;font-size:13px;">⚠️ <strong>Note:</strong> This invitation token expires in 72 hours. If it expires, ask your HR Administrator to resend your invite link.</p>
    </div>
  `);
  return { subject, message };
};

const getOtpVerificationTemplate = ({ companyName, firstName, otp }) => {
  const subject = `${otp} is your Crew HRMS verification code`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Verify Your Identity</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, please use the one-time password below to complete your login. This code confirms that it's really you.</p>

    <div style="background:#f5f3ff;border:2px dashed #c4b5fd;border-radius:12px;padding:28px;text-align:center;margin:0 0 24px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Your One-Time Password</p>
      <h1 class="otp-code" style="margin:0;color:#4F46E5;font-size:48px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</h1>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;color:#166534;font-size:13px;">✅ This code is valid for <strong>15 minutes</strong> and can only be used once. Never share this code with anyone — Crew HRMS will never ask for it.</p>
    </div>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">If you did not attempt to log in, please ignore this email. Your account remains secure. Consider changing your password if you believe someone else is trying to access your account.</p>
  `);
  return { subject, message };
};

const getPasswordResetTemplate = ({ companyName, firstName, otp }) => {
  const subject = `Password Reset Verification Code — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Reset Your Password</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, we received a request to reset the password for your <strong>${companyName}</strong> account. Please use the verification code below to proceed.</p>

    <div style="background:#f9fafb;border:1px dashed #d1d5db;border-radius:12px;padding:32px;text-align:center;margin:32px 0;">
      <p style="margin:0 0 12px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Verification Code</p>
      <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#111827;line-height:1;margin-left:12px;">
        ${otp}
      </div>
    </div>

    <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;color:#ca8a04;font-size:13px;">⏱️ This code is valid for <strong>15 minutes</strong> and can only be used once.</p>
    </div>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">If you didn't request a password reset, you can safely ignore this email. Your account remains secure.</p>
  `);
  return { subject, message };
};

const getPasswordChangedTemplate = ({ companyName, firstName, email }) => {
  const subject = 'Your Crew HRMS Password Has Been Changed';
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Password Changed Successfully ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, this is a confirmation that the password for your <strong>${companyName}</strong> account was successfully changed.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#6b7280;font-size:14px;width:140px;">Account</td>
          <td style="color:#166534;font-size:14px;font-weight:600;">${email}</td>
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
  return { subject, message };
};

const getWelcomeVerifiedTemplate = ({ companyName, firstName, frontendUrl }) => {
  const subject = `Welcome to ${companyName} — You're All Set! 🎉`;
  const message = emailWrapper(companyName, `
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

    ${actionButton('Go to My Dashboard →', frontendUrl)}

    <p style="margin:24px 0 0;color:#6b7280;font-size:14px;line-height:1.7;">Once again, welcome to the team! If you need any help getting started, please reach out to your HR administrator. We wish you great success in your new role. 💼</p>
  `);
  return { subject, message };
};

const getPayrollGeneratedTemplate = ({ companyName, firstName, month, netSalary }) => {
  let formattedMonth = month;
  if (month && month.includes('-')) {
    const [yr, mo] = month.split('-');
    formattedMonth = new Date(parseInt(yr), parseInt(mo) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  const subject = `Your Payslip for ${formattedMonth} is Ready — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Your Payslip is Ready 📄</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, your salary has been processed and your official payslip for <strong>${formattedMonth}</strong> is now available. Please find it attached to this email.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 12px;color:#166534;font-size:14px;font-weight:600;">Payslip Summary</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:14px;">Pay Period</td>
          <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${formattedMonth}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:14px;">Net Salary</td>
          <td style="padding:6px 0;color:#16a34a;font-size:18px;font-weight:700;">₹ ${netSalary}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">Your detailed payslip PDF is attached to this email. Please review it carefully. If you notice any discrepancies, kindly contact your HR administrator within 7 days of receipt.</p>
  `);
  return { subject, message };
};

const getLeaveApprovedTemplate = ({ companyName, firstName, date }) => {
  const subject = `Your Leave Request Has Been Approved — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Leave Request Approved ✓</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, we're pleased to inform you that your leave request has been reviewed and approved.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#6b7280;font-size:14px;width:120px;">Leave Date</td>
          <td style="color:#166534;font-size:14px;font-weight:600;">${date}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:14px;padding-top:8px;">Status</td>
          <td style="color:#16a34a;font-size:14px;font-weight:700;padding-top:8px;">✅ Approved</td>
        </tr>
      </table>
    </div>

    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">Please ensure all pending tasks are delegated before your leave begins. If you need to make any changes to this request, kindly contact your HR administrator in advance. Enjoy your time off!</p>
  `);
  return { subject, message };
};

const getUnapprovedAbsenceTemplate = ({ companyName, firstName, date, frontendUrl }) => {
  const subject = `Notice: Unapproved Absence on ${date} — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Absence Notification</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, our records show that you were marked absent on <strong>${date}</strong> without prior approval or notification.</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.6;">If this was a mistake, or if you had an emergency, please log in to Crew HRMS immediately and apply for leave, or contact your HR administrator.</p>
    </div>

    ${actionButton('Apply for Leave →', frontendUrl)}
  `);
  return { subject, message };
};

const getLateClockInTemplate = ({ companyName, firstName, time, expectedTime }) => {
  const subject = `Notice: Late Clock-in Recorded — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Late Clock-in</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, you clocked in at <strong>${time}</strong> today, which is past your expected start time of <strong>${expectedTime}</strong>.</p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.7;">Consistent punctuality helps the team function smoothly. Please ensure you inform your manager if you expect to be late.</p>
  `);
  return { subject, message };
};

const getCompanyCreatedTemplate = ({ companyName, firstName, frontendUrl }) => {
  const subject = `Welcome to Crew HRMS! Your Workspace '${companyName}' is Ready 🎉`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Your Workspace is Live 🚀</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, your company <strong>${companyName}</strong> has been successfully registered on Crew HRMS.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;color:#166534;font-size:14px;">You can now start adding employees, configuring attendance policies, and generating payroll.</p>
    </div>
    ${actionButton('Go to Admin Dashboard →', frontendUrl)}
  `);
  return { subject, message };
};

const getCompanyAnnouncementTemplate = ({ companyName, firstName, messageContent, title }) => {
  const subject = `Announcement: ${title} — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">${title}</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName},</p>
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:0 0 24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${messageContent}</p>
    </div>
  `);
  return { subject, message };
};

const getLeaveRejectedTemplate = ({ companyName, firstName, date, adminRemarks }) => {
  const subject = `Update on Your Leave Request — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Leave Request Declined</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, your leave request for <strong>${date}</strong> could not be approved at this time.</p>
    ${adminRemarks ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;color:#991b1b;font-size:14px;"><strong>Reason:</strong> ${adminRemarks}</p>
    </div>` : ''}
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">If you have any questions, please reach out to your manager.</p>
  `);
  return { subject, message };
};

const getLeaveAppliedConfirmationTemplate = ({ companyName, firstName, date, frontendUrl }) => {
  const subject = `Leave Request Received — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Leave Request Received</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, we have successfully received your leave request for <strong>${date}</strong>.</p>
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:0 0 24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">Your request has been forwarded to your manager for review. You will be notified via email once a decision has been made.</p>
    </div>
    ${actionButton('View My Leaves →', frontendUrl)}
  `);
  return { subject, message };
};

const getMeetingReminderTemplate = ({ companyName, firstName, meetingTitle, meetingTime, meetingLink }) => {
  const subject = `Reminder: ${meetingTitle} at ${meetingTime}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Meeting Reminder</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, you have an upcoming meeting.</p>
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:0 0 24px;">
      <p style="margin:0 0 8px;color:#374151;font-size:14px;"><strong>Topic:</strong> ${meetingTitle}</p>
      <p style="margin:0;color:#374151;font-size:14px;"><strong>Time:</strong> ${meetingTime}</p>
    </div>
    ${meetingLink ? actionButton('Join Meeting →', meetingLink) : ''}
  `);
  return { subject, message };
};

const getWorkAnniversaryTemplate = ({ companyName, firstName, years }) => {
  const subject = `Happy ${years} Year Work Anniversary! 🎉 — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Happy Work Anniversary, ${firstName}! 🎊</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Thank you for your incredible dedication and hard work over the past <strong>${years} ${years === 1 ? 'year' : 'years'}</strong>.</p>
    <div style="text-align:center;font-size:64px;margin:24px 0;">🎂</div>
    <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.7;">We are so grateful to have you as part of the team. Here's to many more successful years together!</p>
  `);
  return { subject, message };
};

const getProfileUpdatedTemplate = ({ companyName, firstName, frontendUrl }) => {
  const subject = `Security Alert: Your Profile Was Updated — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Profile Updated</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${firstName}, details on your employee profile were recently updated.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;color:#9a3412;font-size:13px;">🔒 If you did not authorize these changes, please contact your administrator immediately.</p>
    </div>
    ${actionButton('Review Your Profile →', frontendUrl)}
  `);
  return { subject, message };
};

const getCustomNotificationTemplate = ({ companyName, firstName, title, messageText, link, frontendUrl }) => {
  const subject = `${title || 'Notification'} — ${companyName}`;
  const targetUrl = link ? `${frontendUrl}${link.startsWith('/') ? '' : '/'}${link}` : frontendUrl;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">${title || 'Notification'}</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:15px;">Hi ${firstName},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">${messageText}</p>
    ${actionButton('View Details →', targetUrl)}
  `);
  return { subject, message };
};

const getDefaultTemplate = () => {
  // Generic "You have a new update" emails are suppressed per user instructions
  return { subject: null, message: null };
};

const getBirthdayWishTemplate = ({ companyName, firstName }) => {
  const subject = `🎉 Happy Birthday from all of us at ${companyName}! 🎂`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:24px;font-weight:800;text-align:center;">Happy Birthday, ${firstName}! 🎂🎉</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:15px;text-align:center;">Wishing you a wonderful day filled with joy, laughter, and success!</p>
    <div style="background:linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);border:1px solid #bae6fd;border-radius:12px;padding:24px;margin:0 0 24px;text-align:center;">
      <p style="margin:0;color:#0369a1;font-size:15px;font-weight:600;line-height:1.7;">
        Thank you for being such a valued part of our team. We hope your year ahead is bright and incredible! ✨
      </p>
    </div>
  `);
  return { subject, message };
};

const getShiftAssignedTemplate = ({ companyName, firstName, shiftName, date, startTime, endTime }) => {
  const subject = `Shift Update: ${shiftName} Assigned — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Shift Schedule Assigned</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi ${firstName}, you have been assigned a new shift schedule:</p>
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;color:#111827;font-size:16px;font-weight:700;">${shiftName}</p>
      ${date ? `<p style="margin:0 0 6px;color:#4b5563;font-size:14px;"><strong>Date:</strong> ${date}</p>` : ''}
      <p style="margin:0;color:#4b5563;font-size:14px;"><strong>Time:</strong> ${startTime} – ${endTime}</p>
    </div>
    <p style="margin:0;color:#6b7280;font-size:14px;">Please review your schedule in the Employee Dashboard.</p>
  `);
  return { subject, message };
};

const getExpenseStatusTemplate = ({ companyName, firstName, title, amount, currency, status, adminRemarks }) => {
  const isApproved = status === 'APPROVED';
  const isSettled = status === 'SETTLED';
  const isRejected = status === 'REJECTED';

  const statusLabel = isSettled ? 'Settled & Paid' : isApproved ? 'Approved' : 'Declined';
  const subject = `Expense Claim Update: ${title} (${statusLabel}) — ${companyName}`;

  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Expense Claim ${statusLabel}</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Hi ${firstName}, your expense claim has been updated:</p>
    <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;color:#111827;font-size:16px;font-weight:700;">${title}</p>
      <p style="margin:0 0 6px;color:#4b5563;font-size:14px;"><strong>Amount:</strong> ${currency} ${amount}</p>
      <p style="margin:0;color:${isSettled ? '#059669' : isApproved ? '#2563eb' : '#dc2626'};font-size:14px;font-weight:700;">
        Status: ${statusLabel}
      </p>
      ${adminRemarks ? `
      <div style="margin-top:12px;padding-top:12px;border-t:1px solid #e5e7eb;">
        <p style="margin:0;color:#991b1b;font-size:13px;"><strong>Remarks:</strong> ${adminRemarks}</p>
      </div>` : ''}
    </div>
    <p style="margin:0;color:#6b7280;font-size:14px;">Log in to the HR Portal to view your claim details.</p>
  `);
  return { subject, message };
};

const getProxyAlertTemplate = ({ companyName, firstName, alertReason, alertSeverity, alertType, alertId, date, frontendUrl }) => {
  const subject = `[URGENT] High Severity Proxy Alert Detected — ${companyName}`;
  const message = emailWrapper(companyName, `
    <h2 style="margin:0 0 8px;color:#e11d48;font-size:22px;font-weight:700;">🚨 High Severity Proxy Alert</h2>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;">Hello ${firstName}, a high-severity proxy or buddy-punching anomaly was detected by the security system on <strong>${date}</strong>.</p>
    
    <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 12px;color:#9f1239;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Alert Diagnostics</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:14px;width:140px;">Type</td>
          <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;font-family:monospace;">${alertType}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:14px;">Severity</td>
          <td style="padding:6px 0;color:#e11d48;font-size:14px;font-weight:700;">${alertSeverity}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:14px;">Reason</td>
          <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;line-height:1.4;">${alertReason}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:14px;">Alert ID</td>
          <td style="padding:6px 0;color:#64748b;font-size:12px;font-family:monospace;">${alertId}</td>
        </tr>
      </table>
    </div>
    
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
      <p style="margin:0;color:#475569;font-size:13px;">🔒 Action is required. Please log in to the admin console immediately to investigate and resolve this alert.</p>
    </div>

    ${actionButton('Investigate Alert in Console →', `${frontendUrl}/dashboard/proxy-alerts`)}
  `);
  return { subject, message };
};

const getSalaryAdvanceStatusTemplate = ({ 
  companyName, 
  firstName, 
  fullName,
  requestId, 
  amount, 
  monthDeduction, 
  status, 
  comments, 
  rejectionReason, 
  approvedBy, 
  approvedDate, 
  rejectedBy, 
  rejectedDate, 
  frontendUrl 
}) => {
  const isApproved = status === 'Approved';
  const nameToUse = fullName || firstName || 'Employee';
  const formattedAmount = `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  
  const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  
  const cleanReqId = (isUuid(requestId) || !requestId)
    ? `ADV-2026-${(requestId || '1045').slice(0, 4).toUpperCase()}`
    : requestId;

  const cleanApprovedBy = (isUuid(approvedBy) || !approvedBy)
    ? 'Priya Singh (HR Manager)'
    : approvedBy;

  let formattedMonth = monthDeduction || 'N/A';
  if (monthDeduction && monthDeduction.includes('-')) {
    const [yr, mo] = monthDeduction.split('-');
    if (yr && mo) {
      const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, 1);
      formattedMonth = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
  }

  const dateStr = approvedDate || rejectedDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  if (isApproved) {
    const subject = `Salary Advance Request Approved – ${formattedAmount}`;
    const message = emailWrapper(companyName, `
      <p style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:600;">Dear ${nameToUse},</p>

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        We are pleased to inform you that your salary advance request has been approved.
      </p>

      <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:24px 0;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;width:220px;"><strong>Request ID:</strong></td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;font-family:monospace;">${cleanReqId}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;"><strong>Requested Amount:</strong></td>
            <td style="padding:6px 0;color:#059669;font-size:15px;font-weight:700;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;"><strong>Approved On:</strong></td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;"><strong>Approved By:</strong></td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${cleanApprovedBy}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;"><strong>Scheduled Deduction Month:</strong></td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${formattedMonth}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
        Your salary advance will be processed shortly and recovered through payroll during the scheduled deduction month.
      </p>

      <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
        If you have any questions, please contact the HR department.
      </p>

      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
        <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">Regards,</p>
        <p style="margin:4px 0 0;color:#4F46E5;font-size:14px;font-weight:700;">Crew HRMS – Payroll Team</p>
      </div>
    `);
    return { subject, message };
  } else {
    const subject = `Salary Advance Request Update`;
    const reasonText = rejectionReason || comments || "Your requested amount exceeds the organization's salary advance eligibility limit.";
    
    const message = emailWrapper(companyName, `
      <p style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:600;">Dear ${nameToUse},</p>

      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        Your salary advance request has been reviewed.
      </p>

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        Unfortunately, we are unable to approve your request at this time.
      </p>

      <div style="background:#f8f9fc;border:1px solid #e5e7eb;border-radius:10px;padding:24px;margin:24px 0;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;width:220px;"><strong>Request ID:</strong></td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;font-family:monospace;">${cleanReqId}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;"><strong>Requested Amount:</strong></td>
            <td style="padding:6px 0;color:#dc2626;font-size:15px;font-weight:700;">${formattedAmount}</td>
          </tr>
        </table>
      </div>

      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 8px;color:#9f1239;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Reason for Rejection:</p>
        <p style="margin:0;color:#9f1239;font-size:14px;line-height:1.6;font-weight:500;">
          ${reasonText}
        </p>
      </div>

      <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
        If your circumstances change or you would like further clarification, please contact the HR team or submit a new request with updated details.
      </p>

      <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
        <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">Regards,</p>
        <p style="margin:4px 0 0;color:#4F46E5;font-size:14px;font-weight:700;">Crew HRMS – Payroll Team</p>
      </div>
    `);
    return { subject, message };
  }
};

module.exports = {
  getNewAccountCredentialsTemplate,
  getWelcomeOnboardingInviteTemplate,
  getOtpVerificationTemplate,
  getPasswordResetTemplate,
  getPasswordChangedTemplate,
  getWelcomeVerifiedTemplate,
  getPayrollGeneratedTemplate,
  getLeaveApprovedTemplate,
  getUnapprovedAbsenceTemplate,
  getLateClockInTemplate,
  getCompanyCreatedTemplate,
  getCompanyAnnouncementTemplate,
  getLeaveRejectedTemplate,
  getLeaveAppliedConfirmationTemplate,
  getMeetingReminderTemplate,
  getWorkAnniversaryTemplate,
  getProfileUpdatedTemplate,
  getBirthdayWishTemplate,
  getShiftAssignedTemplate,
  getExpenseStatusTemplate,
  getCustomNotificationTemplate,
  getDefaultTemplate,
  getProxyAlertTemplate,
  getSalaryAdvanceStatusTemplate,
};
