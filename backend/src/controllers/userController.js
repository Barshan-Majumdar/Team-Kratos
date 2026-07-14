const { PrismaClient } = require('@prisma/client');
const ImageKit = require('imagekit');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

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

const createEmployee = async (req, res) => {
  try {
    const { 
      email, displayName, department, phone, role, 
      jobPosition, gender, location, workingDaysPerWeek, breakTimeHrs 
    } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: 'Email and Name are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const employeeId = await generateEmployeeId(displayName);

    // Auto-generate a secure temporary password
    const generatedPassword = Math.random().toString(36).slice(-8) + 'Aa1@';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    const user = await prisma.user.create({
      data: {
        employeeId,
        email,
        password: hashedPassword,
        role: role || 'Employee',
        mustChangePassword: true,
        displayName,
        department: department || null,
        phone: phone || null,
        jobPosition: jobPosition || null,
        gender: gender || null,
        location: location || null,
        workingDaysPerWeek: workingDaysPerWeek ? parseInt(workingDaysPerWeek) : 5,
        breakTimeHrs: breakTimeHrs ? parseFloat(breakTimeHrs) : 1.0,
        dateOfJoining: new Date()
      }
    });

    const { password: _, ...safeUser } = user;

    res.status(201).json({
      message: 'Employee created successfully',
      user: safeUser,
      generatedPassword
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
        role: true,
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
        // Prevent editing locked fields if they already have a value
        const lockedFields = ['aadharNo', 'panNo', 'voterIdNo', 'dateOfBirth', 'bankName', 'bankBranch', 'accountNumber', 'ifscCode', 'nationality', 'personalEmail', 'gender', 'maritalStatus', 'uanNo', 'empCode'];
        if (lockedFields.includes(field) && currentUser[field] && currentUser.role !== 'Admin') {
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
    const isAdmin = req.user.role === 'Admin';
    
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to edit this profile' });
    }

    const { 
      displayName, phone, aadharNo, panNo, voterIdNo, residingAddress, dateOfBirth, // Personal Info (isSelf || isAdmin)
      department, jobPosition, workingDaysPerWeek, breakTimeHrs, baseSalary, totalLeavesAllowed // Work Info (isAdmin only)
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
    if (isAdmin) {
      if (department !== undefined) updateData.department = department;
      if (jobPosition !== undefined) updateData.jobPosition = jobPosition;
      if (workingDaysPerWeek !== undefined) updateData.workingDaysPerWeek = workingDaysPerWeek;
      if (breakTimeHrs !== undefined) updateData.breakTimeHrs = breakTimeHrs;
      if (totalLeavesAllowed !== undefined) updateData.totalLeavesAllowed = totalLeavesAllowed;
      
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
      data: { role: 'Admin' }
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
      data: { role: 'Employee' }
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
    const isAdmin = req.user.role === 'Admin';
    
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
  uploadKycDocs
};
