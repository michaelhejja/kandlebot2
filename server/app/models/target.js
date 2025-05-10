import mongoose from 'mongoose'
const { Schema, model } = mongoose

const targetSchema = new Schema({
  symbol: String,
  orderID: String,
  type: String,
  targetBuy: Number,
  targetCancel: Number,
  isRealMoney: Boolean,
  numTicks: Number
})

const Target = model('Target', targetSchema)
export default Target