function createLocalDate(dateString) {
    var date = new Date(dateString)
    var year = date.getFullYear()
    var month = date.getMonth()
    var day = date.getDate()
    const offsetMinutes = new Date().getTimezoneOffset(); // in minutes
    const offsetHours = -offsetMinutes / 60;
    return new Date(year, month, day, offsetHours); // month is 0-indexed
}

function createDoubleLocalDate(dateString) {
    var date = new Date(dateString)
    var year = date.getFullYear()
    var month = date.getMonth()
    var day = date.getDate()
    const offsetMinutes = new Date().getTimezoneOffset(); // in minutes
    const offsetHours = - (2 * offsetMinutes) / 60;
    date.setHours(date.getHours() + offsetHours);
    console.log(date, dateString, 111)
    return date;
}

function extractProductSku(productTitle) {
    if (!productTitle) return null;
    const sku = productTitle.replace(/\d+x\s/gi, '');
    return sku;
}

module.exports = {
	createLocalDate, createDoubleLocalDate, extractProductSku
}
