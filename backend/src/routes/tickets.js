const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { createTicket, getTickets, updateTicketStatus } = require('../controllers/ticketController');

router.use(auth);

// Employee & Admin routes
router.post('/', createTicket);
router.get('/', getTickets);

// Admin-only routes
router.put('/:id/status', authorize('Admin'), updateTicketStatus);

module.exports = router;
