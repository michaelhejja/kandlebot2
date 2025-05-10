import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TradeSchema = new Schema({
  symbol: String,
  type: String, // long or short
  isActive: Boolean,
  isRealMoney: Boolean,
  isReverse: Boolean,
  entry: Number,
  exit: Number,
  entryTime: String,
  exitTime: String,
  stopLoss: Number,
  currentPrice: Number,
  tradeHigh: Number,
  tradeLow: Number,
  percent: String
}, { timestamps: true })

const Trade = model('Trade', TradeSchema)
export default Trade