import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    rentalId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Rental', 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    reviewerId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['renter', 'owner'], 
        required: true 
    },
    rating: { 
        type: Number, 
        required: true,
        min: 0,
        max: 5,
        validate: {
            validator: Number.isFinite,
            message: 'Rating must be a number between 0 and 5'
        }
    },
    reviewText: { 
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Review = mongoose.model('Review', reviewSchema);