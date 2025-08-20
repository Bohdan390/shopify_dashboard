# 🔄 Auto-Sync System Implementation

## Overview
This document describes the implementation of **Option 1: Server-to-Client WebSocket Broadcasting** for automatic background syncing every hour.

## 🏗️ Architecture

### Server-Side Components

#### 1. Socket Manager (`server/services/socketManager.js`)
- **Purpose**: Manages WebSocket connections and cron jobs for each store
- **Key Features**:
  - Tracks active socket connections per store
  - Manages cron jobs (one per store)
  - Handles automatic sync scheduling
  - Broadcasts sync progress to all connected clients

#### 2. Main Server (`server/index.js`)
- **Purpose**: Integrates socket manager with Express and Socket.IO
- **Key Features**:
  - Handles socket connections/disconnections
  - Routes store selection events
  - Provides test endpoints for manual sync

#### 3. Test Endpoints
- `POST /api/test/trigger-sync/:storeId` - Manually trigger sync
- `GET /api/sync/status/:storeId` - Get current sync status

### Client-Side Components

#### 1. Socket Context (`client/src/contexts/SocketContext.js`)
- **Purpose**: Manages WebSocket connection and store selection
- **Key Features**:
  - Establishes socket connection
  - Handles store selection for socket
  - Provides socket state to components

#### 2. CustomerLTV Component (`client/src/components/CustomerLTV.js`)
- **Purpose**: Demonstrates auto-sync integration
- **Key Features**:
  - Listens for auto-sync events
  - Shows sync progress
  - Automatically refreshes data when sync completes

#### 3. AutoSyncTest Component (`client/src/components/AutoSyncTest.js`)
- **Purpose**: Testing and demonstration interface
- **Key Features**:
  - Manual sync triggers
  - Sync status display
  - Connection status monitoring

## 🚀 How It Works

### 1. Connection Flow
```
Client connects → Socket established → Store selected → Cron job started
```

### 2. Auto-Sync Process
```
Hourly Cron → Check if sync needed → Run sync operations → Broadcast progress → Update frontend
```

### 3. Real-Time Updates
```
Server sync → WebSocket broadcast → Client receives → UI updates → Data refresh
```

## 📋 Implementation Details

### Cron Job Schedule
- **Frequency**: Every hour at minute 0 (`0 * * * *`)
- **Timezone**: UTC
- **Scope**: Per-store (each store has its own cron job)

### Sync Logic
- **Condition**: Only sync if data is older than 1 hour
- **Operations**: Orders → Ads → LTV (sequential)
- **Progress**: Real-time updates via WebSocket
- **Completion**: Automatic data refresh on frontend

### WebSocket Events
- `selectStore` - Client selects store for socket
- `autoSyncProgress` - Server broadcasts sync progress
- `syncStatus` - Server sends current sync status
- `triggerManualSync` - Client triggers manual sync

## 🧪 Testing

### 1. Start the System
```bash
# Terminal 1: Start server
npm run server

# Terminal 2: Start client
npm run client
```

### 2. Test Auto-Sync
1. Navigate to CustomerLTV page
2. Select a store (e.g., 'buycosari')
3. Wait for socket connection
4. Check console for cron job start message
5. Use test panel to trigger manual sync

### 3. Monitor Progress
- Watch console logs for sync progress
- Check frontend for progress indicators
- Verify data refresh after sync completion

## 🔧 Configuration

### Environment Variables
```env
# Server port
PORT=5000

# Database connection (via Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Cron Schedule
```javascript
// Change in socketManager.js
cron.schedule('0 * * * *', async () => {
    // Runs every hour at minute 0
}, {
    scheduled: true,
    timezone: "UTC"
});

// Alternative schedules:
// '*/30 * * * *' - Every 30 minutes
// '0 */2 * * *' - Every 2 hours
// '0 9-17 * * *' - Every hour, 9 AM to 5 PM
```

## 📊 Monitoring & Debugging

### Server Logs
```
🔌 Socket connected for store: buycosari. Total connections: 1
⏰ Starting cron job for store: buycosari - runs every hour
🔄 Starting auto-sync for store: buycosari
📡 Broadcasted autoSyncProgress to 1 clients for store: buycosari
✅ Auto-sync completed for store: buycosari
```

### Client Logs
```
🏪 Socket selected store: buycosari
🔄 Auto-sync progress: {stage: 'starting', message: '🔄 Automatic sync started'}
📊 Sync status: {storeId: 'buycosari', isSyncing: false}
```

### Database Tables
- `sync_tracking` - Tracks last sync time per store
- `orders` - Order data
- `ads` - Advertising data
- `customer_ltv_cohorts` - LTV analytics data

## 🚨 Troubleshooting

### Common Issues

#### 1. Cron Job Not Starting
- Check if store has active socket connections
- Verify cron package is installed (`npm install node-cron`)
- Check server logs for cron start messages

#### 2. WebSocket Not Broadcasting
- Verify socket connection is established
- Check if store is selected (`socket.storeId`)
- Ensure socket manager is properly imported

#### 3. Frontend Not Receiving Updates
- Check browser console for WebSocket errors
- Verify event listeners are properly set up
- Check if store ID matches between client and server

### Debug Commands
```bash
# Check sync status
curl http://localhost:5000/api/sync/status/buycosari

# Trigger manual sync
curl -X POST http://localhost:5000/api/test/trigger-sync/buycosari

# Check server health
curl http://localhost:5000/health
```

## 🔮 Future Enhancements

### 1. Advanced Scheduling
- Configurable sync intervals per store
- Different schedules for different data types
- Timezone-aware scheduling

### 2. Enhanced Monitoring
- Sync success/failure metrics
- Performance monitoring
- Alert system for failed syncs

### 3. Smart Sync
- Incremental sync (only new data)
- Conflict resolution
- Data validation

### 4. User Controls
- Enable/disable auto-sync per store
- Custom sync schedules
- Manual sync override options

## 📝 API Reference

### Socket Events

#### Client → Server
- `selectStore(storeId)` - Select store for socket
- `triggerManualSync(storeId)` - Trigger manual sync

#### Server → Client
- `autoSyncProgress(data)` - Sync progress updates
- `syncStatus(data)` - Current sync status

### HTTP Endpoints

#### `POST /api/test/trigger-sync/:storeId`
Triggers manual sync for specified store.

**Response:**
```json
{
  "success": true,
  "message": "Manual sync triggered for store: buycosari",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### `GET /api/sync/status/:storeId`
Gets current sync status for specified store.

**Response:**
```json
{
  "success": true,
  "storeId": "buycosari",
  "status": {
    "isSyncing": false,
    "activeConnections": 1,
    "hasCronJob": true
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎯 Success Criteria

✅ **Automatic syncing every hour**  
✅ **Real-time progress updates via WebSocket**  
✅ **Per-store cron job management**  
✅ **Automatic data refresh on completion**  
✅ **Manual sync trigger capability**  
✅ **Comprehensive monitoring and logging**  
✅ **Test interface for demonstration**  

## 🏁 Conclusion

The auto-sync system successfully implements **Option 1: Server-to-Client WebSocket Broadcasting** with the following benefits:

- **Reliable**: Server-side cron jobs ensure consistent scheduling
- **Real-time**: WebSocket broadcasts provide immediate updates
- **Efficient**: Only syncs when needed (data > 1 hour old)
- **Scalable**: Per-store architecture supports multiple stores
- **Testable**: Comprehensive test interface for validation

The system is now ready for production use and can be extended with additional features as needed.
