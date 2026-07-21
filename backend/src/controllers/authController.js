const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { dispatchWebhook } = require('../utils/webhookDispatcher');
const { sendNotification } = require('../utils/notificationEngine');

// ── Helpers ───────────────────────────────────────────────

const generateAuthToken = (user) => {
  return jwt.sign(
    { _id: user.id, role: user.roleDefinition?.name, customRole: user.customRole, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};

/**
 * Generate employeeId in format: OI[First2][Last2][YYYY][0001]
 * Example: John Doe joining in 2026 → OIJODO20260001
 */
const generateEmployeeId = async (displayName) => {
  const year = new Date().getFullYear();
  const parts = (displayName || 'New User').trim().split(/\s+/);
  const f2 = (parts[0] || 'XX').substring(0, 2).toUpperCase();
  const l2 = (parts.length > 1 ? parts[parts.length - 1] : 'XX').substring(0, 2).toUpperCase();
  const prefix = `OI${f2}${l2}${year}`;

  const lastUser = await prisma.basePrisma.user.findFirst({
    where: { employeeId: { startsWith: prefix } },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true }
  });

  let seq = 1;
  if (lastUser && lastUser.employeeId) {
    const lastSeq = parseInt(lastUser.employeeId.slice(-4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${seq.toString().padStart(4, '0')}`;
};

// ── Sign Up (Admin / Employee Invitation) ──────────────────────

const signup = async (req, res) => {
  try {
    const { displayName, email, phone, password, confirmPassword, companyName, department } = req.body;

    // Validate confirm password
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Check duplicate email
    const existing = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const employeeId = await generateEmployeeId(displayName);

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    let assignedRole = 'Employee';
    let assignedTenantId = null;
    
    if (email.toLowerCase() === 'barshanmajumdar249@gmail.com') {
      assignedRole = 'SuperAdmin';
    } else {
      const isAdminEmail = await prisma.basePrisma.adminEmail.findFirst({ where: { email } });
      const isInvitedEmployee = await prisma.basePrisma.invitedEmployee.findFirst({ where: { email } });

      if (isAdminEmail) {
        assignedRole = 'Admin';
        assignedTenantId = isAdminEmail.tenantId;
      } else if (isInvitedEmployee) {
        assignedRole = 'Employee';
        assignedTenantId = isInvitedEmployee.tenantId;
      } else {
        // Block all unauthorized signups
        return res.status(403).json({ 
          error: 'You are not given the permission to enter here. Please ask your administrator to invite you.' 
        });
      }
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await prisma.basePrisma.user.create({
      data: {
        employeeId,
        email,
        phone: phone || null,
        password: hashedPassword,
        tenantId: assignedTenantId,
        mustChangePassword: false,
        emailVerified: false,
        otpCode: otp,
        otpExpiry,
        displayName,
        department: department || null,
        companyName: companyName || null,
        dateOfJoining: new Date()
      }
    });

    // Optionally delete from invited list so it isn't reused (though User table unique constraint prevents reuse anyway)
    // We are keeping it so the admin can see a history of all invitations they've sent.
    
    if (assignedTenantId) {
      // Fire webhook
      dispatchWebhook(assignedTenantId, 'user.created', {
        userId: user.id,
        employeeId: user.employeeId,
        email: user.email
      });

      // Fire notification
      sendNotification({
        userId: user.id,
        tenantId: assignedTenantId,
        channel: 'EMAIL',
        type: 'WELCOME'
      });
      
      // Fire OTP notification
      sendNotification({
        userId: user.id,
        tenantId: assignedTenantId,
        channel: 'EMAIL',
        type: 'OTP_VERIFICATION',
        data: { otp }
      });
    }
    
    const token = generateAuthToken(user);
    const { password: _, ...safeUser } = user;

    res.status(201).json({ user: safeUser, token });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name?.includes('Prisma') || error.message?.includes('prisma')) {
      return res.status(500).json({ error: 'A database error occurred. Please try again later.' });
    }
    res.status(400).json({ error: error.message || 'An unexpected error occurred during signup.' });
  }
};

// ── Login (accepts email OR employeeId) ──────────────────

const login = async (req, res) => {
  try {
    const { identifier, password, source } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Login ID/Email and password are required' });
    }

    // Try finding by email first, then by employeeId
    let user = await prisma.basePrisma.user.findUnique({ 
      where: { email: identifier },
      include: { roleDefinition: true }
    });
    if (!user) {
      user = await prisma.basePrisma.user.findFirst({ 
        where: { employeeId: identifier },
        include: { roleDefinition: true }
      });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    // Block Console access for non-admins BEFORE sending OTP
    const roleLevel = user.roleDefinition?.level ?? 99;
    if (source === 'console' && roleLevel > 1) {
      return res.status(403).json({ error: 'This dashboard is for company administrators. Please use the App.' });
    }

    let requireOtp = false;

    if (!user.mustChangePassword) {
      // Send OTP for 2FA only if password has been changed
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.basePrisma.user.update({
        where: { id: user.id },
        data: { 
          otpCode: otp,
          otpExpiry: new Date(Date.now() + 15 * 60 * 1000) 
        }
      });

      sendNotification({
        userId: user.id,
        tenantId: user.tenantId,
        channel: 'EMAIL',
        type: 'OTP_VERIFICATION',
        data: { otp }
      });
      requireOtp = true;
    }

    const token = generateAuthToken(user);
    const { password: _, ...safeUser } = user;

    res.cookie('jwt', token, {
      domain: process.env.NODE_ENV === 'production' ? '.crewhr.io' : 'localhost',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ user: safeUser, token, requireOtp });
  } catch (error) {
    console.error('Login error:', error);
    if (error.name?.includes('Prisma') || error.message?.includes('prisma')) {
      return res.status(500).json({ error: 'A database error occurred. Please try again later.' });
    }
    res.status(400).json({ error: error.message || 'An unexpected error occurred during login.' });
  }
};

// ── Change Password ──────────────────────────────────────

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.basePrisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        otpCode: otp,
        otpExpiry: new Date(Date.now() + 15 * 60 * 1000) 
      }
    });

    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      channel: 'EMAIL',
      type: 'OTP_VERIFICATION',
      data: { otp }
    });

    // Notify the user that their password was changed
    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      channel: 'EMAIL',
      type: 'PASSWORD_CHANGED',
      data: {}
    });

    res.json({ message: 'Password changed successfully', requireOtp: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ── Get current authenticated user ───────────────────────

const getMe = async (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
};

// ── Register New Company (From Marketing Site) ───────────

const registerCompany = async (req, res) => {
  try {
    const { 
      companyName, legalName, industry, size, website, founded, 
      pan, gstin, cin, address, city, state, pincode, country, 
      departments, customRoles, 
      ceoName, designation, phone, email, password 
    } = req.body;

    if (!companyName || !email || !password || !ceoName) {
      return res.status(400).json({ error: 'Company name, CEO name, email, and password are required' });
    }

    // Check duplicate email
    const existingUser = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const employeeId = await generateEmployeeId(ceoName);

    // Run in a transaction
    const result = await prisma.basePrisma.$transaction(async (tx) => {
      // 1. Create Tenant with all statutory info
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          domain: website || null,
          planTier: 'Free',
          pan: pan || null,
          gstin: gstin || null,
          cin: cin || null,
          industry: industry || null,
          size: size || null,
          founded: founded || null,
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          country: country || null,
          departments: departments || [],
          customRoles: customRoles || []
        }
      });

      // 2. Seed Role Definitions
      let rolesToCreate = customRoles && customRoles.length > 0 ? customRoles : [
        { name: 'Owner', level: 0, isOwnerRole: true, isSystemDefault: true, canAccessConsole: true },
        { name: 'HR Admin', level: 1, isOwnerRole: false, isSystemDefault: true, canAccessConsole: true },
        { name: 'Manager', level: 2, isOwnerRole: false, isSystemDefault: true, canAccessConsole: false },
        { name: 'Employee', level: 3, isOwnerRole: false, isSystemDefault: true, canAccessConsole: false }
      ];

      const createdRoles = [];
      for (const r of rolesToCreate) {
        const roleDef = await tx.roleDefinition.create({
          data: {
            tenantId: tenant.id,
            name: r.name,
            level: r.level,
            isOwnerRole: r.level === 0,
            isSystemDefault: r.isSystemDefault || false,
            canAccessConsole: r.level <= 1
          }
        });
        createdRoles.push(roleDef);
      }

      const ownerRole = createdRoles.find(r => r.level === 0) || createdRoles[0];

      // 3. Create CEO (Level 0)
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          employeeId,
          email,
          password: hashedPassword,
          roleDefinitionId: ownerRole.id,
          customRole: ownerRole.name,
          mustChangePassword: false,
          emailVerified: false,
          otpCode: otp,
          otpExpiry,
          displayName: ceoName,
          jobPosition: designation || 'CEO / Founder',
          phone: phone || null,
          companyName: companyName,
          dateOfJoining: new Date()
        },
        include: { roleDefinition: true }
      });

      // 4. Create Default Configurations
      await tx.payrollConfig.create({
        data: {
          tenantId: tenant.id,
          companyName: companyName,
          pfEmployeePercent: 12.0,
          pfEmployerPercent: 12.0,
          professionalTax: 200.0,
          standardAllowance: 4167.0
        }
      });

      await tx.leavePolicy.create({
        data: {
          tenantId: tenant.id,
          name: 'Annual Leave',
          annualQuota: 20,
          isPaid: true
        }
      });

      return user;
    });

    // Fire OTP Notification
    sendNotification({
      userId: result.id,
      tenantId: result.tenantId,
      channel: 'EMAIL',
      type: 'OTP_VERIFICATION',
      data: { otp: result.otpCode }
    });

    const token = generateAuthToken(result);
    const { password: _, ...safeUser } = result;

    res.cookie('jwt', token, {
      domain: process.env.NODE_ENV === 'production' ? '.crewhr.io' : 'localhost',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({ user: safeUser, token });
  } catch (error) {
    console.error('Register company error:', error);
    if (error.name?.includes('Prisma') || error.message?.includes('prisma')) {
      return res.status(500).json({ error: 'A database error occurred. Please try again later.' });
    }
    res.status(500).json({ error: 'Failed to register company due to an unexpected error.' });
  }
};

// ── Forgot Password ────────────────────────────────────────

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error('Email is required');

    const user = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Email not found in our records.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.basePrisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiry: new Date(Date.now() + 15 * 60 * 1000) 
      }
    });

    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      channel: 'EMAIL',
      type: 'PASSWORD_RESET',
      data: { otp }
    });

    res.json({ message: 'An OTP has been sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) throw new Error('Email, OTP, and new password required');

    const user = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    if (user.otpCode !== otp || !user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.basePrisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword, 
        mustChangePassword: false,
        otpCode: null,
        otpExpiry: null
      }
    });

    sendNotification({
      userId: updatedUser.id,
      tenantId: updatedUser.tenantId,
      channel: 'EMAIL',
      type: 'PASSWORD_CHANGED',
      data: {}
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};

// ── OTP Verification ───────────────────────────────────────

const verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await prisma.basePrisma.user.findUnique({ where: { id: req.user.id } });

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    // Capture whether this is the very first verification BEFORE updating
    const isFirstVerification = !user.emailVerified;

    const updatedUser = await prisma.basePrisma.user.update({
      where: { id: req.user.id },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiry: null
      },
      include: { roleDefinition: true }
    });

    // Send welcome email ONLY once — on their very first successful verification
    if (isFirstVerification) {
      sendNotification({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        channel: 'EMAIL',
        type: 'WELCOME_VERIFIED',
        data: {}
      });
    }

    const { password: _, ...safeUser } = updatedUser;
    res.json({ message: 'Email verified successfully', user: safeUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resendOTP = async (req, res) => {
  try {
    const user = await prisma.basePrisma.user.findUnique({ where: { id: req.user.id } });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.basePrisma.user.update({
      where: { id: req.user.id },
      data: { otpCode: otp, otpExpiry }
    });

    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      channel: 'EMAIL',
      type: 'OTP_VERIFICATION',
      data: { otp }
    });

    res.json({ message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  signup,
  login,
  changePassword,
  getMe,
  registerCompany,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword
};
