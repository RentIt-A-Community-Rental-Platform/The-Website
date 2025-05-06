import { expect } from 'chai';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { Rental } from '../src/models/Rental.js';
import '../src/models/ChatEntry.js';

// This test ensures that all models are imported and covered
describe('Direct Model Testing', function() {
  this.timeout(10000);
  
  describe('User Model', () => {
    it('should create a user with correct schema', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        googleId: 'google123'
      };
      
      const user = new User(userData);
      expect(user).to.have.property('email', userData.email);
      expect(user).to.have.property('password', userData.password);
      expect(user).to.have.property('name', userData.name);
      expect(user).to.have.property('googleId', userData.googleId);
      
      // Validate it's a mongoose model
      expect(user).to.be.instanceof(mongoose.Model);
    });
  });
  
  describe('Item Model', () => {
    it('should create an item with correct schema', async () => {
      const itemData = {
        title: 'Test Item',
        description: 'A test item',
        price: 25.99,
        category: 'Electronics',
        deposit: 10,
        userId: 'user123',
        userName: 'Test User',
        photos: ['photo1.jpg', 'photo2.jpg'],
        createdAt: new Date()
      };
      
      const item = new Item(itemData);
      expect(item).to.have.property('title', itemData.title);
      expect(item).to.have.property('description', itemData.description);
      expect(item).to.have.property('price', itemData.price);
      expect(item).to.have.property('category', itemData.category);
      expect(item).to.have.property('deposit', itemData.deposit);
      expect(item).to.have.property('userId', itemData.userId);
      expect(item).to.have.property('userName', itemData.userName);
      expect(item.photos).to.deep.equal(itemData.photos);
      expect(item.createdAt).to.be.an.instanceOf(Date);
      
      // Validate it's a mongoose model
      expect(item).to.be.instanceof(mongoose.Model);
    });
  });
  
  describe('Rental Model', () => {
    it('should create a rental with correct schema', async () => {
      const rentalData = {
        itemId: new mongoose.Types.ObjectId(),
        renterId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
        paymentMethod: 'cash',
        meetingDetails: {
          date: '2025-06-15',
          time: '14:00',
          location: 'Library',
          notes: 'Meet at entrance'
        },
        rentalPeriod: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        status: 'pending',
        totalPrice: 100,
        createdAt: new Date(),
        chatHistory: [
          {
            sender: 'user1',
            type: 'text',
            message: 'Hello',
            timestamp: new Date()
          }
        ],
        lastModifiedBy: new mongoose.Types.ObjectId()
      };
      
      const rental = new Rental(rentalData);
      
      expect(rental).to.have.property('itemId');
      expect(rental.itemId.toString()).to.equal(rentalData.itemId.toString());
      expect(rental).to.have.property('renterId');
      expect(rental.renterId.toString()).to.equal(rentalData.renterId.toString());
      expect(rental).to.have.property('ownerId');
      expect(rental.ownerId.toString()).to.equal(rentalData.ownerId.toString());
      expect(rental).to.have.property('paymentMethod', rentalData.paymentMethod);
      expect(rental.meetingDetails).to.deep.include(rentalData.meetingDetails);
      expect(rental).to.have.property('status', rentalData.status);
      expect(rental).to.have.property('totalPrice', rentalData.totalPrice);
      expect(rental.createdAt).to.be.an.instanceOf(Date);
      expect(rental.chatHistory).to.have.lengthOf(1);
      expect(rental.chatHistory[0]).to.have.property('sender', 'user1');
      expect(rental.lastModifiedBy.toString()).to.equal(rentalData.lastModifiedBy.toString());
      
      // Validate it's a mongoose model
      expect(rental).to.be.instanceof(mongoose.Model);
    });
  });
});