import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  googleId: {
    type: String,
    sparse: true,
    unique: true
  }
});

export const User = mongoose.model('User', userSchema);