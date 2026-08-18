const crypto = require('crypto');

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateFingerprint(inputs) {
  const canonical = JSON.stringify(inputs, Object.keys(inputs).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Normalizes a string for exact matching (lowercase, alphanumeric only)
 */
function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if candidate has a specific skill (exact/normalized)
 */
function exactSkillMatch(candidateSkills, requirement) {
  const normReq = normalize(requirement);
  return candidateSkills.find(s => normalize(s) === normReq);
}

/**
 * ATS Scoring Engine
 * Deterministically calculates ATS score. Gemini must NEVER override this.
 */
function calculateScore({
  jobId, jobVersion, structuredJD, 
  applicationId, resumeVersion, structuredCandidate, 
  jdEmbeddings, candidateEmbeddings, 
  scoringConfig, scoringVersion, atsEngineVersion
}) {
  
  const config = scoringConfig || {
    requiredSkills: 40,
    experience: 25,
    education: 10,
    responsibilities: 15,
    preferredSkills: 10,
    semanticMatchThreshold: 0.82,
    strongMatchThreshold: 0.90
  };

  const semanticThreshold = config.semanticMatchThreshold || 0.82;
  
  const matchEvidence = [];
  const missingSkills = [];
  
  let requiredSkillsScore = 0;
  let experienceScore = 0;
  let educationScore = 0;
  let responsibilitiesScore = 0;
  let preferredSkillsScore = 0;

  // 1. Required Skills (Hard + Semantic)
  let reqSkillsMatched = 0;
  const candidateSkills = structuredCandidate.skills || [];
  
  (structuredJD.requiredSkills || []).forEach(req => {
    let matched = false;
    let matchMethod = null;
    let similarity = 0;
    let evidenceText = null;

    // A. Exact Match
    const exact = exactSkillMatch(candidateSkills, req);
    if (exact) {
      matched = true;
      matchMethod = 'EXACT';
      evidenceText = exact;
      similarity = 1.0;
    } else {
      // B. Semantic Match
      const reqEmb = jdEmbeddings.find(e => e.content === req && e.sectionType === 'requiredSkills');
      if (reqEmb) {
        let bestSim = 0;
        let bestCand = null;
        candidateEmbeddings.forEach(candEmb => {
          const sim = cosineSimilarity(reqEmb.embedding, candEmb.embedding);
          if (sim > bestSim) {
            bestSim = sim;
            bestCand = candEmb;
          }
        });
        
        if (bestSim >= semanticThreshold) {
          matched = true;
          matchMethod = 'SEMANTIC';
          evidenceText = bestCand.content;
          similarity = bestSim;
        } else {
          similarity = bestSim;
        }
      }
    }

    if (matched) reqSkillsMatched++;
    else missingSkills.push(req);

    matchEvidence.push({
      requirement: req,
      requirementType: "REQUIRED_SKILL",
      matched: matched ? (similarity >= config.strongMatchThreshold ? 'MATCH' : 'PARTIAL') : (similarity > 0 ? 'NOT FOUND' : 'INSUFFICIENT_EVIDENCE'),
      candidateEvidence: evidenceText ? [{ text: evidenceText }] : [],
      semanticSimilarity: similarity,
      matchMethod
    });
  });

  if (structuredJD.requiredSkills && structuredJD.requiredSkills.length > 0) {
    requiredSkillsScore = (reqSkillsMatched / structuredJD.requiredSkills.length) * config.requiredSkills;
  } else {
    requiredSkillsScore = config.requiredSkills; // Free points if none required
  }

  // 2. Experience (Hard Match)
  const reqExp = structuredJD.minimumExperienceYears || 0;
  const candExp = structuredCandidate.experienceYears || 0;
  let expMatched = candExp >= reqExp;
  
  matchEvidence.push({
    requirement: `Minimum ${reqExp} years experience`,
    requirementType: "EXPERIENCE",
    matched: expMatched ? 'MATCH' : 'NOT FOUND',
    candidateEvidence: [{ text: `${candExp} years total experience calculated.` }],
    semanticSimilarity: expMatched ? 1.0 : 0.0,
    matchMethod: 'HARD_MATCH'
  });

  if (reqExp === 0) {
    experienceScore = config.experience;
  } else {
    experienceScore = Math.min(1.0, candExp / reqExp) * config.experience;
  }

  // 3. Education (Hard/Semantic)
  let eduMatchedScore = 0;
  const reqEdu = structuredJD.educationRequirements || [];
  const candEdu = structuredCandidate.education || [];
  
  if (reqEdu.length === 0) {
    eduMatchedScore = config.education;
  } else {
    let bestEduMatch = false;
    let evidenceText = null;
    reqEdu.forEach(req => {
      const exact = candEdu.find(e => normalize(e.degree).includes(normalize(req)) || normalize(req).includes(normalize(e.degree)));
      if (exact) {
        bestEduMatch = true;
        evidenceText = `${exact.degree} in ${exact.field}`;
      }
    });
    
    if (bestEduMatch) {
      eduMatchedScore = config.education;
    }
    
    matchEvidence.push({
      requirement: reqEdu.join(" OR "),
      requirementType: "EDUCATION",
      matched: bestEduMatch ? 'MATCH' : 'NOT FOUND',
      candidateEvidence: evidenceText ? [{ text: evidenceText }] : [],
      semanticSimilarity: bestEduMatch ? 1.0 : 0.0,
      matchMethod: 'HARD_MATCH'
    });
  }
  educationScore = eduMatchedScore;

  // 4. Preferred Skills
  let prefSkillsMatched = 0;
  (structuredJD.preferredSkills || []).forEach(req => {
    const exact = exactSkillMatch(candidateSkills, req);
    if (exact) prefSkillsMatched++;
  });
  if (structuredJD.preferredSkills && structuredJD.preferredSkills.length > 0) {
    preferredSkillsScore = (prefSkillsMatched / structuredJD.preferredSkills.length) * config.preferredSkills;
  } else {
    preferredSkillsScore = config.preferredSkills;
  }

  // 5. Responsibilities (Semantic Match)
  let respScoreMatched = 0;
  const reqResps = structuredJD.responsibilities || [];
  reqResps.forEach(req => {
    let bestSim = 0;
    const reqEmb = jdEmbeddings.find(e => e.content === req && e.sectionType === 'responsibilities');
    if (reqEmb) {
      candidateEmbeddings.forEach(candEmb => {
        // Only compare against candidate experience/responsibilities
        if (candEmb.sectionType === 'experience_responsibilities') {
          const sim = cosineSimilarity(reqEmb.embedding, candEmb.embedding);
          if (sim > bestSim) bestSim = sim;
        }
      });
    }
    if (bestSim >= semanticThreshold) respScoreMatched++;
  });
  
  if (reqResps.length > 0) {
    responsibilitiesScore = (respScoreMatched / reqResps.length) * config.responsibilities;
  } else {
    responsibilitiesScore = config.responsibilities;
  }

  // Calculate Total
  const finalScore = requiredSkillsScore + experienceScore + educationScore + responsibilitiesScore + preferredSkillsScore;

  const breakdown = {
    requiredSkills: requiredSkillsScore,
    experience: experienceScore,
    education: educationScore,
    responsibilities: responsibilitiesScore,
    preferredSkills: preferredSkillsScore,
    total: finalScore,
    maxPotential: config.requiredSkills + config.experience + config.education + config.responsibilities + config.preferredSkills
  };

  const fingerprint = calculateFingerprint({
    jobId, jobVersion, structuredJD, 
    applicationId, resumeVersion, structuredCandidate, 
    scoringConfig: config, scoringVersion, atsEngineVersion
  });

  return {
    score: parseFloat((finalScore).toFixed(2)),
    breakdown,
    matchEvidence,
    missingSkills,
    dataFingerprint: fingerprint
  };
}

module.exports = {
  calculateScore,
  calculateFingerprint
};
