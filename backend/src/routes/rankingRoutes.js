const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const auth = require('../middleware/auth');

router.get('/jobs/:jobId/rankings', auth, rankingController.getJobRankings);
router.post('/jobs/:jobId/rankings/recalculate', auth, rankingController.recalculateJobRankings);
router.get('/jobs/:jobId/rankings/:applicationId/explain', auth, rankingController.getRankingExplanation);
router.get('/applications/:id/ranking', auth, rankingController.getApplicationRanking);

module.exports = router;
