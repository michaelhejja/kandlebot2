/*
    __ __                ____     __          __     ___ 
   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \
  / ,< / __  / __ \/ __  / / _ \/ __ \/ __ \/ __/   __/ /
 / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ 
/_/ |_\__,_/_/ /_/\__,_/_/\___/_.___/\____/\__/   /____/ 
THE SNIPER
                                                      ~ambuscade
*/

import { Event } from '../../models'
import timeFrameToSeconds from '../../utils/timeFrameToSeconds'
import formatHistory from '../../utils/formatHistory'
import formatSingleCandle from '../../utils/formatSingleCandle'
import emaDirection from '../../utils/emaDirection'
import { ADX, cRSI, EMA, MFI } from '@debut/indicators'
import TrendDivergence from '../../utils/TrendDivergence'
import trendScore from '../../utils/trendScore'

class KoinTimeline {

  constructor(symbol, API, WS, timeFrame, defaultCandleLoad = 400) {
    this.symbol = symbol
    this.API = API
    this.WS = WS
    this.timeFrame = timeFrame
    this.history = []
    this.EMA20 = new EMA(20)
    this.EMA50 = new EMA(50)
    this.EMA200 = new EMA(200)
    this.CRSI = new cRSI(4, 2, 100)
    this.ADX = new ADX()
    this.MFI = new MFI()

    console.log(`Symbol: ${this.symbol} | TimeFrame: ${this.timeFrame}`)

    this.loadHistory(timeFrame, defaultCandleLoad)
    .then((res) => {
        console.log(res.length)
        this.history = res
        this.TD = new TrendDivergence(this.history[0].close, this.history[0].MFI, 12)
        this.preloadIndicators()
    })
  }

  async loadHistory(timeFrame, numCandles) {
    try {
      console.log(`Loading History: ${this.symbol} | ${timeFrame}...`)
    
      const history = await this.API.rest.Market.Histories.getMarketCandles(this.symbol, timeFrame)
      let output = history.data
      
      if (history.data.length > 0 && numCandles > 100) {
        let endAt = Number(history.data[history.data?.length - 1][0]) || null
        const iterations = Math.floor(numCandles / 100)
        for (let i = 0; i < iterations; i++) {
          let startAt = endAt - (100 * timeFrameToSeconds[timeFrame] ?? 0)
          const history2 = await this.API.rest.Market.Histories.getMarketCandles(this.symbol, timeFrame, { startAt: startAt, endAt: endAt })
          const result = history2
          if (!result.data || result.data?.length === 0) {
            break
          } else {
            endAt = Number(result.data[result.data.length - 1][0])
            output = output.concat(result.data)
          }
        }
      }

      console.log(`History Loaded: ${this.symbol} | ${timeFrame}...`)
      return formatHistory(output)

    } catch (error) {
      console.log(`Error worth logging getHistory: ${this.symbol} | ${timeFrame} | ${error}`)
    }
  }

  async getNextTick() {
    console.log(`Next tick for ${this.symbol} | ${this.timeFrame}`)

    const lastTimeStamp = Number(this.history[0].timeStamp)
    const nextTimeStamp = lastTimeStamp + timeFrameToSeconds[this.timeFrame]
    const newKandle = await this.API.rest.Market.Histories.getMarketCandles(this.symbol, this.timeFrame)

    if (newKandle.data[0][0] == nextTimeStamp) {
      const formatted = formatSingleCandle(newKandle.data[0])
      this.history.unshift(formatted)
      this.updateIndicators()
      this.detectEvents()
      this.publishMessage('minuteMessage', `${this.history[0].timeStampFormatted} | ${this.history[0].close} | CRSI: ${this.history[0].CRSI} | MFI: ${this.history[0].MFI}`)
      
    } else {
      this.retryGetNextTick()
    }
  }

  retryGetNextTick() {
    console.log(`Candle not found. Retrying...`)
    setTimeout(() => {
      this.getNextTick()
    }, 1000)
  }

