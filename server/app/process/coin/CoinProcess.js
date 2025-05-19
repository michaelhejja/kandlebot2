import { Event, Target, Trade, TestCandle, TestCandle2, TestCandle3, TestCandle4, TestStat, Psar } from '../../models'
import tripleXers from './../../config/tripleXers'
import snipeCRSI from './../../config/SnipeCRSI'
import percentChange from './../../utils/percentChange'
import toIncrement from './../../utils/toIncrement'
import formatDate from './../../utils/formatDate'
import emaDirection from './../../utils/emaDirection'
import getAverage from './../../utils/getAverage'
import sendSMS from './../../utils/sendSMS'
import { ADX, cRSI, EMA, Pivot, PSAR, SuperTrend } from '@debut/indicators'
import coinz from './../../coinz'

/*
    __ __                ____     __          __     ___ 
   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \
  / ,< / __  / __ \/ __  / / _ \/ __ \/ __ \/ __/   __/ /
 / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ 
/_/ |_\__,_/_/ /_/\__,_/_/\___/_.___/\____/\__/   /____/ 
THE SNIPER
                                                      ~ambuscade
*/

class CoinProcess {

  constructor(ID, config, symbol, API, datafeed, tradeParams, account) {

    if (symbol === 'BTC-USDT') {
      // sendSMS(`Hello from Kandlebot. I'll tell you when to buy or sell ${symbol} over the Holidays. No news is no news!`)
    }

    // 24 Hour Trading bot
    // Based on 5min trading patterns
    this.ID = ID
    this.config = config
    this.symbol = symbol
    this.API = API
    this.datafeed = datafeed
    this.tradeParams = tradeParams
    this.account = account
    this.state = 'watching' // watching, targetbuy, buying, intrade, selling
    this.shortState = 'watching' // watching, targetbuy, buying, intrade, selling
    this.snapshots = []
    this.histories1min = []
    this.histories = []
    this.histories15min = []
    this.histories1hour = []
    this.histories4hour = []
    this.histories12hour = []
    this.historyIsLoaded = false
    this.statsLoaded = false
    this.canBuy = false
    this.minVolume = 1000000
    this.currentPrice = null

    // Matrix Vars
    this.simIndex = 0
    this.simEvents = []
    this.simTargets = []
    this.simTrades = []

    // Indicators
    this.SuperTrend = new SuperTrend(10, 3, 'EMA')
    this.SuperTrend_1HOUR = new SuperTrend(10, 3, 'EMA')
    this.SuperTrend_4HOUR = new SuperTrend(10, 3, 'EMA')
    this.SuperTrend_12HOUR = new SuperTrend(10, 3, 'EMA')
    this.EMA20 = new EMA(20)
    this.EMA20_1HOUR = new EMA(20)
    this.EMA20_4HOUR = new EMA(20)
    this.EMA20_12HOUR = new EMA(20)
    this.EMA50 = new EMA(50)
    this.EMA50_1HOUR = new EMA(50)
    this.EMA50_4HOUR = new EMA(50)
    this.EMA50_12HOUR = new EMA(50)
    this.EMA200 = new EMA(200)
    this.EMA200_1HOUR = new EMA(200)
    this.EMA200_4HOUR = new EMA(200)
    this.EMA200_12HOUR = new EMA(200)
    this.PSAR = new PSAR()
    this.PSAR_1HOUR = new PSAR()
    this.PSAR_4HOUR = new PSAR()
    this.PSAR_12HOUR = new PSAR()
    this.CRSI = new cRSI(4, 2, 100)
    this.CRSI_1HOUR = new cRSI(4, 2, 100)
    this.CRSI_4HOUR = new cRSI(4, 2, 100)
    this.CRSI_12HOUR = new cRSI(4, 2, 100)
    this.ADX = new ADX()
    this.ADX_1HOUR = new ADX()
    this.ADX_4HOUR = new ADX()
    this.ADX_12HOUR = new ADX()
    this.PIVOTS = new Pivot()
    this.numPSARTouches = 0
    this.is3X = tripleXers.includes(this.symbol)
    
    if (this.is3X) {
      this.calculatePivots()
    }

    // New Trend VARIABLES (3 levels of trend)
    // 1. PSAR, 2. SuperTrend, 3. EMA (Fan of 20/50/200)
    this.PSAR_DIR = null
    this.SUPERTREND_DIR = null
    this.EMA_DIR = null
    this.PREV_EMA_DIR = null
      
    // TRADING VARIABLES
    this.fibFactor = 0.382
    this.currentTrade = null
    this.currentShortTrade = null
    this.current1HourCandle = null
    this.current4HourCandle = null
    this.current12HourCandle = null
    this.PIVOT_POINTS = null

    // Import coinz logic
    if (tripleXers.includes(this.symbol)) {
      this.coin = coinz[this.symbol]
      this.stopLoss = this.coin?.stopLoss || this.config.stopLoss
    }

    if (!config.matrixMode && (tripleXers.includes(this.symbol) || snipeCRSI.includes(this.symbol))) {
      this.subscribe()
    }
    
    if (!config.matrixMode) {
      if (tripleXers.includes(this.symbol) || snipeCRSI.includes(this.symbol)) {
      setTimeout(() => {
        this.getStats()
        .then(() => {
          this.getHistory()
          this.getActiveTrade()
        })
      }, ID * 30)
      }
    } else {
      if (tripleXers.includes(this.symbol) || snipeCRSI.includes(this.symbol)) {
        setTimeout(() => {
          this.getSimulationStats()
          .then(() => {
            this.getSimulationHistory()
          })
        }, ID * 10)
      }
    }
  }

  async getStats() {
    try {
      const coin = this.symbol
      const stats = await this.API.rest.Market.Symbols.get24hrStats(this.symbol)
      console.log(`Stats loaded: ${this.symbol} : ${this.ID}`)
      this.statsLoaded = true
      this.twentyFourVolume = stats.data.volValue
      if (this.twentyFourVolume >= this.minVolume) {
        this.canBuy = true
      } else {
        this.canBuy = false
      }
      
      // Save stats for testing
      //const stat = {
      //  symbol: this.symbol,
      //  volValue: stats.data.volValue
      //}
      //const newStat = new TestStat(stat)
      //newStat.save()

    } catch (error) {
      console.log(`Error worth logging getStats: ${this.symbol} : ${error}`)
      this.retryStats()
    }
  }

  async getSimulationStats() {
    try {
      const stats = await TestStat.find({ symbol: this.symbol })
      this.statsLoaded = true
      this.twentyFourVolume = stats[0].volValue
      if (this.twentyFourVolume >= this.minVolume) {
        this.canBuy = true
      }
    } catch (error) {
      console.log(`Error worth logging getSimulationStats: ${this.symbol} : ${error}`)
    }
  }

  retryStats() {
    console.log(`Retrying stats: ${this.symbol}...`)
    setTimeout(() => {
      this.getStats()
    }, this.ID * 3)
  }

  subscribe() {
    const topic = `/market/candles:${this.symbol}_30min`
    const callbackId = this.datafeed.subscribe(topic, (message) => {
      if (message.topic === topic) {
        this.process(message.data)
      }
    })
    console.log(`${callbackId}. Subscribed to 30 min candle: ${this.symbol}`)
    
    if (tripleXers.includes(this.symbol)) {
      const topic_1hour = `/market/candles:${this.symbol}_1hour`
      const callbackId_1hour = this.datafeed.subscribe(topic_1hour, (message) => {
        if (message.topic === topic_1hour) {
          this.process1hour(message.data)
        }
      })
      console.log(`${callbackId_1hour}. Subscribed to 1Hour candle: ${this.symbol}`)

      const topic_4hour = `/market/candles:${this.symbol}_4hour`
      const callbackId_4hour = this.datafeed.subscribe(topic_4hour, (message) => {
        if (message.topic === topic_4hour) {
          this.process4hour(message.data)
        }
      })
      console.log(`${callbackId_4hour}. Subscribed to 4Hour candle: ${this.symbol}`)

      const topic_12hour = `/market/candles:${this.symbol}_12hour`
      const callbackId_12hour = this.datafeed.subscribe(topic_12hour, (message) => {
        if (message.topic === topic_12hour) {
          this.process12hour(message.data)
        }
      })
      console.log(`${callbackId_12hour}. Subscribed to 12Hour candle: ${this.symbol}`)
    }
  }

