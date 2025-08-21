const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
// const rateLimit = require('express-rate-limit'); // No longer needed
const http = require('http');
const common = require("./config/common");
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure server timeouts for long-running operations
server.timeout = 36000000; // 10 hours (in milliseconds)
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set timeout for all requests
app.use((req, res, next) => {
  req.setTimeout(36000000); // 10 hours
  res.setTimeout(36000000); // 10 hours
  next();
});

// Rate limiting - DISABLED for development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Database connection - Supabase only
const { supabase } = require('./config/database-supabase');

// Import socket manager
const cronJobManager = require('./services/CronJobManager');
// WebSocket connection handling
cronJobManager.startCronJob();
wss.on('connection', (ws) => {
  // Generate a unique ID for this WebSocket connection
  ws.id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('🔌 New WebSocket connection:', ws.id);
  common.activeSockets.set(ws.id, ws);
  console.log(common.activeSockets.keys());
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 WebSocket message received:`, data);
      if (data.type === 'getSocketId') {
        ws.send(JSON.stringify({ type: 'getSocketId', data: ws.id }));
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 WebSocket ${ws.id} disconnected`);
    common.activeSockets.delete(ws.id);
  });
  
  ws.on('error', (error) => {
    console.error(`❌ WebSocket ${ws.id} error:`, error);
  });
});

// Make WebSocket server available to routes
app.set('wss', wss);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shopify', require('./routes/shopify'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/product-groups', require('./routes/productGroups'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/product-skus', require('./routes/productSkus'));

// Serve static files from React build
const buildPath = path.join(__dirname, '../client/build');

app.use(express.static(buildPath));

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'React build files not found',
      buildPath,
      indexPath,
      files: require('fs').readdirSync(buildPath)
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get sync status for a store
app.get('/api/sync/status/:storeId', (req, res) => {
  const { storeId } = req.params;
  try {
    const status = cronJobManager.getSyncStatus(storeId);
    res.json({ 
      success: true, 
      storeId,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
}); 