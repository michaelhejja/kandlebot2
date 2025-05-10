import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TestCandleSchema2 = new Schema({
  symbol: String,
  type: String,
  candle: Object
}, { timestamps: true })

const TestCandle2 = model('TestCandle2', TestCandleSchema2)
export default TestCandle2
