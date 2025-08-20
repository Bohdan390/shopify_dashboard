const cron = require('node-cron');
const { supabase } = require('../config/database-supabase');
const ShopifyService = require('./shopifyService');
const windsorService = require('./windsorService');

class SocketManager {
    constructor() {
        this.activeSockets = new Map(); // storeId -> Set of socket objects
        this.syncInProgress = new Map(); // storeId -> sync status
        this.cronJobs = new Map(); // storeId -> cron job reference
    }

    // Add socket connection for a store
    addSocket(socket) {
        if (!this.activeSockets.has(socket.id)) {
            this.activeSockets.set(socket.id, socket);
        }
        console.log(socket.id)
        // Start cron job for this store if not already running        
    }

    // Remove socket connection for a store
    removeSocket(socket) {
        if (this.activeSockets.has(socket.id)) {
            this.activeSockets.delete(socket.id);
        }
    }

    // Start cron job for automatic syncing
    startCronJob() {
        // 0 * * * *
        cron.schedule('0 * * * *', async () => {
            var stores = ["buycosari", "meonutrition", "nomobark", "gamoseries", "cosara", "dermao"]
            for (const storeId of stores) {
                await this.runAutoSync(storeId);
            }
        }, {
            scheduled: true,
            timezone: "UTC"
        });
    }

    // Run automatic sync for a store
    async runAutoSync(storeId) {
        // Check if sync is already in progress
        if (this.syncInProgress.get(storeId)) {
            console.log(`🔄 Auto-sync already in progress for store: ${storeId}`);
            return;
        }

        try {
            console.log(`🔄 Starting auto-sync for store: ${storeId}`);
            this.syncInProgress.set(storeId, true);
            
            // Check if sync is needed (last sync > 1 hour ago)
            const needsSync = await this.checkSyncNeeded(storeId);
            if (!needsSync) {
                console.log(`✅ Store ${storeId} is up to date, skipping auto-sync`);
                this.syncInProgress.set(storeId, false);
                return;
            }

            // Broadcast sync start
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'starting',
                message: '🔄 Automatic sync started',
                progress: 0,
                timestamp: new Date().toISOString()
            });

            // Run sync operations with progress tracking
            const ordersCount = await this.syncOrders(storeId);
            
