import mongoose from 'mongoose'
const { Schema, model } = mongoose

const fiveMinuteSchema = new Schema({
  highs: {
    type: Array,
    required: true
  },
  lows: {
    type: Array,
    required: true
  }
}, { timestamps: true })

const FiveMinute = model('FiveMinute', fiveMinuteSchema)
export default FiveMinute
