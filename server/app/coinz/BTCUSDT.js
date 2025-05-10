import { Event } from '../models'
import percentChange from './../utils/percentChange'

export default {
  volatility: 0,
  stopLoss: '0.03',
  buyLong: true,
  buyShort: true,
  logEvent(timeStamp, type, message) {
    const obj = {
      symbol: "BTC-USDT",
      timeStamp: timeStamp,
      type: type,
      message: message
    }

    const newEvent = new Event(obj)
    newEvent.save()
  },
  enterLongEMA(candle, candle1hour, candle4hour, candle12hour, averageADX) {
    console.log(`BTC-USDT: ENTER LONG EMA ${candle.timeStamp}`)

    // Sign of a reversal
    if (candle?.ADX?.adx > 25 && candle?.ADX?.pdi > candle?.ADX?.mdi * 2) {
      if (candle4hour?.ADX?.mdi > candle4hour?.ADX?.pdi && candle12hour?.ADX?.mdi > candle12hour?.ADX?.pdi) {
        this.logEvent(candle.timeStamp, 'Enter Long EMA', 'Enter: Sign of a reversal')
        return true
      }
    }

    // Not enough action
    if (averageADX < 15) {
      // Enter if we are all green
      if (candle1hour.color !== 'green' || candle4hour.color !== 'green' || candle12hour.color !== 'green') {
        this.logEvent(candle.timeStamp, 'Enter Long EMA', 'Do Not Enter: Not Enough Action')
        return false
      }
    }

    if (candle.CRSI < 90 && candle1hour.EMA_20 < candle1hour.EMA_200) {
      this.logEvent(candle.timeStamp, 'Enter Long EMA', 'Enter: candle1hour.EMA_20 < candle1hour.EMA_200')
      return true
    } else if (candle.CRSI > 90 && candle1hour.EMA_20 > candle1hour.EMA_200 && candle1hour.EMA_50 > candle1hour.EMA_200) {
      this.logEvent(candle.timeStamp, 'Enter Long EMA', 'Enter: candle1hour.EMA_20 > candle1hour.EMA_200 && candle1hour.EMA_50 > candle1hour.EMA_200')
      return true
    }
    
    this.logEvent(candle.timeStamp, 'Enter Long EMA', 'Do Not Enter: No Conditions Met')
    return false
  },
  enterLongOversold(candle, candle1hour, candle4hour, candle12hour) {
    console.log(`BTC-USDT: ENTER LONG OVERSOLD ${candle.timeStamp}`)

    // Avoid growing downtrends
    if (candle1hour?.ADX?.adx > candle4hour?.ADX?.adx && candle1hour?.ADX?.mdi > candle1hour?.ADX?.pdi && candle4hour?.ADX?.mdi > candle4hour?.ADX?.pdi) {
      this.logEvent(candle.timeStamp, 'Enter Long Oversold', 'Growing Downtrend - Dont Enter')
      return false
    }

    // Avoid strong downtrends
    if (candle1hour?.ADX?.adx > 25 && candle1hour?.ADX?.pdi < candle1hour?.ADX?.mdi) {
      this.logEvent(candle.timeStamp, 'Enter Long Oversold', 'Strong Downtrend - Dont Enter')
      return false
    }

    return true
  },
  exitLongEMA50(currentTrade, candle, candle1hour, candle4hour, candle12hour) {
    console.log(`BTC-USDT: EXIT LONG EMA 50 ${candle.timeStamp}`)

    if (candle.close < currentTrade.entry) {
      console.log('close less than entry')
      this.logEvent(candle.timeStamp, 'Exit Long EMA50', 'Close less than entry')
      return false
    }

    if (candle1hour.EMA_20 > candle1hour.EMA_50 && candle1hour.EMA_50 > candle1hour.EMA_200) {
      if (candle4hour.EMA_20 > candle4hour.EMA_50 && candle4hour.EMA_50 > candle4hour.EMA_200) {
        if (candle12hour.EMA_20 > candle12hour.EMA_50 && candle12hour.EMA_50 > candle12hour.EMA_200) {
          console.log('larger timeframes still all EMA of 2')
          this.logEvent(candle.timeStamp, 'Exit Long EMA50', 'Larger timeframes still all EMA of 2')
          return false
        }
      }
    }

    if (candle4hour?.ADX?.adx > 10 && candle4hour?.ADX?.pdi < candle4hour?.ADX?.mdi) {
      console.log('ADX > 10 & 4 hour PDI < MDI')
      return true
    }
      
    // Signals of a reversal: ADX timeframe flips from bullish to bearish
    if (candle1hour?.ADX?.adx > 35 && candle4hour?.ADX?.adx > 35) {
      if (candle1hour?.ADX?.mdi > candle1hour?.ADX?.pdi && candle4hour?.ADX?.pdi > candle4hour?.ADX?.mdi * 2) {
        return true
      }
    }

    if (candle4hour?.ADX?.adx > 25 && Math.round(candle4hour?.ADX?.pdi) >= Math.round(candle4hour?.ADX?.mdi * 2)) {
      if (candle?.ADX?.mdi > candle?.ADX?.pdi * 2) {
        if (candle1hour?.ADX?.mdi > candle1hour?.ADX?.pdi) {
          return true
        }
      }
    }
    
    console.log('No conditions met')
    this.logEvent(candle.timeStamp, 'Exit Long EMA50', 'No Conditions Met')
    return false
  },
  exitLongEMA200(candle, currentTrade, candle1hour, candle4hour) {
    console.log(`BTC-USDT: EXIT LONG EMA 200 ${candle.timeStamp}`)

    if (candle4hour?.ADX?.adx > 10 && candle4hour?.ADX?.pdi < candle4hour?.ADX?.mdi) {

      if (!currentTrade.ema200Cross) {
        return true
      }

      const minBars = 6
      if (Number(candle.timeStamp) - Number(currentTrade.ema200Cross) > (1800 * minBars)) {
        return true
      }
    }
    return false
  },
  exitLongOverBought(currentTrade, candle, candle1hour, candle4hour) {
    console.log(`BTC-USDT: EXIT LONG OVERBOUGHT ${candle.timeStamp}`)

    if (candle.CRSI >= 90 && candle1hour.CRSI >= 80) {

      if (candle.EMA_20 > candle.EMA_200) {

        // Don't bail on a long uptrend based on oversold
        if (percentChange(currentTrade.entry, currentTrade.tradeHigh) > 10) {
          if (candle1hour?.ADX?.pdi > candle1hour?.ADX?.mdi && candle4hour?.ADX?.pdi > candle4hour?.ADX?.mdi) {
            this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'Don\'t bail on a long uptrend')
            return false
          }
        }

        // Don't bail yet if low movement (still positive) and not oversold
        if (candle4hour.CRSI < 80) {
          if (candle4hour?.ADX?.adx < 15 && candle4hour?.ADX?.pdi > candle4hour?.ADX?.mdi) {
            this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'Low Movement and not oversold')
            return false
          }
        }

        // Sign of an uptrend dying out
        if (candle1hour?.ADX?.pdi < candle1hour?.ADX?.mdi * 2) {
          if (candle4hour?.ADX?.pdi < candle4hour?.ADX?.mdi * 2) {
            this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'Uptrend Dying Out')
            return true
          }
        }
    
        // If the EMA 50 is still below the EMA200
        if (candle.EMA_50 < candle.EMA_200) {
                      
          // We want to see bigger movement up to stay in
          if (candle1hour?.ADX.pdi < candle1hour?.ADX.mdi * 2 || candle4hour?.ADX.pdi < candle4hour?.ADX.mdi * 2) {
            if (candle.ADX.adx > 25 && candle.ADX.pdi > candle.ADX.mdi * 4) {
              this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'We want to see bigger movement up to stay in: PASSED')
              return false
            }
            this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'We want to see bigger movement up to stay in: FAILED')
            return true
          }
        }
      }
    }

    // Very High CRSI and 4Hour CSRI -> If the 4Hour isn't strong enough bail
    if (Math.round(candle.CRSI) >= 95) {
      if (candle4hour?.CRSI >= 85 && candle4hour?.ADX.pdi < candle4hour?.ADX.mdi * 2) {
        if (candle4hour?.EMA_20 > candle4hour?.EMA_200 && candle4hour?.EMA_20 < candle4hour?.EMA_50) {
          
          this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'Very High CRSI and 4Hour CSRI: PASSED')
          return true
        }
      }

      if (candle.ADX.adx > 25 && candle.ADX.pdi > candle.ADX.mdi * 6) {
        this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'Very High CRSI and 4Hour CSRI: FAILED')
        return true
      }
    }

    this.logEvent(candle.timeStamp, 'Exit Long Overbought', 'No Conditions Met')
    return false
  },
  exitLongMACD(candle, candle1hour, candle4hour, candle12hour) {
    return false
  },
  enterShortEMA(candle, candle1hour, candle4hour, candle12hour, averageADX) {
    
    if (candle4hour.ADX.adx > 50 && candle4hour.ADX.pdi > candle4hour.ADX.mdi * 2) {
      return false
    }

    if (candle12hour?.ADX?.adx > 50 && candle12hour?.ADX?.pdi > candle12hour?.ADX?.mdi * 2) {
      return false
    }

    if (candle4hour.ADX.adx > 25 && candle4hour.ADX.pdi > candle4hour.ADX.mdi) {
      if (candle12hour?.ADX?.adx > 25 && candle12hour?.ADX?.pdi > candle12hour?.ADX?.mdi) {
        return false
      }
    }

    if (candle.CRSI < 5) {
      return false
    }

    return true
  },
  enterShortOverbought(candle1hour, candle4hour, candle12hour) {
    return false
  },
  exitShortEMA50(currentTrade, candle, candle1hour, candle4hour, candle12hour) {
    if (candle.CRSI > 90 && candle1hour.CRSI > 90) {
      return false
    }

    if (candle4hour.ADX.mdi > candle4hour.ADX.pdi && candle12hour?.ADX?.mdi > candle12hour?.ADX?.pdi) {
      if (candle4hour.ADX.adx > 25 || candle12hour?.ADX?.adx > 25) {
        return false
      }
    }

    return true
  },
  exitShortEMA200(candle, currentTrade, candle1hour, candle4hour) {
    if (candle4hour.ADX.adx < 10) {
      return false
    }

    if (candle4hour.CRSI >= 80) {
      if (candle.ADX.adx > 25 && candle.ADX.pdi > candle.ADX.mdi * 2) {
        if (candle1hour.ADX.adx > 25 && candle1hour.ADX.pdi > candle1hour.ADX.mdi * 2) {
          return false
        }
      }
    }

    if (!currentTrade.ema200Cross) {
      return true
    }
    
    const minBars = 6
    if (Number(candle.timeStamp) - Number(currentTrade.ema200Cross) < (1800 * minBars)) {
      return false
    }
    return true
  },
  exitShortOversold(currentTrade, candle, candle1hour, candle4hour) {
    if (Math.round(candle.CRSI) <= 5) {

      if (candle.ADX.adx > 25 && candle.ADX.mdi > candle.ADX.pdi * 2) {
        return false
      }

      if (candle1hour.ADX.adx > 25 && candle1hour.ADX.mdi > candle1hour.ADX.pdi * 2) {
        return false
      }
      
      return true
    }

    // if (currentTrade.entryTime === '1668790800') {
    //   console.log(`${candle.timeStamp} : ${candle.CRSI}`)
    //   if (candle.timeStamp === '1669059000') {
    //     return true
    //   }
    // }

    return false
  }
}