  async process1hour(data) {
    const obj = this.formatSingleCandle(data.candles)
    const trend = this.SuperTrend_1HOUR.momentValue(obj.high, obj.low, obj.close)
    const psar = this.PSAR_1HOUR.momentValue(obj.high, obj.low)
    const ema20 = this.EMA20_1HOUR.momentValue(obj.close)
    const ema50 = this.EMA50_1HOUR.momentValue(obj.close)
    const ema200 = this.EMA200_1HOUR.momentValue(obj.close)
    const crsi = this.CRSI_1HOUR.momentValue(obj.close)
    const adx = this.ADX_1HOUR.momentValue(obj.high, obj.low, obj.close)

    if (ema20 && ema50 && ema200) {
      obj.EMA_20 = ema20
      obj.EMA_50 = ema50
      obj.EMA_200 = ema200
      obj.EMA_ENABLED = true
    } else {
      obj.EMA_ENABLED = false
    }

    if (psar) {
      obj.PSAR = psar
      obj.PSAR_DIR = obj.close > obj.PSAR ? 1 : -1
    }

    if (trend) {
      obj.SUPERTREND_DIR = 0 - trend.direction
    }

    if (crsi) {
      obj.CRSI = crsi
    }

    if (adx) {
      obj.ADX = adx
    }

    this.current1HourCandle = obj
  }

  async process4hour(data) {
    const obj = this.formatSingleCandle(data.candles)
    const trend = this.SuperTrend_4HOUR.momentValue(obj.high, obj.low, obj.close)
    const psar = this.PSAR_4HOUR.momentValue(obj.high, obj.low)
    const ema20 = this.EMA20_4HOUR.momentValue(obj.close)
    const ema50 = this.EMA50_4HOUR.momentValue(obj.close)
    const ema200 = this.EMA200_4HOUR.momentValue(obj.close)
    const crsi = this.CRSI_4HOUR.momentValue(obj.close)
    const adx = this.ADX_4HOUR.momentValue(obj.high, obj.low, obj.close)

    if (ema20 && ema50 && ema200) {
      obj.EMA_20 = ema20
      obj.EMA_50 = ema50
      obj.EMA_200 = ema200
      obj.EMA_ENABLED = true
    } else {
      obj.EMA_ENABLED = false
    }

    if (psar) {
      obj.PSAR = psar
      obj.PSAR_DIR = obj.close > obj.PSAR ? 1 : -1
    }

    if (trend) {
      obj.SUPERTREND_DIR = 0 - trend.direction
    }

    if (crsi) {
      obj.CRSI = crsi
    }

    if (adx) {
      obj.ADX = adx
    }

    this.current4HourCandle = obj
  }

  async process12hour(data) {
    const obj = this.formatSingleCandle(data.candles)
    const trend = this.SuperTrend_12HOUR.momentValue(obj.high, obj.low, obj.close)
    const psar = this.PSAR_12HOUR.momentValue(obj.high, obj.low)
    const ema20 = this.EMA20_12HOUR.momentValue(obj.close)
    const ema50 = this.EMA50_12HOUR.momentValue(obj.close)
    const ema200 = this.EMA200_12HOUR.momentValue(obj.close)
    const crsi = this.CRSI_12HOUR.momentValue(obj.close)
    const adx = this.ADX_12HOUR.momentValue(obj.high, obj.low, obj.close)

    if (ema20 && ema50 && ema200) {
      obj.EMA_20 = ema20
      obj.EMA_50 = ema50
      obj.EMA_200 = ema200
      obj.EMA_ENABLED = true
    } else {
      obj.EMA_ENABLED = false
    }

    if (psar) {
      obj.PSAR = psar
      obj.PSAR_DIR = obj.close > obj.PSAR ? 1 : -1
    }

    if (trend) {
      obj.SUPERTREND_DIR = 0 - trend.direction
    }

    if (crsi) {
      obj.CRSI = crsi
    }

    if (adx) {
      obj.ADX = adx
    }

    this.current12HourCandle = obj
  }

  unsubscribe() {
    const topic = `/market/candles:${this.symbol}_30min`
    this.datafeed.unsubscribe(topic)
  }

  async process(data) {

    if (this.historyIsLoaded && this.canBuy && (tripleXers.includes(this.symbol) || snipeCRSI.includes(this.symbol))) {
      const obj = this.formatSingleCandle(data.candles)
      this.currentPrice = obj.close

      if (this.currentTrade) {
        if (this.currentTrade.type === 'long') {
          this.currentTrade.percent = percentChange(this.currentTrade.entry, this.currentPrice)
        } else {
          this.currentTrade.percent = percentChange(this.currentPrice, this.currentTrade.entry)
        }
      }
  
      this.snapshots.unshift(obj)
      if (this.snapshots.length > 2000) {
        this.snapshots.pop()
      }

      const psar = this.PSAR.momentValue(obj.high, obj.low)
      obj.PSAR = psar
      const ema20 = this.EMA20.momentValue(obj.close)
      obj.EMA_20 = ema20
      const ema50 = this.EMA50.momentValue(obj.close)
      obj.EMA_50 = ema50
      const ema200 = this.EMA200.momentValue(obj.close)
      obj.EMA_200 = ema200
      const crsi = this.CRSI.momentValue(obj.close)
      obj.CRSI = crsi
      const adx = this.ADX.momentValue(obj.high, obj.low, obj.close)
      obj.ADX = adx
      const trend = this.SuperTrend.momentValue(obj.high, obj.low, obj.close)
      obj.SUPERTREND_DIR = 0 - trend.direction

      this.currentCandle = obj

      const prevEmaDir = emaDirection(this.histories[0].EMA_20, this.histories[0].EMA_50, this.histories[0].EMA_200)
      const emaDir = emaDirection(ema20, ema50, ema200)
      const averageADX = getAverage([adx.adx || 0, this.current1HourCandle?.ADX?.adx || 0, this.current4HourCandle?.ADX?.adx || 0, this.current12HourCandle?.ADX?.adx || 0])

      /** LONGS **/
      if (this.state !== 'intrade') {
        
        if (this.coin.buyLong) {
        
          // Ignore if all timeframes are in a positive SUPERTREND phase
          if (this.current1HourCandle.SUPERTREND_DIR === -1 && this.current4HourCandle.SUPERTREND_DIR === -1 && this.current12HourCandle.SUPERTREND_DIR === -1) {
            console.log('FULL DOWNWARD SUPERTREND')
            return
          }

          // Find a low crossing of the ema20 above the ema50
          if (prevEmaDir === -2) {
                      
            // Enter on an EMA20 rising above an EMA50
            if (emaDir > -2) {
                        
              if (this.coin.enterLongEMA(obj, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle, averageADX)) {
                this.enterLong(obj.close, obj.timeStamp, obj)
              }
            }
          }

          if (prevEmaDir === -1) {
            if (emaDir > -1) {
              
              // Only on strong uptrends
              if (this.current12HourCandle.SUPERTREND_DIR === 1 && this.current12HourCandle.ADX.adx > 25 && this.current4HourCandle.SUPERTREND_DIR === 1) {
                if (this.coin.enterLongEMA(obj, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle, averageADX)) {
                  this.enterLong(obj.close, obj.timeStamp, obj)
                }
              }
            }
          }
        }
      } else {
      
        // Update trade high
        if (obj.close > this.currentTrade.tradeHigh) {
          this.currentTrade.tradeHigh = obj.close
        }
      
        // Exit when stop loss is hit
        if (obj.close <= this.currentTrade.stopLoss) {
          this.exitLong(obj.close, obj.timeStamp, obj, true)
        }
      
        // Track crossing of the EMA200
        if (prevEmaDir < 2 && emaDir === 2) {
          this.currentTrade.fullEMACross = true
        }
      
        if (this.currentTrade.fullEMACross) {
          if (prevEmaDir > -2 && emaDir === -2) {
            this.currentTrade.isHighRisk = true
          }
        }
      
        if (prevEmaDir < 0 && emaDir > 0) {
          this.currentTrade.ema200Cross = obj.timeStamp
        }
                  
        if (this.currentTrade.isHighRisk && crsi > 95) {
          if (this.coin.volatility < 5) {
            this.exitLong(obj.close, obj.timeStamp, obj)
          }
        }
      
        // Stay in if all timeframes are in a positive PSAR phase
        if (this.current1HourCandle.PSAR_DIR === 1 && this.current4HourCandle.PSAR_DIR === 1 && this.current12HourCandle.PSAR_DIR === 1) {
          console.log('FULL PSAR')
          return
        }
      
        // Stay in if all timeframes are in a positive SUPERTREND phase
        if (this.current1HourCandle.SUPERTREND_DIR === 1 && this.current4HourCandle.SUPERTREND_DIR === 1 && this.current12HourCandle.SUPERTREND_DIR === 1) {
          console.log('FULL SUPERTREND')
          return
        }

        console.log('PREV: ', prevEmaDir)
        console.log('CURRENT: ', emaDir)
        console.log('-------------')
                  
        if (prevEmaDir === 2) {
          if (emaDir < 2) {
            console.log('EMA 20 Below EMA 50')
            if (this.coin.exitLongEMA50(this.currentTrade, obj, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle)) {
              this.exitLong(obj.close, obj.timeStamp, obj)
            }
          }
        } else if (prevEmaDir === 1) {
          if (emaDir < 1) {
            if (this.coin.exitLongEMA200(obj, this.currentTrade, this.current1HourCandle, this.current4HourCandle)) {
              this.exitLong(obj.close, obj.timeStamp, obj)
            }
          }
        }
      }
    }
  }