  detectEvents() {
    const currentCandle = this.history[0]
    const prevCandle = this.history[1]

    // Trend Strengths
    const lastTwelwe = this.history.slice(0, 12)
    const closes = lastTwelwe.map(obj => {
      return obj.close
    }).reverse()

    const mfis = lastTwelwe.map(obj => {
      return obj.MFI
    }).reverse()

    const priceTrendScore = trendScore(closes)
    const mfiTrendScore = trendScore(mfis)

    this.history[0].priceTrend = priceTrendScore
    this.history[0].mfiTrend = mfiTrendScore

    // Oversold / Undersold
    if (currentCandle.EMA_DIR === -2 && currentCandle.CRSI < 20 && currentCandle.MFI < 20) {
      console.log(`${currentCandle.timeStampFormatted} OVERSOLD | CRSI: ${currentCandle.CRSI} | MFI: ${currentCandle.MFI} | MFTREND: ${mfiTrendScore}`)
      this.publishMessage('minuteMessage', `OVERSOLD! | CRSI: ${currentCandle.CRSI} | MFI: ${currentCandle.MFI} | MFTREND: ${mfiTrendScore}`, 'alert')
      this.logEvent(currentCandle.timeStamp, 'OVERSOLD', `${this.symbol} OVERSOLD! ${currentCandle.timeStampFormatted} | CRSI: ${currentCandle.CRSI} | MFI: ${currentCandle.MFI} | MFTREND: ${mfiTrendScore}`)
    }
  
    if (currentCandle.EMA_DIR === 2 && currentCandle.CRSI > 80 && currentCandle.MFI > 80) {
      console.log(`${currentCandle.timeStampFormatted} OVERBOUGHT | CRSI:${currentCandle.CRSI} | MFI:${currentCandle.MFI} | MFTREND: ${mfiTrendScore}`)
      this.publishMessage('minuteMessage', `OVERBOUGHT! | CRSI:${currentCandle.CRSI} | MFI:${currentCandle.MFI} | MFTREND: ${mfiTrendScore}`, 'alert')
      this.logEvent(currentCandle.timeStamp, 'OVERBOUGHT', `${this.symbol} OVERBOUGHT! ${currentCandle.timeStampFormatted} | CRSI: ${currentCandle.CRSI} | MFI: ${currentCandle.MFI} | MFTREND: ${mfiTrendScore}`)
    }

    // Divergence
    const TD = this.TD.nextValue(this.history[0].close, this.history[0].MFI)

    if (TD.trend > 90 || TD.magnitude > 90) {
      console.log('minuteMessage', `DIVERGENCE! ${currentCandle.timeStampFormatted} | PRICE: ${priceTrendScore} | MFI: ${mfiTrendScore} | TD: ${TD.trend} | MD: ${TD.magnitude}`)
      this.publishMessage('minuteMessage', `DIVERGENCE! ${currentCandle.timeStampFormatted} | PRICE: ${priceTrendScore.toFixed(2)} | MFI: ${mfiTrendScore.toFixed(2)} | TD: ${TD.trend} | MD: ${TD.magnitude}`, 'alert')
      this.logEvent(currentCandle.timeStamp, 'DIVERGENCE', `${this.symbol} DIVERGENCE! ${currentCandle.timeStampFormatted} | PRICE TREND: ${priceTrendScore.toFixed(2)} | MFI TREND: ${mfiTrendScore.toFixed(2)} | TD: ${TD.trend} | MD: ${TD.magnitude}`)
    }

    currentCandle.TD_TREND = TD.trend
    currentCandle.TD_MAGNITUDE = TD.magnitude

    // Update stats to frontend clients
    this.publishMessage('statMessage', this.history[0])
  }

  // Run indicators on loaded candles so that we are up to date
  preloadIndicators() {

    if (this.history.length <= 0) {
      return false
    }
      
    let i = this.history.length - 1
    while(i >= 0) {
  
      const ema20 = this.EMA20.nextValue(this.history[i].close)
      const ema50 = this.EMA50.nextValue(this.history[i].close)
      const ema200 = this.EMA200.nextValue(this.history[i].close)
      if (ema20 && ema50 && ema200) {
        this.history[i].EMA_DIR = emaDirection(ema20, ema50, ema200)
        this.history[i].EMA_20 = ema20
        this.history[i].EMA_50 = ema50
        this.history[i].EMA_200 = ema200
        this.history[i].EMA_ENABLED = true
      } else {
        this.history[i].EMA_ENABLED = false
      }
  
      const crsi = this.CRSI.nextValue(this.history[i].close)
      if (crsi) {
        this.history[i].CRSI = crsi.toFixed(2)
      }
  
      const adx = this.ADX.nextValue(this.history[i].high, this.history[i].low, this.history[i].close)
      if (adx) {
        this.history[i].ADX = adx
      }

      const mfi = this.MFI.nextValue(this.history[i].high, this.history[i].low, this.history[i].close, this.history[i].volume)
      if (mfi) {
        this.history[i].MFI = mfi.toFixed(2)
      }

      const TD = this.TD.nextValue(this.history[i].close, this.history[i].MFI)
      if (TD) {
        this.history[i].TD_TREND = TD.trend
        this.history[i].TD_MAGNITUDE = TD.magnitude
      }

      i--
    }
  }

  updateIndicators() {
    if (this.history.length <= 0) {
      return false
    }
  
    const ema20 = this.EMA20.nextValue(this.history[0].close)
    const ema50 = this.EMA50.nextValue(this.history[0].close)
    const ema200 = this.EMA200.nextValue(this.history[0].close)
    if (ema20 && ema50 && ema200) {
      this.history[0].EMA_DIR = emaDirection(ema20, ema50, ema200)
      this.history[0].EMA_20 = ema20
      this.history[0].EMA_50 = ema50
      this.history[0].EMA_200 = ema200
      this.history[0].EMA_ENABLED = true
    } else {
      this.history[0].EMA_ENABLED = false
    }
  
    const crsi = this.CRSI.nextValue(this.history[0].close)
    if (crsi) {
      this.history[0].CRSI = crsi.toFixed(2)
    }
  
    const adx = this.ADX.nextValue(this.history[0].high, this.history[0].low, this.history[0].close)
    if (adx) {
      this.history[0].ADX = adx
    }

    const mfi = this.MFI.nextValue(this.history[0].high, this.history[0].low, this.history[0].close, this.history[0].volume)
    if (mfi) {
      this.history[0].MFI = mfi.toFixed(2)
    }
  }

  publishMessage(type, msg, meta = null) {
    // Websocket Update
    const clients = this.WS.getWss().clients
    const state = {
      type: type,
      message: msg,
      meta: meta
    }
    clients.forEach(function each(client) {
      client.send(JSON.stringify(state))
    })
  }

  // Log events
  logEvent(timeStamp, type, message) {
    const obj = {
      symbol: this.symbol,
      timeStamp: timeStamp,
      type: type,
      message: message
    }
    const newEvent = new Event(obj)
    newEvent.save()
  }

  // GETTERS
  get getHistory() {
    return this.history
  }

  get latestCandle() {
    return this.history[0]
  }
}

export default KoinTimeline