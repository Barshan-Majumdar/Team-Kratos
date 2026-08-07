const prisma = require('../config/db');
const ImageKit = require('imagekit');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
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
      jobPosition, gender, location, workingDaysPerWeek, breakTimeHrs, entityId, officeId 
    } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: 'Email and Name are required' });
    }

    if (!customRole) {
      return res.status(400).json({ error: 'A role must be assigned to the new employee' });
    }

    if (!officeId) {
      return res.status(400).json({ error: 'An Office / Branch must be assigned to the new employee' });
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
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);
    // Generate secure 72-hour onboarding invite token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        tenantId: req.user ? req.user.tenantId : null,
        employeeId,
        email,
        password: hashedPassword,
        roleDefinitionId: targetRoleDef.id,
        customRole: customRole,    // Human-readable org role (Employee / HR / Manager)
        mustChangePassword: true,
        status: 'Active',
        inviteToken,
        inviteTokenExpiry,
        faceRegistered: false,
        displayName,
        department: department || null,
        phone: phone || null,
        jobPosition: jobPosition || null,
        gender: gender || null,
        location: location || null,
        entityId: entityId || null,
        officeId: officeId || null,
        workingDaysPerWeek: workingDaysPerWeek ? parseInt(workingDaysPerWeek) : 5,
        breakTimeHrs: breakTimeHrs ? parseFloat(breakTimeHrs) : 1.0,
        dateOfJoining: new Date()
      }
    });

    const { password: _, ...safeUser } = user;

    // Send welcome onboarding email containing setup token & instructions
    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      type: 'WELCOME_ONBOARDING_INVITE',
      data: {
        email,
        inviteToken,
        roleName: customRole
      }
    }).catch(err => console.error('Failed to send onboarding invite notification in background', err));

    res.status(201).json({
      message: `Account created successfully for "${customRole}". Welcome invite email sent to ${email}.`,
      user: safeUser,
      inviteToken
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
        tenantId: req.user.tenantId,  // Explicit tenant scope — safety net against context leaks
        email: { not: 'barshanmajumdar249@gmail.com' } // Hide platform admin from employee cards
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
            OR: [
              { date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
              { checkIn: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            ]
          },
          orderBy: { checkIn: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            checkIn: true,
            checkOut: true
          }
        },
        leaves: {
          where: {
            status: 'Approved',
            startDate: { lte: today },
            endDate: { gte: today }
          },
          select: {
            id: true,
            status: true
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
        assets: true,
        attendances: {
          where: {
            OR: [
              { date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
              { checkIn: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
            ]
          },
          orderBy: { checkIn: 'desc' },
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
    const isAdmin = req.user.roleDefinition?.level <= 1;
    const isManager = req.user.roleDefinition?.level === 2;

    // Managers can edit their direct subordinates' basic profile info
    let isManagerOfTarget = false;
    if (isManager && !isSelf) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { managerId: true }
      });
      isManagerOfTarget = targetUser?.managerId === req.user.id;
    }
    
    if (!isSelf && !isAdmin && !isManagerOfTarget) {
      return res.status(403).json({ error: 'Not authorized to edit this profile' });
    }

    const { 
      displayName, phone, status, aadharNo, panNo, voterIdNo, residingAddress, dateOfBirth, // Personal Info
      department, jobPosition, workingDaysPerWeek, breakTimeHrs, baseSalary, entityId, officeId, roleDefinitionId // Work Info
    } = req.body;

    const updateData = {};
    
    // Anyone can edit these fields if they own the profile
    if (isSelf || isAdmin) {
      if (displayName !== undefined) updateData.displayName = displayName;
      if (phone !== undefined) updateData.phone = phone;
      if (aadharNo !== undefined) updateData.aadharNo = aadharNo;
      if (panNo !== undefined) updateData.panNo = panNo;
      if (voterIdNo !== undefined) updateData.voterIdNo = voterIdNo;
      if (residingAddress !== undefined) updateData.residingAddress = residingAddress;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    }

    // Admins and Managers (for their direct subordinates) can edit basic work info
    if (isAdmin || isManagerOfTarget) {
      if (status !== undefined && isAdmin) updateData.status = status;
      if (department !== undefined) updateData.department = department;
      if (jobPosition !== undefined) updateData.jobPosition = jobPosition;
      if (workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = workingDaysPerWeek;
      if (breakTimeHrs !== undefined) updateData.breakTimeHrs = breakTimeHrs;
      if (entityId !== undefined) updateData.entityId = entityId;
      if (officeId !== undefined) updateData.officeId = officeId;
    }

    // ONLY Admins (L0/L1) can change salary and role assignment
    let oldSalary = undefined;
    let oldRole = undefined;
    if (isAdmin) {
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

    if (status === 'Inactive') {
      try {
        await prisma.faceRegistration.deleteMany({ where: { userId: targetId } });
      } catch (_) {}
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

    if (isAdmin) {
      if (baseSalary !== undefined && oldSalary !== baseSalary) {
        await prisma.auditLog.create({
          data: {
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            action: 'SALARY_UPDATED',
            targetId: targetId,
            details: { oldSalary, newSalary: baseSalary }
          }
        });
      }

      if (roleDefinitionId !== undefined && oldRole !== roleDefinitionId) {
        await prisma.auditLog.create({
          data: {
            tenantId: req.user.tenantId,
            actorId: req.user.id,
            action: 'EMPLOYEE_PROMOTED',
            targetId: targetId,
            details: { oldRole, newRole: roleDefinitionId }
          }
        });
      }
      
      if (officeId !== undefined) {
        const oldUser = await prisma.user.findUnique({ where: { id: targetId }, select: { officeId: true } });
        if (oldUser && oldUser.officeId !== officeId) {
          await prisma.auditLog.create({
            data: {
              tenantId: req.user.tenantId,
              actorId: req.user.id,
              action: 'EMPLOYEE_TRANSFERRED',
              targetId: targetId,
              details: { oldOfficeId: oldUser.officeId, newOfficeId: officeId }
            }
          });
        }
      }
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
    // Scope to the current user's tenant — admins should only see their own company's list
    const emails = await prisma.adminEmail.findMany({
      where: { tenantId: req.user.tenantId }
    });
    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addAdminEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    
    const added = await prisma.adminEmail.create({
      data: { email, tenantId: req.user.tenantId }  // Scope to this tenant
    });

    // If the user already exists, promote them to the tenant's L1 (HR Admin) role immediately
    const adminRole = await prisma.basePrisma.roleDefinition.findFirst({
      where: { tenantId: req.user.tenantId, level: 1 }
    });
    if (adminRole) {
      await prisma.user.updateMany({
        where: { email, tenantId: req.user.tenantId },
        data: { roleDefinitionId: adminRole.id }  // Actually promote — fixes the empty data:{} bug
      });
    }

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
    await prisma.adminEmail.deleteMany({
      where: { email, tenantId: req.user.tenantId }
    });
    
    // If the user already signed up, demote them to the tenant's most basic role
    const employeeRole = await prisma.basePrisma.roleDefinition.findFirst({
      where: { tenantId: req.user.tenantId },
      orderBy: { level: 'desc' }  // Highest level number = least privileged
    });
    if (employeeRole) {
      await prisma.user.updateMany({
        where: { email, tenantId: req.user.tenantId },
        data: { roleDefinitionId: employeeRole.id }  // Actually demote — fixes the empty data:{} bug
      });
    }
    
    res.json({ message: 'Removed successfully and downgraded if user exists' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getInvitedEmails = async (req, res) => {
  try {
    // Scope to the current tenant
    const emails = await prisma.invitedEmployee.findMany({
      where: { tenantId: req.user.tenantId }
    });
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

    // Scope to this tenant so signup flow can find the correct tenantId
    const added = await prisma.invitedEmployee.create({
      data: { email, tenantId: req.user.tenantId }
    });
    res.json(added);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email already invited' });
    res.status(500).json({ error: error.message });
  }
};

const removeInvitedEmail = async (req, res) => {
  try {
    const { email } = req.params;
    // Scope delete to this tenant
    await prisma.invitedEmployee.deleteMany({
      where: { email, tenantId: req.user.tenantId }
    });
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

// ── PII-safe user directory for dropdowns ─────────────────
// Returns ONLY display-safe fields (id, displayName, jobPosition, department,
// avatar, customRole, managerId). Zero PAN, Aadhaar, bank, address, or phone.
// Supports ?scope=team (subordinates only for managers) and ?scope=all (full tenant).

const getUserDirectory = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const scope = req.query.scope || 'all';
    const userLevel = req.user.roleDefinition?.level ?? 3;

    let whereClause = {
      tenantId,
      status: 'Active',
      email: { not: 'barshanmajumdar249@gmail.com' } // Hide permanent admin
    };

    if (scope === 'team' && userLevel === 2) {
      // Managers see only their subordinate tree
      const { getSubordinateIds } = require('../utils/managerHierarchy');
      const teamIds = await getSubordinateIds(req.user.id, tenantId);
      whereClause.id = { in: teamIds };
    } else if (scope === 'team' && userLevel >= 3) {
      // Employees can't assign goals/reviews to anyone
      return res.json([]);
    }
    // Level 0/1 admins and scope=all: return all active tenant users

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        displayName: true,
        jobPosition: true,
        department: true,
        avatar: true,
        customRole: true,
        managerId: true
      },
      orderBy: { displayName: 'asc' }
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── User Preference Handlers ──────────────────────────────
const getUserPreferences = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    let preference = await prisma.userPreference.findUnique({
      where: { userId }
    });

    if (!preference) {
      preference = await prisma.userPreference.create({
        data: {
          tenantId,
          userId,
          announceBirthday: true
        }
      });
    }

    res.json(preference);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserPreferences = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { announceBirthday } = req.body;

    const preference = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        announceBirthday: typeof announceBirthday === 'boolean' ? announceBirthday : true
      },
      create: {
        tenantId,
        userId,
        announceBirthday: typeof announceBirthday === 'boolean' ? announceBirthday : true
      }
    });

    res.json(preference);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Verify Onboarding Invite Token ──────────────────────────
const verifyInviteToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Invite token is required' });

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExpiry: { gt: new Date() }
      },
      select: { id: true, email: true, displayName: true, customRole: true, faceRegistered: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired invite token. Please request a new invitation from HR.' });
    }

    res.json({ valid: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Set Password from Invite Token ──────────────────────────
const setPasswordFromToken = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Invite token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await prisma.user.findFirst({
      where: {
        inviteToken: token,
        inviteTokenExpiry: { gt: new Date() }
      },
      include: { roleDefinition: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired invite token.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
        status: 'Active',
        inviteToken: null,
        inviteTokenExpiry: null
      },
      include: { roleDefinition: true }
    });

    const authToken = jwt.sign(
      { id: updatedUser.id, tenantId: updatedUser.tenantId, role: updatedUser.roleDefinitionId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const { password: _, ...safeUser } = updatedUser;
    res.json({
      message: 'Password established successfully! Proceed to mandatory face registration.',
      token: authToken,
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Resend Invite Token (HR/Admin action) ───────────────────
const resendInviteToken = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!user) return res.status(404).json({ error: 'Employee/User record not found' });

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: targetUserId },
      data: { inviteToken, inviteTokenExpiry }
    });

    sendNotification({
      userId: user.id,
      tenantId: user.tenantId,
      type: 'WELCOME_ONBOARDING_INVITE',
      data: {
        email: user.email,
        inviteToken,
        roleName: user.customRole || 'Team Member'
      }
    }).catch(err => console.error('Failed to resend invite notification', err));

    res.json({ message: `Welcome invitation successfully resent to ${user.email}.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createEmployee,
  verifyInviteToken,
  setPasswordFromToken,
  resendInviteToken,
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
  getOrgChart,
  getUserDirectory,
  getUserPreferences,
  updateUserPreferences
};