  runSim() {
    console.log('RUNSIM')
    this.currentTrade = null
    this.simIndex = 0
    this.simEvents = []
    this.simTargets = []
    this.simTrades = []
    this.state = 'watching'
    this.ADX = new ADX()
    this.ADX_1HOUR = new ADX()
    this.ADX_4HOUR = new ADX()

    return new Promise((resolve, reject) => {
      let i = this.histories.length - 1
      while(i >= 0) {
        this.getNextTick()
        i--
      }
      
      setTimeout(() => {
        resolve ({
          simEvents: this.simEvents,
          simTargets: this.simTargets,
          simTrades: this.simTrades
        })
      }, 3000)
    })
  }

  async getNextTick() {
    let candle
    let prevCandle

    if (!tripleXers.includes(this.symbol) && !snipeCRSI.includes(this.symbol)) {
      return null
    }

    if (!this.historyIsLoaded || !this.statsLoaded) {
      return null
    }

    if (!this.config.matrixMode && this.snapshots.length === 0) {
      this.histories.unshift(this.formatSingleCandle([]))
      return null
    }

    try {
      if (!this.config.matrixMode) {
        
        // Find the latest occurence of the most recent timestamp
        // That becomes the new 30min candle in history
        const lastHistory = {...this.histories[0]}
        const lastTimeStamp = Number(lastHistory.timeStamp)
        const nextHistoricalTimeStamp = lastTimeStamp + 1800
        const currentTimeStamp = nextHistoricalTimeStamp + 1800
        const nextCandle = this.snapshots.find(obj => {
          return Number(obj.timeStamp) === nextHistoricalTimeStamp
        })
        let lastSnapshot
        if (nextCandle) {
          lastSnapshot = {...nextCandle}
        } else {
          console.log(`No Last Snapshot Candle Found: ${nextHistoricalTimeStamp}`)
          console.log(`${nextHistoricalTimeStamp}`)

          await this.getHistory()
          // const history = await this.API.rest.Market.Histories.getMarketCandles(this.symbol, '5min')
          // let output = history.data
          // console.log(output)
          // const theCandle = output.find(candle => {
          //   return candle[0] === String(nextTimeStamp)
          // })
          // console.log(theCandle)
          // lastSnapshot = {...this.formatSingleCandle(theCandle)}
        }// 
        this.histories.unshift(lastSnapshot)

        // Look at the individual candles
        const hist = this.histories
        candle = hist[0]
        prevCandle = hist[1]

        const prevEmaDir = emaDirection(prevCandle.EMA_20, prevCandle.EMA_50, prevCandle.EMA_200)
        // const emaDir = emaDirection(candle.EMA_20, candle.EMA_50, candle.EMA_200)

        // Update Indicators
        const ema20 = this.EMA20.nextValue(candle.close)
        const ema50 = this.EMA50.nextValue(candle.close)
        const ema200 = this.EMA200.nextValue(candle.close)
        
        if (ema20 && ema50 && ema200) {
          candle.EMA_20 = ema20
          candle.EMA_50 = ema50
          candle.EMA_200 = ema200
          candle.EMA_ENABLED = true
        } else {
          candle.EMA_ENABLED = false
        }

        const trend = this.SuperTrend.nextValue(candle.high, candle.low, candle.close)
        if (trend) {
          candle.SUPERTREND_DIR = 0 - trend.direction
        }

        const psar = this.PSAR.nextValue(candle.high, candle.low, candle.close)
        if (psar) {
          candle.PSAR = psar
        }

        const crsi = this.CRSI.nextValue(candle.close)
        if (crsi) {
          candle.CRSI = crsi
        }

        const adx = this.ADX.nextValue(candle.high, candle.low, candle.close)
        if (adx) {
          candle.ADX = adx
        }

        if (tripleXers.includes(this.symbol)) {
        
          // Save the 1 hour candle to history
          if (currentTimeStamp % 3600 === 0) {
            
            console.log(`SAVING NEW HOUR CANDLE AT ${formatDate(currentTimeStamp)}`)
  
            const copy = JSON.parse(JSON.stringify(this.current1HourCandle))
            copy.EMA_20 = this.EMA20_1HOUR.nextValue(copy.close)
            copy.EMA_50 = this.EMA50_1HOUR.nextValue(copy.close)
            copy.EMA_200 = this.EMA200_1HOUR.nextValue(copy.close)
  
            const trend = this.SuperTrend_1HOUR.nextValue(copy.high, copy.low, copy.close)
            copy.SUPERTREND_DIR = 0 - trend.direction
            copy.PSAR = this.PSAR_1HOUR.nextValue(candle.high, candle.low, candle.close)
            copy.PSAR_DIR = copy.close > copy.PSAR ? 1 : -1
            copy.CRSI = this.CRSI_1HOUR.nextValue(candle.close)
            copy.ADX = this.ADX_1HOUR.nextValue(candle.high, candle.low, candle.close)
            this.histories1hour.unshift(copy)
          }
  
          // Save the 4 hour candle to history
          if (currentTimeStamp % 14400 === 0) {
            
            console.log(`SAVING NEW 4 HOUR CANDLE AT ${formatDate(currentTimeStamp)}`)
  
            const copy = JSON.parse(JSON.stringify(this.current4HourCandle))
            copy.EMA_20 = this.EMA20_4HOUR.nextValue(copy.close)
            copy.EMA_50 = this.EMA50_4HOUR.nextValue(copy.close)
            copy.EMA_200 = this.EMA200_4HOUR.nextValue(copy.close)
  
            const trend = this.SuperTrend_4HOUR.nextValue(copy.high, copy.low, copy.close)
            copy.SUPERTREND_DIR = 0 - trend.direction
            copy.PSAR = this.PSAR_4HOUR.nextValue(candle.high, candle.low, candle.close)
            copy.PSAR_DIR = copy.close > copy.PSAR ? 1 : -1
            copy.CRSI = this.CRSI_4HOUR.nextValue(candle.close)
            copy.ADX = this.ADX_4HOUR.nextValue(candle.high, candle.low, candle.close)
            this.histories4hour.unshift(copy)
          }
  
          // Save the 12 hour candle to history
          if (currentTimeStamp % 43200 === 0) {
            
            console.log(`SAVING NEW 12 HOUR CANDLE AT ${formatDate(currentTimeStamp)}`)
  
            const copy = JSON.parse(JSON.stringify(this.current12HourCandle))
            copy.EMA_20 = this.EMA20_12HOUR.nextValue(copy.close)
            copy.EMA_50 = this.EMA50_12HOUR.nextValue(copy.close)
            copy.EMA_200 = this.EMA200_12HOUR.nextValue(copy.close)
  
            const trend = this.SuperTrend_12HOUR.nextValue(copy.high, copy.low, copy.close)
            copy.SUPERTREND_DIR = 0 - trend.direction
            copy.PSAR = this.PSAR_12HOUR.nextValue(candle.high, candle.low, candle.close)
            copy.PSAR_DIR = copy.close > copy.PSAR ? 1 : -1
            copy.CRSI = this.CRSI_12HOUR.nextValue(candle.close)
            copy.ADX = this.ADX_12HOUR.nextValue(candle.high, candle.low, candle.close)
            this.histories12hour.unshift(copy)

            this.calculatePivots()
          }
        }

        // CRSI SNIPE
        if (snipeCRSI.includes(this.symbol)) {
          if (crsi >= 90) {
            sendSMS(`${this.symbol} is overbought at ${crsi}. Price: ${candle.close}`)
          }

          if (crsi <= 10) {
            sendSMS(`${this.symbol} is oversold at ${crsi}. Price: ${candle.close}`)
          }
        }

        // CRSI ENTRY / EXITS are on the 30min

        if (this.state !== 'intrade') {
          if (this.coin.buyLong && prevEmaDir === -2) {
            if (crsi <= 10) {
        
              if (this.coin.enterLongOversold(candle, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle)) {
                this.logEvent(candle.timeStamp, 'CRSI Oversold', 'EMA 20 low and CRSI oversold')
                this.enterLong(candle.close, candle.timeStamp, candle)
              }
            }
          }
        } else {
          if (candle.CRSI >= 90) {
            if (this.coin.exitLongOverBought(this.currentTrade, candle, this.current1HourCandle, this.current4HourCandle)) {
              this.exitLong(candle.close, candle.timeStamp, candle)
            }
          }
        }

      } else {
        ////// MATRIX MODE ////////
        const candleIndex = this.histories.length - 1 - this.simIndex
        candle = this.histories[candleIndex]
        const prevCandleIndex = this.simIndex === 0 ? this.histories.length - 1 : this.histories.length - this.simIndex
        prevCandle = this.histories[prevCandleIndex]

        const adx = this.ADX.nextValue(candle.high, candle.low, candle.close)
        candle.ADX = adx

        if (candle.timeStamp % 3600 === 0) {
          const hourCandle = this.histories1hour.find(obj => {
            return Number(obj.timeStamp) === Number(candle.timeStamp)
          })
          if (hourCandle) {
            this.current1HourCandle = hourCandle
            const adx1hour = this.ADX_1HOUR.nextValue(this.current1HourCandle.high, this.current1HourCandle.low, this.current1HourCandle.close)
            this.current1HourCandle.ADX = adx1hour          
          }
        }

        if (candle.timeStamp % 14400 === 0) {
          const fourHourCandle = this.histories4hour.find(obj => {
            return Number(obj.timeStamp) === Number(candle.timeStamp)
          })
          if (fourHourCandle) {
            this.current4HourCandle = fourHourCandle
            const adx4hour = this.ADX_4HOUR.nextValue(this.current4HourCandle.high, this.current4HourCandle.low, this.current4HourCandle.close)
            this.current4HourCandle.ADX = adx4hour
          }
        }

        if (candle.timeStamp % 43200 === 0) {
          const twelveHourCandle = this.histories12hour.find(obj => {
            return Number(obj.timeStamp) === Number(candle.timeStamp)
          })
          if (twelveHourCandle) {
            this.current12HourCandle = twelveHourCandle
            const adx12hour = this.ADX_12HOUR.nextValue(this.current12HourCandle.high, this.current12HourCandle.low, this.current12HourCandle.close)
            this.current12HourCandle.ADX = adx12hour
          }
        }

        const averageADX = getAverage([candle?.ADX?.adx || 0, this.current1HourCandle?.ADX?.adx || 0, this.current4HourCandle?.ADX?.adx || 0, this.current12HourCandle?.ADX?.adx || 0])
        candle.averageADX = averageADX
        
        const prevEmaDir = emaDirection(prevCandle.EMA_20, prevCandle.EMA_50, prevCandle.EMA_200)
        const emaDir = emaDirection(candle.EMA_20, candle.EMA_50, candle.EMA_200)


        /** LONGS **/
        if (this.state !== 'intrade') {
          if (this.coin.buyLong) {
            // Make sure enough time has passed to calculate all EMAs
            if (candle.EMA_ENABLED) {
    
              // Find a low crossing of the ema20 above the ema50
              if (prevEmaDir === -2) {
                
                // Enter on an EMA20 rising above an EMA50
                if (emaDir > -2) {
                  
                  if (this.coin.enterLongEMA(candle, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle, averageADX)) {
                    this.logEvent(candle.timeStamp, 'Enter on EMA', 'EMA 20 low and CRSI oversold')
                    this.enterLong(candle.close, candle.timeStamp, candle)
                    if (this.shortState === 'intrade') {
                      this.exitShort(candle.close, candle.timeStamp, candle)
                    }
                  }
                }
  
                // Enter on a CRSI falling below 10
                if (candle.CRSI <= 10) {
  
                  if (this.coin.enterLongOversold(this.current1HourCandle, this.current4HourCandle, this.current12HourCandle)) {
                    this.logEvent(candle.timeStamp, 'CRSI Oversold', 'EMA 20 low and CRSI oversold')
                    this.enterLong(candle.close, candle.timeStamp, candle)

                    if (this.shortState === 'intrade') {
                      this.exitShort(candle.close, candle.timeStamp, candle)
                    }
                  }
                }
              }
            }
          }
        } else {

          // Update trade high
          if (candle.close > this.currentTrade.tradeHigh) {
            this.currentTrade.tradeHigh = candle.close
          }

          // Exit when stop loss is hit
          if (candle.close <= this.currentTrade.stopLoss) {
            this.exitLong(candle.close, candle.timeStamp, candle)
          }

          // Track crossing of the EMA200
          if (prevEmaDir < 2 && emaDir === 2) {
            this.currentTrade.fullEMACross = true
          }

          if (this.currentTrade.fullEMACross) {
            if (prevEmaDir > -2 && emaDir === -2) {
              this.currentTrade.isHighRisk = true
            }
          }

          if (prevEmaDir < 0 && emaDir > 0) {
            this.currentTrade.ema200Cross = candle.timeStamp
          }
            
          if (this.currentTrade.isHighRisk && candle.CRSI > 95) {
            if (this.coin.volatility < 5) {
              this.exitLong(candle.close, candle.timeStamp, candle)

              if (this.shortState !== 'intrade' && this.coin.buyShort) {
                this.enterShort(candle.close, candle.timeStamp, candle)
              }
            }
          }

          // Stay in if all timeframes are in a positive PSAR phase
          if (candle.PSAR_DIR === 1 && this.current1HourCandle.PSAR_DIR === 1 && this.current4HourCandle.PSAR_DIR === 1 && this.current12HourCandle.PSAR_DIR === 1) {
            this.simIndex++
            return
          }

          // Stay in if all timeframes are in a positive SUPERTREND phase
          if (candle.SUPERTREND_DIR === 1 && this.current1HourCandle.SUPERTREND_DIR === 1 && this.current4HourCandle.SUPERTREND_DIR === 1 && this.current12HourCandle.SUPERTREND_DIR === 1) {
            this.simIndex++
            return
          }
            
          if (prevEmaDir === 2) {
            if (emaDir < 2) {
              if (this.coin.exitLongEMA50(this.currentTrade, candle, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle)) {
                this.exitLong(candle.close, candle.timeStamp, candle)

                if (this.shortState !== 'intrade' && this.coin.buyShort) {
                  this.enterShort(candle.close, candle.timeStamp, candle)
                }
              }
            }
          } else if (prevEmaDir === 1) {
            if (emaDir < 1) {

              if (this.coin.exitLongEMA200(candle, this.currentTrade, this.current1HourCandle, this.current4HourCandle)) {
                this.exitLong(candle.close, candle.timeStamp, candle)

                if (this.shortState !== 'intrade' && this.coin.buyShort) {
                  this.enterShort(candle.close, candle.timeStamp, candle)
                }
              }
            }
          }

          if (candle.CRSI >= 90) {
            if (this.coin.exitLongOverBought(this.currentTrade, candle, this.current1HourCandle, this.current4HourCandle)) {
              this.exitLong(candle.close, candle.timeStamp, candle)

              if (this.shortState !== 'intrade' && this.coin.buyShort) {
                this.enterShort(candle.close, candle.timeStamp, candle)
              }
            }
          }
        }

        /** SHORTS **/
        if (this.shortState !== 'intrade') {
          
          if (this.coin.buyShort) {
            // Make sure enough time has passed to calculate all EMAs
            if (candle.EMA_ENABLED) {
    
              // Find a high crossing of the ema20 below the ema50
              if (prevEmaDir === 2) {
                if (emaDir < 2) {
                  
                  if (this.coin.enterShortEMA(candle, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle, averageADX)) {
                    // this.enterShort(candle.close, candle.timeStamp, candle)
                  }
                }
  
                // Enter on a CRSI rising above 90
                if (candle.CRSI >= 90) {
  
                  if (this.coin.enterShortOverbought(this.current1HourCandle, this.current4HourCandle, this.current12HourCandle)) {
                    // this.enterShort(candle.close, candle.timeStamp, candle)
                  }
                }
              }
            }
          }
        } else {
          // Update trade low
          if (candle.close < this.currentShortTrade.tradeLow) {
            this.currentShortTrade.tradeLow = candle.low
          }
          
          // Exit when stop loss is hit
          if (candle.close >= this.currentShortTrade.stopLoss) {
            this.exitShort(candle.close, candle.timeStamp, candle)
          }

          if (prevEmaDir > 0 && emaDir < 0) {
            this.currentShortTrade.ema200Cross = candle.timeStamp
          }

          if (prevEmaDir === -2) {
            if (emaDir > -2) {
              if (this.coin.exitShortEMA50(this.currentShortTrade, candle, this.current1HourCandle, this.current4HourCandle, this.current12HourCandle)) {
                // this.exitShort(candle.close, candle.timeStamp, candle)
              }
            }
          } else if (prevEmaDir === -1) {
            if (emaDir > -1) {

              if (this.coin.exitShortEMA200(candle, this.currentShortTrade, this.current1HourCandle, this.current4HourCandle)) {
                // this.exitShort(candle.close, candle.timeStamp, candle)
              }
            }
          }

          if (candle.CRSI <= 10) {
            if (this.coin.exitShortOversold(this.currentShortTrade, candle, this.current1HourCandle, this.current4HourCandle)) {
              // this.exitShort(candle.close, candle.timeStamp, candle)
            }
          }
        }

        this.simIndex++
      }
      
      return { currentPrice: 0, priceChange: 0, volumeChange: 0, pricePercentChange: 0, volumePercentChange: 0 }
    } catch (error) {
      console.log(`Error worth logging getNextTick: ${this.symbol} : ${error}`)
    }
  }

