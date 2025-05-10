import mongoose from 'mongoose'
const { Schema, model } = mongoose

const oneMinuteSchema = new Schema({
  coins: {
    type: Array,
    required: true
  }
}, { timestamps: true })

const OneMinute = model('OneMinute', oneMinuteSchema)
export default OneMinute
