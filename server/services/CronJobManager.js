const cron = require('node-cron');
const { supabase } = require('../config/database-supabase');
const ShopifyService = require('./shopifyService');
const windsorService = require('./windsorService');
const common = require('../config/common');

class CronJobManager {
    constructor() {
        this.syncInProgress = new Map(); // storeId -> sync status
    }

    // Start cron job for automatic syncing
    startCronJob() {
        // 0 * * * *
        console.log("Starting cron job")
        cron.schedule('0 * * * *', async () => {
            console.log("Running cron job")
            var stores = ["buycosari", "meonutrition", "nomobark", "gamoseries", "cosara", "dermao"]
            for (const storeId of stores) {
                await this.runAutoSync(storeId);
            }
            common.broadcastToStore(common.activeSockets, 'autoSyncProgress', {
                storeId,
                type: 'auto',
                stage: 'ads_completed',
                message: `Auto Sync Completed.`,
                progress: 100,
                timestamp: new Date().toISOString()
            });
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
            // Run sync operations with progress tracking
            const ordersCount = await this.syncOrders(storeId);
            
            const adsCount = await this.syncAds(storeId);
            // Update progress after ads
            
            
            console.log(`✅ Auto-sync completed for store: ${storeId}`);
            
        } catch (error) {
            console.error(`❌ Auto-sync failed for store: ${storeId}:`, error);
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
            const lastAdsSyncDate = new Date(syncTracking[0].last_ads_sync_date) ? new Date(syncTracking[0].last_ads_sync_date) : new Date(2023, 1, 1);
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
            // Get the last sync date to use as start date
            let { ordersStartDate, endDate } = await this.getLastSyncDates(storeId);
            
            console.log("syncingOrders", ordersStartDate, endDate)
            if (!ordersStartDate) {
                ordersStartDate = new Date(2023, 1, 1);
            }
            // Call the real Shopify order sync service with the actual start date
            ordersStartDate = common.createLocalDateWithTime(new Date(ordersStartDate.getTime() - 1000 * 60 * 60 * 3))
            const storeService = new ShopifyService(storeId);
            const ordersCount = await storeService.syncOrders(250, ordersStartDate.toISOString().split('T')[0], null, 'autoSyncProgress');

            return ordersCount;
            
        } catch (error) {
            console.error(`❌ Error in auto-sync orders for store: ${storeId}:`, error);
            throw error;
        }
    }

    // Sync ads for a store
    async syncAds(storeId) {
        try {
            // Get the last ads sync date to use as start date
            let { adsStartDate, endDate } = await this.getLastSyncDates(storeId);
            endDate = new Date(endDate.getTime() + 1000 * 60 * 60 * 24 * 2)
            console.log("syncingAds", adsStartDate, endDate)
            if (!adsStartDate) {
                adsStartDate = new Date(2023, 1, 1);
            }
            // Call the real Windsor ads sync service with the actual start date
            const result = await windsorService.fetchAndSaveAdData(
                adsStartDate.toISOString().split('T')[0], 
                endDate.toISOString().split('T')[0], 
                null, 
                storeId, 
                'autoSyncProgress'
            );

            console.log(`📢 Auto-sync ads completed for store: ${storeId}, ${result.campaignsSaved} campaigns, ${result.adSpendRecordsSaved} records from ${adsStartDate.toISOString().split('T')[0]}`);
            
            return result.campaignsSaved;
        } catch (error) {
            console.error(`❌ Error in auto-sync ads for store: ${storeId}:`, error);
            throw error;
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

module.exports = new CronJobManager();
