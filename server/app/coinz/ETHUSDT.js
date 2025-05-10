import percentChange from './../utils/percentChange'

export default {
  volatility: 0,
  stopLoss: '0.03',
  buyLong: true,
  buyShort: false,
  enterLongEMA(candle, candle1hour, candle4hour, candle12hour, averageADX) {
    return true
  },
  enterLongOversold(candle, candle1hour, candle4hour, candle12hour) {
    return true
  },
  enterLongMACD(candle, candle1hour, candle4hour, candle12hour) {
    return true
  },
  exitLongEMA50(currentTrade, candle, candle1hour, candle4hour, candle12hour) {
    return true
  },
  exitLongEMA200(candle, currentTrade, candle1hour, candle4hour) {
    return false
  },
  exitLongOverBought(currentTrade, candle, candle1hour, candle4hour) {
    return false
  },
  exitLongMACD(candle, candle1hour, candle4hour, candle12hour) {
    return true
  },
  enterShortEMA(candle, candle1hour, candle4hour, candle12hour, averageADX) {
    return true
  },
  enterShortOverbought(candle1hour, candle4hour, candle12hour) {
    return false
  },
  exitShortEMA50(currentTrade, candle, candle1hour, candle4hour, candle12hour) {
    return true
  },
  exitShortEMA200(candle, currentTrade, candle1hour, candle4hour) {
    return true
  },
  exitShortOversold(currentTrade, candle, candle1hour, candle4hour) {
    return false
  }
}