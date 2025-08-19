const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit'); // No longer needed
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting - DISABLED for development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Database connection - Supabase only
const { supabase } = require('./config/database-supabase');

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shopify', require('./routes/shopify'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/campaign-roi', require('./routes/campaignRoi'));
app.use('/api/product-groups', require('./routes/productGroups'));
app.use('/api/customers', require('./routes/customers'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
}); 