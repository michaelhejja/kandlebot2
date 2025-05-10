import generateCode from './../../utils/generateCode'

/*
 __  _   ____  ____   ___    _        ___  ____    ___   ______ 
|  |/ ] /    ||    \ |   \  | |      /  _]|    \  /   \ |      |
|  ' / |  o  ||  _  ||    \ | |     /  [_ |  o  )|     ||      |
|    \ |     ||  |  ||  D  || |___ |    _]|     ||  O  ||_|  |_|
|     ||  _  ||  |  ||     ||     ||   [_ |  O  ||     |  |  |  
|  .  ||  |  ||  |  ||     ||     ||     ||     ||     |  |  |  
|__|\_||__|__||__|__||_____||_____||_____||_____| \___/   |__|  
                                                                ~ambuscade
*/

class Account {

  constructor(config, API, datafeed, CoinProcesses) {
    this.config = config
    this.API = API
    this.datafeed = datafeed
    this.CoinProcesses = CoinProcesses
    this.USDT = null
    this.accountLoaded = false
    this.accounts = {}
    this.debtList = {}
    
    this.getAccount()
    .then(() => {
      this.watchForConnection()
    })
  }
  
  // Account Details
  async getAccount() {
    try {
      const marginAccount = await this.API.rest.Margin.MarginInfo.getMarginAccount()
      this.accounts = marginAccount.data.accounts
  
    } catch (error) {
      console.log(`Error worth logging: ${error}`)
    }
  }

  watchForConnection(success) {
    const interval = setInterval(() => { 
      if (this.datafeed.trustConnected) {
        clearInterval(interval)
        this.subscribe()
    }}, 100)
  }

  // Websocket feed
  subscribe() {
    const topic = `/account/balance`
    const callbackId = this.datafeed.subscribe(topic, (message) => {
      if (message.topic === topic) {
        // console.log(message)
        this.process(message.data)
      }
    }, true)
    console.log(`${callbackId}. Subscribed to Account Changes`)

    const topic2 = `/margin/position`
    const callbackId2 = this.datafeed.subscribe(topic2, (message) => {
      if (message.topic === topic2) {
        // console.log(message)
        this.processMarginPosition(message)
      }
    }, true)
    console.log(`${callbackId2}. Subscribed to margin Changes`)

    // const topic2 = '/spotMarket/tradeOrders'
    // const callbackId2 = this.datafeed.subscribe(topic2, (message) => {
    //   if (message.topic === topic2) {
    //     this.processOrder(message.data)
    //   }
    // }, true)
    // console.log(`${callbackId2}. Subscribed to Order Changes`)
  }

  unsubscribe() {
    const topic = `/account/balance`
    this.datafeed.unsubscribe(topic, null, true)
  }

  async process(data) {
    const account = this.accounts.find(obj => {
      return obj.currency === data.currency
    })
    account.totalBalance = data.total
    account.availableBalance = data.available
  }

  async processMarginPosition(message) {
    if (message.subject === `debt.ratio`) {
      this.debtList = message.data.debtList
    }
  }

  async processOrder(data) {
    console.log(`ORDER STATUS`)
    console.log(data)
    
    // if (data.side === 'buy') {
    //   if (data.type === 'match') {
    //     this.CoinProcesses[data.symbol].doBuyAtMatch(data.price)
    //   } else if (data.type === 'canceled') {
    //     this.CoinProcesses[data.symbol].orderCanceled()
    //   } else if (data.type === 'filled') {
    //     this.CoinProcesses[data.symbol].doBuyAtCallback(true, data.price)
    //   }
    // } else if (data.side === 'sell') {
    //   if (data.type === 'open') {
    //     this.CoinProcesses[data.symbol].doSellAtOpen(data.orderId)
    //   }
    //   else if (data.type === 'canceled') {
    //     this.CoinProcesses[data.symbol].sellOrderCanceled()
    //   } else if (data.type === 'filled') {
    //     this.CoinProcesses[data.symbol].doSellAtCallback(true, data.price)
    //   }
    // }
  }

