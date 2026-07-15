const express = require('express');
const { generatePFChallan } = require('../controllers/statutoryFilingController');
const auth = require('../middleware/auth');

const router = express.Router();

const authorizeAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role === 'CEO')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admins only.' });
  }
};

router.use(auth, authorizeAdmin);
router.post('/pf-challan', generatePFChallan);

module.exports = router;
