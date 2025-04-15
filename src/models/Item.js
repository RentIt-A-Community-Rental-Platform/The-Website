import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    category: String,
    deposit: Number,
    userId: String,
    photos: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Item = mongoose.model('Item', itemSchema); 