const prisma = require('../config/db');
const jdParser = require('./jdParserService');
const resumeParser = require('./resumeParserService');
const { generateEmbeddingsBatch } = require('./embeddings');
const { calculateScore, calculateFingerprint } = require('./atsScoringEngine');

const ATS_ENGINE_VERSION = "v1.0.0";

async function processApplication(tenantId, applicationId) {
  try {
    console.log('1. Starting Concurrency Check');
    // 1. Concurrency Check
    const app = await prisma.basePrisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobRequisition: true,
        candidate: true
      }
    });

    if (!app) throw new Error('Application not found');
    if (app.atsStatus === 'PROCESSING') {
      console.log(`Application ${applicationId} is already processing. Skipping.`);
      return;
    }

    await prisma.basePrisma.application.update({
      where: { id: applicationId },
      data: { atsStatus: 'PROCESSING' }
    });

    const job = app.jobRequisition;
    const candidate = app.candidate;

    console.log('2. JD Processing');
    // 2. Parse & Embed JD if missing
    let structuredJD = job.structuredData;
    if (!structuredJD) {
      structuredJD = await jdParser.parseJobDescription(job.title, job.description, job.requirements);
      await prisma.basePrisma.jobRequisition.update({
        where: { id: job.id },
        data: { structuredData: structuredJD }
      });
      
      // Embed JD requirements
      const jdTexts = [];
      const jdMeta = [];
      
      (structuredJD.requiredSkills || []).forEach(req => {
        jdTexts.push(req);
        jdMeta.push({ type: 'requiredSkills' });
      });
      (structuredJD.responsibilities || []).forEach(req => {
        jdTexts.push(req);
        jdMeta.push({ type: 'responsibilities' });
      });
      
      if (jdTexts.length > 0) {
        const embeddings = await generateEmbeddingsBatch(jdTexts);
        for (let i = 0; i < embeddings.length; i++) {
          await prisma.basePrisma.$executeRaw`
            INSERT INTO "ATSEmbedding" ("id", "tenantId", "documentType", "sectionType", "sourceType", "sourceId", "jobId", "content", "embedding")
            VALUES (gen_random_uuid(), ${tenantId}, 'JD', ${jdMeta[i].type}, 'JobRequisition', ${job.id}, ${job.id}, ${jdTexts[i]}, ${JSON.stringify(embeddings[i])}::vector)
          `;
        }
      }
    }

    // 3. Parse & Embed Resume
    const resumeText = candidate.parsedData?.originalText;
    if (!resumeText) {
      throw new Error('No resume text available for candidate');
    }
    
    // We parse it specifically for this application's resume version
    console.log('Calling parseResumeText');
    const structuredCandidate = await resumeParser.parseResumeText(resumeText);
    console.log('parseResumeText completed');
    
    console.log('3. Candidate Processing');
    // 3. Candidate Processing
    const candTexts = [];
    const candMeta = [];
    
    (structuredCandidate.skills || []).forEach(skill => {
      candTexts.push(skill);
      candMeta.push({ type: 'skills' });
    });
    (structuredCandidate.experience || []).forEach(exp => {
      const expText = `${exp.title} at ${exp.company}. ${exp.durationMonths} months. ${(exp.responsibilities || []).join(' ')}`;
      candTexts.push(expText);
      candMeta.push({ type: 'experience_responsibilities' });
    });

    if (candTexts.length > 0) {
      console.log('Calling generateEmbeddingsBatch');
      const embeddings = await generateEmbeddingsBatch(candTexts);
      console.log('generateEmbeddingsBatch completed');
      // Delete old embeddings for this application
      await prisma.basePrisma.aTSEmbedding.deleteMany({
        where: { applicationId }
      });
      
      for (let i = 0; i < embeddings.length; i++) {
        await prisma.basePrisma.$executeRaw`
          INSERT INTO "ATSEmbedding" ("id", "tenantId", "documentType", "sectionType", "sourceType", "sourceId", "applicationId", "content", "embedding")
          VALUES (gen_random_uuid(), ${tenantId}, 'RESUME', ${candMeta[i].type}, 'Application', ${applicationId}, ${applicationId}, ${candTexts[i]}, ${JSON.stringify(embeddings[i])}::vector)
        `;
      }
    }

    console.log('4. Fetch Embeddings');
    // 4. Fetch Embeddings for Scoring
    const jdEmbeddingsRaw = await prisma.basePrisma.$queryRaw`
      SELECT "content", "sectionType", "embedding"::text FROM "ATSEmbedding"
      WHERE "jobId" = ${job.id} AND "documentType" = 'JD'
    `;
    const jdEmbeddings = jdEmbeddingsRaw.map(e => ({ ...e, embedding: JSON.parse(e.embedding) }));

    const candEmbeddingsRaw = await prisma.basePrisma.$queryRaw`
      SELECT "content", "sectionType", "embedding"::text FROM "ATSEmbedding"
      WHERE "applicationId" = ${applicationId} AND "documentType" = 'RESUME'
    `;
    const candidateEmbeddings = candEmbeddingsRaw.map(e => ({ ...e, embedding: JSON.parse(e.embedding) }));

    const scoringConfig = job.scoringConfig || {
      requiredSkills: 40,
      experience: 25,
      education: 10,
      responsibilities: 15,
      preferredSkills: 10,
      semanticMatchThreshold: 0.82,
      strongMatchThreshold: 0.90
    };

    const scoringVersion = "v1";

    const fingerprint = calculateFingerprint({
      jobId: job.id, jobVersion: job.version, structuredJD, 
      applicationId, resumeVersion: app.resumeVersion, structuredCandidate, 
      scoringConfig, scoringVersion, atsEngineVersion: ATS_ENGINE_VERSION
    });

    const existingResult = await prisma.basePrisma.aTSResult.findUnique({
      where: {
        tenantId_applicationId_dataFingerprint: {
          tenantId,
          applicationId,
          dataFingerprint: fingerprint
        }
      }
    });

    if (existingResult && existingResult.status === 'COMPLETED') {
      await prisma.basePrisma.application.update({
        where: { id: applicationId },
        data: { atsStatus: 'COMPLETED' }
      });
      return;
    }

    console.log('5. Calculate Score');
    // 5. Score
    const result = calculateScore({
      jobId: job.id, jobVersion: job.version, structuredJD, 
      applicationId, resumeVersion: app.resumeVersion, structuredCandidate, 
      jdEmbeddings, candidateEmbeddings, 
      scoringConfig, scoringVersion, atsEngineVersion: ATS_ENGINE_VERSION
    });

    console.log('6. Save ATSResult');
    // 6. Save ATSResult
    await prisma.basePrisma.aTSResult.create({
      data: {
        tenantId,
        applicationId,
        score: result.score,
        breakdown: result.breakdown,
        matchEvidence: result.matchEvidence,
        missingSkills: result.missingSkills,
        engineVersion: ATS_ENGINE_VERSION,
        scoringVersion,
        jobVersion: job.version,
        resumeVersion: app.resumeVersion,
        status: 'COMPLETED',
        dataFingerprint: result.dataFingerprint
      }
    });

    await prisma.basePrisma.application.update({
      where: { id: applicationId },
      data: { atsStatus: 'COMPLETED' }
    });

    console.log(`ATS Processing completed for Application ${applicationId}. Score: ${result.score}`);

  } catch (error) {
    console.error(`ATS Processing failed for Application ${applicationId}:`, error);
    await prisma.basePrisma.application.update({
      where: { id: applicationId },
      data: { atsStatus: 'FAILED' }
    }).catch(e => console.error('Failed to update FAILED status:', e));

    // Try to record failure in a new ATSResult if possible
    try {
      await prisma.basePrisma.aTSResult.create({
        data: {
          tenantId,
          applicationId,
          engineVersion: ATS_ENGINE_VERSION,
          scoringVersion: "v1",
          jobVersion: 1,
          resumeVersion: 1,
          status: 'FAILED',
          failureReason: error.message,
          dataFingerprint: `failed-${Date.now()}`
        }
      });
    } catch(e) {}
  }
}

// Background queue processor mock (In real prod, use BullMQ/Redis)
function enqueueATSJob(tenantId, applicationId) {
  setTimeout(() => {
    processApplication(tenantId, applicationId);
  }, 0);
}

module.exports = {
  processApplication,
  enqueueATSJob
};
