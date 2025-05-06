import { expect } from 'chai';
import mongoose from 'mongoose';
import { ChatEntrySchema } from '../../src/models/ChatEntry.js';

// Create a test model that uses the ChatEntrySchema
const TestChat = mongoose.model('TestChat', new mongoose.Schema({
  chatEntries: [ChatEntrySchema]
}));

describe('ChatEntry Schema Tests', function() {
  this.timeout(10000); // Increase timeout
  it('should create a new chat entry with valid data', async () => {
    const testChat = new TestChat();
    
    const chatEntryData = {
      sender: '507f1f77bcf86cd799439011', // Example ObjectId as string
      type: 'text',
      message: 'This is a test message'
    };

    testChat.chatEntries.push(chatEntryData);
    const savedChat = await testChat.save();

    expect(savedChat.chatEntries).to.be.an('array').with.lengthOf(1);
    expect(savedChat.chatEntries[0].sender).to.equal(chatEntryData.sender);
    expect(savedChat.chatEntries[0].type).to.equal(chatEntryData.type);
    expect(savedChat.chatEntries[0].message).to.equal(chatEntryData.message);
    expect(savedChat.chatEntries[0].timestamp).to.be.a('date');
  });

  it('should handle chat entries with meeting details', async () => {
    const testChat = new TestChat();
    
    testChat.chatEntries.push({
      sender: '507f1f77bcf86cd799439011',
      type: 'meeting',
      message: 'Let\'s meet at the library',
      meetingDetails: {
        location: 'University Library',
        date: '2025-06-20',
        time: '15:00',
        notes: 'Meet at the entrance'
      }
    });

    const savedChat = await testChat.save();
    const chatEntry = savedChat.chatEntries[0];

    expect(chatEntry.type).to.equal('meeting');
    expect(chatEntry.meetingDetails.location).to.equal('University Library');
    expect(chatEntry.meetingDetails.date).to.equal('2025-06-20');
    expect(chatEntry.meetingDetails.time).to.equal('15:00');
    expect(chatEntry.meetingDetails.notes).to.equal('Meet at the entrance');
  });

  it('should handle chat entries with rental period', async () => {
    const testChat = new TestChat();
    const startDate = new Date('2025-07-01');
    const endDate = new Date('2025-07-10');
    
    testChat.chatEntries.push({
      sender: '507f1f77bcf86cd799439011',
      type: 'rental_period',
      message: 'I want to rent for this period',
      rentalPeriod: {
        startDate: startDate,
        endDate: endDate
      }
    });

    const savedChat = await testChat.save();
    const chatEntry = savedChat.chatEntries[0];

    expect(chatEntry.type).to.equal('rental_period');
    expect(chatEntry.rentalPeriod.startDate.toISOString()).to.equal(startDate.toISOString());
    expect(chatEntry.rentalPeriod.endDate.toISOString()).to.equal(endDate.toISOString());
  });

  it('should not create an _id for chat entries', async () => {
    const testChat = new TestChat();
    
    testChat.chatEntries.push({
      sender: '507f1f77bcf86cd799439011',
      type: 'text',
      message: 'Testing the _id: false option'
    });

    const savedChat = await testChat.save();
    
    // Direct _id property should not exist on the entry due to { _id: false } option
    // However, the entry should still be there with other properties
    expect(savedChat.chatEntries[0]).to.not.have.property('_id');
    expect(savedChat.chatEntries[0].message).to.equal('Testing the _id: false option');
  });
});