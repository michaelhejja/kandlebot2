import { Decimal128 } from 'mongodb'
import mongoose from 'mongoose'
const { Schema, model } = mongoose

const coinStrategySchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strategy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Strategy',
    required: true
  },
  coin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coin',
    required: true
  },
  variables: {
    type: Array,
    required: false
  },
  buy: {
    type: Decimal128,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    required: true
  }
}, { timestamps: true })

const CoinStrategy = model('CoinStrategy', coinStrategySchema)
export default CoinStrategy