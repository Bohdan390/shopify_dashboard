const { supabase } = require("./database-supabase");

function createLocalDate(dateString) {
    var date = new Date(dateString)
    var year = date.getFullYear()
    var month = date.getMonth()
    var day = date.getDate()
    const offsetMinutes = new Date().getTimezoneOffset(); // in minutes
    const offsetHours = -offsetMinutes / 60;
    return new Date(year, month, day, offsetHours); // month is 0-indexed
}

function createLocalDateWithTime(dateString) {
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

module.exports = {
    productSkus: [],
    createLocalDate, createDoubleLocalDate, extractProductSku, createLocalDateWithTime,
    diffInDays, updateSyncTracking, roundPrice, diffInMilliSeconds, diffInMonths, hasNumberX, hasNumberXPattern
}
