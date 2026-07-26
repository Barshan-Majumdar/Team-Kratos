const prisma = require('../config/db');
const ImageKit = require('imagekit');
const {
  personalDetailsSchema,
  financialDetailsSchema,
  statutoryDetailsSchema,
} = require('../../../packages/shared/validations/onboarding');

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

exports.submitWizardStep = async (req, res) => {
  const { tenantId, id: userId } = req.user;
  const { step, data } = req.body;

  try {
    const user = await prisma.basePrisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stepOrder = ['personal_details', 'emergency_contact', 'financial_details', 'statutory_details', 'completed'];
    const currentIndex = stepOrder.indexOf(user.onboardingStep);
    const requestedIndex = stepOrder.indexOf(step);

    if (requestedIndex > currentIndex) {
      return res.status(403).json({ error: `Cannot skip forward to step ${step}` });
    }

    let updateData = {};
    let nextStep = stepOrder[requestedIndex + 1];

    if (step === 'personal_details') {
      const parsed = personalDetailsSchema.parse(data);
      updateData = { ...parsed, onboardingStep: requestedIndex === currentIndex ? nextStep : user.onboardingStep };
      if (parsed.dateOfBirth) updateData.dateOfBirth = new Date(parsed.dateOfBirth);
    } else if (step === 'emergency_contact') {
      updateData = { onboardingStep: requestedIndex === currentIndex ? nextStep : user.onboardingStep };
    } else if (step === 'financial_details') {
      const parsed = financialDetailsSchema.parse(data);
      updateData = { ...parsed, onboardingStep: requestedIndex === currentIndex ? nextStep : user.onboardingStep };
    } else if (step === 'statutory_details') {
      const parsed = statutoryDetailsSchema.parse(data);
      updateData = { ...parsed, onboardingCompleted: true, onboardingStep: 'completed' };
    } else {
      return res.status(400).json({ error: 'Invalid step' });
    }

    const updatedUser = await prisma.basePrisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json(updatedUser);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const { tenantId, id: userId } = req.user;
    const { type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    if (!['PAN', 'AADHAAR'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const uploadRes = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName: `${userId}-${type}-${Date.now()}`,
      folder: `/onboarding/${tenantId}`,
      isPrivateFile: true,
      useUniqueFileName: true
    });

    const doc = await prisma.basePrisma.onboardingDocument.create({
      data: {
        tenantId,
        userId,
        type,
        fileId: uploadRes.filePath // store filePath to easily generate signed URLs
      }
    });

    res.json({ success: true, document: doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, id: requesterId, roleLevel } = req.user;

    const doc = await prisma.basePrisma.onboardingDocument.findUnique({
      where: { id }
    });

    if (!doc || doc.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.userId !== requesterId && roleLevel > 1) {
      return res.status(403).json({ error: 'Unauthorized to view this document' });
    }

    const signedUrl = imagekit.url({
      path: doc.fileId,
      signed: true,
      expireSeconds: 300 // 5 minutes
    });

    // Audit Log
    await prisma.basePrisma.auditLog.create({
      data: {
        tenantId,
        actorId: requesterId,
        action: `VIEW_ONBOARDING_DOCUMENT`,
        targetId: doc.id,
        details: { type: doc.type, ownerId: doc.userId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ url: signedUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPipeline = async (req, res) => {
  try {
    const { tenantId } = req.user;
    
    const users = await prisma.basePrisma.user.findMany({
      where: { 
        tenantId, 
        onboardingCompleted: false 
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        onboardingStep: true,
        dateOfJoining: true
      }
    });

    const pipeline = users.map(user => {
      const daysSinceJoining = user.dateOfJoining 
        ? Math.floor((new Date() - new Date(user.dateOfJoining)) / (1000 * 60 * 60 * 24))
        : 0;
      return { ...user, daysSinceJoining };
    });

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { tenantId, id: userId, roleLevel } = req.user;
    const targetUserId = roleLevel <= 1 && req.query.userId ? req.query.userId : userId;

    const tasks = await prisma.basePrisma.onboardingTask.findMany({
      where: { tenantId, userId: targetUserId }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignTask = async (req, res) => {
  try {
    const { tenantId, roleLevel } = req.user;
    if (roleLevel > 1) return res.status(403).json({ error: 'Unauthorized' });

    const { userId, templateId } = req.body;

    const template = await prisma.basePrisma.onboardingChecklistTemplate.findUnique({
      where: { id: templateId },
      include: { tasks: true }
    });

    if (!template || template.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const tasks = template.tasks.map(t => ({
      tenantId,
      userId,
      checklistId: template.id,
      title: t.title,
      dueDate: new Date(Date.now() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
    }));

    await prisma.basePrisma.onboardingTask.createMany({ data: tasks });

    res.json({ success: true, message: 'Tasks assigned' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { tenantId, id: userId, roleLevel } = req.user;

    const task = await prisma.basePrisma.onboardingTask.findUnique({ where: { id } });
    if (!task || task.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // A user can complete their own task, or an admin can complete it
    if (task.userId !== userId && roleLevel > 1) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.basePrisma.onboardingTask.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: userId
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