  async instantMarginBuy(symbol, price) {
    const orderID = `${symbol}-${generateCode(24, "#aA")}`

    let theFunds = this.config.tradePriceUSDT
    if (price) {
      const tradeParams = this.CoinProcesses[symbol].getTradeParams
      const length = tradeParams.priceIncrement.split('.')[1].length
      const coin = symbol.split('-')[0]
      theFunds = Number(this.debtList[coin]) * price
      theFunds = theFunds.toFixed(length)
    }

    const baseParams = {
      clientOid: orderID,
      side: 'buy',
      symbol: symbol,
      type: 'market',
      marginMode: 'cross',
      autoBorrow: true,
      funds: String(theFunds)
    }
    const newBuy = await this.API.rest.Margin.MarginInfo.postMarginOrder(baseParams)
    if (newBuy.msg) {
      console.log(`${symbol} MARGIN BUY ORDER ERROR: ${newBuy.msg}`)
      if (newBuy.msg === 'Order funds invalid.') {
        console.log(`FUNDS: ${theFunds}`)
      }
    }
    return newBuy
  }

  async instantMarginSell(symbol, price = null) {
    const coin = symbol.split('-')[0]
    const account = this.accounts.find(obj => {
      return obj.currency === coin
    })
    const tradeParams = this.CoinProcesses[symbol].getTradeParams
    const length = tradeParams.baseIncrement.split('.')[1].length

    const balance = Number(account.availableBalance)
    let theSize = balance.toFixed(length)
    if (price) {
      const size = Math.floor(this.config.tradePriceUSDT / price)
      theSize = size.toFixed(length)
    }

    console.log(theSize)

    console.log(account.availableBalance)

    const orderID = `${symbol}-${generateCode(24, "#aA")}`
    const baseParams = {
      clientOid: orderID,
      side: 'sell',
      symbol: symbol,
      type: 'market',
      marginMode: 'cross',
      autoBorrow: true,
      size: theSize
    }
    const newSell = await this.API.rest.Margin.MarginInfo.postMarginOrder(baseParams)
    if (newSell.msg) {
      console.log(`${symbol} MARGIN SELL ORDER ERROR: ${newSell.msg}`)
    }
    return newSell
  }

  async instantBuy(symbol) {
    const orderID = `${symbol}-${generateCode(24, "#aA")}`
    const baseParams = {
      clientOid: orderID,
      side: 'buy',
      symbol: symbol,
      type: 'market',
    }
    const orderParams = {
      funds: this.config.tradePriceUSDT
    }
    const newBuy = await this.API.rest.Trade.Orders.postOrder(baseParams, orderParams)
    if (newBuy.msg) {
      console.log(`${symbol} BUY ORDER ERROR: ${newBuy.msg}`)
    }
    return newBuy
  }

  async instantLimitBuy(symbol, price) {
    const orderID = `${symbol}-${generateCode(24, "#aA")}`
    const tradeParams = this.CoinProcesses[symbol].getTradeParams
    console.log('TRADE PARAMS', tradeParams)
    const priceLength = tradeParams.priceIncrement.split('.')[1].length
    console.log('PRICE LENGTH', priceLength)
    const buyPrice = price + Number(tradeParams.priceIncrement)
    console.log('BUY PRICE', buyPrice)
    const buyPriceIncremented = buyPrice.toFixed(priceLength)
    console.log('BUY PRICE INCREMENTED', buyPrice)
    const sizeLength = tradeParams.baseIncrement.split('.')[1].length
    console.log('SIZE LENGTH', sizeLength)
    const size = this.config.tradePriceUSDT / buyPriceIncremented
    console.log('BUY SIZE', size)
    const sizeIncremented = size.toFixed(sizeLength)
    console.log('BUY SIZE', size)
    console.log(`${symbol}: price: ${buyPrice.toFixed(priceLength)}, size: ${size}`)
    const baseParams = {
      clientOid: orderID,
      side: 'buy',
      symbol: symbol,
      type: 'limit'
    }
    const orderParams = {
      price: buyPriceIncremented,
      size: sizeIncremented,
      timeInForce: 'GTT',
      cancelAfter: 300,
      hidden: false
    }
    const newBuy = await this.API.rest.Trade.Orders.postOrder(baseParams, orderParams)
    return newBuy
  }

