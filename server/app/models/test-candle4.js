import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TestCandleSchema4 = new Schema({
  symbol: String,
  type: String,
  candle: Object
}, { timestamps: true })

const TestCandle4 = model('TestCandle4', TestCandleSchema4)
export default TestCandle4
