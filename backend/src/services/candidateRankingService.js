/**
 * candidateRankingService.js
 * 
 * Orchestrator for calculating and saving candidate rankings.
 */
const crypto = require('crypto');
const prisma = require('../config/db');
const { checkEligibility } = require('./candidateEligibilityService');
const { calculateRanking } = require('./candidateRankingEngine');

const RANKING_VERSION = "v1.0.0";

function canonicalize(obj) {
  return JSON.stringify(obj, Object.keys(obj).sort());
}

function generateFingerprint(inputs) {
  const data = canonicalize(inputs);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function rankCandidatesForJob(tenantId, jobId) {
  const job = await prisma.basePrisma.jobRequisition.findUnique({
    where: { id: jobId }
  });

  if (!job) throw new Error("Job not found");

  const applications = await prisma.basePrisma.application.findMany({
    where: { 
      jobRequisitionId: jobId, 
      tenantId,
      stage: 'Applied'
    },
    include: {
      candidate: true,
      atsResults: {
        orderBy: { generatedAt: 'desc' },
        take: 1
      }
    }
  });

  const candidatesData = [];

  for (const app of applications) {
    const atsResult = app.atsResults[0];
    
    // Eligibility
    const eligibilityResult = checkEligibility(job.structuredData, app.candidate.structuredData, atsResult);

    // TODO: Load interview data from actual interview models
    // const interviewData = await fetchInterviewData(app.id);
    const interviewData = null; // Mocking as not available for now

    const rankingInputs = {
      jobId: job.id,
      jobVersion: job.version,
      applicationId: app.id,
      atsResultId: atsResult?.id,
      atsEngineVersion: atsResult?.engineVersion,
      rankingVersion: RANKING_VERSION,
      rankingConfig: job.scoringConfig?.ranking,
      interviewResultVersion: null,
      eligibilityInputs: eligibilityResult
    };

    const fingerprint = generateFingerprint(rankingInputs);

    // Check existing
    const existingRanking = await prisma.basePrisma.candidateRanking.findUnique({
      where: {
        tenantId_applicationId_dataFingerprint: {
          tenantId,
          applicationId: app.id,
          dataFingerprint: fingerprint
        }
      }
    });

    if (existingRanking) {
      candidatesData.push(existingRanking);
      continue;
    }

    // Calculate
    const rankingResult = calculateRanking({
      job,
      application: app,
      atsResult,
      eligibilityResult,
      interviewData
    });

    candidatesData.push({
      ...rankingResult,
      fingerprint,
      createdAt: app.createdAt // for tie breaking
    });
  }

  // Sort candidates
  // Tie-Breaking Rules:
  // 1. Eligibility status
  // 2. Ranking score
  // 3. Required skill coverage
  // 4. ATS score
  // 5. Relevant experience
  // 6. Interview score
  // 7. Application timestamp
  
  const eligibilityValue = {
    'ELIGIBLE': 3,
    'REVIEW_REQUIRED': 2,
    'REQUIREMENT_NOT_MET': 1
  };

  candidatesData.sort((a, b) => {
    // 1. Eligibility
    const elA = eligibilityValue[a.eligibilityStatus] || 0;
    const elB = eligibilityValue[b.eligibilityStatus] || 0;
    if (elA !== elB) return elB - elA;

    // 2. Ranking Score
    if (a.rankingScore !== b.rankingScore) return b.rankingScore - a.rankingScore;

    // 3. Required skill coverage
    if (a.scoreBreakdown.requiredSkillCoverage !== b.scoreBreakdown.requiredSkillCoverage) {
      return b.scoreBreakdown.requiredSkillCoverage - a.scoreBreakdown.requiredSkillCoverage;
    }

    // 4. ATS score
    if (a.scoreBreakdown.atsMatch !== b.scoreBreakdown.atsMatch) {
      return b.scoreBreakdown.atsMatch - a.scoreBreakdown.atsMatch;
    }

    // 5. Experience
    if (a.scoreBreakdown.experience !== b.scoreBreakdown.experience) {
      return b.scoreBreakdown.experience - a.scoreBreakdown.experience;
    }

    // 6. Interview score
    const intA = a.scoreBreakdown.interviewPerformance || 0;
    const intB = b.scoreBreakdown.interviewPerformance || 0;
    if (intA !== intB) return intB - intA;

    // 7. Timestamp
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Assign ranks & save
  const finalRankings = [];
  let currentRank = 1;

  for (const item of candidatesData) {
    if (item.id) {
      // Already existed, just need to update rank if it changed
      // Note: we'd also need to delete old ones if we are recreating, but fingerprinting handles it if input changes.
      // If fingerprint same, we still might need to update rank if relative ordering changed.
      const updated = await prisma.basePrisma.candidateRanking.update({
        where: { id: item.id },
        data: { rank: currentRank }
      });
      finalRankings.push(updated);
    } else {
      // Create new
      const created = await prisma.basePrisma.candidateRanking.create({
        data: {
          tenantId,
          jobId,
          applicationId: item.applicationId,
          rank: currentRank,
          rankingScore: item.rankingScore,
          eligibilityStatus: item.eligibilityStatus,
          evidenceCoverage: item.evidenceCoverage,
          scoreBreakdown: item.scoreBreakdown,
          rankingEvidence: item.rankingEvidence,
          disqualifyingFactors: item.disqualifyingFactors,
          rankingVersion: RANKING_VERSION,
          dataFingerprint: item.fingerprint
        }
      });
      finalRankings.push(created);
    }
    currentRank++;
  }

  return finalRankings;
}

module.exports = {
  rankCandidatesForJob
};