            // Update progress after orders
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'orders_completed',
                message: '📦 Orders sync completed, starting ads sync...',
                progress: 35,
                timestamp: new Date().toISOString()
            });
            
            const adsCount = await this.syncAds(storeId);
            
            // Update progress after ads
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'ads_completed',
                message: `Auto Sync Completed. ${ordersCount} orders synced. ${adsCount} campaigns synced`,
                progress: 65,
                timestamp: new Date().toISOString()
            });
            
            console.log(`✅ Auto-sync completed for store: ${storeId}`);
            
        } catch (error) {
            console.error(`❌ Auto-sync failed for store: ${storeId}:`, error);
            
            // Broadcast error
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'error',
                message: `❌ Auto-sync failed: ${error.message}`,
                progress: 0,
                timestamp: new Date().toISOString()
            });
        } finally {
            this.syncInProgress.set(storeId, false);
        }
    }

    // Check if sync is needed based on last sync time
    async checkSyncNeeded(storeId) {
        try {
            const { data: syncTracking, error } = await supabase
                .from('sync_tracking')
                .select('last_sync_date, last_ads_sync_date')
                .eq('store_id', storeId)
                .limit(1);

            if (error || !syncTracking || syncTracking.length === 0) {
                return true; // No sync tracking found, sync needed
            }

            const lastSync = new Date(syncTracking[0].last_sync_date);
            const now = new Date();
            const hoursSinceLastSync = (now - lastSync) / (1000 * 60 * 60);

            return hoursSinceLastSync >= 1; // Sync if > 1 hour
        } catch (error) {
            console.error(`Error checking sync status for ${storeId}:`, error);
            return true; // Sync on error to be safe
        }
    }

    // Get last sync dates for a store
    async getLastSyncDates(storeId) {
        try {
            const { data: syncTracking, error } = await supabase
                .from('sync_tracking')
                .select('last_sync_date, last_ads_sync_date')
                .eq('store_id', storeId)
                .limit(1);

            if (error || !syncTracking || syncTracking.length === 0) {
                // If no tracking found, use default dates (last 7 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                return { startDate, endDate };
            }

            const lastSyncDate = new Date(syncTracking[0].last_sync_date);
            const lastAdsSyncDate = syncTracking[0].last_ads_sync_date ? new Date(syncTracking[0].last_ads_sync_date) : lastSyncDate;
            const now = new Date();

            // For orders: use last_sync_date as start date
            const ordersStartDate = lastSyncDate;
            
            // For ads: use last_ads_sync_date as start date, or last_sync_date if not available
            const adsStartDate = lastAdsSyncDate;

            return {
                ordersStartDate,
                adsStartDate,
                endDate: now
            };
        } catch (error) {
            console.error(`Error getting last sync dates for ${storeId}:`, error);
            // Fallback to last 7 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            return { startDate, endDate };
        }
    }

    // Sync orders for a store
    async syncOrders(storeId) {
        try {
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'orders',
                message: '📦 Syncing orders...',
                progress: 25,
                timestamp: new Date().toISOString()
            });

            // Get the last sync date to use as start date
            const { ordersStartDate, endDate } = await this.getLastSyncDates(storeId);
            
            // Call the real Shopify order sync service with the actual start date
            const storeService = new ShopifyService(storeId);
            const ordersCount = await storeService.syncOrders(250, ordersStartDate, null, 'autoSyncProgress');
            
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'orders',
                message: `✅ Orders sync completed! ${ordersCount} orders processed from ${ordersStartDate.toISOString().split('T')[0]}`,
                progress: 30,
                timestamp: new Date().toISOString()
            });

            return ordersCount;
            
        } catch (error) {
            console.error(`❌ Error in auto-sync orders for store: ${storeId}:`, error);
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'orders',
                message: `❌ Orders sync failed: ${error.message}`,
                progress: 25,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // Sync ads for a store
    async syncAds(storeId) {
        try {
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'ads',
                message: '📢 Syncing ads...',
                progress: 50,
                timestamp: new Date().toISOString()
            });

            // Get the last ads sync date to use as start date
            const { adsStartDate, endDate } = await this.getLastSyncDates(storeId);

            // Call the real Windsor ads sync service with the actual start date
            const result = await windsorService.fetchAndSaveAdData(
                adsStartDate.toISOString().split('T')[0], 
                endDate.toISOString().split('T')[0], 
                null, 
                storeId, 
                'autoSyncProgress'
            );
            
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'ads',
                message: `✅ Ads sync completed! ${result.campaignsSaved} campaigns, ${result.adSpendRecordsSaved} records from ${adsStartDate.toISOString().split('T')[0]}`,
                progress: 60,
                timestamp: new Date().toISOString()
            });

            console.log(`📢 Auto-sync ads completed for store: ${storeId}, ${result.campaignsSaved} campaigns, ${result.adSpendRecordsSaved} records from ${adsStartDate.toISOString().split('T')[0]}`);
            
            return result.campaignsSaved;
        } catch (error) {
            console.error(`❌ Error in auto-sync ads for store: ${storeId}:`, error);
            this.broadcastToStore(storeId, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'ads',
                message: `❌ Ads sync failed: ${error.message}`,
                progress: 50,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    // Broadcast message to all WebSocket connections for a specific store
    broadcastToStore(storeId, event, data) {
        if (this.activeSockets.has(storeId)) {
            const sockets = this.activeSockets.get(storeId);
            const message = JSON.stringify({
                type: event,
                data: data,
                timestamp: Date.now()
            });
            
            sockets.forEach(ws => {
                if (ws.readyState === 1) { // WebSocket.OPEN
                    ws.send(message);
                }
            });
            console.log(`📡 Broadcasted ${event} to ${sockets.size} clients for store: ${storeId}`);
        }
    }

    // Send current sync status to a specific WebSocket connection
    sendSyncStatus(storeId, ws) {
        const isSyncing = this.syncInProgress.get(storeId) || false;
        const message = JSON.stringify({
            type: 'syncStatus',
            data: {
                storeId,
                isSyncing,
                timestamp: new Date().toISOString()
            },
            timestamp: Date.now()
        });
        
        if (ws.readyState === 1) { // WebSocket.OPEN
            ws.send(message);
        }
    }

    // Get sync status for a store
    getSyncStatus(storeId) {
        return {
            isSyncing: this.syncInProgress.get(storeId) || false,
        };
    }

    // Manual sync trigger (for testing)
    async triggerManualSync(storeId) {
        console.log(`🔄 Manual sync triggered for store: ${storeId}`);
        await this.runAutoSync(storeId);
    }
}

module.exports = new SocketManager();
