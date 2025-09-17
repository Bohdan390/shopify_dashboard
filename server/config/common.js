const { supabase } = require("./database-supabase");

// Create the activeSockets Map locally in this module
const activeSockets = new Map();
let productLtvCohorts = new Map();
let productSkus = new Map();

function createLocalDate(dateString) {
    var date = new Date(dateString)
    var year = date.getFullYear()
    var month = date.getMonth()
    var day = date.getDate()
    return new Date(year, month, day); // month is 0-indexed
}

function createLocalDateWithTime(dateString) {
    if (dateString && dateString.toString()[dateString.length - 6] == "-") {
        const offset = dateString.substring(dateString.length - 6); 
        dateString = dateString.replace(offset, "");
    }
    var date = new Date(dateString)
    var offsetMinutes = new Date().getTimezoneOffset()
    var time = date.getTime() - offsetMinutes * 60 * 1000
    return new Date(time)
}

function createDoubleLocalDate(dateString) {
    var date = new Date(dateString)
    var year = date.getFullYear()
    var month = date.getMonth()
    var day = date.getDate()
    const offsetMinutes = new Date().getTimezoneOffset(); // in minutes
    const offsetHours = - (2 * offsetMinutes) / 60;
    date.setHours(date.getHours() + offsetHours);
    return date;
}

function extractProductSku(productTitle) {
    if (!productTitle) return null;
    const sku = productTitle.replace(/\d+x\s/gi, '');
    return sku;
}

function diffInDays(date1, date2) {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function diffInMilliSeconds(date1, date2) {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return diffTime;
}

function diffInMonths(date1, date2) {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
}

function roundPrice(price) {
    return Number(price.toFixed(2));
}

const hasNumberX = (str) => {
    return /\d+x/i.test(str);
};

async function updateSyncTracking(fieldName, now = new Date(), storeId) {
    try {
        now = now.toISOString();
        // Try to update existing record
        const { error: updateError } = await supabase
            .from('sync_tracking')
            .upsert({
                store_id: storeId,
                [fieldName]: now,
                updated_at: now
            }, {
                onConflict: 'store_id'
            });

        if (updateError) {
            console.error(`❌ Error updating sync tracking for ${fieldName}:`, updateError);
            throw updateError;
        }
    } catch (error) {
        console.error(`❌ Error in updateSyncTracking for ${fieldName}:`, error);
        // Don't throw error - sync tracking failure shouldn't break the main sync
    }
}

const hasNumberXPattern = (str) => {
    // Check for patterns like "1x", "2x", "3x", "10x", "25x", etc.
    return /\d+x/i.test(str);
};

function broadcastToStore(sockets, event, data) {
    const message = JSON.stringify({
        type: event,
        data: data,
        timestamp: Date.now()
    });
    
    let sentCount = 0;
    let totalCount = sockets.size;
    
    sockets.forEach((ws, id) => {
        if (ws.readyState === 1) { // WebSocket.OPEN
            try {
                ws.send(message);
                sentCount++;
            } catch (error) {
                console.error(`❌ Error sending to socket ${id}:`, error);
                // Remove broken socket
                sockets.delete(id);
            }
        } else {
            console.log(`⚠️ Socket ${id} not ready (state: ${ws.readyState}), removing...`);
            sockets.delete(id);
        }
    });
    
    console.log(`📡 Broadcasted ${event} to ${sentCount}/${totalCount} clients`);
    console.log(`🔌 Active sockets after broadcast:`, Array.from(sockets.keys()));
}

// Enhanced socket management functions
function addSocket(id, ws) {
    activeSockets.set(id, ws);
    // Store additional metadata
    ws.connectedAt = Date.now();
    ws.lastActivity = Date.now();
}

function removeSocket(id) {
    if (activeSockets.has(id)) {
        activeSockets.delete(id);
        console.log(`❌ Socket ${id} removed. Total active: ${activeSockets.size}`);
        console.log(`🔌 Remaining socket IDs:`, Array.from(activeSockets.keys()));
    }
}

function getSocket(id) {
    const socket = activeSockets.get(id);
    return socket;
}

function getActiveSocketsInfo() {
    const info = {
        total: activeSockets.size,
        ids: Array.from(activeSockets.keys()),
        states: {},
        metadata: {}
    };
    
    activeSockets.forEach((ws, id) => {
        info.states[id] = ws.readyState;
        info.metadata[id] = {
            connectedAt: ws.connectedAt,
            lastActivity: ws.lastActivity,
            storeId: ws.storeId,
            readyState: ws.readyState
        };
    });
    
    return info;
}

async function initialSiteData(self, store_id, product_sku) {
    let query = supabase.from("customer_ltv_cohorts").update({created_at: new Date("1900-01-01")})
    if (store_id) {
        query.eq('store_id', store_id)
    }
    if (product_sku) {
        query.eq('product_sku', product_sku)
    }
    await query;
    self.productSkus.set(store_id, []);
    self.productLtvCohorts.set(store_id, []);
}

function getLastDayOfMonth(year, month) {
    console.log(year, month)
    return new Date(year, month, 0); // day 0 of next month = last day of current month
}

function getLastDayOfMonthISO(year, month) {
    const lastDay = getLastDayOfMonth(year, month); // 0-indexed month, 8 = September
    console.log(lastDay)
    return lastDay.toISOString().split('T')[0]; // "2025-09-30T21:59:59.000Z"
}
  
  

module.exports = {
    currencyRates: {
        USD: 1,
        SEK: 0.1,
        EUR: 1.16,
        GBP: 1.32
    },
    productSkus: productSkus,
    activeSockets: activeSockets,
    productLtvCohorts: productLtvCohorts,
    createLocalDate, createDoubleLocalDate, extractProductSku, createLocalDateWithTime,
    diffInDays, updateSyncTracking, roundPrice, diffInMilliSeconds, diffInMonths, hasNumberX, hasNumberXPattern,
    broadcastToStore, addSocket, removeSocket, getSocket, getActiveSocketsInfo, initialSiteData, getLastDayOfMonthISO
}
