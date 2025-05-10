import { Double, Timestamp } from 'mongodb'
import mongoose from 'mongoose'
const { Schema, model } = mongoose

const PsarSchema = new Schema({
  symbol: String,
  open: Double,
  close: Double,
  opentime: Timestamp,
  closetime: Timestamp
}, { timestamps: true })

const Psar = model('Psar', PsarSchema)
export default Psar
