const express = require('express');
const router = express.Router();

// Fixed password - replace this with your desired password
const FIXED_PASSWORD = 'Metricsecom2024!';

// Session duration in milliseconds (3 hours base session)
const BASE_SESSION_DURATION = 3 * 60 * 60 * 1000;

// Login endpoint
router.post('/login', (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password is required' 
    });
  }
  
  if (password === FIXED_PASSWORD) {
    // Generate session token with shorter base duration
    const sessionToken = generateSessionToken();
    const expiryTime = Date.now() + BASE_SESSION_DURATION; // 30 minutes base
    
    res.json({
      success: true,
      message: 'Login successful',
      sessionToken,
      expiryTime
    });
  } else {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid password' 
    });
  }
});

// Verify session endpoint
router.post('/verify', (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken) {
    return res.status(401).json({ 
      success: false, 
      message: 'Session token required' 
    });
  }
  
  // For now, we'll use a simple approach
  // In production, you might want to store sessions in database or use JWT
  try {
    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    
    if (sessionData.expiryTime > Date.now()) {
      res.json({
        success: true,
        message: 'Session valid',
        expiryTime: sessionData.expiryTime
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid session token'
    });
  }
});

// Generate a simple session token (base64 encoded JSON)
function generateSessionToken() {
  const sessionData = {
    expiryTime: Date.now() + BASE_SESSION_DURATION,
    createdAt: Date.now()
  };
  return Buffer.from(JSON.stringify(sessionData)).toString('base64');
}

module.exports = router;
