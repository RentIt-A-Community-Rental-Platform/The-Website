import { expect } from 'chai';
import mongoose from 'mongoose';
import { RentalService } from '../../src/services/RentalService.js';
import { Item } from '../../src/models/Item.js';
import { Rental } from '../../src/models/Rental.js';
import { User } from '../../src/models/User.js';

describe('RentalService', () => {
  let rentalService;
  let testUser;
  let testItem;
  let testOwner;

  before(async () => {
    rentalService = new RentalService();
  });

  beforeEach(async () => {
    testOwner = await User.create({
      email: 'owner@example.com',
      password: 'password123',
      name: 'Test Owner'
    });

    testUser = await User.create({
      email: 'renter@example.com',
      password: 'password123',
      name: 'Test Renter'
    });

    testItem = await Item.create({
      title: 'Test Item',
      description: 'Test Description',
      price: 100,
      category: 'Electronics',
      condition: 'New',
      owner: testOwner._id,
      deposit: 200
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    await Rental.deleteMany({});
  });

  describe('calculateTotalPrice', () => {
    it('should calculate total price correctly for multiple days', () => {
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-03-05');
      const dailyRate = 100;
      const deposit = 200;

      const totalPrice = rentalService.calculateTotalPrice(dailyRate, startDate, endDate, deposit);
      expect(totalPrice).to.equal(600); // 4 days * 100 + 200 deposit
    });

    it('should calculate total price correctly for same day rental', () => {
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-03-01');
      const dailyRate = 100;
      const deposit = 200;

      const totalPrice = rentalService.calculateTotalPrice(dailyRate, startDate, endDate, deposit);
      expect(totalPrice).to.equal(300); // 1 day * 100 + 200 deposit
    });

    it('should handle zero deposit', () => {
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-03-05');
      const dailyRate = 100;
      const deposit = 0;

      const totalPrice = rentalService.calculateTotalPrice(dailyRate, startDate, endDate, deposit);
      expect(totalPrice).to.equal(400); // 4 days * 100 + 0 deposit
    });

    it('should handle zero daily rate', () => {
      const startDate = new Date('2024-03-01');
      const endDate = new Date('2024-03-05');
      const dailyRate = 0;
      const deposit = 200;

      const totalPrice = rentalService.calculateTotalPrice(dailyRate, startDate, endDate, deposit);
      expect(totalPrice).to.equal(200); // 4 days * 0 + 200 deposit
    });
  });

  describe('createRentalRequest', () => {
    it('should create a rental request successfully', async () => {
      const rentalData = {
        itemId: testItem._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        paymentMethod: 'cash',
        meetingDate: new Date('2024-03-01'),
        meetingTime: '10:00',
        meetingLocation: 'Test Location',
        notes: 'Test Notes',
        chatHistory: []
      };

      const rental = await rentalService.createRentalRequest(rentalData, testUser._id);
      expect(rental).to.have.property('_id');
      expect(rental.itemId.toString()).to.equal(testItem._id.toString());
      expect(rental.renterId.toString()).to.equal(testUser._id.toString());
      expect(rental.ownerId.toString()).to.equal(testOwner._id.toString());
      expect(rental.status).to.equal('pending');
      expect(rental.totalPrice).to.equal(600);
      expect(rental.meetingDetails).to.deep.include({
        date: rentalData.meetingDate,
        time: rentalData.meetingTime,
        location: rentalData.meetingLocation,
        notes: rentalData.notes
      });
    });

    it('should throw error for non-existent item', async () => {
      const rentalData = {
        itemId: new mongoose.Types.ObjectId(),
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        paymentMethod: 'cash'
      };

      try {
        await rentalService.createRentalRequest(rentalData, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Error creating rental request: Item not found');
      }
    });

    it('should throw error for invalid dates', async () => {
      const rentalData = {
        itemId: testItem._id,
        startDate: new Date('2024-03-05'),
        endDate: new Date('2024-03-01'),
        totalPrice: 600
      };

      try {
        await rentalService.createRentalRequest(rentalData, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('End date must be after start date');
      }
    });

    it('should throw error for same day rental with invalid dates', async () => {
      const rentalData = {
        itemId: testItem._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-01'),
        totalPrice: 300
      };

      try {
        await rentalService.createRentalRequest(rentalData, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Start date must be before end date');
      }
    });

    it('should throw error for overlapping rentals', async () => {
      // Create an existing rental
      await Rental.create({
        itemId: testItem._id,
        renter: testUser._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'confirmed',
        totalPrice: 600
      });

      // Try to create an overlapping rental
      const rentalData = {
        itemId: testItem._id,
        startDate: new Date('2024-03-03'),
        endDate: new Date('2024-03-07'),
        totalPrice: 600
      };

      try {
        await rentalService.createRentalRequest(rentalData, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Item is not available for the selected dates');
      }
    });
  });

  describe('updateRentalStatus', () => {
    let rental;

    beforeEach(async () => {
      rental = await Rental.create({
        itemId: testItem._id,
        renter: testUser._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'pending',
        totalPrice: 600
      });
    });

    it('should update rental status successfully', async () => {
      const updatedRental = await rentalService.updateRentalStatus(rental._id, 'confirmed');
      expect(updatedRental.status).to.equal('confirmed');
    });

    it('should throw error for invalid status', async () => {
      try {
        await rentalService.updateRentalStatus(rental._id, 'invalid_status');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Invalid status');
      }
    });

    it('should throw error for non-existent rental', async () => {
      try {
        await rentalService.updateRentalStatus(new mongoose.Types.ObjectId(), 'confirmed');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Rental not found');
      }
    });

    it('should handle status transition from pending to cancelled', async () => {
      const updatedRental = await rentalService.updateRentalStatus(rental._id, 'cancelled');
      expect(updatedRental.status).to.equal('cancelled');
    });

    it('should handle status transition from confirmed to completed', async () => {
      rental.status = 'confirmed';
      await rental.save();
      
      const updatedRental = await rentalService.updateRentalStatus(rental._id, 'completed');
      expect(updatedRental.status).to.equal('completed');
    });
  });

  describe('getRentalsByUser', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renter: testUser._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renter: testUser._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'confirmed',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renter: testUser._id,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-05-05'),
          status: 'completed',
          totalPrice: 600
        }
      ]);
    });

    it('should get all rentals for a user', async () => {
      const rentals = await rentalService.getRentalsByUser(testUser._id);
      expect(rentals).to.have.lengthOf(3);
      rentals.forEach(rental => {
        expect(rental.renter.toString()).to.equal(testUser._id.toString());
      });
    });

    it('should filter rentals by status', async () => {
      const rentals = await rentalService.getRentalsByUser(testUser._id, 'confirmed');
      expect(rentals).to.have.lengthOf(1);
      expect(rentals[0].status).to.equal('confirmed');
    });

    it('should return empty array for user with no rentals', async () => {
      const newUser = await User.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      });
      const rentals = await rentalService.getRentalsByUser(newUser._id);
      expect(rentals).to.be.an('array').that.is.empty;
    });

    it('should return empty array for invalid status filter', async () => {
      const rentals = await rentalService.getRentalsByUser(testUser._id, 'invalid_status');
      expect(rentals).to.be.an('array').that.is.empty;
    });
  });

  describe('getRentalsByItem', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renter: testUser._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renter: testUser._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'confirmed',
          totalPrice: 600
        }
      ]);
    });

    it('should get all rentals for an item', async () => {
      const rentals = await rentalService.getRentalsByItem(testItem._id);
      expect(rentals).to.have.lengthOf(2);
      rentals.forEach(rental => {
        expect(rental.itemId.toString()).to.equal(testItem._id.toString());
      });
    });

    it('should return empty array for item with no rentals', async () => {
      const newItem = await Item.create({
        title: 'New Item',
        description: 'New Description',
        price: 200,
        category: 'Electronics',
        condition: 'New',
        owner: testUser._id
      });
      const rentals = await rentalService.getRentalsByItem(newItem._id);
      expect(rentals).to.be.an('array').that.is.empty;
    });
  });

  describe('checkItemAvailability', () => {
    beforeEach(async () => {
      await Rental.create({
        itemId: testItem._id,
        renter: testUser._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'confirmed',
        totalPrice: 600
      });
    });

    it('should return true for available dates', async () => {
      const isAvailable = await rentalService.checkItemAvailability(
        testItem._id,
        new Date('2024-03-10'),
        new Date('2024-03-15')
      );
      expect(isAvailable).to.be.true;
    });

    it('should return false for overlapping dates', async () => {
      const isAvailable = await rentalService.checkItemAvailability(
        testItem._id,
        new Date('2024-03-03'),
        new Date('2024-03-07')
      );
      expect(isAvailable).to.be.false;
    });

    it('should return true for non-existent item', async () => {
      const isAvailable = await rentalService.checkItemAvailability(
        new mongoose.Types.ObjectId(),
        new Date('2024-03-01'),
        new Date('2024-03-05')
      );
      expect(isAvailable).to.be.true;
    });
  });

  describe('getPendingRequests', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'modified',
          totalPrice: 600
        }
      ]);
    });

    it('should get all pending and modified requests for owner', async () => {
      const requests = await rentalService.getPendingRequests(testOwner._id);
      expect(requests).to.have.lengthOf(2);
      requests.forEach(request => {
        expect(request.ownerId.toString()).to.equal(testOwner._id.toString());
        expect(['pending', 'modified']).to.include(request.status);
      });
    });

    it('should return empty array for user with no pending requests', async () => {
      const requests = await rentalService.getPendingRequests(testUser._id);
      expect(requests).to.be.an('array').that.is.empty;
    });
  });

  describe('getAllRequests', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'accepted',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-05-01'),
          endDate: new Date('2024-05-05'),
          status: 'completed',
          totalPrice: 600
        }
      ]);
    });

    it('should get all requests for owner', async () => {
      const requests = await rentalService.getAllRequests(testOwner._id);
      expect(requests).to.have.lengthOf(3);
      requests.forEach(request => {
        expect(request.ownerId.toString()).to.equal(testOwner._id.toString());
        expect(['pending', 'modified', 'accepted', 'ongoing', 'completed']).to.include(request.status);
      });
    });
  });

  describe('getUserRequests', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'accepted',
          totalPrice: 600
        }
      ]);
    });

    it('should get all requests for user', async () => {
      const requests = await rentalService.getUserRequests(testUser._id);
      expect(requests).to.have.lengthOf(2);
      requests.forEach(request => {
        expect(request.renterId.toString()).to.equal(testUser._id.toString());
      });
    });

    it('should filter requests by status', async () => {
      const requests = await rentalService.getUserRequests(testUser._id, ['pending']);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].status).to.equal('pending');
    });
  });

  describe('updateRental', () => {
    let rental;

    beforeEach(async () => {
      rental = await Rental.create({
        itemId: testItem._id,
        renterId: testUser._id,
        ownerId: testOwner._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'pending',
        totalPrice: 600,
        meetingDetails: {
          date: new Date('2024-03-01'),
          time: '10:00',
          location: 'Test Location',
          notes: 'Test Notes'
        }
      });
    });

    it('should update rental as owner', async () => {
      const updateData = {
        meetingDetails: {
          date: new Date('2024-03-02'),
          time: '11:00',
          location: 'New Location',
          notes: 'Updated Notes'
        }
      };

      const updatedRental = await rentalService.updateRental(rental._id, updateData, testOwner._id);
      expect(updatedRental.status).to.equal('modified');
      expect(updatedRental.meetingDetails).to.deep.include(updateData.meetingDetails);
      expect(updatedRental.chatHistory).to.have.lengthOf(1);
      expect(updatedRental.chatHistory[0].sender).to.equal('owner');
    });

    it('should update rental as renter', async () => {
      const updateData = {
        rentalPeriod: {
          startDate: new Date('2024-03-02'),
          endDate: new Date('2024-03-06')
        }
      };

      const updatedRental = await rentalService.updateRental(rental._id, updateData, testUser._id);
      expect(updatedRental.status).to.equal('modified');
      expect(updatedRental.rentalPeriod).to.deep.include(updateData.rentalPeriod);
      expect(updatedRental.chatHistory).to.have.lengthOf(1);
      expect(updatedRental.chatHistory[0].sender).to.equal('renter');
    });

    it('should throw error for unauthorized user', async () => {
      const unauthorizedUser = await User.create({
        email: 'unauthorized@example.com',
        password: 'password123',
        name: 'Unauthorized User'
      });

      try {
        await rentalService.updateRental(rental._id, { status: 'accepted' }, unauthorizedUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Error updating rental request: Not authorized to modify this request');
      }
    });
  });

  describe('confirmPickup', () => {
    let rental;

    beforeEach(async () => {
      rental = await Rental.create({
        itemId: testItem._id,
        renterId: testUser._id,
        ownerId: testOwner._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'accepted',
        totalPrice: 600
      });
    });

    it('should confirm pickup successfully', async () => {
      const updatedRental = await rentalService.confirmPickup(rental._id, testOwner._id);
      expect(updatedRental.status).to.equal('ongoing');
      expect(updatedRental.lastModifiedBy.toString()).to.equal(testOwner._id.toString());
    });

    it('should throw error for non-existent rental', async () => {
      try {
        await rentalService.confirmPickup(new mongoose.Types.ObjectId(), testOwner._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Error confirming pickup: Rental request not found');
      }
    });
  });

  describe('confirmReturn', () => {
    let rental;

    beforeEach(async () => {
      rental = await Rental.create({
        itemId: testItem._id,
        renterId: testUser._id,
        ownerId: testOwner._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'ongoing',
        totalPrice: 600
      });
    });

    it('should confirm return successfully', async () => {
      const updatedRental = await rentalService.confirmReturn(rental._id, testOwner._id);
      expect(updatedRental.status).to.equal('completed');
      expect(updatedRental.lastModifiedBy.toString()).to.equal(testOwner._id.toString());
    });

    it('should throw error for non-existent rental', async () => {
      try {
        await rentalService.confirmReturn(new mongoose.Types.ObjectId(), testOwner._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Error confirming return: Rental request not found');
      }
    });
  });

  describe('getRequestsByStatus', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'pending',
          totalPrice: 600
        }
      ]);
    });

    it('should get requests by status', async () => {
      const requests = await rentalService.getRequestsByStatus(testOwner._id, 'pending');
      expect(requests).to.have.lengthOf(2);
      requests.forEach(request => {
        expect(request.status).to.equal('pending');
        expect(request.ownerId.toString()).to.equal(testOwner._id.toString());
      });
    });
  });

  describe('getRequestsByStatuses', () => {
    beforeEach(async () => {
      await Rental.create([
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-03-05'),
          status: 'pending',
          totalPrice: 600
        },
        {
          itemId: testItem._id,
          renterId: testUser._id,
          ownerId: testOwner._id,
          startDate: new Date('2024-04-01'),
          endDate: new Date('2024-04-05'),
          status: 'modified',
          totalPrice: 600
        }
      ]);
    });

    it('should get requests by multiple statuses', async () => {
      const requests = await rentalService.getRequestsByStatuses(testOwner._id, ['pending', 'modified']);
      expect(requests).to.have.lengthOf(2);
      requests.forEach(request => {
        expect(['pending', 'modified']).to.include(request.status);
        expect(request.ownerId.toString()).to.equal(testOwner._id.toString());
      });
    });
  });
}); 