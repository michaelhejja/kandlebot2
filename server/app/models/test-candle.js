import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TestCandleSchema = new Schema({
  symbol: String,
  type: String,
  candle: Object
}, { timestamps: true })

const TestCandle = model('TestCandle', TestCandleSchema)
export default TestCandle
