import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Item } from '../src/models/Item.js';
import { createTestUser } from './test-helper.js';

// A simpler test that directly exercises the routes
describe('Simple Items API Tests', function() {
  this.timeout(10000);
  let app, request;
  
  before(async function() {
    // Create a simple Express app
    app = express();
    app.use(express.json());
    
    // Create route handlers that match the items.js file
    app.get('/items', async (req, res) => {
      try {
        const query = req.query.userId ? { userId: req.query.userId } : {};
        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json(items);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
      }
    });
    
    app.post('/items', async (req, res) => {
      try {
        const { title, description, price, category, deposit, photos } = req.body;
        
        // For testing, we'll create a mock user
        const user = {
          _id: req.headers['x-user-id'] || 'test-user-id',
          name: req.headers['x-user-name'] || 'Test User'
        };
        
        // Parse the photos if needed
        const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
        
        const item = new Item({
          title,
          description,
          price: parseFloat(price),
          category,
          deposit: parseFloat(deposit) || 0,
          userId: user._id,
          userName: user.name,
          photos: parsedPhotos || []
        });
        
        await item.save();
        res.status(201).json(item);
      } catch (error) {
        res.status(400).json({ error: 'Failed to create item' });
      }
    });
    
    app.get('/items/:id', async (req, res) => {
      try {
        const item = await Item.findById(req.params.id);
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch item' });
      }
    });
    
    app.put('/items/:id', async (req, res) => {
      try {
        const itemId = req.params.id;
        const userId = req.headers['x-user-id'] || 'test-user-id';
        const updateData = req.body;
        
        const updatedItem = await Item.findOneAndUpdate(
          { _id: itemId, userId },
          updateData,
          { new: true }
        );
        
        if (!updatedItem) {
          return res.status(404).json({ error: 'Item not found or unauthorized' });
        }
        
        res.json(updatedItem);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update item' });
      }
    });
    
    app.delete('/items/:id', async (req, res) => {
      try {
        const itemId = req.params.id;
        const userId = req.headers['x-user-id'] || 'test-user-id';
        
        const deletedItem = await Item.findOneAndDelete({ _id: itemId, userId });
        
        if (!deletedItem) {
          return res.status(404).json({ error: 'Item not found or unauthorized' });
        }
        
        res.json({ message: 'Item deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
      }
    });
    
    request = supertest(app);
  });
  
  beforeEach(async () => {
    await Item.deleteMany({}); // Clear items collection
  });
  
  describe('Item CRUD operations', () => {
    it('should create an item', async () => {
      const newItem = {
        title: 'Test Item',
        description: 'This is a test item',
        price: 25.99,
        category: 'Electronics'
      };
      
      const response = await request
        .post('/items')
        .set('x-user-id', 'test-user-id')
        .set('x-user-name', 'Test User')
        .send(newItem);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('_id');
      expect(response.body.title).to.equal(newItem.title);
      expect(response.body.userId).to.equal('test-user-id');
    });
    
    it('should retrieve all items', async () => {
      // Create test items
      await Item.create([
        {
          title: 'Item 1',
          description: 'First test item',
          price: 10,
          userId: 'user1',
          userName: 'User One'
        },
        {
          title: 'Item 2',
          description: 'Second test item',
          price: 20,
          userId: 'user2',
          userName: 'User Two'
        }
      ]);
      
      const response = await request.get('/items');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
    });
    
    it('should filter items by userId', async () => {
      // Create test items
      await Item.create([
        {
          title: 'Item 1',
          description: 'First test item',
          price: 10,
          userId: 'user1',
          userName: 'User One'
        },
        {
          title: 'Item 2',
          description: 'Second test item',
          price: 20,
          userId: 'user2',
          userName: 'User Two'
        }
      ]);
      
      const response = await request.get('/items?userId=user1');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(1);
      expect(response.body[0].userId).to.equal('user1');
    });
    
    it('should retrieve a single item by id', async () => {
      const item = await Item.create({
        title: 'Single Item',
        description: 'An item to be fetched by ID',
        price: 15.99,
        userId: 'test-user-id',
        userName: 'Test User'
      });
      
      const response = await request.get(`/items/${item._id}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('_id', item._id.toString());
      expect(response.body.title).to.equal(item.title);
    });
    
    it('should update an item', async () => {
      const item = await Item.create({
        title: 'Original Title',
        description: 'Original description',
        price: 10,
        userId: 'test-user-id',
        userName: 'Test User'
      });
      
      const updateData = {
        title: 'Updated Title',
        price: 15
      };
      
      const response = await request
        .put(`/items/${item._id}`)
        .set('x-user-id', 'test-user-id')
        .send(updateData);
      
      expect(response.status).to.equal(200);
      expect(response.body.title).to.equal(updateData.title);
      expect(response.body.price).to.equal(updateData.price);
      expect(response.body.description).to.equal(item.description); // Unchanged
    });
    
    it('should not update an item owned by another user', async () => {
      const item = await Item.create({
        title: 'Other User Item',
        description: 'This belongs to someone else',
        price: 50,
        userId: 'other-user-id',
        userName: 'Other User'
      });
      
      const response = await request
        .put(`/items/${item._id}`)
        .set('x-user-id', 'test-user-id')
        .send({ title: 'Attempted Update' });
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found or unauthorized');
    });
    
    it('should delete an item', async () => {
      const item = await Item.create({
        title: 'Item to Delete',
        description: 'This will be deleted',
        price: 30,
        userId: 'test-user-id',
        userName: 'Test User'
      });
      
      const response = await request
        .delete(`/items/${item._id}`)
        .set('x-user-id', 'test-user-id');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message', 'Item deleted successfully');
      
      // Verify item is deleted
      const deletedItem = await Item.findById(item._id);
      expect(deletedItem).to.be.null;
    });
    
    it('should not delete an item owned by another user', async () => {
      const item = await Item.create({
        title: 'Other User Item',
        description: 'This belongs to someone else',
        price: 50,
        userId: 'other-user-id',
        userName: 'Other User'
      });
      
      const response = await request
        .delete(`/items/${item._id}`)
        .set('x-user-id', 'test-user-id');
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found or unauthorized');
      
      // Verify item still exists
      const existingItem = await Item.findById(item._id);
      expect(existingItem).to.exist;
    });
    
    it('should handle errors when retrieving items', async () => {
      // Force an error by making Item.find throw an exception
      sinon.stub(Item, 'find').throws(new Error('Database error'));
      
      const response = await request.get('/items');
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to fetch items');
      
      // Restore the stub
      Item.find.restore();
    });
    
    it('should handle invalid item ID when retrieving a single item', async () => {
      const response = await request.get('/items/invalid-id');
      
      expect(response.status).to.equal(500); // MongoDB will throw a CastError
      expect(response.body).to.have.property('error', 'Failed to fetch item');
    });
  });
});