  // TRADE LOGIC

  async enterLong(price, timeStamp, candle = null, isReverse = false) {
    this.state === 'buying'
    console.log(`${this.symbol}: ENTER LONG - ${timeStamp}`)
    
    if (!this.config.matrixMode) {
      sendSMS(`${this.symbol} : It's time to enter long at ${price}. Trust me bro.`)
    }

    if (this.config.useRealMoney) {
      const order = await this.account.instantMarginBuy(this.symbol)
      console.log(order)
      if (order.msg) {
        console.log(`${this.symbol} ENTER LONG BUY ORDER ERROR: ${order.msg}`)
        
        if (order.msg === 'Balance insufficient!') {
          this.retryEnterLong(price, timeStamp, candle)
        }
        return false
      } else {
        this.openTrade('long', price, timeStamp, candle, isReverse)
      }
      
      return order
    } else {
      this.openTrade('long', price, timeStamp, candle, isReverse)
    }
  }

  retryEnterLong(price, timeStamp, candle) {
    console.log('Retrying Enter Long')
    
    setTimeout(() => {
      this.enterLong(price, timeStamp, candle)
    }, 2000)
  }

  async exitLong(price, timeStamp, candle = null, isStopLoss = false) {
    this.state = 'selling'
    console.log(`${this.symbol}: EXIT LONG`)
    
    if (!this.config.matrixMode) {
      // if (!isStopLoss) {
        sendSMS(`${this.symbol} : Exit that long position at ${price}. Take profits. Wait for the next one.`)
      // } else {
        // sendSMS(`${this.symbol} : It's not going well. Get out at ${price}. I'll let you know when to enter again.`)
      // }
    }

    if (this.currentTrade) {
      this.closeTrade('long', price, timeStamp, candle)
    }

    if (this.config.useRealMoney) {
      const order = await this.account.instantMarginSell(this.symbol, price)
      console.log(order)
      console.log(`${timeStamp}`)
      if (order.msg) {
        console.log(`${this.symbol} EXIT LONG SELL ORDER ERROR: ${order.msg}`)

        if (order.msg === 'Balance insufficient!') {
          this.retryExitLong(price, timeStamp)
        }
        return false
      }
      
      return order
    }
  }

