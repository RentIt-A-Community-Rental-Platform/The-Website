// models/ChatEntry.js
import mongoose from 'mongoose';

export const ChatEntrySchema = new mongoose.Schema({
  sender:    String,
  type:      String,
  timestamp: { type: Date, default: Date.now },
  rentalPeriod: {
    startDate: Date,
    endDate:   Date
  },
  meetingDetails: {
    location: String,
    date:     String,
    time:     String,
    notes:    String
  },
  message: String
}, { _id: false });
