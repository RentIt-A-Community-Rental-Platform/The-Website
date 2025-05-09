// models/ChatEntry.js
import mongoose from 'mongoose';

export const ChatEntrySchema = new mongoose.Schema({
    rentalId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Rental' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    message: { type: String, required: true },
    type: { 
        type: String, 
        required: true,
        enum: ['text', 'rental_period', 'meeting_details']
    },
    rentalPeriod: {
        startDate: { type: Date, required: function() { return this.type === 'rental_period'; } },
        endDate: { type: Date, required: function() { return this.type === 'rental_period'; } }
    },
    meetingDetails: {
        date: { type: Date, required: function() { return this.type === 'meeting_details'; } },
        time: { type: String, required: function() { return this.type === 'meeting_details'; } },
        location: { type: String, required: function() { return this.type === 'meeting_details'; } },
        notes: String
    },
    timestamp: { type: Date, default: Date.now }
}, { _id: true });

const ChatEntry = mongoose.model('ChatEntry', ChatEntrySchema);
export default ChatEntry;
