# Digital Ocean WebSocket Socket Management Debug Guide

## 🚨 Problem Description
On Digital Ocean (production), the `activeSockets` Map appears empty when trying to use sockets for sync operations, even though sockets are being connected and stored.

## 🔍 Root Causes (Most Likely)

### 1. **Server Process Restarts**
- **Issue**: Server restarts clear in-memory `activeSockets` Map
- **Symptoms**: Sockets connect successfully but disappear after server restart
- **Evidence**: `activeSockets` shows connections initially, then becomes empty

### 2. **Multiple Server Instances**
- **Issue**: Load balancer distributes requests across multiple server instances
- **Symptoms**: WebSocket connects to Instance A, but HTTP requests go to Instance B
- **Evidence**: Socket exists in one process but not in another

### 3. **Socket Disconnection Issues**
- **Issue**: Sockets disconnect unexpectedly due to network issues
- **Symptoms**: Sockets appear connected but are actually dead
- **Evidence**: `readyState` shows OPEN but socket is unusable

### 4. **Memory Management Issues**
- **Issue**: Node.js garbage collection or memory pressure
- **Symptoms**: Sockets are lost without explicit disconnection
- **Evidence**: Sudden disappearance of socket references

## 🛠️ Solutions Implemented

### 1. **Enhanced Socket Management**
```javascript
// New functions in common.js
addSocket(id, ws)           // Add socket with metadata
removeSocket(id)            // Remove socket safely
getSocket(id)               // Get socket with debugging
getActiveSocketsInfo()      // Get comprehensive socket info
cleanupDeadSockets()        // Clean up dead/inactive sockets
```

### 2. **Socket Recovery Mechanism**
```javascript
// Fallback to any available socket for the store
if (!socket) {
  common.activeSockets.forEach((ws, id) => {
    if (ws.storeId === storeId && ws.readyState === 1) {
      fallbackSocket = ws;
    }
  });
}
```

### 3. **Periodic Cleanup**
```javascript
// Clean up dead sockets every 2 minutes
setInterval(() => {
  common.cleanupDeadSockets();
}, 120000);
```

### 4. **Enhanced Debugging**
```javascript
// Debug endpoint: GET /api/debug/sockets
// Comprehensive logging in sync operations
// Socket state monitoring
```

## 🔧 Debugging Steps

### Step 1: Check Socket Status
```bash
curl https://your-domain.com/api/debug/sockets
```

**Expected Output:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "server": {
    "pid": 12345,
    "uptime": 3600,
    "platform": "linux"
  },
  "sockets": {
    "total": 2,
    "ids": ["ws_123", "ws_456"],
    "states": {"ws_123": 1, "ws_456": 1},
    "metadata": {
      "ws_123": {
        "connectedAt": 1704067200000,
        "storeId": "meonutrition",
        "readyState": 1
      }
    }
  }
}
```

### Step 2: Monitor Server Logs
Look for these log patterns:
```
✅ Socket ws_123 added. Total active: 1
🔌 Active socket IDs: ['ws_123']
🏪 Socket ws_123 selected store: meonutrition
🔍 SYNC ORDERS REQUEST DEBUG:
🔌 Socket ID from request: ws_123
✅ Found socket ws_123 for sync
```

### Step 3: Check for Errors
Look for these warning patterns:
```
⚠️ Socket ws_123 not found in activeSockets
🔍 Socket lookup failed. Possible causes:
   - Server restarted and lost connections
   - Socket disconnected unexpectedly
   - Multiple server instances running
```

## 🚀 Production Recommendations

### 1. **Use Redis for Socket Storage** (Recommended)
```javascript
// Store sockets in Redis instead of memory
const redis = require('redis');
const client = redis.createClient();

async function addSocket(id, ws) {
  await client.set(`socket:${id}`, JSON.stringify({
    storeId: ws.storeId,
    connectedAt: ws.connectedAt,
    readyState: ws.readyState
  }));
}
```

### 2. **Implement Socket Heartbeat**
```javascript
// Send ping every 30 seconds
setInterval(() => {
  ws.ping();
}, 30000);

ws.on('pong', () => {
  ws.lastActivity = Date.now();
});
```

### 3. **Use Sticky Sessions**
```nginx
# Nginx configuration for sticky sessions
upstream backend {
    ip_hash;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
}
```

### 4. **Monitor Process Manager**
```bash
# Check if PM2 is running multiple instances
pm2 list
pm2 monit

# Check for multiple Node.js processes
ps aux | grep node
```

## 📊 Monitoring and Alerts

### 1. **Socket Count Monitoring**
```javascript
// Alert if socket count drops unexpectedly
if (common.activeSockets.size < expectedMinSockets) {
  console.error('🚨 Socket count below threshold!');
  // Send alert to monitoring system
}
```

### 2. **Connection Health Checks**
```javascript
// Check socket health every minute
setInterval(() => {
  const healthySockets = Array.from(common.activeSockets.values())
    .filter(ws => ws.readyState === 1).length;
  
  if (healthySockets === 0) {
    console.error('🚨 No healthy sockets found!');
  }
}, 60000);
```

## 🔍 Troubleshooting Checklist

- [ ] Check `/api/debug/sockets` endpoint
- [ ] Monitor server logs for socket events
- [ ] Verify single server instance is running
- [ ] Check for server restarts in logs
- [ ] Verify WebSocket connections are stable
- [ ] Check network connectivity and timeouts
- [ ] Monitor memory usage and garbage collection
- [ ] Verify load balancer configuration

## 📝 Next Steps

1. **Deploy the enhanced socket management** to Digital Ocean
2. **Monitor the debug endpoint** to track socket behavior
3. **Check server logs** for the new debugging information
4. **Implement Redis-based socket storage** if memory issues persist
5. **Set up monitoring and alerts** for socket health

## 🆘 Emergency Fix

If sockets continue to disappear, implement this immediate workaround:

```javascript
// In shopify.js sync route
if (!socket) {
  // Force client to reconnect
  console.log('🔄 No socket found, requesting client reconnect');
  // The client should detect this and reconnect automatically
}
```
