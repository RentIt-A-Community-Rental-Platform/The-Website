import { expect } from 'chai';
import mongoose from 'mongoose';
import { Rental } from '../../src/models/Rental.js';
import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';

describe('Rental Model Tests', function() {
  this.timeout(10000); // Increase timeout
  let testUser1, testUser2, testItem;

  // Create test users and item before each test
  beforeEach(async () => {
    // Create test users
    testUser1 = new User({
      email: 'owner@example.com',
      name: 'Owner User'
    });
    await testUser1.save();

    testUser2 = new User({
      email: 'renter@example.com',
      name: 'Renter User'
    });
    await testUser2.save();

    // Create test item
    testItem = new Item({
      title: 'Rental Test Item',
      description: 'Item for rental tests',
      price: 25.00,
      userId: testUser1._id.toString(),
      userName: testUser1.name
    });
    await testItem.save();
  });

  it('should create a new rental with valid data', async () => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // 1 week rental

    const rentalData = {
      itemId: testItem._id,
      ownerId: testUser1._id,
      renterId: testUser2._id,
      paymentMethod: 'cash',
      meetingDetails: {
        date: '2025-06-15',
        time: '14:30',
        location: 'University Library',
        notes: 'Meet at the front entrance'
      },
      rentalPeriod: {
        startDate: startDate,
        endDate: endDate
      },
      totalPrice: 175.00
    };

    const rental = new Rental(rentalData);
    const savedRental = await rental.save();

    expect(savedRental).to.have.property('_id');
    expect(savedRental.itemId.toString()).to.equal(testItem._id.toString());
    expect(savedRental.ownerId.toString()).to.equal(testUser1._id.toString());
    expect(savedRental.renterId.toString()).to.equal(testUser2._id.toString());
    expect(savedRental.paymentMethod).to.equal(rentalData.paymentMethod);
    expect(savedRental.meetingDetails.location).to.equal(rentalData.meetingDetails.location);
    expect(savedRental.totalPrice).to.equal(rentalData.totalPrice);
    expect(savedRental.status).to.equal('pending'); // Default status
    expect(savedRental.createdAt).to.be.a('date');
    expect(savedRental.chatHistory).to.be.an('array').that.is.empty;
  });

  it('should fail without required fields', async () => {
    const invalidRental = new Rental({
      // Missing required fields
      itemId: testItem._id,
      // Missing renterId, ownerId, etc.
    });

    try {
      await invalidRental.save();
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.exist;
      expect(error.name).to.equal('ValidationError');
    }
  });

  it('should add and retrieve chat messages', async () => {
    // Create a base rental
    const rental = new Rental({
      itemId: testItem._id,
      ownerId: testUser1._id,
      renterId: testUser2._id,
      paymentMethod: 'card',
      meetingDetails: {
        date: '2025-07-01',
        time: '10:00',
        location: 'Campus Center',
        notes: ''
      },
      rentalPeriod: {
        startDate: new Date('2025-07-01'),
        endDate: new Date('2025-07-10')
      },
      totalPrice: 250.00
    });

    // Add chat messages
    rental.chatHistory.push({
      sender: testUser1._id.toString(),
      type: 'text',
      message: 'Hello, is this item still available?'
    });

    rental.chatHistory.push({
      sender: testUser2._id.toString(),
      type: 'text',
      message: 'Yes, it is available.'
    });

    const savedRental = await rental.save();

    expect(savedRental.chatHistory).to.be.an('array').with.lengthOf(2);
    expect(savedRental.chatHistory[0].message).to.equal('Hello, is this item still available?');
    expect(savedRental.chatHistory[1].message).to.equal('Yes, it is available.');
    expect(savedRental.chatHistory[0].sender).to.equal(testUser1._id.toString());
    expect(savedRental.chatHistory[1].sender).to.equal(testUser2._id.toString());
    expect(savedRental.chatHistory[0].timestamp).to.be.a('date');
  });

  it('should validate enum values like status and paymentMethod', async () => {
    // Test with invalid status
    const rentalWithInvalidStatus = new Rental({
      itemId: testItem._id,
      ownerId: testUser1._id,
      renterId: testUser2._id,
      paymentMethod: 'cash',
      meetingDetails: {
        date: '2025-06-15',
        time: '14:30',
        location: 'University Library'
      },
      rentalPeriod: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      totalPrice: 175.00,
      status: 'invalid_status' // Invalid status
    });

    try {
      await rentalWithInvalidStatus.save();
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.exist;
      expect(error.name).to.equal('ValidationError');
      expect(error.message).to.include('status');
    }

    // Test with invalid payment method
    const rentalWithInvalidPayment = new Rental({
      itemId: testItem._id,
      ownerId: testUser1._id,
      renterId: testUser2._id,
      paymentMethod: 'bitcoin', // Invalid payment method
      meetingDetails: {
        date: '2025-06-15',
        time: '14:30',
        location: 'University Library'
      },
      rentalPeriod: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
      totalPrice: 175.00
    });

    try {
      await rentalWithInvalidPayment.save();
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.exist;
      expect(error.name).to.equal('ValidationError');
      expect(error.message).to.include('paymentMethod');
    }
  });
});