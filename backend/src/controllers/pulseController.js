const prisma = require('../config/db');
const crypto = require('crypto');
const pulseEngine = require('../utils/pulseEngine');

// Generate SHA-256 Hash for anonymization
const generateHash = (userId, surveyId) => {
  const salt = process.env.PULSE_SALT || 'crew_pulse_secret_salt_123';
  return crypto.createHash('sha256').update(`${userId}:${surveyId}:${salt}`).digest('hex');
};

const getSurveys = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const isManager = req.user.roleDefinition?.level <= 2 || req.user.role === 'Admin' || req.user.role === 'Manager';

    if (isManager) {
      // Admins/Managers see all surveys and aggregated responses
      const surveys = await prisma.pulseSurvey.findMany({
        where: { tenantId },
        include: { responses: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(surveys);
    } else {
      // Employees only see active surveys they haven't responded to yet
      const userId = req.user._id || req.user.id;
      const activeSurveys = await prisma.pulseSurvey.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      // Filter out those the user has already answered
      const filteredSurveys = [];
      for (const survey of activeSurveys) {
        const hash = generateHash(userId, survey.id);
        const hasResponded = await prisma.pulseResponse.findUnique({
          where: { surveyId_respondentHash: { surveyId: survey.id, respondentHash: hash } }
        });
        if (!hasResponded) {
          filteredSurveys.push(survey);
        }
      }

      res.json(filteredSurveys);
    }
  } catch (error) {
    console.error('getSurveys error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createSurvey = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { title, questions } = req.body;

    const survey = await prisma.pulseSurvey.create({
      data: {
        tenantId,
        title,
        questions
      }
    });

    res.status(201).json(survey);
  } catch (error) {
    console.error('createSurvey error:', error);
    res.status(500).json({ error: error.message });
  }
};

const submitResponse = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user._id || req.user.id;
    const { surveyId } = req.params;
    const { answers } = req.body;

    const respondentHash = generateHash(userId, surveyId);

    const response = await prisma.pulseResponse.create({
      data: {
        tenantId,
        surveyId,
        respondentHash,
        answers
      }
    });

    res.status(201).json({ success: true, message: 'Response submitted anonymously.' });
  } catch (error) {
    console.error('submitResponse error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'You have already submitted a response for this survey.' });
    }
    res.status(500).json({ error: error.message });
  }
};

const getLivePulse = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required.' });
    }
    
    // Seed/initialize states from the database if they don't exist yet
    await pulseEngine.seedStateFromDB(prisma, tenantId);
    
    const data = pulseEngine.getTenantState(tenantId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSurveys,
  createSurvey,
  submitResponse,
  getLivePulse
};
