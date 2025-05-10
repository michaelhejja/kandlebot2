/*

    __ __                ____     __          __     ___        ________            _____       _                
   / //_____ _____  ____/ / ___  / /_  ____  / /_   |__ \ _    /_  __/ /_  ___     / ___/____  (_____  ___  _____
  / ,< / __ `/ __ \/ __  / / _ \/ __ \/ __ \/ __/   __/ /(_)    / / / __ \/ _ \    \__ \/ __ \/ / __ \/ _ \/ ___/
 / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/_      / / / / / /  __/   ___/ / / / / / /_/ /  __/ /    
/_/ |_\__,_/_/ /_/\__,_/_/\___/_.___/\____/\__/   /____(_)    /_/ /_/ /_/\___/   /____/_/ /_/_/ .___/\___/_/     
                                                                                             /_/                 
                                                                ~ambuscade
*/

import express from 'express'
import { MongoClient, ServerApiVersion } from 'mongodb'
import mongoose from 'mongoose'
import { Coin, Strategy, CoinStrategy, OneMinute, FiveMinute, Event, Target, Trade } from './app/models'
import Account from './app/process/account/Account'
import CoinProcess from './app/process/coin/CoinProcess'
const axios = require("axios")
var cron = require('node-cron')
import cors from 'cors'
import API from 'kucoin-node-sdk'
import kuConfig from './app/config/kucoin.config.js'
import config from './app/config/kandlebot.config.js'
import WebSocket from './app/websocket/websocket'
API.init(kuConfig)
const datafeed = new API.websocket.Datafeed()
const datafeed2 = new API.websocket.Datafeed()
const datafeed3 = new API.websocket.Datafeed()
const datafeed4 = new API.websocket.Datafeed()
const datafeed5 = new API.websocket.Datafeed()
const datafeed6 = new API.websocket.Datafeed()
const datafeed7 = new API.websocket.Datafeed()
const datafeed8 = new API.websocket.Datafeed()
const datafeed9 = new API.websocket.Datafeed()
const datafeed10 = new API.websocket.Datafeed()
const datafeed11 = new API.websocket.Datafeed()
const datafeed12 = new API.websocket.Datafeed()
const datafeed13 = new API.websocket.Datafeed()
const accountDatafeed = new API.websocket.Datafeed(true)
const socket = new WebSocket(datafeed)
datafeed.connectSocket()
datafeed2.connectSocket()
// datafeed3.connectSocket()
// datafeed4.connectSocket()
// datafeed5.connectSocket()
// datafeed6.connectSocket()
// datafeed7.connectSocket()
// datafeed8.connectSocket()
// datafeed9.connectSocket()
// datafeed10.connectSocket()
// datafeed11.connectSocket()
// datafeed12.connectSocket()
// datafeed13.connectSocket()
// accountDatafeed.connectSocket()

var corsOptions = {
  origin: 'http://localhost:8080',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'device-remember-token', 'Access-Control-Allow-Origin', 'Origin', 'Accept']
}

// Express App Plugins
const app = express()
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded())

// Connect Mongoose Client
const uri = `mongodb+srv://ambuscade:0lBKQz9qJCLLbU1w@cluster0.vetckcw.mongodb.net/scrapeobot?retryWrites=true&w=majority`
const client = new MongoClient(uri)
mongoose.set('strictQuery', false)
mongoose.connect(uri)

let account
const CoinProcesses = {}

