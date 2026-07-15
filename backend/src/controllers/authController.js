const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { dispatchWebhook } = require('../utils/webhookDispatcher');
const { sendNotification } = require('../utils/notificationEngine');

// ── Helpers ───────────────────────────────────────────────

const generateAuthToken = (user) => {
  return jwt.sign(
    { _id: user.id, role: user.role, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
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

// ── Sign Up (Admin / Company Setup) ──────────────────────

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

    const salt = await bcrypt.genSalt(10);
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

    const user = await prisma.basePrisma.user.create({
      data: {
        employeeId,
        email,
        phone: phone || null,
        password: hashedPassword,
        role: assignedRole,
        tenantId: assignedTenantId,
        mustChangePassword: false,
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
        email: user.email,
        role: user.role
      });

      // Fire notification
      sendNotification({
        userId: user.id,
        tenantId: assignedTenantId,
        channel: 'EMAIL',
        type: 'WELCOME'
      });
    }
    
    const token = generateAuthToken(user);
    const { password: _, ...safeUser } = user;

    res.status(201).json({ user: safeUser, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ── Login (accepts email OR employeeId) ──────────────────

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Login ID/Email and password are required' });
    }

    // Try finding by email first, then by employeeId
    let user = await prisma.basePrisma.user.findUnique({ where: { email: identifier } });
    if (!user) {
      user = await prisma.basePrisma.user.findFirst({ where: { employeeId: identifier } });
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const token = generateAuthToken(user);
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message });
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false
      }
    });

    res.json({ message: 'Password changed successfully' });
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
    const { companyName, domain, ceoName, email, password } = req.body;

    if (!companyName || !email || !password || !ceoName) {
      return res.status(400).json({ error: 'Company name, CEO name, email, and password are required' });
    }

    // Check duplicate email
    const existingUser = await prisma.basePrisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check duplicate domain
    if (domain) {
      const existingTenant = await prisma.basePrisma.tenant.findUnique({ where: { domain } });
      if (existingTenant) {
        return res.status(400).json({ error: 'Company domain already registered' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const employeeId = await generateEmployeeId(ceoName);

    // Run in a transaction
    const result = await prisma.basePrisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          domain: domain || null,
          planTier: 'Free'
        }
      });

      // 2. Create CEO
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          employeeId,
          email,
          password: hashedPassword,
          role: 'CEO',
          mustChangePassword: false,
          displayName: ceoName,
          companyName: companyName,
          dateOfJoining: new Date()
        }
      });

      // 3. Create Default Configurations
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

    const token = generateAuthToken(result);
    const { password: _, ...safeUser } = result;

    res.status(201).json({ user: safeUser, token });
  } catch (error) {
    console.error('Register company error:', error);
    res.status(500).json({ error: 'Failed to register company: ' + error.message });
  }
};

module.exports = {
  signup,
  login,
  changePassword,
  getMe,
  registerCompany
};
