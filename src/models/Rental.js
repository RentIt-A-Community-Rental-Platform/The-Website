// models/Rental.js
import mongoose from 'mongoose';
import { ChatEntrySchema } from './ChatEntry.js';

const rentalSchema = new mongoose.Schema({
  itemId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  renterId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['cash','card','paypal'], required: true },
  meetingDetails: {
    date:     { type: String, required: true },
    time:     { type: String, required: true },
    location: { type: String, required: true },
    notes:    String
  },
  rentalPeriod: {
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true }
  },
  status:     { type: String, enum: ['pending','accepted','rejected','completed','modified','ongoing'], default: 'pending' },
  totalPrice: { type: Number, required: true },
  createdAt:  { type: Date, default: Date.now },
  chatHistory: [ ChatEntrySchema ],
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Add review status fields
  ownerReviewed: { type: Boolean, default: false },
  renterReviewed: { type: Boolean, default: false }
});

export const Rental = mongoose.model('Rental', rentalSchema);
