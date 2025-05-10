import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TestCandleSchema3 = new Schema({
  symbol: String,
  type: String,
  candle: Object
}, { timestamps: true })

const TestCandle3 = model('TestCandle3', TestCandleSchema3)
export default TestCandle3
