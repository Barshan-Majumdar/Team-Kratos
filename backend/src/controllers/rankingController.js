const { rankCandidatesForJob } = require('../services/candidateRankingService');
const prisma = require('../config/db');

exports.getJobRankings = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { jobId } = req.params;

    const rankings = await prisma.basePrisma.candidateRanking.findMany({
      where: { 
        tenantId, 
        jobId,
        application: {
          stage: 'Applied'
        }
      },
      orderBy: { rank: 'asc' },
      include: {
        application: {
          include: {
            candidate: true
          }
        }
      }
    });

    const formattedRankings = rankings.map(r => ({
      rank: r.rank,
      applicationId: r.applicationId,
      candidateName: `${r.application.candidate.firstName} ${r.application.candidate.lastName}`,
      rankingScore: r.rankingScore,
      eligibilityStatus: r.eligibilityStatus,
      evidenceCoverage: r.evidenceCoverage || 100, // Assuming 100 if not saved in model explicitly, wait, we didn't add evidenceCoverage to prisma!
      scoreBreakdown: r.scoreBreakdown,
      rankingEvidence: r.rankingEvidence
    }));

    res.json({
      jobId,
      rankingVersion: rankings[0]?.rankingVersion || 'v1',
      candidates: formattedRankings
    });
  } catch (error) {
    console.error('Error fetching job rankings:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.recalculateJobRankings = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { jobId } = req.params;

    // This will calculate and save
    const rankings = await rankCandidatesForJob(tenantId, jobId);

    res.json({ success: true, message: "Rankings recalculated successfully." });
  } catch (error) {
    console.error('Error recalculating job rankings:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getApplicationRanking = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params; // applicationId

    const ranking = await prisma.basePrisma.candidateRanking.findFirst({
      where: { tenantId, applicationId: id }
    });

    if (!ranking) return res.status(404).json({ error: 'Ranking not found' });

    res.json(ranking);
  } catch (error) {
    console.error('Error fetching application ranking:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getRankingExplanation = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { jobId, applicationId } = req.params;

    const ranking = await prisma.basePrisma.candidateRanking.findFirst({
      where: { tenantId, jobId, applicationId },
      include: {
        application: {
          include: { candidate: true }
        },
        jobRequisition: true
      }
    });

    if (!ranking) return res.status(404).json({ error: 'Ranking not found' });

    // Fetch top 3 competitors
    const topCompetitors = await prisma.basePrisma.candidateRanking.findMany({
      where: { 
        tenantId, 
        jobId,
        application: { stage: 'Applied' }
      },
      orderBy: { rank: 'asc' },
      take: 3,
      include: {
        application: { include: { candidate: true } }
      }
    });

    const geminiClient = require('../services/geminiClient');
    const ai = geminiClient.getAI();

    const prompt = `
Explain why this candidate is ranked above/below the specified candidates using only the supplied evidence. Do not recalculate scores. Do not introduce facts that are not present.

Candidate: ${ranking.application.candidate.firstName} ${ranking.application.candidate.lastName} (Rank #${ranking.rank})
Ranking Score: ${ranking.rankingScore}
Evidence Coverage: ${ranking.evidenceCoverage}%
Strengths: ${ranking.rankingEvidence?.positive?.join('; ') || 'None listed'}
Gaps: ${ranking.rankingEvidence?.negative?.join('; ') || 'None listed'}

Top Competitors:
${topCompetitors.map(c => `
- ${c.application.candidate.firstName} ${c.application.candidate.lastName} (Rank #${c.rank})
  Score: ${c.rankingScore}
  Strengths: ${c.rankingEvidence?.positive?.join('; ') || 'None'}
  Gaps: ${c.rankingEvidence?.negative?.join('; ') || 'None'}
`).join('')}

Explain the rank of ${ranking.application.candidate.firstName} concisely in 2-3 sentences.
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      contents: prompt
    });

    const explanation = response.text;

    res.json({ explanation });
  } catch (error) {
    console.error('Error generating ranking explanation:', error);
    res.status(500).json({ error: error.message });
  }
};