  retryExitLong(price, timeStamp) {
    console.log('Retrying Exit Long...')
    
    setTimeout(() => {
      this.exitLong(price, timeStamp)
    }, 2000)
  }

  async enterShort(price, timeStamp, isReverse = false) {
    this.shortState = 'selling'
    console.log(`${this.symbol}: ENTER SHORT`)
    console.log(`${timeStamp}`)

    if (this.config.useRealMoney) {
      const order = await this.account.instantMarginSell(this.symbol, price)
      console.log(order)
      if (order.msg) {
        console.log(`${this.symbol} ENTER SHORT SELL ORDER ERROR: ${order.msg}`)
        if (order.msg === 'Balance insufficient!') {
          this.retryEnterShort(price, timeStamp)
        }
        return false
      }
      this.openTrade('short', price, timeStamp, isReverse)
      return order
    } else {
      this.openTrade('short', price, timeStamp, isReverse)
    }
  }

  retryEnterShort(price, timeStamp) {
    console.log('Retrying Enter Short...')
    
    setTimeout(() => {
      this.enterShort(price, timeStamp)
    }, 2000)
  }

  async exitShort(price, timeStamp, candle) {
    this.shortState = 'buying'
    console.log(`${this.symbol}: EXIT SHORT`)
    console.log(`${timeStamp}`)

    if (this.currentShortTrade) {
      this.closeTrade('short', price, timeStamp, candle)
    }

    if (this.config.useRealMoney) {
      const order = await this.account.instantMarginBuy(this.symbol, price)
      console.log(order)
      if (order.msg) {
        console.log(`${this.symbol} EXIT SHORT BUY ORDER ERROR: ${order.msg}`)
        if (order.msg === 'Balance insufficient!') {
          this.retryExitShort(price, timeStamp, candle)
        }
        return false
      }
      return order
    }
  }

