/**
 * @fileoverview Backend entry point for the Web Scanner App.
 * @module server
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const uploadRouter = require('./routes/upload');
const scansRouter = require('./routes/scans');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend applications (React on 5173 by default)
app.use(cors({
  origin: '*', // In production, replace with specific origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse application/json payloads
app.use(express.json());

// Parse urlencoded payloads
app.use(express.urlencoded({ extended: true }));

// Health Check route
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Register routers
app.use('/api/upload', uploadRouter);
app.use('/api/scans', scansRouter);
app.use('/api/admin/users', usersRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error Handler caught:', err);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred on the server.'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Web Scanner App Backend running on port ${PORT}`);
});
