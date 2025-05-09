import { expect } from 'chai';
import mongoose from 'mongoose';
import { Rental } from '../../src/models/Rental.js';
import { Item } from '../../src/models/Item.js';
import { User } from '../../src/models/User.js';

describe('Rental Model Test', () => {
  let testItem;
  let testRenter;
  let testOwner;

  beforeEach(async () => {
    // Create test users
    testRenter = new User({ name: 'Test Renter', email: 'renter@test.com' });
    testOwner = new User({ name: 'Test Owner', email: 'owner@test.com' });
    await Promise.all([testRenter.save(), testOwner.save()]);

    // Create test item
    testItem = new Item({
      title: 'Test Item',
      description: 'Test Description',
      price: 10.99,
      userId: testOwner._id.toString(),
      userName: testOwner.name
    });
    await testItem.save();
  });

  it('should create & save rental successfully', async () => {
    const validRental = new Rental({
      itemId: testItem._id,
      renterId: testRenter._id,
      ownerId: testOwner._id,
      paymentMethod: 'cash',
      meetingDetails: {
        date: '2024-03-20',
        time: '14:00',
        location: 'Test Location',
        notes: 'Test Notes'
      },
      rentalPeriod: {
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-25')
      },
      totalPrice: 54.95
    });

    const savedRental = await validRental.save();
    
    expect(savedRental._id).to.exist;
    expect(savedRental.status).to.equal('pending');
    expect(savedRental.paymentMethod).to.equal('cash');
    expect(savedRental.meetingDetails.location).to.equal('Test Location');
    expect(savedRental.totalPrice).to.equal(54.95);
    expect(savedRental.createdAt).to.exist;
  });

  it('should fail to save rental without required fields', async () => {
    const rentalWithoutRequiredField = new Rental({
      itemId: testItem._id,
      renterId: testRenter._id,
      // Missing ownerId
      paymentMethod: 'cash',
      meetingDetails: {
        date: '2024-03-20',
        time: '14:00',
        location: 'Test Location'
      },
      rentalPeriod: {
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-25')
      },
      totalPrice: 54.95
    });

    let err;
    try {
      await rentalWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).to.exist;
    expect(err.errors.ownerId).to.exist;
  });

  it('should validate payment method enum', async () => {
    const rentalWithInvalidPayment = new Rental({
      itemId: testItem._id,
      renterId: testRenter._id,
      ownerId: testOwner._id,
      paymentMethod: 'invalid_method',
      meetingDetails: {
        date: '2024-03-20',
        time: '14:00',
        location: 'Test Location'
      },
      rentalPeriod: {
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-25')
      },
      totalPrice: 54.95
    });

    let err;
    try {
      await rentalWithInvalidPayment.save();
    } catch (error) {
      err = error;
    }

    expect(err).to.exist;
    expect(err.errors.paymentMethod).to.exist;
  });

  it('should handle chat history', async () => {
    const rental = new Rental({
      itemId: testItem._id,
      renterId: testRenter._id,
      ownerId: testOwner._id,
      paymentMethod: 'cash',
      meetingDetails: {
        date: '2024-03-20',
        time: '14:00',
        location: 'Test Location'
      },
      rentalPeriod: {
        startDate: new Date('2024-03-20'),
        endDate: new Date('2024-03-25')
      },
      totalPrice: 54.95,
      chatHistory: [{
        senderId: testRenter._id,
        message: 'Hello, I would like to rent this item',
        timestamp: new Date()
      }]
    });

    const savedRental = await rental.save();
    expect(savedRental.chatHistory).to.have.lengthOf(1);
    expect(savedRental.chatHistory[0].message).to.equal('Hello, I would like to rent this item');
  });
}); 