  retryExitShort(price, timeStamp) {
    console.log('Retrying Exit Short...')
    
    setTimeout(() => {
      this.exitShort(price, timeStamp)
    }, 2000)
  }

  async openTrade(type, price, timeStamp, candle = null, isReverse = false) {
    if (type === 'long' && this.state === 'intrade') {
      return
    }

    if (type === 'short' && this.shortState === 'intrade') {
      return
    }

    try {

      let stopLoss = toIncrement(price - (price * this.stopLoss), this.tradeParams.priceIncrement)
      if (type === 'short') {
        stopLoss = toIncrement(price + (price * this.stopLoss), this.tradeParams.priceIncrement)
      }

      const trade = {
        symbol: this.symbol,
        type: type,
        isActive: true,
        isRealMoney: this.config.useRealMoney,
        isReverse: isReverse,
        entry: price,
        exit: null,
        entryTime: timeStamp,
        exitTime: null,
        stopLoss: stopLoss,
        currentPrice: price,
        tradeHigh: price,
        tradeLow: price,
        fullEMACross: false,
        isHighRisk: false,
        ema200Cross: '',
        entryCandle: candle,
        entry1HourCandle: this.current1HourCandle,
        entry4HourCandle: this.current4HourCandle,
        entry12HourCandle: this.current12HourCandle
      }

      if (type === 'long') {
        this.currentTrade = trade
        this.state = 'intrade'
      } else {
        this.currentShortTrade = trade
        this.shortState = 'intrade'
      }

      if (this.config.matrixMode) {
        this.simTrades.push(type === 'long' ? this.currentTrade : this.currentShortTrade)
      } else {
        const newTrade = new Trade(type === 'long' ? this.currentTrade : this.currentShortTrade)
        newTrade.save()
      }
    } catch (error) {
      console.log(`Error worth logging openTrade: ${this.symbol} : ${error}`)
    }
  }

  async closeTrade(type, price, timeStamp, candle = null) {
    try {
      if (type === 'long') {
        this.currentTrade.isActive = false
        this.currentTrade.exit = price
        this.currentTrade.exitTime = timeStamp
        this.currentTrade.exitCandle = candle
        this.currentTrade.exit1HourCandle = this.current1HourCandle
        this.currentTrade.exit4HourCandle = this.current4HourCandle
        this.currentTrade.exit12HourCandle = this.current12HourCandle
        
        const filter = {
          symbol: this.symbol,
          isActive: true
        }
        const res = await Trade.updateOne(filter, this.currentTrade)

        this.currentTrade = null
        this.state = 'watching'
        
      } else {
        this.currentShortTrade.isActive = false
        this.currentShortTrade.exit = price
        this.currentShortTrade.exitTime = timeStamp
        this.currentShortTrade.exitCandle = candle
        this.currentShortTrade.exit1HourCandle = this.current1HourCandle
        this.currentShortTrade.exit4HourCandle = this.current4HourCandle
        this.currentShortTrade.exit12HourCandle = this.current12HourCandle
        
        const filter = {
          symbol: this.symbol,
          isActive: true
        }
        const res = await Trade.updateOne(filter, this.currentTrade)

        this.currentShortTrade = null
        this.shortState = 'watching'
      }

    } catch (error) {
      console.log(`Error worth logging closeTrade: ${this.symbol} : ${error}`)
    }
  }


  // Load historical 30 minute candles
  async getHistory() {
    try {
      // console.log(`Loading History: ${this.symbol}...`)
      const coin = this.symbol

      // 1 minute history
      const history1min = await this.API.rest.Market.Histories.getMarketCandles(coin, '1min')
      let output1min = history1min.data
      // console.log(output1min)

      if (history1min.data.length > 0) {
        let endAt = Number(history1min.data[history1min.data?.length - 1][0]) || null
        const hours = 24
        for (let i = 0; i < hours; i++) {
          let startAt = endAt - (60 * 60)
          const history2 = await this.API.rest.Market.Histories.getMarketCandles(coin, '1min', { startAt: startAt, endAt: endAt })
          const result = history2
          if (!result.data || result.data?.length === 0) {
            break
          } else {
            endAt = Number(result.data[result.data.length - 1][0])
            output1min = output1min.concat(result.data)
          }
        }
      }
      this.histories1min = this.formatHistory(output1min)
      // this.histories.shift()
      
      // 30 Minute history
      const history = await this.API.rest.Market.Histories.getMarketCandles(coin, '30min')
      let output = history.data

      if (history.data.length > 0) {
        let endAt = Number(history.data[history.data?.length - 1][0]) || null
        const days = 4
        for (let i = 0; i < days; i++) {
          let startAt = endAt - (24 * 60 * 60)
          const history2 = await this.API.rest.Market.Histories.getMarketCandles(coin, '30min', { startAt: startAt, endAt: endAt })
          const result = history2
          if (!result.data || result.data?.length === 0) {
            break
          } else {
            endAt = Number(result.data[result.data.length - 1][0])
            output = output.concat(result.data)
          }
        }
      }
      this.histories = this.formatHistory(output)
      this.histories.shift()

      if (tripleXers.includes(this.symbol)) {

        // 1 Hour history
        const history1hour = await this.API.rest.Market.Histories.getMarketCandles(coin, '1hour')
        let output1hour = history1hour.data
  
        if (history1hour.data.length > 0) {
          let endAt = Number(history1hour.data[history1hour.data?.length - 1][0]) || null
          const days = 10
          for (let i = 0; i < days; i++) {
            let startAt = endAt - (24 * 60 * 60)
            const history2 = await this.API.rest.Market.Histories.getMarketCandles(coin, '1hour', { startAt: startAt, endAt: endAt })
            const result = history2
            if (!result.data || result.data?.length === 0) {
              break
            } else {
              endAt = Number(result.data[result.data.length - 1][0])
              output1hour = output1hour.concat(result.data)
            }
          }
        }
        this.histories1hour = this.formatHistory(output1hour)
        this.histories1hour.shift()
  
        // 4 Hour history
        const history4hour = await this.API.rest.Market.Histories.getMarketCandles(coin, '4hour')
        let output4hour = history4hour.data
  
        if (history4hour.data.length > 0) {
          let endAt = Number(history4hour.data[history4hour.data?.length - 1][0]) || null
          const days = 10
          for (let i = 0; i < days; i++) {
            let startAt = endAt - (5 * 24 * 60 * 60)
            const history2 = await this.API.rest.Market.Histories.getMarketCandles(coin, '4hour', { startAt: startAt, endAt: endAt })
            const result = history2
            if (!result.data || result.data?.length === 0) {
              break
            } else {
              endAt = Number(result.data[result.data.length - 1][0])
              output4hour = output4hour.concat(result.data)
            }
          }
        }
        this.histories4hour = this.formatHistory(output4hour)
        this.histories4hour.shift()
  
        // 12 Hour history
        const history12hour = await this.API.rest.Market.Histories.getMarketCandles(coin, '12hour')
        let output12hour = history12hour.data
  
        if (history12hour.data.length > 0) {
          let endAt = Number(history12hour.data[history12hour.data?.length - 1][0]) || null
          const days = 4
          for (let i = 0; i < days; i++) {
            let startAt = endAt - (24 * 24 * 60 * 60)
            const history2 = await this.API.rest.Market.Histories.getMarketCandles(coin, '12hour', { startAt: startAt, endAt: endAt })
            const result = history2
            if (!result.data || result.data?.length === 0) {
              break
            } else {
              endAt = Number(result.data[result.data.length - 1][0])
              output12hour = output12hour.concat(result.data)
            }
          }
        }
        this.histories12hour = this.formatHistory(output12hour)
        this.histories12hour.shift()
      }

      this.historyIsLoaded = true
      // console.log(`History loaded: ${this.symbol}`)
      
      // Save history for testing
      // const mapped = this.histories.map(obj => {
      //   const testCandle = {
      //     symbol: this.symbol,
      //     type: '30min',
      //     candle: obj
      //   }
      //   return testCandle
      // })
      // TestCandle.insertMany(mapped, (err, docs) => {
      //   console.log(`${this.symbol} Test Candles Saved`)
      // })

      this.preloadIndicators()
    } catch (error) {
      console.log(`Error worth logging getHistory: ${this.symbol} : ${error}`)
      this.retryHistory()
    }
  }