const main = async () => {
  if (!config.matrixMode) {
    console.log(`/*`)
    console.log(`    __ __                ____     __          __     ___ `)
    console.log(`   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \\`)
    console.log(`  / ,< / __  / __ \\/ __  / / _ \\/ __ \\/ __ \\/ __/   __/ /`)
    console.log(` / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ `)
    console.log(`/_/ |_\\__,_/_/ /_/\\__,_/_/\\___/_.___/\\____/\\__/   /____/ `)
    console.log(`THE SNIPER`)
    console.log(`                                                      ~ambuscade`)
    console.log(`*/`)
  } else {
    console.log(`/*`)
    console.log(`  ___ ___   ____  ______  ____   ____  __ __  ____    ___   ______ `)
    console.log(` |   |   | /    ||      ||    \\ |    ||  |  ||    \\  /   \\ |      |`)
    console.log(` | _   _ ||  o  ||      ||  D  ) |  | |  |  ||  o  )|     ||      |`)
    console.log(` |  \\_/  ||     ||_|  |_||    /  |  | |_   _||     ||  O  ||_|  |_|`)
    console.log(` |   |   ||  _  |  |  |  |    \\  |  | |     ||  O  ||     |  |  |  `)
    console.log(` |   |   ||  |  |  |  |  |  .  \\ |  | |  |  ||     ||     |  |  |  `)
    console.log(` |___|___||__|__|  |__|  |__|\\_||____||__|__||_____| \\___/   |__|  `)
    console.log(`/*`)
  }

  // Connect to MongoDB
  await client.connect()
  console.log('Connected to Mongo DB')
  
  // Connect to Account
  // account = new Account(config, API, accountDatafeed, CoinProcesses)

  try {
    const getTimestampRl = await API.rest.Others.getTimestamp()
    console.log(getTimestampRl.data)

    const symbols = await API.rest.Market.Symbols.getSymbolsList()
    const symbolsUSDT = symbols.data.filter(obj => {
      const split = obj.symbol.split('-')
      return split[1] === 'USDT' && split[0] !== 'USDC'
    })
    console.log(`${symbolsUSDT.length} COINS FOUND`)
    
    let i = 0
    symbolsUSDT.forEach(obj => {
      const tradeParams = {
        baseMinSize: obj.baseMinSize,
        baseIncrement: obj.baseIncrement,
        priceIncrement: obj.priceIncrement
      }
      if (i < 100) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed, tradeParams, account)
      } else if (i < 200) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed2, tradeParams, account)
      } else if (i < 300) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed3, tradeParams, account)
      } else if (i < 400) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed4, tradeParams, account)
      } else if (i < 500) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed5, tradeParams, account)
      } else if (i < 600) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed6, tradeParams, account)
      } else if (i < 700) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed7, tradeParams, account)
      } else if (i < 800) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed8, tradeParams, account)
      } else if (i < 900) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed9, tradeParams, account)
      } else if (i < 1000) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed10, tradeParams, account)
      } else if (i < 1100) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed11, tradeParams, account)
      } else if (i < 1200) {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed12, tradeParams, account)
      } else {
        CoinProcesses[obj.symbol] = new CoinProcess(i, config, obj.symbol, API, datafeed13, tradeParams, account)
      }
      i++
    })

  } catch (error) {
    console.log(`Error worth logging in COINPROCESS: ${error}`)
  }
}

// Five Minute CRON job
if (!config.matrixMode) {
  cron.schedule('*/30 * * * *', async () => {
  
    console.log(`/*`)
    console.log(`    __ __                ____     __          __     ___ `)
    console.log(`   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \\`)
    console.log(`  / ,< / __  / __ \\/ __  / / _ \\/ __ \\/ __ \\/ __/   __/ /`)
    console.log(` / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ `)
    console.log(`/_/ |_\\__,_/_/ /_/\\__,_/_/\\___/_.___/\\____/\\__/   /____/ `)
    console.log(`THE SNIPER`)
    console.log(`                                                      ~ambuscade`)
    console.log(`*/`)
  
    const outputArr = []
    try {
      for (const coin in CoinProcesses) {
        const change = CoinProcesses[coin].getNextTick()
      }
    } catch (error) {
      console.log(`Error worth logging: ${error}`)
    }
  })
}

// Running the simulation
app.post('/api/runsim', async (req, res) => {
  if (config.matrixMode) {
    try {
      const b = req.body
      console.log(b)
      const matrixData = await runMatrix(b.settings)
      res.json(matrixData)
    } catch (error) {
      console.log(`Error worth logging: ${error}`)
    }
  } else {
    res.json({ message: `You're not in the Matrix` })
  }
})

const runMatrix = async (settings) => {
  return new Promise((resolve, reject) => {
      const promises = []
      let totalcoins = 0
      let allSimEvents = []
      let allSimTargets = []
      let allSimTrades = []
      for (const coin in CoinProcesses) {
        promises.push(CoinProcesses[coin].runSim(settings))
        totalcoins ++
      }

      Promise.all(promises).then(values => {
        values.forEach(simData => {
          allSimEvents = allSimEvents.concat(simData.simEvents)
          allSimTargets = allSimTargets.concat(simData.simTargets)
          allSimTrades = allSimTrades.concat(simData.simTrades)
        })
        resolve({ numCoins: totalcoins, simEvents: allSimEvents, simTargets: allSimTargets, simTrades: allSimTrades })
      })
  })
}

