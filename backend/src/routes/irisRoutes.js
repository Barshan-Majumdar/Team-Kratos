const express = require('express');
const router = express.Router();
const { approveIrisTask, getIrisTask } = require('../controllers/irisApprovalController');
const { authorize } = require('../middleware/role');
const auth = require('../middleware/auth');

router.post('/approve', auth, approveIrisTask);
router.get('/:id', auth, getIrisTask);

module.exports = router;