  async cancelAndUpdateLimitSell(symbol, price, orderId) {
    const cancellation = await this.API.rest.Trade.Orders.cancelOrder(orderId)
    console.log(cancellation)

    const interval = setInterval(() => {
      const balance = Number(this.accounts[symbol])
      if (balance && balance > 0) {
        clearInterval(interval)
        this.instantLimitSell(symbol, price)
    }}, 100)
    return cancellation
  }

  async cancelAndSell(symbol, orderId) {
    const cancellation = await this.API.rest.Trade.Orders.cancelOrder(orderId)
    console.log(cancellation)

    const interval = setInterval(() => {
      const balance = Number(this.accounts[symbol])
      if (balance && balance > 0) {
        clearInterval(interval)
        this.instantSell(symbol)
    }}, 100)
    return cancellation
  }

  async instantSell(symbol) {
    const balance = Number(this.accounts[symbol])
    console.log(`INSTANT SELL: ${symbol} -> ${balance}`)

    if (balance === 0) {
      return false
    }

    try {
    const tradeParams = this.CoinProcesses[symbol].getTradeParams
    const length = tradeParams.baseIncrement.split('.')[1].length
    const orderID = `${symbol}-${generateCode(24, "#aA")}`
    const baseParams = {
      clientOid: orderID,
      side: 'sell',
      symbol: symbol,
      type: 'market'
    }
    const orderParams = {
      size: balance.toFixed(length)
    }
    const newSell = await this.API.rest.Trade.Orders.postOrder(baseParams, orderParams)
    if (newSell.msg) {
      console.log(`${symbol} SELL ORDER ERROR: ${newSell.msg}`)
    }
    return newSell

    } catch (error) {
      console.log(`Sell Error worth logging: ${error}`)
    }
  }

  async instantLimitSell(symbol, price) {
    const orderID = `${symbol}-${generateCode(24, "#aA")}`
    const balance = Number(this.accounts[symbol])
    console.log('SELL BALANCE', balance)
    const tradeParams = this.CoinProcesses[symbol].getTradeParams
    const sellPrice = price
    console.log('SELL PRICE', sellPrice)
    const sizeLength = tradeParams.baseIncrement.split('.')[1].length
    console.log('SIZE LENGTH', sizeLength)
    const size = balance
    console.log('SELL SIZE', size)
    const sizeIncremented = size.toFixed(sizeLength)
    console.log('SELL SIZE INCREMENTED', sizeIncremented)
    console.log(`${symbol}: price: ${sellPrice}, size: ${size}`)
    
    const baseParams = {
      clientOid: orderID,
      side: 'sell',
      symbol: symbol,
      type: 'limit'
    }
    const orderParams = {
      price: price,
      size: sizeIncremented,
      hidden: false
    }
    const newSell = await this.API.rest.Trade.Orders.postOrder(baseParams, orderParams)
    return newSell
  }

  // Buying 3X shorts and longs
  buyShort(symbol) {
    const shortSymbol = `${symbol.split('-')[0]}3S-USDT`

    this.instantBuy(shortSymbol)
  }

  sellShort(symbol) {
    const shortSymbol = `${symbol.split('-')[0]}3S-USDT`
    this.instantSell(shortSymbol)
  }

  buyLong(symbol) {
    const longSymbol = `${symbol.split('-')[0]}3L-USDT`
    this.instantBuy(longSymbol)
  }

  sellLong(symbol) {
    const longSymbol = `${symbol.split('-')[0]}3L-USDT`
    this.instantSell(longSymbol)
  }
  
  // Getters
  get getState() {
    const USDTaccount = this.accounts.find(obj => {
      return obj.currency === 'USDT'
    })
    let netBalance = Number(USDTaccount.availableBalance)

    const balances = this.accounts.filter(obj => {
      return obj.currency !== 'USDT' && Number(obj.availableBalance) > 0
    })

    balances.forEach(obj => {
      const price = this.CoinProcesses[`${obj.currency}-USDT`].getCurrentPrice
      netBalance += Number(obj.availableBalance) * price
    })

    for (const currency in this.debtList) {
      if (currency === 'USDT') {
        netBalance -= Number(this.debtList['USDT'])
      } else {
        const price = this.CoinProcesses[`${currency}-USDT`].getCurrentPrice
        netBalance -= Number(this.debtList[currency]) * price
      }
    }

    return {
      netBalance: netBalance,
      debtList: this.debtList,
      accounts: this.accounts
    }
  }

}

export default Account