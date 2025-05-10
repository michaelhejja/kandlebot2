import mongoose from 'mongoose'
const { Schema, model } = mongoose

const strategySchema = new Schema({
  name: String,
  variables: Array,
  data: Object
})

const Strategy = model('Strategy', strategySchema)
export default Strategy