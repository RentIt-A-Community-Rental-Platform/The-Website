import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    category: String,
    deposit: Number,
    userId: { type: String, required: true },
    userName: { type: String, default: 'Unknown User' },
    photos: [String],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Item = mongoose.model('Item', itemSchema); 