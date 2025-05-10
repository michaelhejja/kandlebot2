import mongoose from 'mongoose'
const { Schema, model } = mongoose

const coinSchema = new Schema({
  symbol: String,
  name: String,
  name: String,
  baseCurrency: String,
  quoteCurrency: String,
  feeCurrency: String,
  market: String,
  baseMinSize: String,
  quoteMinSize: String,
  baseMaxSize: String,
  quoteMaxSize: String,
  baseIncrement: String,
  quoteIncrement: String,
  priceIncrement: String,
  priceLimitRate: String,
  minFunds: String,
  isMarginEnabled: Boolean,
  enableTrading: Boolean
})

const Coin = model('Coin', coinSchema)
export default Coin