import mongoose from 'mongoose'
const { Schema, model } = mongoose

const eventSchema = new Schema({
  symbol: String,
  type: String,
  message: String,
}, { timestamps: true })

const Event = model('Event', eventSchema)
export default Event
