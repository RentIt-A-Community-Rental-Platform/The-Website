import { expect } from 'chai';
import mongoose from 'mongoose';
import ChatEntry from '../../src/models/ChatEntry.js';

describe('ChatEntry Schema Test', () => {
  beforeEach(async () => {
    await ChatEntry.deleteMany({});
  });

  it('should create chat entry with basic message', async () => {
    const chatEntry = new ChatEntry({
      _id: new mongoose.Types.ObjectId(),
      rentalId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      message: 'Test message',
      type: 'text'
    });
    const savedEntry = await chatEntry.save();
    expect(savedEntry.message).to.equal('Test message');
    expect(savedEntry.type).to.equal('text');
  });

  it('should create chat entry with rental period', async () => {
    const chatEntry = new ChatEntry({
      _id: new mongoose.Types.ObjectId(),
      rentalId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      message: 'Test message',
      type: 'rental_period',
      rentalPeriod: {
        startDate: new Date(),
        endDate: new Date()
      }
    });
    const savedEntry = await chatEntry.save();
    expect(savedEntry.type).to.equal('rental_period');
    expect(savedEntry.rentalPeriod).to.have.property('startDate');
    expect(savedEntry.rentalPeriod).to.have.property('endDate');
  });

  it('should create chat entry with meeting details', async () => {
    const chatEntry = new ChatEntry({
      _id: new mongoose.Types.ObjectId(),
      rentalId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      message: 'Test message',
      type: 'meeting_details',
      meetingDetails: {
        date: new Date(),
        time: '14:00',
        location: 'Campus Center'
      }
    });
    const savedEntry = await chatEntry.save();
    expect(savedEntry.type).to.equal('meeting_details');
    expect(savedEntry.meetingDetails).to.have.property('date');
    expect(savedEntry.meetingDetails).to.have.property('time');
    expect(savedEntry.meetingDetails).to.have.property('location');
  });

  it('should create chat entry with all fields', async () => {
    const chatEntry = new ChatEntry({
      _id: new mongoose.Types.ObjectId(),
      rentalId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      message: 'Test message',
      type: 'rental_period',
      rentalPeriod: {
        startDate: new Date(),
        endDate: new Date()
      },
      meetingDetails: {
        date: new Date(),
        time: '14:00',
        location: 'Campus Center'
      }
    });
    const savedEntry = await chatEntry.save();
    expect(savedEntry.message).to.equal('Test message');
    expect(savedEntry.type).to.equal('rental_period');
    expect(savedEntry.rentalPeriod).to.exist;
    expect(savedEntry.meetingDetails).to.exist;
  });
}); 