  async getSimulationHistory() {
    console.log(`${this.symbol}: LOADING SIM HISTORY...`)

    // 30 minute history
    const all = await TestCandle.find({ symbol: this.symbol })
    if (all.length === 0) {
      console.log(`${this.symbol}: NO SIM HISTORY`)
      this.canBuy = false
      return false
    }
    const sorted = all.sort((a, b) => {
      if (Number(a.candle.timeStamp) > Number(b.candle.timeStamp)) {
        return -1
      }
      if (Number(b.candle.timeStamp) > Number(a.candle.timeStamp)) {
        return 1
      }
      return 0
    })
    .map(obj => {
      return obj.candle
    })

    if (this.symbol === 'RNDR-USDT') {
      const unique = sorted.filter(function(_, i) {
        return i % 2 === 0
      })
      this.histories = unique
    } else {
      this.histories = sorted
    }
    
    // 1 Hour history
    const all1hour = await TestCandle2.find({ symbol: this.symbol })
    if (all1hour.length === 0) {
      console.log(`${this.symbol}: NO SIM HISTORY`)
      this.canBuy = false
      return false
    }
    const sorted1hour = all1hour.sort((a, b) => {
      if (Number(a.candle.timeStamp) > Number(b.candle.timeStamp)) {
        return -1
      }
      if (Number(b.candle.timeStamp) > Number(a.candle.timeStamp)) {
        return 1
      }
      return 0
    })
    .map(obj => {
      return obj.candle
    })
    this.histories1hour = sorted1hour

    // 4 Hour history
    const all4hour = await TestCandle3.find({ symbol: this.symbol })
    if (all4hour.length === 0) {
      console.log(`${this.symbol}: NO SIM HISTORY`)
      this.canBuy = false
      return false
    }
    const sorted4hour = all4hour.sort((a, b) => {
      if (Number(a.candle.timeStamp) > Number(b.candle.timeStamp)) {
        return -1
      }
      if (Number(b.candle.timeStamp) > Number(a.candle.timeStamp)) {
        return 1
      }
      return 0
    })
    .map(obj => {
      return obj.candle
    })
    this.histories4hour = sorted4hour

    // 12 Hour history
    const all12hour = await TestCandle4.find({ symbol: this.symbol })
    if (all12hour.length === 0) {
      console.log(`${this.symbol}: NO SIM 12Hour HISTORY`)
      this.canBuy = false
      return false
    }
    const sorted12hour = all12hour.sort((a, b) => {
      if (Number(a.candle.timeStamp) > Number(b.candle.timeStamp)) {
        return -1
      }
      if (Number(b.candle.timeStamp) > Number(a.candle.timeStamp)) {
        return 1
      }
      return 0
    })
    .map(obj => {
      return obj.candle
    })
    this.histories12hour = sorted12hour
    this.historyIsLoaded = true

    console.log(`Matrix History loaded: ${this.symbol}`)
  }

  retryHistory() {
    console.log(`Retrying: ${this.symbol}...`)
    setTimeout(() => {
      this.getHistory()
    }, this.ID * 3)
  }

  async getActiveTrade() {
    const trade = await Trade.find({ symbol: this.symbol, isActive: true })
    if (trade.length > 0) {
      this.currentTrade = trade[0]
      this.state = 'intrade'
    }
  }

  formatSingleCandle(arr) {
    if (arr.length === 7 ) {
      const output = {
        timeStamp: arr[0],
        timeStampFormatted: formatDate(arr[0] * 1000),
        open: Number(arr[1]),
        close: Number(arr[2]),
        high: Number(arr[3]),
        low: Number(arr[4]),
        volume: Number(arr[5]),
        type: null
      }
      output.color = output.close < output.open ? 'red' : 'green'
      return output
    } else {
      const blank = {
        timeStamp: null,
        timeStampFormatted: null,
        open: null,
        close: null,
        high: null,
        low: null,
        volume: null,
        color: null
      }
      return blank
    }
  }

  formatHistory(array) {
    return array.map(obj => { 
      const candle = this.formatSingleCandle(obj)
      return candle
    })
  }

  doBuyAtMatch(price) {
    if (this.currentTrade) {
      this.currentTrade.match = true
      this.currentTrade.buy.price = price
    }
  }

  // Log events
  logEvent(timeStamp, type, message) {
    const obj = {
      symbol: this.symbol,
      timeStamp: timeStamp,
      type: type,
      message: message
    }

    if (!this.config.matrixMode) {
      const newEvent = new Event(obj)
      newEvent.save()
    } else {
      this.simEvents.push(obj)
    }
  }

