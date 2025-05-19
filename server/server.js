/*
    __ __                ____     __          __     ___ 
   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \
  / ,< / __  / __ \/ __  / / _ \/ __ \/ __ \/ __/   __/ /
 / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ 
/_/ |_\__,_/_/ /_/\__,_/_/\___/_.___/\____/\__/   /____/ 
THE SNIPER
                                                      ~ambuscade
*/

import express from 'express'
import { MongoClient, ServerApiVersion } from 'mongodb'
import mongoose from 'mongoose'
import { Event } from './app/models'
import KoinProcess2 from './app/process/coin/KoinProcess2.js'
const axios = require("axios")
var cron = require('node-cron')
import cors from 'cors'
import API from 'kucoin-node-sdk'
import kuConfig from './app/config/kucoin.config.js'
import config from './app/config/kandlebot.config.js'
import formatDate from './app/utils/formatDate.js'
API.init(kuConfig)
const datafeed = new API.websocket.Datafeed()
const datafeed2 = new API.websocket.Datafeed()
datafeed.connectSocket()
datafeed2.connectSocket()

const allowedOrigins = ['http://localhost:5173', 'https://kandlebot2.netlify.app/', 'https://kandlebot.com/']

var corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'device-remember-token', 'Access-Control-Allow-Origin', 'Origin', 'Accept']
}

// Express App Plugins
const app = express()
var expressWs = require('express-ws')(app)

//middleware function is now defined that will be executed for every request to the server.
app.use(function (req, res, next) {
  console.log('middleware')
  req.testing = 'testing'
  //next middleware function in the chain is called
  return next()
})

app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded())

// Connect Mongoose Client
const uri = "mongodb+srv://mikehejja:doorSMILED81%40nimalz@kandlebot2-cluster.wcqpwuv.mongodb.net/?retryWrites=true&w=majority&appName=Kandlebot2-Cluster"
const client = new MongoClient(uri)
mongoose.set('strictQuery', false)
mongoose.connect(uri)

const KoinProcesses2 = {}

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
  }

  // Connect to MongoDB
  await client.connect()
  console.log('Connected to Mongo DB')

  try {
    const getTimestampRl = await API.rest.Others.getTimestamp()
    console.log(formatDate(getTimestampRl.data))

    const symbols = await API.rest.Market.Symbols.getSymbolsList()
    const symbolsUSDT = symbols.data.filter(obj => {
      const split = obj.symbol.split('-')
      return split[1] === 'USDT' && split[0] !== 'USDC'
    })
    console.log(`${symbolsUSDT.length} COINS FOUND`)
    
    let i = 0
    symbolsUSDT.forEach(obj => {

      if (obj.symbol === 'ETH-USDT') {
        KoinProcesses2[obj.symbol] = new KoinProcess2(i, obj.symbol, API, expressWs)
      }
    })

  } catch (error) {
    console.log(`Error worth logging in KOINPROCESS: ${error}`)
  }
}

// Five Minute CRON job
if (!config.matrixMode) {
  cron.schedule('*/1 * * * *', async () => {
  
    console.log(`/*`)
    console.log(`    __ __                ____     __          __     ___ `)
    console.log(`   / // _____ ____  ____/ / /__  / /_  ____  / /_   |__ \\`)
    console.log(`  / ,< / __  / __ \\/ __  / / _ \\/ __ \\/ __ \\/ __/   __/ /`)
    console.log(` / /| / /_/ / / / / /_/ / /  __/ /_/ / /_/ / /_    / __/ `)
    console.log(`/_/ |_\\__,_/_/ /_/\\__,_/_/\\___/_.___/\\____/\\__/   /____/ `)
    console.log(`THE SNIPER | ONE MINUTE TICK`)
    console.log(`                                                      ~ambuscade`)
    console.log(`*/`)

    const getTimestampRl = await API.rest.Others.getTimestamp()
    console.log(formatDate(getTimestampRl.data))

    try {
      for (const koin in KoinProcesses2) {
        const change = KoinProcesses2[koin].getNextTick()
      }
    } catch (error) {
      console.log(`Error worth logging: ${error}`)
    }
  })
}

/*  ROUTES  */

// simple route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to KandleBot 2: The Sniper." })
})

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

app.get('/api/history2/:coin/:timeframe', async (req, res) => {
  const coin = req.params.coin || ''
  const timeFrame = req.params.timeframe || ''
  const timelines = KoinProcesses2[coin].getTimelines
  let output = []
  if (timeFrame in timelines) {
    output = timelines[timeFrame].getHistory
  }
  res.json(output)
})

app.get('/api/events', async (req, res) => {
  let { page, pageSize } = req.query

  try {
    page = parseInt(page, 10) || 1
    pageSize = parseInt(pageSize, 10) || 50
  
    const events = await Event.aggregate([
      {
        $facet: {
          metadata: [{ $count: 'totalCount' }],
          data: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        },
      },
    ])

    res.json({
      success: true,
      events: {
        metadata: { totalCount: events[0].metadata[0].totalCount, page, pageSize },
        data: events[0].data,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false });
  }
})

// Websocket
app.ws('/', function(ws, req) {
  const greet = {
    type: 'greet',
    message: 'You are connected to Kandlebot 2. Good luck.'
  }
  ws.send(JSON.stringify(greet))

  ws.on('message', function(msg) {
    console.log(`WS MESSAGE: ${msg}`)
  })
  console.log('socket', req.testing)
})

main()

// set port, listen for requests
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
})