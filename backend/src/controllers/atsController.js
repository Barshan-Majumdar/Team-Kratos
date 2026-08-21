const prisma = require('../config/db');
const ImageKit = require('imagekit');
const pdfParse = require('pdf-parse');
const { sendNotification } = require('../utils/notificationEngine');
const { enqueueATSJob } = require('../services/atsProcessingJob');
const { generateATSExplanation } = require('../services/atsExplanationService');

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
    let extractedResumeText = resumeText || null;

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

      try {
        const pdfData = await pdfParse(req.file.buffer);
        if (pdfData && pdfData.text) {
          extractedResumeText = pdfData.text.trim();
        }
      } catch (err) {
        console.error('Failed to parse PDF:', err);
      }
    }

    if (!extractedResumeText) {
      return res.status(400).json({ error: 'A resume is required. Please upload a standard text-based PDF.' });
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
        ...(extractedResumeText && { parsedData: { originalText: extractedResumeText } })
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
        parsedData: extractedResumeText ? { originalText: extractedResumeText } : null
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
        stage: 'Applied',
        atsStatus: 'PENDING'
      }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('inbox:updated', { message: 'New job application received via careers page' });
    }

    enqueueATSJob(tenantId, application.id);

    res.status(201).json({ success: true, applicationId: application.id });
  } catch (error) {
    console.error('publicApply error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Job Requisitions ──────────────────────────────────────

const getJobRequisitions = async (req, res) => {
  try {
    const isFounder = req.user.roleDefinition?.level === 0;
    const whereClause = isFounder ? {} : { tenantId: req.user.tenantId };
    
    const jobs = await prisma.jobRequisition.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
        tenant: { select: { name: true } }
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

    // Notify Level 2 and 3 employees
    try {
      const targetUsers = await prisma.user.findMany({
        where: {
          tenantId: req.user.tenantId,
          roleDefinition: {
            level: { in: [2, 3] }
          },
          status: 'Active'
        },
        select: { id: true }
      });

      for (const tUser of targetUsers) {
        await sendNotification({
          userId: tUser.id,
          tenantId: req.user.tenantId,
          type: 'NEW_JOB_OPENING',
          title: `New Job Opening: ${title}`,
          message: `A new job requisition for ${title} (${department}) has been posted.`
        });
      }
    } catch (notifErr) {
      console.error('Error notifying for new job opening:', notifErr);
    }

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

    const existingJob = await prisma.jobRequisition.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });
    if (!existingJob) return res.status(404).json({ error: 'Job requisition not found' });

    const job = await prisma.jobRequisition.update({
      where: { id },
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
    await prisma.jobRequisition.deleteMany({
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
    const isFounder = req.user.roleDefinition?.level === 0;
    const whereClause = isFounder ? {} : { tenantId: req.user.tenantId };
    
    const candidates = await prisma.candidate.findMany({
      where: whereClause,
      include: { tenant: { select: { name: true } } },
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
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ error: 'Resume text is required' });
    const { parseResumeText } = require('../services/resumeParserService');
    const parsedData = await parseResumeText(resumeText);
    
    // Merge original text back into the response for consistency
    res.json({
      ...parsedData,
      originalText: resumeText
    });
  } catch (error) {
    console.error('parseResume error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ── Applications ──────────────────────────────────────────

const getApplications = async (req, res) => {
  try {
    const isFounder = req.user.roleDefinition?.level === 0;
    const whereClause = isFounder ? {} : { tenantId: req.user.tenantId };
    
    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        tenant: { select: { name: true } },
        candidate: true,
        jobRequisition: true,
        atsResults: {
          orderBy: { generatedAt: 'desc' },
          take: 1
        }
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
        notes,
        atsStatus: 'PENDING'
      },
      include: {
        candidate: true,
        jobRequisition: true
      }
    });
    const io = req.app.get('io');
    if (io) io.to(`tenant:${req.user.tenantId}`).emit('inbox:updated', { message: 'New job application received' });

    enqueueATSJob(req.user.tenantId, application.id);

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

    const existingApplication = await prisma.application.findFirst({
      where: { id, tenantId: req.user.tenantId }
    });
    if (!existingApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = await prisma.application.update({
      where: { id },
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

const getLatestATSResult = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await prisma.basePrisma.aTSResult.findFirst({
      where: { applicationId: id, tenantId: req.user.tenantId },
      orderBy: { generatedAt: 'desc' }
    });
    res.json(result);
  } catch (error) {
    console.error('getLatestATSResult error:', error);
    res.status(500).json({ error: error.message });
  }
};

const explainATSScore = async (req, res) => {
  try {
    const { id } = req.params;
    let result = await prisma.basePrisma.aTSResult.findFirst({
      where: { applicationId: id, tenantId: req.user.tenantId },
      orderBy: { generatedAt: 'desc' }
    });

    if (!result) return res.status(404).json({ error: 'ATS Result not found' });
    if (result.explanationStatus === 'COMPLETED' && result.explanation) {
      return res.json({ explanation: result.explanation });
    }

    await prisma.basePrisma.aTSResult.update({
      where: { id: result.id },
      data: { explanationStatus: 'GENERATING' }
    });

    const explanation = await generateATSExplanation(result.score, result.breakdown, result.matchEvidence, result.missingSkills);

    result = await prisma.basePrisma.aTSResult.update({
      where: { id: result.id },
      data: { explanation, explanationStatus: 'COMPLETED' }
    });

    res.json({ explanation: result.explanation });
  } catch (error) {
    console.error('explainATSScore error:', error);
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
  publicApply,
  getLatestATSResult,
  explainATSScore
};
