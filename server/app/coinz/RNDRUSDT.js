import percentChange from './../utils/percentChange'

export default {
  volatility: 8,
  stopLoss: '0.04',
  buyLong: true,
  buyShort: false,
  enterLongEMA(candle, candle1hour, candle4hour, candle12hour, averageADX) {

    if (candle12hour?.ADX?.adx > 25 && candle12hour?.ADX?.mdi > candle12hour?.ADX?.pdi) {
      return false
    }

    return true
  },
  enterLongOversold(candle1hour, candle4hour, candle12hour) {

    return false
  },
  exitLongEMA50(currentTrade, candle, candle1hour, candle4hour, candle12hour) {

    // if (candle.timeStamp === '1675846800') {
    //   return true
    // }

    if (candle.ADX.adx > 25 && candle.ADX.mdi > candle.ADX.pdi * 2) {
      if (candle12hour.ADX.adx > 50 && candle12hour.ADX.pdi > candle12hour.ADX.mdi * 2) {
        return true
      }
    }
    
    return false
  },
  exitLongEMA200(candle, currentTrade, candle1hour, candle4hour) {

    return false
  },
  exitLongOverBought(currentTrade, candle, candle1hour, candle4hour) {

    if (Math.round(candle.CRSI) >= 97) {

      if (candle.ADX.pdi > candle.ADX.mdi * 2 && candle1hour.ADX.pdi > candle1hour.ADX.mdi * 2) {
        return false
      }
      return true
    }

    return false
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