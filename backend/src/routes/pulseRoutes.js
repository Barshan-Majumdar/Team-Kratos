const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getSurveys,
  createSurvey,
  submitResponse
} = require('../controllers/pulseController');

const authorize = require('../middleware/role');

router.use(auth);

router.get('/', getSurveys);
router.post('/', authorize(2), createSurvey); // Managers and above can create surveys
router.post('/:surveyId/responses', submitResponse);

module.exports = router;
