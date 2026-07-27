const express = require('express');
const router = express.Router();
const { getAssets, createAsset, assignAsset, unassignAsset, updateAssetStatus, deleteAsset } = require('../controllers/assetController');
const authorize = require('../middleware/role');
const auth = require('../middleware/auth');

router.use(auth);

// Managers (Level 2) and above can manage assets
router.get('/', authorize(2), getAssets);
router.post('/', authorize(2), createAsset);
router.post('/:id/assign', authorize(2), assignAsset);
router.post('/:id/unassign', authorize(2), unassignAsset);
router.patch('/:id/status', authorize(2), updateAssetStatus);
router.delete('/:id', authorize(2), deleteAsset);

module.exports = router;
