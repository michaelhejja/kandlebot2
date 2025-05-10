import mongoose from 'mongoose'
const { Schema, model } = mongoose

const userSchema = new Schema({
  first: {
    type: String,
    required: true
  },
  last: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  handle: {
    type: String,
    required: true
  },
}, { timestamps: true })

const User = model('User', userSchema)
export default User