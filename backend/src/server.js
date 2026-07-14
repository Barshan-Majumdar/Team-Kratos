const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/payroll', require('./routes/payroll'));

// Cron job endpoint
app.get('/api/cron', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
