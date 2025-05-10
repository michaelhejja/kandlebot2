import { CoinStrategy } from '../models'
import processStrategy from '../process'
import Market from '../process/market/market'

class WebSocket {

  constructor(datafeed) {
    this.datafeed = datafeed

    // this.MARKET_BTC = new Market('BTC', datafeed)
  }

  async init() {

    const strategies = await CoinStrategy.find({ active: true })
    .populate({ path: 'strategy', select: ['name', 'data']})
    .populate({ path: 'coin', select: 'symbol'})
    this.strategies = strategies

    const coins = [...new Set(strategies.map(item => item.coin.symbol))]

    // close callback
    this.datafeed.onClose(() => {
      console.log('ws closed, status ', this.datafeed.trustConnected)
    })

    this.datafeed.connectSocket()
    
    // Check coins in strategies against socket subscriptions
    // coins.forEach(coin => {
    //   const subscribed = this.datafeed.topicState.find(topic => topic[0] === `/market/candles:${coin}_1min`)
    //   if (!subscribed) {
    //     this.subscribe(coin)
    //   }
    // })

    // Unsubscribe from any unused subscriptions
    this.datafeed.topicState.forEach(topic => {
      const sym = topic[0].split(':')[1]
      if (!coins.includes(sym)) {
        this.unsubscribe(sym)
      }
    })

    setTimeout(() => {
      this.unsubscribe('GOVI-USDT')
    }, 3000)

    setTimeout(() => {
      this.unsubscribe('IXS-USDT')
    }, 5000)

    setTimeout(() => {
      this.unsubscribe('VAI-USDT')
    }, 7000)
  }

  subscribe(coin) {
    const topic = `/market/candles:${coin}_1min`
    const callbackId = this.datafeed.subscribe(topic, (message) => {
      if (message.topic === topic) {
        this.strategies.forEach(strat => {
          if (strat.coin.symbol === coin) {
            // console.log(`Process strategy ${strat._id} : ${strat.strategy.name} for ${coin}`)
            console.log(message.data)
            processStrategy(strat, message.data)
          }
        })
      }
    })

    console.log(`subscribe : ${topic} : ${callbackId}`)
  }

  unsubscribe(coin) {
    const topic = `/market/candles:${coin}_1min`
    this.datafeed.unsubscribe(topic)

    console.log(`unsubscribed: ${topic}`)
    console.log(this.datafeed.topicState)
  }
}

export default WebSocket