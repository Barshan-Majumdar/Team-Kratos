const prisma = require('../config/db');
const ImageKit = require('imagekit');
const bcrypt = require('bcrypt');
const { sendNotification } = require('../utils/notificationEngine');
const imagekit = new ImageKit({
    publicKey : process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : process.env.IMAGEKIT_URL_ENDPOINT
});

// ── Helper: Generate Employee ID ─────────────────────────

const generateEmployeeId = async (displayName) => {
  const year = new Date().getFullYear();
  const parts = (displayName || 'New User').trim().split(/\s+/);
  const f2 = (parts[0] || 'XX').substring(0, 2).toUpperCase();
  const l2 = (parts.length > 1 ? parts[parts.length - 1] : 'XX').substring(0, 2).toUpperCase();
  const prefix = `OI${f2}${l2}${year}`;

  const lastUser = await prisma.user.findFirst({
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

// ── Admin only: Create new employee ──────────────────────
// Role mapping: level 0 = CEO, level 1 = Admin, level 2 = Manager, level 3+ = Employee
// The `role` (Prisma Enum) drives system permissions; `customRole` is the org label.
const LEVEL_TO_SYSTEM_ROLE = (level) => {
  if (level === 0) return 'CEO';
  if (level === 1) return 'Admin';
  if (level === 2) return 'Manager';
  return 'Employee'; // level 3 and above
};

const createEmployee = async (req, res) => {
  try {
    const { 
      email, displayName, department, phone, customRole,
      jobPosition, gender, location, workingDaysPerWeek, breakTimeHrs, entityId 
    } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: 'Email and Name are required' });
    }

    if (!customRole) {
      return res.status(400).json({ error: 'A role must be assigned to the new employee' });
    }

    // ── Fetch the tenant's role hierarchy defined by the chairman ──
    const tenantRoles = await prisma.basePrisma.roleDefinition.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { level: 'asc' }
    });

    if (!tenantRoles || tenantRoles.length === 0) {
      return res.status(400).json({ error: 'No role hierarchy configured for this company. Please ask the owner to set up roles.' });
    }

    // ── Identify target role in company hierarchy ──
    const targetRoleDef = tenantRoles.find(
      r => r.name.toLowerCase() === customRole.toLowerCase()
    );
    if (!targetRoleDef) {
      return res.status(400).json({ 
        error: `"${customRole}" is not a valid role in your company's role hierarchy. Valid roles: ${tenantRoles.map(r => r.name).join(', ')}` 
      });
    }

    // ── Identify the inviter's role level in company hierarchy ──
    // Extract level securely from the JWT / user context rather than relying on strings
    let inviterLevel = 99;
    const inviterSystemRole = req.user.roleDefinition?.name || req.user.customRole || req.user.role;
    
    if (req.user.roleDefinition) {
       inviterLevel = req.user.roleDefinition.level;
    } else {
       // Fallback for legacy logins
       const inviterRoleDef = tenantRoles.find(
         r => r.name.toLowerCase() === (inviterSystemRole || '').toLowerCase()
       );
       if (inviterRoleDef) inviterLevel = inviterRoleDef.level;
    }

    const targetLevel = targetRoleDef.level;

    // ── Enforce strict hierarchical RBAC universally ──
    // NO ONE can assign a role at or above their own level.
    // CEO (L0) can only assign L1+, Admin (L1) can only assign L2+, etc.
    if (targetLevel <= inviterLevel) {
      return res.status(403).json({
        error: `Access Denied: As a "${inviterSystemRole}" (Level ${inviterLevel}), you can only assign roles strictly below your level. "${customRole}" is at Level ${targetLevel}.`
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const employeeId = await generateEmployeeId(displayName);

    // Auto-generate a secure temporary password
    const generatedPassword = Math.random().toString(36).slice(-8) + 'Aa1@';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Map the custom role level to a system Role enum value (drives permissions)
    const systemRole = LEVEL_TO_SYSTEM_ROLE(targetLevel);

    const user = await prisma.user.create({
      data: {
        tenantId: req.user ? req.user.tenantId : null,
        employeeId,
        email,
        password: hashedPassword,
        roleDefinitionId: targetRoleDef.id,
        customRole: customRole,    // Human-readable org role from chairman's hierarchy
        mustChangePassword: true,
        displayName,
        department: department || null,
        phone: phone || null,
        jobPosition: jobPosition || null,
        gender: gender || null,
        location: location || null,
        entityId: entityId || null,
        workingDaysPerWeek: workingDaysPerWeek ? parseInt(workingDaysPerWeek) : 5,
        breakTimeHrs: breakTimeHrs ? parseFloat(breakTimeHrs) : 1.0,
        dateOfJoining: new Date()
      }
    });

    const { password: _, ...safeUser } = user;

    // Send credentials via email (Background task for speed)
    const { sendNotification } = require('../utils/notificationEngine');
    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      type: 'NEW_ACCOUNT_CREDENTIALS',
      data: {
        email,
        password: generatedPassword
      }
    }).catch(err => console.error('Failed to send notification in background', err));

    res.status(201).json({
      message: `Employee created successfully as "${customRole}". Credentials sent via email.`,
      user: safeUser
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(400).json({ error: error.message });
  }
};



// ── Get current user profile ─────────────────────────────

const getMyProfile = async (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
};

// ── Get all employees (Admin only) ───────────────────────

const getAllEmployees = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const users = await prisma.user.findMany({
      where: {
        email: { not: 'barshanmajumdar249@gmail.com' } // Hide permanent admin from employee cards
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        displayName: true,
        department: true,
        customRole: true,
        status: true,
        avatar: true,
        phone: true,
        jobPosition: true,
        dateOfJoining: true,
        createdAt: true,
        attendances: {
          where: {
            date: {
              gte: today,
              lt: tomorrow
            }
          },
          take: 1
        },
        leaves: {
          where: {
            status: 'Approved',
            startDate: { lte: today },
            endDate: { gte: today }
          },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error('Get all employees error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Get Org Chart (All Roles) ───────────────────────────

const getOrgChart = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        tenantId: req.user.tenantId,
        email: { not: 'barshanmajumdar249@gmail.com' } // Hide permanent admin
      },
      select: {
        id: true,
        displayName: true,
        jobPosition: true,
        department: true,
        avatar: true,
        customRole: true,
        managerId: true,
        status: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Get single employee by ID (view-only for cards) ──────

const getEmployeeById = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        manager: {
          select: { id: true, displayName: true }
        },
        attendances: {
          where: {
            date: {
              gte: today,
              lt: tomorrow
            }
          },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Get employee by id error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Update own profile ───────────────────────────────────

const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      'displayName', 'phone', 'about', 'skills', 'certifications',
      'residingAddress', 'personalEmail', 'gender', 'nationality',
      'maritalStatus', 'location', 'dateOfBirth', 'aadharNo', 'panNo', 'voterIdNo',
      'bankName', 'bankBranch', 'accountNumber', 'ifscCode', 'uanNo', 'empCode', 'avatar'
    ];

    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) throw new Error('User not found');

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Prevent editing locked fields if they already have a value (unless user is Level 1 Admin/Level 0 Owner)
        const lockedFields = ['aadharNo', 'panNo', 'voterIdNo', 'dateOfBirth', 'bankName', 'bankBranch', 'accountNumber', 'ifscCode', 'nationality', 'personalEmail', 'gender', 'maritalStatus', 'uanNo', 'empCode'];
        const isHighLevel = req.user.roleDefinition && req.user.roleDefinition.level <= 1;
        if (lockedFields.includes(field) && currentUser[field] && !isHighLevel) {
           // Skip updating this field because it's already set
           continue;
        }
        
        if (field === 'dateOfBirth') {
           if (req.body[field]) {
             updateData[field] = new Date(req.body[field]);
           } else {
             updateData[field] = null;
           }
        } else {
        if (field === 'avatar' && req.body[field] && req.body[field].startsWith('data:image')) {
          // Upload to ImageKit
          const uploadRes = await imagekit.upload({
            file: req.body[field], // base64 string
            fileName: `avatar_${currentUser.id}_${Date.now()}.jpg`,
            folder: '/avatars'
          });
          updateData[field] = uploadRes.url;
        } else {
           updateData[field] = req.body[field];
        }
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    sendNotification({
      userId: updated.id,
      tenantId: updated.tenantId,
      type: 'PROFILE_UPDATED',
      data: {}
    });

    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({ error: error.message });
  }
};

const updateEmployeeById = async (req, res) => {
  try {
    const targetId = req.params.id;
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.roleDefinition && req.user.roleDefinition.level <= 1;
    
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this profile' });
    }

    const { 
      displayName, phone, aadharNo, panNo, voterIdNo, residingAddress, dateOfBirth, // Personal Info (isSelf || isAdmin)
      department, jobPosition, workingDaysPerWeek, breakTimeHrs, baseSalary, entityId, roleDefinitionId // Work Info (isAdmin only)
    } = req.body;

    const updateData = {};
    
    // Anyone can edit these fields if they own the profile (or if admin is editing them)
    if (isSelf || isAdmin) {
      if (displayName !== undefined) updateData.displayName = displayName;
      if (phone !== undefined) updateData.phone = phone;
      if (aadharNo !== undefined) updateData.aadharNo = aadharNo;
      if (panNo !== undefined) updateData.panNo = panNo;
      if (voterIdNo !== undefined) updateData.voterIdNo = voterIdNo;
      if (residingAddress !== undefined) updateData.residingAddress = residingAddress;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    }

    // ONLY Admins can edit these fields
    let oldSalary = undefined;
    let oldRole = undefined;
    if (isAdmin) {
      if (department !== undefined) updateData.department = department;
      if (jobPosition !== undefined) updateData.jobPosition = jobPosition;
      if (workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = workingDaysPerWeek;
      if (breakTimeHrs !== undefined) updateData.breakTimeHrs = breakTimeHrs;
      if (entityId !== undefined) updateData.entityId = entityId;
      if (roleDefinitionId !== undefined) {
        // Enforce RBAC rules for role assignment updates
        const targetRole = await prisma.basePrisma.roleDefinition.findUnique({ where: { id: roleDefinitionId }});
        if (!targetRole || targetRole.tenantId !== req.user.tenantId) {
          return res.status(400).json({ error: 'Invalid role for this tenant.' });
        }
        
        const inviterLevel = req.user.roleDefinition?.level ?? 99;
        if (targetRole.level <= inviterLevel) {
          return res.status(403).json({ error: 'Cannot assign a role equal to or higher than your own.' });
        }
        
        updateData.roleDefinitionId = roleDefinitionId;
        const oldUser = await prisma.user.findUnique({ where: { id: targetId }, select: { roleDefinitionId: true } });
        oldRole = oldUser?.roleDefinitionId;
      }
      
      if (baseSalary !== undefined) {
        updateData.baseSalary = baseSalary;
        const oldUser = await prisma.user.findUnique({ where: { id: targetId }, select: { baseSalary: true } });
        oldSalary = oldUser?.baseSalary;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      include: {
        manager: {
          select: { id: true, displayName: true }
        }
      }
    });

    sendNotification({
      userId: updatedUser.id,
      tenantId: updatedUser.tenantId,
      type: 'PROFILE_UPDATED',
      data: {}
    });

    if (isAdmin && roleDefinitionId !== undefined && oldRole !== roleDefinitionId) {
      const io = req.app.get('io');
      if (io) io.to(`tenant:${updatedUser.tenantId}:user:${targetId}`).emit('user:role_updated', { user: updatedUser });
    }

    if (isAdmin && baseSalary !== undefined && oldSalary !== baseSalary) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'SALARY_UPDATED',
          targetId: targetId,
          details: `Updated base salary from ${oldSalary} to ${baseSalary}`
        }
      });
    }

    const { password: _, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    console.error('Update employee by ID error:', error);
    res.status(400).json({ error: error.message });
  }
};

const getAdminEmails = async (req, res) => {
  try {
    const emails = await prisma.adminEmail.findMany();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addAdminEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const added = await prisma.adminEmail.create({ data: { email } });

    // If the user already exists in the system, upgrade them to Admin immediately
    await prisma.user.updateMany({
      where: { email },
      data: { }
    });

    res.json(added);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already in list' });
    res.status(500).json({ error: error.message });
  }
};

const removeAdminEmail = async (req, res) => {
  try {
    const { email } = req.params;
    if (email.toLowerCase() === 'barshanmajumdar249@gmail.com') {
      return res.status(400).json({ error: 'Cannot remove permanent admin' });
    }
    
    // Remove from the authorized list
    await prisma.adminEmail.delete({ where: { email } });
    
    // If they already signed up, downgrade them to an Employee immediately
    await prisma.user.updateMany({
      where: { email },
      data: { }
    });
    
    res.json({ message: 'Removed successfully and downgraded if user exists' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getInvitedEmails = async (req, res) => {
  try {
    const emails = await prisma.invitedEmployee.findMany();
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const inviteEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User is already fully registered' });
    }

    const added = await prisma.invitedEmployee.create({ data: { email } });
    res.json(added);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already invited' });
    res.status(500).json({ error: error.message });
  }
};

const removeInvitedEmail = async (req, res) => {
  try {
    const { email } = req.params;
    await prisma.invitedEmployee.delete({ where: { email } });
    res.json({ message: 'Removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Upload KYC Docs ──────────────────────────────────────
const uploadKycDocs = async (req, res) => {
  try {
    const targetId = req.params.id;
    const isSelf = req.user.id === targetId;
    const isAdmin = req.user.roleDefinition && req.user.roleDefinition.level <= 1;
    
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const uploadToImageKit = async (fileObj, docName) => {
      const uploadRes = await imagekit.upload({
        file: fileObj.buffer.toString('base64'),
        fileName: `${docName}_${targetId}_${Date.now()}_${fileObj.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        folder: '/kyc',
        useUniqueFileName: true
      });
      return uploadRes.url;
    };

    const updateData = {};
    if (req.files['aadharDoc']) updateData.aadharDoc = await uploadToImageKit(req.files['aadharDoc'][0], 'aadhar');
    if (req.files['panDoc']) updateData.panDoc = await uploadToImageKit(req.files['panDoc'][0], 'pan');
    if (req.files['voterDoc']) updateData.voterDoc = await uploadToImageKit(req.files['voterDoc'][0], 'voter');
    if (req.files['addressProofDoc']) updateData.addressProofDoc = await uploadToImageKit(req.files['addressProofDoc'][0], 'address');

    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      include: {
        manager: {
          select: { id: true, displayName: true }
        }
      }
    });

    const { password: _, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    console.error('Upload KYC error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createEmployee,
  getMyProfile,
  getAllEmployees,
  getEmployeeById,
  updateMyProfile,
  getAdminEmails,
  addAdminEmail,
  removeAdminEmail,
  getInvitedEmails,
  inviteEmail,
  removeInvitedEmail,
  updateEmployeeById,
  uploadKycDocs,
  getOrgChart
};
