const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { createTenant, getAllTenants } = require('../controllers/superadminController');

router.use(auth, authorize('SuperAdmin'));

router.post('/tenants', createTenant);
router.get('/tenants', getAllTenants);

module.exports = router;
