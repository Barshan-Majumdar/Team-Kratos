const geminiClient = require('./geminiClient');

async function generateATSExplanation(atsScore, breakdown, matchEvidence, missingSkills) {
  const prompt = `You are an expert ATS (Applicant Tracking System) assistant. Your job is to explain an ALREADY CALCULATED ATS score to a human recruiter.

Here is the deterministic ATS evaluation:
Score: ${atsScore}/100
Breakdown: ${JSON.stringify(breakdown, null, 2)}
Missing Skills: ${JSON.stringify(missingSkills)}
Match Evidence: ${JSON.stringify(matchEvidence.filter(e => e.matched !== 'NOT FOUND'), null, 2)}

INSTRUCTIONS:
1. Explain WHY the candidate received this score based ONLY on the evidence above.
2. DO NOT recalculate the score. DO NOT invent new skills or infer things that are not in the evidence.
3. Be objective, concise, and auditable. State clearly what mandatory requirements were met or missed.
4. DO NOT make a hiring recommendation (e.g., do not say "This candidate is unsuitable" or "You should hire them").
5. Return ONLY the explanation text in a clear paragraph.`;

  try {
    const result = await geminiClient.getAI().models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      contents: prompt,
    });
    return result.text;
  } catch (error) {
    console.error('Explanation generation error:', error);
    throw new Error('Failed to generate ATS explanation');
  }
}

module.exports = {
  generateATSExplanation
};
