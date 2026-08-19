/**
 * candidateEligibilityService.js
 * 
 * Determines if a candidate meets the hard requirements for a job requisition.
 */

function checkEligibility(structuredJD, structuredCandidate, atsResult) {
  let status = "ELIGIBLE";
  let failedRequirements = [];
  let reviewRequired = false;

  if (!structuredJD || !structuredCandidate) {
    return {
      status: "REVIEW_REQUIRED",
      failedRequirements: [],
      reviewRequired: true,
      reason: "Missing structured data for evaluation"
    };
  }

  // 1. Check minimum experience
  const minExp = structuredJD.minimumExperienceYears || 0;
  const candExp = structuredCandidate.totalExperienceYears || 0;
  
  if (minExp > 0 && candExp < minExp) {
    failedRequirements.push({
      requirement: `Minimum experience of ${minExp} years`,
      reason: `Candidate has ${candExp} years`
    });
  }

  // 2. Check missing mandatory skills from ATS Result
  if (atsResult && atsResult.missingSkills && Array.isArray(atsResult.missingSkills)) {
    atsResult.missingSkills.forEach(skill => {
      // In a real system, you might differentiate between mandatory vs nice-to-have.
      // If we consider all missing skills from ATS as potentially failing strict requirements:
      // failedRequirements.push({
      //   requirement: `Required skill: ${skill}`,
      //   reason: "No evidence found"
      // });
    });
  }

  // Determine final status
  if (failedRequirements.length > 0) {
    status = "REQUIREMENT_NOT_MET";
  } else if (reviewRequired) {
    status = "REVIEW_REQUIRED";
  } else {
    status = "ELIGIBLE";
  }

  return {
    status,
    failedRequirements,
    reviewRequired
  };
}

module.exports = {
  checkEligibility
};