  // Helper functions
  preloadIndicators() {

    // Loop through 30 minute candle history and set indicators
    if (this.histories.length <= 0) {
      return false
    }
    
    let i = this.histories.length - 1
    while(i >= 0) {
      const trend = this.SuperTrend.nextValue(this.histories[i].high, this.histories[i].low, this.histories[i].close)

      const ema20 = this.EMA20.nextValue(this.histories[i].close)
      const ema50 = this.EMA50.nextValue(this.histories[i].close)
      const ema200 = this.EMA200.nextValue(this.histories[i].close)
      if (ema20 && ema50 && ema200) {
        // this.histories[i].EMA_DIR = emaDirection(ema20, ema50, ema200)
        this.histories[i].EMA_20 = ema20
        this.histories[i].EMA_50 = ema50
        this.histories[i].EMA_200 = ema200
        this.histories[i].EMA_ENABLED = true
      } else {
        this.histories[i].EMA_ENABLED = false
      }

      if (trend) {
        this.histories[i].SUPERTREND_DIR = 0 - trend.direction
        if (i === 0) {
          this.SUPERTREND_DIR = 0 - trend.direction
        }
      }

      const crsi = this.CRSI.nextValue(this.histories[i].close)
      if (crsi) {
        this.histories[i].CRSI = crsi
      }

      const adx = this.ADX.nextValue(this.histories[i].high, this.histories[i].low, this.histories[i].close)
      if (adx) {
        this.histories[i].ADX = adx
      }

      const psar = this.PSAR.nextValue(this.histories[i].high, this.histories[i].low, this.histories[i].close)
      if (psar) {
        this.histories[i].PSAR = psar
        this.histories[i].PSAR_DIR = this.histories[i].close > this.histories[i].PSAR ? 1 : -1

        if (i === 0) {
          if (this.histories[0].close > this.histories[0].PSAR) {
            this.PSAR_DIR = 1
          } else {
            this.PSAR_DIR = -1
          }
          this.EMA_DIR = emaDirection(ema20, ema50, ema200)
          this.PREV_EMA_DIR = emaDirection(ema20, ema50, ema200)
        }
      }
      i--
    }

    // Loop through 1 Hour candle history and set indicators
    if (this.histories1hour.length <= 0) {
      return false
    }
    
    i = this.histories1hour.length - 1
    while(i >= 0) {
      const trend = this.SuperTrend_1HOUR.nextValue(this.histories1hour[i].high, this.histories1hour[i].low, this.histories1hour[i].close)

      const ema20 = this.EMA20_1HOUR.nextValue(this.histories1hour[i].close)
      const ema50 = this.EMA50_1HOUR.nextValue(this.histories1hour[i].close)
      const ema200 = this.EMA200_1HOUR.nextValue(this.histories1hour[i].close)
      if (ema20 && ema50 && ema200) {
        this.histories1hour[i].EMA_20 = ema20
        this.histories1hour[i].EMA_50 = ema50
        this.histories1hour[i].EMA_200 = ema200
        this.histories1hour[i].EMA_ENABLED = true
      } else {
        this.histories1hour[i].EMA_ENABLED = false
      }

      if (trend) {
        this.histories1hour[i].SUPERTREND_DIR = 0 - trend.direction
      }

      const crsi = this.CRSI_1HOUR.nextValue(this.histories1hour[i].close)
      if (crsi) {
        this.histories1hour[i].CRSI = crsi
      }

      const adx = this.ADX_1HOUR.nextValue(this.histories1hour[i].high, this.histories1hour[i].low, this.histories1hour[i].close)
      if (adx) {
        this.histories1hour[i].ADX = adx
      }

      const psar = this.PSAR_1HOUR.nextValue(this.histories1hour[i].high, this.histories1hour[i].low, this.histories1hour[i].close)
      if (psar) {
        this.histories1hour[i].PSAR = psar
        this.histories1hour[i].PSAR_DIR = this.histories1hour[i].close > this.histories1hour[i].PSAR ? 1 : -1
      }
      i--
    }

    // Loop through 4 Hour candle history and set indicators
    if (this.histories4hour.length <= 0) {
      return false
    }
    
    i = this.histories4hour.length - 1
    while(i >= 0) {
      const trend = this.SuperTrend_4HOUR.nextValue(this.histories4hour[i].high, this.histories4hour[i].low, this.histories4hour[i].close)

      const ema20 = this.EMA20_4HOUR.nextValue(this.histories4hour[i].close)
      const ema50 = this.EMA50_4HOUR.nextValue(this.histories4hour[i].close)
      const ema200 = this.EMA200_4HOUR.nextValue(this.histories4hour[i].close)
      if (ema20 && ema50 && ema200) {
        this.histories4hour[i].EMA_20 = ema20
        this.histories4hour[i].EMA_50 = ema50
        this.histories4hour[i].EMA_200 = ema200
        this.histories4hour[i].EMA_ENABLED = true
      } else {
        this.histories4hour[i].EMA_ENABLED = false
      }

      if (trend) {
        this.histories4hour[i].SUPERTREND_DIR = 0 - trend.direction
      }

      const crsi = this.CRSI_4HOUR.nextValue(this.histories4hour[i].close)
      if (crsi) {
        this.histories4hour[i].CRSI = crsi
      }

      const adx = this.ADX_4HOUR.nextValue(this.histories4hour[i].high, this.histories4hour[i].low, this.histories4hour[i].close)
      if (adx) {
        this.histories4hour[i].ADX = adx
      }

      const psar = this.PSAR_4HOUR.nextValue(this.histories4hour[i].high, this.histories4hour[i].low, this.histories4hour[i].close)
      if (psar) {
        this.histories4hour[i].PSAR = psar
        this.histories4hour[i].PSAR_DIR = this.histories4hour[i].close > this.histories4hour[i].PSAR ? 1 : -1
      }
      i--
    }

    // Loop through 12 Hour candle history and set indicators
    if (this.histories12hour.length <= 0) {
      return false
    }
    
    i = this.histories12hour.length - 1
    while(i >= 0) {
      const trend = this.SuperTrend_12HOUR.nextValue(this.histories12hour[i].high, this.histories12hour[i].low, this.histories12hour[i].close)
    
      const ema20 = this.EMA20_12HOUR.nextValue(this.histories12hour[i].close)
      const ema50 = this.EMA50_12HOUR.nextValue(this.histories12hour[i].close)
      const ema200 = this.EMA200_12HOUR.nextValue(this.histories12hour[i].close)
      if (ema20 && ema50 && ema200) {
        this.histories12hour[i].EMA_20 = ema20
        this.histories12hour[i].EMA_50 = ema50
        this.histories12hour[i].EMA_200 = ema200
        this.histories12hour[i].EMA_ENABLED = true
      } else {
        this.histories12hour[i].EMA_ENABLED = false
      }
    
      if (trend) {
        this.histories12hour[i].SUPERTREND_DIR = 0 - trend.direction
      }
    
      const crsi = this.CRSI_12HOUR.nextValue(this.histories12hour[i].close)
      if (crsi) {
        this.histories12hour[i].CRSI = crsi
      }
    
      const adx = this.ADX_12HOUR.nextValue(this.histories12hour[i].high, this.histories12hour[i].low, this.histories12hour[i].close)
      if (adx) {
        this.histories12hour[i].ADX = adx
      }
    
      const psar = this.PSAR_12HOUR.nextValue(this.histories12hour[i].high, this.histories12hour[i].low, this.histories12hour[i].close)
      if (psar) {
        this.histories12hour[i].PSAR = psar
        this.histories12hour[i].PSAR_DIR = this.histories12hour[i].close > this.histories12hour[i].PSAR ? 1 : -1
      }
      i--
    }
  }

  // Calculate weekly Pivot Points
  async calculatePivots() {
    try {
      const history = await this.API.rest.Market.Histories.getMarketCandles(this.symbol, '1day')
      const lastMonday = history.data.findIndex(obj => {
        return new Date(obj[0] * 1000).getDay() === 1
      })
      const candles = history.data.slice(lastMonday, lastMonday + 7)
      console.log(candles.length)
      const formattedCandles = this.formatHistory(candles)
      // candles.shift()
      const highs = formattedCandles.map(obj => obj.high)
      const high = Math.max(...highs)
      const lows = formattedCandles.map(obj => obj.low)
      const low = Math.min(...lows)
      const close = formattedCandles[0].close

      console.log('week', {high: high, low: low, close: close})

      const pivot = this.PIVOTS.nextValue(high, low, close)
      this.PIVOT_POINTS = pivot
      
      /*
      let i = candles.length - 1
      while(i >= 0) {
        const obj = this.formatSingleCandle(candles[i])
        const pivot = this.PIVOTS.nextValue(obj.high, obj.low, obj.close)
  
        if (i === 0) {
          this.PIVOT_POINTS = pivot
        }
        i--
      }
      */
      
    } catch (error) {
      console.log(`Error Calculating Pivots: ${this.symbol} : ${error}`)
      this.retryStats()
    }
  }

  // GETTERS
  get getSnapshots() {
    return this.snapshots
  }

  get getHistories1min() {
    return this.histories1min
  }

  get getHistories() {
    return this.histories
  }

  get getHistories15min() {
    return this.histories15min
  }

  get getHistories1hour() {
    return this.histories1hour
  }

  get getHistories4hour() {
    return this.histories4hour
  }

  get getHistories12hour() {
    return this.histories12hour
  }

  get getTradeParams() {
    return this.tradeParams
  }

  get getCurrentPrice() {
    return this.currentPrice
  }

  get getState() {
    return {
      ID: this.ID,
      symbol: this.symbol,
      is3X: this.is3X,
      isLong: this.isLong,
      state: this.state,
      canBuy: this.canBuy,
      tradeParams: this.tradeParams,
      retracement: this.retracement,
      currentTrade: this.currentTrade,
      currentShortTrade: this.currentShortTrade,
      historyIsLoaded: this.historyIsLoaded,
      statsLoaded: this.statsLoaded,
      SUPERTREND_DIR: this.currentCandle?.SUPERTREND_DIR || null,
      PSAR_DIR: this.currentCandle?.PSAR_DIR || null,
      EMA_DIR: this.currentCandle?.EMA_DIR || null,
      PIVOT_POINTS: this.PIVOT_POINTS,
      currentPrice: this.currentPrice,
      currentCandle: this.currentCandle,
      current1HourCandle: this.current1HourCandle,
      current4HourCandle: this.current4HourCandle,
      current12HourCandle: this.current12HourCandle
    }
  }

  get getCurrentTrade() {
    return this.currentTrade
  }
}
  
export default CoinProcess
