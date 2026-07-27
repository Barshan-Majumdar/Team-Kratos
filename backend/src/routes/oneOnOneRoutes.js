const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getOneOnOnes,
  createOneOnOne,
  updateOneOnOne,
  deleteOneOnOne
} = require('../controllers/oneOnOneController');

const authorize = require('../middleware/role');

router.use(auth);

router.get('/', getOneOnOnes);
router.post('/', authorize(2), createOneOnOne);
router.patch('/:id', authorize(2), updateOneOnOne);
router.delete('/:id', authorize(2), deleteOneOnOne);

module.exports = router;
