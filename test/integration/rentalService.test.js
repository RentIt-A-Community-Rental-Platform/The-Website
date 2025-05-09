import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RentalService } from '../../src/services/RentalService.js';
import { Rental } from '../../src/models/Rental.js';
import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';
import { setupTestDB, teardownTestDB, clearCollections } from '../helpers/testUtils.js';

describe('RentalService', () => {
  let mongoServer;
  let rentalService;
  let testUser;
  let testItem;

  before(async () => {
    await setupTestDB();
    rentalService = new RentalService();
  });

  after(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();
    
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    testItem = await Item.create({
      title: 'Test Item',
      description: 'Test Description',
      price: 100,
      category: 'Electronics',
      condition: 'New',
      owner: testUser._id,
      availability: true
    });
  });

  describe('calculateTotalPrice', () => {
    it('should calculate total price correctly for single day rental', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      
      const totalPrice = await rentalService.calculateTotalPrice(testItem._id, startDate, endDate);
      
      expect(totalPrice).to.equal(150); // 1 day * 100 + 50 deposit
    });

    it('should calculate total price correctly for multiple days rental', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      
      const totalPrice = await rentalService.calculateTotalPrice(testItem._id, startDate, endDate);
      
      expect(totalPrice).to.equal(550); // 5 days * 100 + 50 deposit
    });

    it('should handle same day rental', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 12 * 60 * 60 * 1000);
      
      const totalPrice = await rentalService.calculateTotalPrice(testItem._id, startDate, endDate);
      
      expect(totalPrice).to.equal(150); // 1 day * 100 + 50 deposit
    });

    it('should handle overnight rental', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 36 * 60 * 60 * 1000);
      
      const totalPrice = await rentalService.calculateTotalPrice(testItem._id, startDate, endDate);
      
      expect(totalPrice).to.equal(250); // 2 days * 100 + 50 deposit
    });
  });

  describe('createRentalRequest', () => {
    it('should create a rental request successfully', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      
      const rental = await rentalService.createRentalRequest({
        itemId: testItem._id,
        renter: testUser._id,
        startDate,
        endDate,
        paymentMethod: 'credit_card'
      });

      expect(rental).to.have.property('_id');
      expect(rental).to.have.property('itemId', testItem._id);
      expect(rental).to.have.property('renter', testUser._id);
      expect(rental).to.have.property('status', 'pending');
      expect(rental).to.have.property('totalPrice', 550);
    });

    it('should throw error for non-existent item', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      
      try {
        await rentalService.createRentalRequest({
          itemId: new mongoose.Types.ObjectId(),
          renter: testUser._id,
          startDate,
          endDate,
          paymentMethod: 'credit_card'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Item not found');
      }
    });

    it('should throw error for invalid date range', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
      
      try {
        await rentalService.createRentalRequest({
          itemId: testItem._id,
          renter: testUser._id,
          startDate,
          endDate,
          paymentMethod: 'credit_card'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid date range');
      }
    });

    it('should throw error for missing required fields', async () => {
      try {
        await rentalService.createRentalRequest({
          itemId: testItem._id,
          renter: testUser._id
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error creating rental request');
      }
    });

    it('should throw error for invalid payment method', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      
      try {
        await rentalService.createRentalRequest({
          itemId: testItem._id,
          renter: testUser._id,
          startDate,
          endDate,
          paymentMethod: 'invalid_method'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid payment method');
      }
    });
  });

  describe('updateRentalStatus', () => {
    it('should update rental status successfully', async () => {
      const rental = await Rental.create({
        itemId: testItem._id,
        renter: testUser._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'pending',
        totalPrice: 550
      });

      const updatedRental = await rentalService.updateRentalStatus(rental._id, 'approved');

      expect(updatedRental).to.have.property('status', 'approved');
    });

    it('should throw error for non-existent rental', async () => {
      try {
        await rentalService.updateRentalStatus(new mongoose.Types.ObjectId(), 'approved');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Rental not found');
      }
    });

    it('should throw error for invalid status', async () => {
      const rental = await Rental.create({
        itemId: testItem._id,
        renter: testUser._id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'pending',
        totalPrice: 550
      });

      try {
        await rentalService.updateRentalStatus(rental._id, 'invalid_status');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid status');
      }
    });
  });
}); 