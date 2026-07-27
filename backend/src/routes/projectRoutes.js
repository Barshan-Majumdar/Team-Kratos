const express = require('express');
const router = express.Router();
const { 
  getProjects, 
  createProject, 
  getTimesheets, 
  createTimesheet, 
  updateTimesheetStatus, 
  getProjectAnalytics 
} = require('../controllers/projectController');
const authorize = require('../middleware/role');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getProjects);
router.post('/', authorize(2), createProject); // Managers and above

router.get('/timesheets', getTimesheets);
router.post('/timesheets', createTimesheet); // Any employee can submit a timesheet
router.patch('/timesheets/:id/status', authorize(2), updateTimesheetStatus); // Only managers+ can approve/reject

router.get('/:id/analytics', getProjectAnalytics);

module.exports = router;
