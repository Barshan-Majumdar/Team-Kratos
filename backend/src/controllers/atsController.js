const prisma = require('../config/db');
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey : process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : process.env.IMAGEKIT_URL_ENDPOINT
});

// ── Public Endpoints ──────────────────────────────────────

const getPublicJobs = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const whereClause = { status: 'Open' };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }
    const jobs = await prisma.basePrisma.jobRequisition.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobs);
  } catch (error) {
    console.error('getPublicJobs error:', error);
    res.status(500).json({ error: error.message });
  }
};

const publicApply = async (req, res) => {
  try {
    const { tenantId, jobRequisitionId, firstName, lastName, email, phone, resumeText } = req.body;
    if (!tenantId || !jobRequisitionId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let resumeUrl = null;
    if (req.file) {
      const uploadRes = await new Promise((resolve, reject) => {
        imagekit.upload({
          file: req.file.buffer,
          fileName: `resume_${Date.now()}_${req.file.originalname}`,
          folder: '/resumes'
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      resumeUrl = uploadRes.url;
    }

    // 1. Create or update candidate
    const candidate = await prisma.basePrisma.candidate.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email
        }
      },
      update: {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        phone,
        ...(resumeUrl && { resumeUrl }),
        ...(resumeText && { parsedData: { originalText: resumeText } })
      },
      create: {
        tenantId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        source: 'Careers Page',
        resumeUrl,
        parsedData: resumeText ? { originalText: resumeText } : null
      }
    });

    // 2. Prevent duplicate application for the same job
    const existingApp = await prisma.basePrisma.application.findUnique({
      where: {
        tenantId_candidateId_jobRequisitionId: {
          tenantId,
          candidateId: candidate.id,
          jobRequisitionId
        }
      }
    });

    if (existingApp) {
      return res.status(400).json({ error: 'You have already applied for this role.' });
    }

    const application = await prisma.basePrisma.application.create({
      data: {
        tenantId,
        candidateId: candidate.id,
        jobRequisitionId,
        stage: 'Applied'
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('inbox:updated', { message: 'New job application received via careers page' });
    }

    res.status(201).json({ success: true, applicationId: application.id });
  } catch (error) {
    console.error('publicApply error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Job Requisitions ──────────────────────────────────────

const getJobRequisitions = async (req, res) => {
  try {
    const jobs = await prisma.jobRequisition.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } }
      }
    });
    res.json(jobs);
  } catch (error) {
    console.error('getJobRequisitions error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createJobRequisition = async (req, res) => {
  try {
    const { title, department, location, employmentType, description, requirements, salaryMin, salaryMax, currency } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const job = await prisma.jobRequisition.create({
      data: {
        tenantId: req.user.tenantId,
        title,
        department,
        location,
        employmentType,
        description,
        requirements,
        salaryMin,
        salaryMax,
        currency,
        createdById: req.user.id
      }
    });
    res.status(201).json(job);
  } catch (error) {
    console.error('createJobRequisition error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const job = await prisma.jobRequisition.update({
      where: { id, tenantId: req.user.tenantId },
      data: updateData
    });
    res.json(job);
  } catch (error) {
    console.error('updateJobRequisition error:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.jobRequisition.delete({
      where: { id, tenantId: req.user.tenantId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteJobRequisition error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Candidates ────────────────────────────────────────────

const getCandidates = async (req, res) => {
  try {
    const candidates = await prisma.candidate.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(candidates);
  } catch (error) {
    console.error('getCandidates error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createCandidate = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, resumeUrl, parsedData, source } = req.body;
    if (!firstName || !lastName || !email) return res.status(400).json({ error: 'First name, last name, and email are required' });

    const candidate = await prisma.candidate.create({
      data: {
        tenantId: req.user.tenantId,
        firstName,
        lastName,
        email,
        phone,
        resumeUrl,
        parsedData,
        source
      }
    });
    res.status(201).json(candidate);
  } catch (error) {
    console.error('createCandidate error:', error);
    res.status(500).json({ error: error.message });
  }
};

const parseResume = async (req, res) => {
  try {
    // In Phase 5, we'll implement actual Anthropic API call here.
    // For now, we return mocked JSON structured data representing a parsed resume.
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });

    const mockParsed = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      skills: ["JavaScript", "React", "Node.js"],
      experience: "5 years of full-stack development"
    };

    res.json(mockParsed);
  } catch (error) {
    console.error('parseResume error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Applications ──────────────────────────────────────────

const getApplications = async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { tenantId: req.user.tenantId },
      include: {
        candidate: true,
        jobRequisition: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(applications);
  } catch (error) {
    console.error('getApplications error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createApplication = async (req, res) => {
  try {
    const { candidateId, jobRequisitionId, stage, notes } = req.body;
    if (!candidateId || !jobRequisitionId) return res.status(400).json({ error: 'Candidate ID and Job Requisition ID are required' });

    const application = await prisma.application.create({
      data: {
        tenantId: req.user.tenantId,
        candidateId,
        jobRequisitionId,
        stage: stage || 'Applied',
        notes
      },
      include: {
        candidate: true,
        jobRequisition: true
      }
    });
    const io = req.app.get('io');
    if (io) io.to(`tenant:${tenantId}`).emit('inbox:updated', { message: 'New job application received' });

    res.status(201).json(application);
  } catch (error) {
    console.error('createApplication error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateApplicationStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const application = await prisma.application.update({
      where: { id, tenantId: req.user.tenantId },
      data: { stage },
      include: {
        candidate: true,
        jobRequisition: true
      }
    });

    // If stage becomes 'Hired', auto-generate an onboarding task per the plan (#7)
    if (stage === 'Hired') {
      await prisma.onboardingTask.create({
        data: {
          tenantId: req.user.tenantId,
          title: `Onboard new hire: ${application.candidate.firstName} ${application.candidate.lastName} for ${application.jobRequisition.title}`,
          isCompleted: false
        }
      });
    }

    res.json(application);
  } catch (error) {
    console.error('updateApplicationStage error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getJobRequisitions,
  createJobRequisition,
  updateJobRequisition,
  deleteJobRequisition,
  getCandidates,
  createCandidate,
  parseResume,
  getApplications,
  createApplication,
  updateApplicationStage,
  getPublicJobs,
  publicApply
};