// Run simulation for one coin
app.post('/api/coinsim', async (req, res) => {
  if (config.matrixMode) {
    try {
      const b = req.body
      console.log(b)
      const coin = b.symbol
      const matrixData = await CoinProcesses[coin].runSim()
      res.json(matrixData)
      // res.json({ status: true })
    } catch (error) {
      console.log(`Error worth logging: ${error}`)
    }
  } else {
    res.json({ message: `You're not in the Matrix` })
  }
})

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to scrapeobot motherfucker." })
})

// simple route
app.get("/config", (req, res) => {
  res.json(config)
})

app.get('/api/symbols', async (req, res) => {
  const symbols = await API.rest.Market.Symbols.getSymbolsList()
  const output = symbols.data.map(obj => {
    const newSym = {}
    newSym.symbol = obj.symbol
    newSym.market = obj.market
    return newSym
  })
  res.json(output)
})

app.get('/api/history/:coin', async (req, res) => {
  try {
    const coin = req.params.coin || ''
    const getTimestampRl = await API.rest.Others.getTimestamp()
    const timeStamp = getTimestampRl.data
    console.log(timeStamp)
    
    const history = await API.rest.Market.Histories.getMarketCandles(coin, '1hour')
    let endAt = Number(history.data[history.data.length - 1][0])
    
    let output = history.data
    console.log(output.length)
    
    const days = 7
    for (let i = 0; i < days; i++) {
      let startAt = endAt - (24 * 60 * 60)
      const history2 = await API.rest.Market.Histories.getMarketCandles(coin, '1hour', { startAt: startAt, endAt: endAt })
      if (!history2.data || history2.data?.length === 0) {
        break
      } else {
        endAt = Number(history2.data[history2.data.length - 1][0])
        output = output.concat(history2.data)
        console.log(output.length)
      }
    }

    res.json(output)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
  }
})

app.get('/api/history2/:coin', async (req, res) => {
  try {
    const coin = req.params.coin || ''
    const getTimestampRl = await API.rest.Others.getTimestamp()
    const timeStamp = getTimestampRl.data
    console.log(timeStamp)
    const thirtyMinutes = timeStamp - 30 * 60 * 1000
    const oneHour = timeStamp - 60 * 60 * 1000
    const oneDay = timeStamp - 24 * 60 * 60 * 1000
    const history = await API.rest.Market.Histories.getMarketCandles(coin, { oneDay, thirtyMinutes })
    console.log(history.data.length)

    res.json(history)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
  }
})

app.get('/api/ticker/:coin', async (req, res) => {
  try {
    const b = req.params.coin || ''
    const ticker = await API.rest.Market.Symbols.getTicker(b)
    res.json(ticker)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
  }
})

app.get('/api/coins', async (req, res) => {
  const symbols = await API.rest.Market.Symbols.getSymbolsList()
  const symbolsUSDT = symbols.data.filter(obj => {
    return obj.symbol.includes('USDT')
  })
  res.json(symbolsUSDT)
})

app.get('/api/strategies', async (req, res) => {
  const filter = {}
  const all = await Strategy.find(filter)
  res.json(all)
})

app.get('/api/coinstrategies', async (req, res) => {
  const filter = {}
  const all = await CoinStrategy.find(filter)
    .populate({ path: 'strategy', select: ['name', 'data']})
    .populate({ path: 'coin', select: 'symbol'})
  res.json(all)
})

app.post('/api/saveCoinStrategy', async (req, res) => {
  try {
    const b = req.body
    const obj = {
      strategy: b._id,
      user: b.user,
      coin: b.coin,
      variables: b.variables,
      buy: b.investment,
      status: 'Created',
      active: true
    }

    const newModel = new CoinStrategy(obj)
    const newStrategy = await newModel.save()
    socket.init()
    res.json(newStrategy)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.get('/api/snapshots/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const snapshots = CoinProcesses[coin].getSnapshots
  res.json(snapshots)
})

app.get('/api/histories/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const histories = CoinProcesses[coin].getHistories.slice(0, 20000)
  res.json(histories)
})

app.get('/api/histories15min/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const histories = CoinProcesses[coin].getHistories15min
  res.json(histories)
})

