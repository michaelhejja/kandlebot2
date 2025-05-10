import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TestStatSchema = new Schema({
  symbol: String,
  volValue: String
}, { timestamps: true })

const TestStat = model('TestStat', TestStatSchema)
export default TestStat
