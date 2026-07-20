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
app.use(cors(corsOptions));
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
app.use('/api/developer-settings', developerSettingsRoutes);
app.use('/api/statutory-filings', statutoryFilingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/import', importRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/console', require('./routes/console'));

// Cron job endpoint
const { runDailyCron } = require('./controllers/cronController');
app.get('/api/cron', runDailyCron);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
