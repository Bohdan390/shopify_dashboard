module.exports = {
  currencyRates: {
    USD: 1,
    SEK: 0.1,
    EUR: 1.16
  },
  availableCountries: [],
  createLocalDateWithTime: function (dateString) {
    var date = new Date(dateString)
    var offsetMinutes = new Date().getTimezoneOffset()
    console.log(offsetMinutes)
    var time = date.getTime() - offsetMinutes * 60 * 1000
    return new Date(time)
  },
  roundPrice: function (price) {
    return Number(price.toFixed(2));
  }
}