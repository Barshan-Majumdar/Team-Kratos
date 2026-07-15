const prisma = require('../config/db');

// ── Employee: Create Ticket ─────────────────────────────
const createTicket = async (req, res) => {
  try {
    const { subject, description, category } = req.body;
    
    if (!subject) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    const ticket = await prisma.ticket.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        subject,
        description,
        category: category || 'HR'
      }
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ── Admin/Employee: Get Tickets ─────────────────────────
const getTickets = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'Admin' || req.user.role === 'SuperAdmin' || req.user.role === 'CEO';
    
    let whereClause = { tenantId: req.user.tenantId };
    
    if (!isAdmin) {
      whereClause.userId = req.user.id;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, displayName: true, email: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Admin: Update Ticket Status ─────────────────────────
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await prisma.ticket.update({
      where: { id, tenantId: req.user.tenantId },
      data: { status }
    });

    res.json(ticket);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  updateTicketStatus
};
