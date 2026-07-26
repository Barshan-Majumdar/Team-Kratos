const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performanceController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

router.use(auth);

// Goals
router.post('/goals', performanceController.createGoal);
router.get('/goals', performanceController.getGoals);
router.put('/goals/:id/progress', performanceController.updateGoalProgress);

// Reviews
router.post('/reviews', authorize(2), performanceController.createOrUpdateReview);
router.get('/reviews', performanceController.getReviews);
router.get('/team-reviews', authorize(2), performanceController.getTeamReviews);
router.post('/reviews/:id/reopen', authorize(2), performanceController.reopenReview); // Strictly controlled in controller
router.put('/reviews/:id/acknowledge', performanceController.acknowledgeReview);

// Feedback360
router.post('/feedback', performanceController.submitFeedback);
router.get('/feedback', performanceController.getFeedback);
router.put('/feedback/:id/status', authorize(1), performanceController.updateFeedbackStatus); // Admin only

module.exports = router;