app.get('/api/histories1hour/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const histories = CoinProcesses[coin].getHistories1hour
  res.json(histories)
})

app.get('/api/histories4hour/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const histories = CoinProcesses[coin].getHistories4hour
  res.json(histories)
})

app.get('/api/histories12hour/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const histories = CoinProcesses[coin].getHistories12hour
  res.json(histories)
})

app.get('/api/change1min/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const change = CoinProcesses[coin].getChange('1min')
  res.json(change)
})

app.get('/api/change5min/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const change = CoinProcesses[coin].getChange('5min')
  res.json(change)
})

app.get('/api/oneMinuteData', async (req, res) => {
  const filter = {}
  const all = await OneMinute.find(filter)
  res.json(all)
})

app.get('/api/fiveMinuteData', async (req, res) => {
  const filter = {}
  const all = await FiveMinute.find(filter)
  res.json(all)
})

app.get('/api/state/:coin', async (req, res) => {
  const coin = req.params.coin || ''
  const state = CoinProcesses[coin].getState
  res.json(state)
})

app.get('/api/events', async (req, res) => {
  const filter = {}
  const all = await Event.find(filter).sort({ createdAt: -1 }).limit(200)
  res.json(all)
})

app.get('/api/trades', async (req, res) => {
  const outputArr = []
  try {
    for (const coin in CoinProcesses) {
      const trade = CoinProcesses[coin].getCurrentTrade
      if (trade) {
        outputArr.push(trade)
      }
    }
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
  res.json(outputArr)
})

app.get('/api/triples', async (req, res) => {
  const outputArr = []
  try {
    for (const coin in CoinProcesses) {
      const state = CoinProcesses[coin].getState
      if (state.is3X) {
        outputArr.push(state)
      }
    }
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
  res.json(outputArr)
})

app.get('/api/targets', async (req, res) => {
  try {
    const filter = {}
    const all = await Target.find(filter)
    res.json(all)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.get('/api/config', async (req, res) => {
  res.json(config)
})

app.get('/api/tradehistory', async (req, res) => {
  const filter = {}
  const all = await Trade.find(filter).sort({ createdAt: -1 }).limit(100)
  res.json(all)
})

app.post('/api/enterLong', async (req, res) => {
  try {
    const b = req.body
    const order = await CoinProcesses[b.symbol].enterLong(1.9379, '1686292800')
    res.json(order)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/exitLong', async (req, res) => {
  try {
    const b = req.body
    const order = await CoinProcesses[b.symbol].exitLong(1.979, '1686292803')
    res.json(order)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/enterShort', async (req, res) => {
  try {
    const b = req.body
    const order = await CoinProcesses[b.symbol].enterShort(1.9033, '1686292803')
    res.json(order)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/exitShort', async (req, res) => {
  try {
    const b = req.body
    const order = await CoinProcesses[b.symbol].exitShort(1.9001, '1686293100')
    res.json(order)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/instantBuy', async (req, res) => {
  try {
    const b = req.body
    const buy = await account.instantMarginBuy(b.symbol)
    res.json(buy)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/instantSell', async (req, res) => {
  try {
    const b = req.body
    // const sell = await CoinProcesses[b.symbol].doSellAt()
    const sell = await account.instantMarginSell(b.symbol)
    res.json(sell)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

// Account Endpoints
app.get('/api/account', async (req, res) => {
  try {
  const data = account.getState
  res.json(data)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/targettrade', async (req, res) => {
  try {
    const b = req.body
    const stopOrder = await account.targetTrade(b.symbol, b.price)
    res.json(stopOrder)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})


app.post('/api/canceltargettrade', async (req, res) => {
  try {
    const b = req.body
    const stopOrder = await CoinProcesses[b.symbol].cancelTargetTrade()
    res.json(stopOrder)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/userealmoney', async (req, res) => {
  try {
    const b = req.body
    this.config.useRealMoney = b.useRealMoney
    res.json({ useRealMoney: this.config.useRealMoney })
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

app.post('/api/updateBuyLongShort', async (req, res) => {
  try {
    const b = req.body
    console.log(b)
    config.buyLong = b.buyLong
    config.buyShort = b.buyShort
    res.json(b)
  } catch (error) {
    console.log(`Error worth logging: ${error}`)
    res.json(error)
  }
})

main()

// set port, listen for requests
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
})