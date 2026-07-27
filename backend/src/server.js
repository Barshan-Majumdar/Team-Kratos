const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(url => url.trim()) 
  : true;

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

// Make io accessible to controllers
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('localhost') || origin.endsWith('.crewhr.io')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(require('cookie-parser')());
app.use(express.json({ limit: '5mb' })); // Reduced from 50mb to prevent DoS
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes.'
});
app.use('/api/', limiter);

// Stricter Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 login/register requests per hour
  message: 'Too many authentication attempts from this IP, please try again after an hour.'
});
app.use('/api/auth/', authLimiter);


// Socket.io for Real-Time Attendance
io.on('connection', (socket) => {
  console.log('New client connected', socket.id);

  socket.on('join', ({ tenantId, userId, roleLevel }) => {
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
      if (roleLevel <= 1) socket.join(`tenant:${tenantId}:admin`);
    }
    if (userId && tenantId) {
      socket.join(`tenant:${tenantId}:user:${userId}`);
    }
  });

  socket.on('check-in', (data) => {
    // Broadcast to admins
    io.emit('attendance-update', { type: 'check-in', data });
  });

  socket.on('check-out', (data) => {
    io.emit('attendance-update', { type: 'check-out', data });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

// Start Background Workers
const { initCronJobs } = require('./workers/cronJobs');
initCronJobs();

// Routes Placeholder
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave', require('./routes/leave'));
const payrollRoutes = require('./routes/payroll');
const tenantSettingsRoutes = require('./routes/tenantSettingsRoutes');
const importRoutes = require('./routes/importRoutes');
const developerSettingsRoutes = require('./routes/developerSettingsRoutes');
const statutoryFilingRoutes = require('./routes/statutoryFilingRoutes');
const ticketRoutes = require('./routes/tickets');
const announcementRoutes = require('./routes/announcements');
const billingRoutes = require('./routes/billingRoutes');

const { tenantStorage, setTenantContext } = require('./middleware/auth');
app.use('/api/payroll', payrollRoutes);
app.use('/api/superadmin', require('./routes/superadminRoutes'));
app.use('/api/tenant-settings', tenantSettingsRoutes);
app.use('/api/ats', require('./routes/atsRoutes'));
app.use('/api/inbox', require('./routes/inboxRoutes'));
app.use('/api/developer-settings', developerSettingsRoutes);
app.use('/api/statutory-filings', statutoryFilingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/import', importRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/one-on-ones', require('./routes/oneOnOneRoutes'));
app.use('/api/pulse', require('./routes/pulseRoutes'));
app.use('/api/console', require('./routes/console'));
app.use('/api/v1', require('./routes/apiV1Routes'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/benefits', require('./routes/benefits'));
app.use('/api/analytics', require('./routes/analytics'));

// Cron job endpoint
const { runDailyCron } = require('./controllers/cronController');
app.get('/api/cron', runDailyCron);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown to prevent Prisma connection pool exhaustion on nodemon restart
const prisma = require('./config/db');

const gracefulShutdown = async () => {
  console.log('Shutting down gracefully, closing database connections...');
  try {
    await prisma.basePrisma.$disconnect();
    console.log('Database connections closed.');
  } catch (err) {
    console.error('Error during disconnection:', err);
  }
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // For nodemon restarts
