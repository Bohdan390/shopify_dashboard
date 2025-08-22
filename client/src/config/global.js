module.exports = {
  currencyRates: {
    USD: 1,
    SEK: 0.1,
    EUR: 1.16
  },
  createLocalDateWithTime: function (dateString) {
    var date = new Date(dateString)
    var offsetMinutes = new Date().getTimezoneOffset()
    var time = date.getTime() + offsetMinutes * 60 * 1000
    return new Date(time)
  }
}