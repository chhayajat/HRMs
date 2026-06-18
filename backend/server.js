require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route files
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const { verifyConnection } = require('./services/emailService');

const app = express();

// Connect to Database
connectDB();

// Verify SMTP on startup
verifyConnection();

// CORS configuration - Allow client requests
app.use(cors({
  origin: '*', // We can change this to specific client domains for production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Tenant-ID', 'X-Tenant-ID']
}));

// Body parser
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads for profile photos

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);

// Serve frontend in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.send('HRMS API Server is Running...');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
