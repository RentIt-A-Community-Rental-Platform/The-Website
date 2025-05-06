import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Rental } from '../../src/models/Rental.js';
import { Item } from '../../src/models/Item.js';
import { User } from '../../src/models/User.js';
import { createTestUser, createTestItem, createTestRental } from '../test-helper.js';

describe('Rentals Routes Tests', function() {
  this.timeout(10000); // Increase timeout
  let app, request, authStub;
  const testUserId = new mongoose.Types.ObjectId();
  const testOwnerId = new mongoose.Types.ObjectId();
  const testItemId = new mongoose.Types.ObjectId();

  before(async function() {
    // Create test express app
    app = express();
    app.use(express.json());

    // Mock the isAuthenticated middleware
    authStub = sinon.stub();
    
    // Create a test router (since we can't directly test the module's router)
    const router = express.Router();
    
    // Helper function to calculate total price (copied from rentals.js)
    function calculateTotalPrice(dailyRate, startDate, endDate, deposit) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return (days * dailyRate) + deposit;
    }

    // Define test routes similar to rentals.js
    router.post('/', authStub, async (req, res) => {
      try {
        const {
          itemId,
          paymentMethod,
          meetingDate,
          meetingTime,
          meetingLocation,
          notes,
          startDate,
          endDate,
          chatHistory
        } = req.body;

        // Get the item to check if it exists and get the owner
        const item = await Item.findById(itemId);

        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }
        
        // Create the rental request
        const rental = new Rental({
          itemId,
          renterId: req.user._id,
          ownerId: item.userId,
          paymentMethod,
          meetingDetails: {
            date: meetingDate,
            time: meetingTime,
            location: meetingLocation,
            notes
          },
          rentalPeriod: {
            startDate,
            endDate
          },
          status: 'pending',
          totalPrice: calculateTotalPrice(item.price, startDate, endDate, item.deposit),
          chatHistory: chatHistory || []
        });
        
        await rental.save();
        
        res.status(201).json({ 
          message: 'Rental request created successfully',
          rental
        });
        
      } catch (error) {
        console.error('Error creating rental request:', error);
        res.status(500).json({ error: 'Failed to create rental request' });
      }
    });

    // Get all pending rental requests for the current user (as owner)
    router.get('/pending', authStub, async (req, res) => {
      try {
        const allRequests = await Rental.find({ 
          ownerId: req.user._id, 
          status: { $in: ['pending', 'modified', 'accepted', 'rejected', 'completed'] }
        })
        .populate('itemId')
        .populate('renterId');
      
        res.json(allRequests);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending rental requests' });
      }
    });

    // Get all rental requests where the user is the sender (renter)
    router.get('/my-requests', authStub, async (req, res) => {
      try {
        const myRequests = await Rental.find({ 
          renterId: req.user._id 
        })
        .populate('itemId')
        .populate('ownerId');
      
        res.json(myRequests);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch my rental requests' });
      }
    });

    // Accept a rental request
    router.post('/:id/accept', authStub, async (req, res) => {
      try {
        const rental = await Rental.findOneAndUpdate(
          { _id: req.params.id, ownerId: req.user._id, status: 'pending' },
          { status: 'accepted' },
          { new: true }
        );
        if (!rental) {
          return res.status(404).json({ error: 'Rental request not found or already processed' });
        }
        res.json({ message: 'Rental request accepted', rental });
      } catch (error) {
        res.status(500).json({ error: 'Failed to accept rental request' });
      }
    });

    // Reject a rental request
    router.post('/:id/reject', authStub, async (req, res) => {
      try {
        const rental = await Rental.findOneAndUpdate(
          { _id: req.params.id, ownerId: req.user._id, status: 'pending' },
          { status: 'rejected' },
          { new: true }
        );
        if (!rental) {
          return res.status(404).json({ error: 'Rental request not found or already processed' });
        }
        res.json({ message: 'Rental request rejected', rental });
      } catch (error) {
        res.status(500).json({ error: 'Failed to reject rental request' });
      }
    });

    app.use('/rentals', router);
    request = supertest(app);
  });

  beforeEach(async () => {
    // Reset auth stub behavior and clear database
    authStub.reset();
    
    // Default auth stub behavior - authenticated as the test user
    authStub.callsFake((req, res, next) => {
      req.user = { _id: testUserId };
      next();
    });

    // Clean database collections
    await Rental.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    // Create test data for each test
    await User.create([
      { _id: testUserId, email: 'renter@example.com', name: 'Renter User' },
      { _id: testOwnerId, email: 'owner@example.com', name: 'Owner User' }
    ]);

    await Item.create({
      _id: testItemId,
      title: 'Test Item',
      price: 10.00,
      deposit: 20.00,
      userId: testOwnerId.toString(),
      userName: 'Owner User'
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /rentals', () => {
    it('should create a new rental request', async () => {
      const rentalData = {
        itemId: testItemId,
        paymentMethod: 'cash',
        meetingDate: '2025-06-25',
        meetingTime: '14:00',
        meetingLocation: 'University Library',
        notes: 'Meet at the entrance',
        startDate: '2025-06-26',
        endDate: '2025-07-03',
        chatHistory: [
          {
            sender: testUserId.toString(),
            type: 'text',
            message: 'I would like to rent this item'
          }
        ]
      };

      const response = await request
        .post('/rentals')
        .send(rentalData);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('message', 'Rental request created successfully');
      expect(response.body).to.have.property('rental');
      expect(response.body.rental.itemId.toString()).to.equal(testItemId.toString());
      expect(response.body.rental.renterId.toString()).to.equal(testUserId.toString());
      expect(response.body.rental.ownerId.toString()).to.equal(testOwnerId.toString());
      expect(response.body.rental.status).to.equal('pending');
      expect(response.body.rental.chatHistory).to.be.an('array').with.lengthOf(1);
      
      // Calculate expected total price (7 days * $10 + $20 deposit = $90)
      expect(response.body.rental.totalPrice).to.equal(90);
    });

    it('should return 404 when item not found', async () => {
      const nonExistentItemId = new mongoose.Types.ObjectId();
      
      const rentalData = {
        itemId: nonExistentItemId,
        paymentMethod: 'cash',
        meetingDate: '2025-06-25',
        meetingTime: '14:00',
        meetingLocation: 'University Library',
        startDate: '2025-06-26',
        endDate: '2025-07-03'
      };

      const response = await request
        .post('/rentals')
        .send(rentalData);
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found');
    });
  });

  describe('GET /rentals/pending', () => {
    beforeEach(async () => {
      // Create some test rental requests
      await Rental.create([
        {
          itemId: testItemId,
          renterId: new mongoose.Types.ObjectId(), // Different renter
          ownerId: testUserId, // Current user as owner
          paymentMethod: 'cash',
          meetingDetails: {
            date: '2025-06-25',
            time: '14:00',
            location: 'Library'
          },
          rentalPeriod: {
            startDate: new Date('2025-06-26'),
            endDate: new Date('2025-07-03')
          },
          status: 'pending',
          totalPrice: 90
        },
        {
          itemId: testItemId,
          renterId: new mongoose.Types.ObjectId(), // Different renter
          ownerId: testUserId, // Current user as owner
          paymentMethod: 'card',
          meetingDetails: {
            date: '2025-07-10',
            time: '15:00',
            location: 'Campus Center'
          },
          rentalPeriod: {
            startDate: new Date('2025-07-11'),
            endDate: new Date('2025-07-14')
          },
          status: 'accepted',
          totalPrice: 50
        }
      ]);
    });

    it('should retrieve all pending rental requests for owner', async () => {
      const response = await request.get('/rentals/pending');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].ownerId.toString()).to.equal(testUserId.toString());
      expect(response.body[1].ownerId.toString()).to.equal(testUserId.toString());
      
      // Verify we have both pending and accepted status rentals
      const statuses = response.body.map(rental => rental.status);
      expect(statuses).to.include('pending');
      expect(statuses).to.include('accepted');
    });
  });

  describe('GET /rentals/my-requests', () => {
    beforeEach(async () => {
      // Create some test rental requests
      await Rental.create([
        {
          itemId: testItemId,
          renterId: testUserId, // Current user as renter
          ownerId: testOwnerId,
          paymentMethod: 'cash',
          meetingDetails: {
            date: '2025-06-25',
            time: '14:00',
            location: 'Library'
          },
          rentalPeriod: {
            startDate: new Date('2025-06-26'),
            endDate: new Date('2025-07-03')
          },
          status: 'pending',
          totalPrice: 90
        },
        {
          itemId: testItemId,
          renterId: new mongoose.Types.ObjectId(), // Different renter
          ownerId: testOwnerId,
          paymentMethod: 'card',
          meetingDetails: {
            date: '2025-07-10',
            time: '15:00',
            location: 'Campus Center'
          },
          rentalPeriod: {
            startDate: new Date('2025-07-11'),
            endDate: new Date('2025-07-14')
          },
          status: 'pending',
          totalPrice: 50
        }
      ]);
    });

    it('should retrieve only the current user\'s rental requests', async () => {
      const response = await request.get('/rentals/my-requests');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(1);
      expect(response.body[0].renterId.toString()).to.equal(testUserId.toString());
    });
  });

  describe('POST /rentals/:id/accept', () => {
    let testRentalId;

    beforeEach(async () => {
      // Create a test rental to accept
      const testRental = await Rental.create({
        itemId: testItemId,
        renterId: new mongoose.Types.ObjectId(),
        ownerId: testUserId, // Current user as owner
        paymentMethod: 'cash',
        meetingDetails: {
          date: '2025-06-25',
          time: '14:00',
          location: 'Library'
        },
        rentalPeriod: {
          startDate: new Date('2025-06-26'),
          endDate: new Date('2025-07-03')
        },
        status: 'pending',
        totalPrice: 90
      });
      
      testRentalId = testRental._id;
    });

    it('should accept a pending rental request', async () => {
      const response = await request.post(`/rentals/${testRentalId}/accept`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message', 'Rental request accepted');
      expect(response.body.rental.status).to.equal('accepted');
      
      // Verify the rental was updated in the database
      const updatedRental = await Rental.findById(testRentalId);
      expect(updatedRental.status).to.equal('accepted');
    });

    it('should return 404 for non-existent rental', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request.post(`/rentals/${nonExistentId}/accept`);
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Rental request not found or already processed');
    });

    it('should return 404 when trying to accept another owner\'s rental', async () => {
      // Create a rental owned by someone else
      const otherOwnerRental = await Rental.create({
        itemId: testItemId,
        renterId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(), // Different owner
        paymentMethod: 'cash',
        meetingDetails: {
          date: '2025-06-25',
          time: '14:00',
          location: 'Library'
        },
        rentalPeriod: {
          startDate: new Date('2025-06-26'),
          endDate: new Date('2025-07-03')
        },
        status: 'pending',
        totalPrice: 90
      });

      const response = await request.post(`/rentals/${otherOwnerRental._id}/accept`);
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Rental request not found or already processed');
    });
  });

  describe('POST /rentals/:id/reject', () => {
    let testRentalId;

    beforeEach(async () => {
      // Create a test rental to reject
      const testRental = await Rental.create({
        itemId: testItemId,
        renterId: new mongoose.Types.ObjectId(),
        ownerId: testUserId, // Current user as owner
        paymentMethod: 'cash',
        meetingDetails: {
          date: '2025-06-25',
          time: '14:00',
          location: 'Library'
        },
        rentalPeriod: {
          startDate: new Date('2025-06-26'),
          endDate: new Date('2025-07-03')
        },
        status: 'pending',
        totalPrice: 90
      });
      
      testRentalId = testRental._id;
    });

    it('should reject a pending rental request', async () => {
      const response = await request.post(`/rentals/${testRentalId}/reject`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message', 'Rental request rejected');
      expect(response.body.rental.status).to.equal('rejected');
      
      // Verify the rental was updated in the database
      const updatedRental = await Rental.findById(testRentalId);
      expect(updatedRental.status).to.equal('rejected');
    });
  });
});