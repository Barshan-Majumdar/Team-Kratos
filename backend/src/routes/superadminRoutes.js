const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { createTenant, getAllTenants } = require('../controllers/superadminController');

router.use(auth, authorize('SuperAdmin'));

router.post('/tenants', createTenant);
router.get('/tenants', getAllTenants);
router.post('/tenants/:id/request-access', require('../controllers/superadminController').requestAccess);
router.post('/tenants/:id/verify-access', require('../controllers/superadminController').verifyAccess);
router.get('/tenants/:id', require('../controllers/superadminController').getTenantDetails);
router.put('/tenants/:id', require('../controllers/superadminController').updateTenant);

module.exports = router;
