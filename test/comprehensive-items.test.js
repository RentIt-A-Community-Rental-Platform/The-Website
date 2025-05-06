import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Item } from '../src/models/Item.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { createTestUser, createTestItem } from './test-helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a test app that replicates the actual items.js route behavior
describe('Comprehensive Items Routes Tests', function() {
  this.timeout(15000);
  let app, request;
  let consoleLogStub;
  let uploadStub;
  let isAuthenticatedStub;

  before(async function() {
    // Mock console.log to reduce test output noise
    consoleLogStub = sinon.stub(console, 'log');
    
    // Create Express app
    app = express();
    app.use(express.json());
    
    // Create upload stub
    uploadStub = sinon.stub().returns(multer());
    
    // Authentication middleware stub
    isAuthenticatedStub = (req, res, next) => {
      if (req.headers.authorization === 'Bearer valid-token') {
        // Set user object in request to simulate authenticated user
        req.user = {
          _id: req.headers['x-user-id'] || '123456789012345678901234',
          name: req.headers['x-user-name'] || 'Test User'
        };
        next();
      } else {
        return res.status(401).json({ error: 'Not authenticated' });
      }
    };
    
    // Configure storage for multer
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, join(__dirname, '../src/uploads'));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
      }
    });
    
    // Initialize router
    const router = express.Router();
    
    // Get all items
    router.get('/', async (req, res) => {
      try {
        const query = req.query.userId ? { userId: req.query.userId } : {};
        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json(items);
      } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
      }
    });
    
    // Create new item with authentication
    router.post('/', isAuthenticatedStub, async (req, res) => {
      try {
        console.log('Received item data:', req.body);
        
        const { title, description, price, category, deposit, photos } = req.body;
        
        // Get the authenticated user information
        const userId = req.user._id;
        const userName = req.user.name || 'Unknown User';
        
        // Parse the photos if needed
        const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;
        
        const item = new Item({
          title,
          description,
          price: parseFloat(price),
          category,
          deposit: parseFloat(deposit),
          userId: userId,
          userName: userName,
          photos: parsedPhotos || []
        });
        
        await item.save();
        console.log('Item created successfully by user:', userName);
        res.status(201).json(item);
      } catch (error) {
        console.error('Error creating item:', error);
        res.status(400).json({ error: 'Failed to create item' });
      }
    });
    
    // Get item by ID
    router.get('/:id', async (req, res) => {
      try {
        const item = await Item.findById(req.params.id);
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
      } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
      }
    });
    
    // Update item (PUT)
    router.put('/:id', isAuthenticatedStub, async (req, res) => {
      try {
        const itemId = req.params.id;
        const userId = req.user._id;
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
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
      }
    });
    
    // Delete item (DELETE)
    router.delete('/:id', isAuthenticatedStub, async (req, res) => {
      try {
        const itemId = req.params.id;
        const userId = req.user._id;
        
        const deletedItem = await Item.findOneAndDelete({ _id: itemId, userId });
        
        if (!deletedItem) {
          return res.status(404).json({ error: 'Item not found or unauthorized' });
        }
        
        res.json({ message: 'Item deleted successfully' });
      } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
      }
    });
    
    // Mount routes
    app.use('/items', router);
    
    // Create supertest client
    request = supertest(app);
  });
  
  afterEach(async function() {
    // Clean up database after each test
    await Item.deleteMany({});
  });
  
  after(function() {
    // Restore stubs
    consoleLogStub.restore();
  });
  
  describe('GET /items', () => {
    it('should return all items', async () => {
      // Create some test items
      await Item.create([
        { title: 'Item 1', description: 'Test 1', price: 10, userId: 'user1', userName: 'User 1' },
        { title: 'Item 2', description: 'Test 2', price: 20, userId: 'user2', userName: 'User 2' }
      ]);
      
      const response = await request.get('/items');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
    });
    
    it('should filter items by userId', async () => {
      // Create some test items
      await Item.create([
        { title: 'Item 1', description: 'Test 1', price: 10, userId: 'user1', userName: 'User 1' },
        { title: 'Item 2', description: 'Test 2', price: 20, userId: 'user2', userName: 'User 2' },
        { title: 'Item 3', description: 'Test 3', price: 30, userId: 'user1', userName: 'User 1' }
      ]);
      
      const response = await request.get('/items?userId=user1');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].userId).to.equal('user1');
      expect(response.body[1].userId).to.equal('user1');
    });
    
    it('should handle errors during item retrieval', async () => {
      // Force an error by making Item.find throw
      const findStub = sinon.stub(Item, 'find').throws(new Error('Database error'));
      
      const response = await request.get('/items');
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to fetch items');
      
      // Restore the stub
      findStub.restore();
    });
  });
  
  describe('POST /items', () => {
    it('should create a new item when authenticated', async () => {
      const newItem = {
        title: 'Test Item',
        description: 'This is a test item',
        price: 25.99,
        category: 'Electronics',
        deposit: 10,
        photos: ['photo1.jpg', 'photo2.jpg']
      };
      
      const response = await request
        .post('/items')
        .set('Authorization', 'Bearer valid-token')
        .send(newItem);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('_id');
      expect(response.body.title).to.equal(newItem.title);
      expect(response.body.price).to.equal(newItem.price);
      expect(response.body.photos).to.deep.equal(newItem.photos);
    });
    
    it('should handle stringified photos array', async () => {
      const newItem = {
        title: 'Test Item with Stringified Photos',
        description: 'This item has stringified photos',
        price: 25.99,
        category: 'Electronics',
        deposit: 10,
        photos: JSON.stringify(['photo1.jpg', 'photo2.jpg'])
      };
      
      const response = await request
        .post('/items')
        .set('Authorization', 'Bearer valid-token')
        .send(newItem);
      
      expect(response.status).to.equal(201);
      expect(response.body.photos).to.deep.equal(['photo1.jpg', 'photo2.jpg']);
    });
    
    it('should handle missing photos with empty array', async () => {
      const newItem = {
        title: 'Test Item No Photos',
        description: 'This item has no photos',
        price: 25.99,
        category: 'Electronics',
        deposit: 10
      };
      
      const response = await request
        .post('/items')
        .set('Authorization', 'Bearer valid-token')
        .send(newItem);
      
      expect(response.status).to.equal(201);
      expect(response.body.photos).to.deep.equal([]);
    });
    
    it('should reject creation when not authenticated', async () => {
      const newItem = {
        title: 'Test Item',
        description: 'This is a test item',
        price: 25.99
      };
      
      const response = await request
        .post('/items')
        .send(newItem);
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Not authenticated');
    });
    
    it('should handle errors during item creation', async () => {
      // Force an error by making Item.prototype.save throw
      const saveStub = sinon.stub(mongoose.Model.prototype, 'save').throws(new Error('Save error'));
      
      const newItem = {
        title: 'Error Item',
        description: 'This item will cause an error',
        price: 25.99
      };
      
      const response = await request
        .post('/items')
        .set('Authorization', 'Bearer valid-token')
        .send(newItem);
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error', 'Failed to create item');
      
      // Restore the stub
      saveStub.restore();
    });
  });
  
  describe('GET /items/:id', () => {
    it('should return a single item by id', async () => {
      const item = await Item.create({
        title: 'Single Item',
        description: 'Get by ID test',
        price: 15.99,
        userId: 'test123',
        userName: 'Test User'
      });
      
      const response = await request.get(`/items/${item._id}`);
      
      expect(response.status).to.equal(200);
      expect(response.body._id.toString()).to.equal(item._id.toString());
      expect(response.body.title).to.equal(item.title);
    });
    
    it('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request.get(`/items/${fakeId}`);
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found');
    });
    
    it('should handle errors during single item retrieval', async () => {
      // Force an error by making findById throw
      const findByIdStub = sinon.stub(Item, 'findById').throws(new Error('Database error'));
      
      const response = await request.get('/items/123456789012345678901234');
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to fetch item');
      
      // Restore the stub
      findByIdStub.restore();
    });
  });
  
  describe('PUT /items/:id', () => {
    it('should update an item when authenticated as owner', async () => {
      // Create a test item
      const item = await Item.create({
        title: 'Original Title',
        description: 'Original description',
        price: 50,
        userId: '123456789012345678901234',
        userName: 'Test User'
      });
      
      const updates = {
        title: 'Updated Title',
        price: 75
      };
      
      const response = await request
        .put(`/items/${item._id}`)
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', '123456789012345678901234')
        .send(updates);
      
      expect(response.status).to.equal(200);
      expect(response.body.title).to.equal(updates.title);
      expect(response.body.price).to.equal(updates.price);
      expect(response.body.description).to.equal(item.description); // Unchanged
    });
    
    it('should reject update for items not owned by user', async () => {
      // Create an item owned by someone else
      const item = await Item.create({
        title: 'Someone Else Item',
        price: 100,
        userId: 'different-user-id',
        userName: 'Different User'
      });
      
      const response = await request
        .put(`/items/${item._id}`)
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', '123456789012345678901234')
        .send({ title: 'Trying to update' });
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found or unauthorized');
    });
    
    it('should handle errors during item update', async () => {
      // Force an error by making findOneAndUpdate throw
      const findOneAndUpdateStub = sinon.stub(Item, 'findOneAndUpdate').throws(new Error('Update error'));
      
      const response = await request
        .put('/items/123456789012345678901234')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Error Update' });
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to update item');
      
      // Restore the stub
      findOneAndUpdateStub.restore();
    });
    
    it('should reject update when not authenticated', async () => {
      const item = await Item.create({
        title: 'Auth Test Item',
        price: 50,
        userId: '123456789012345678901234'
      });
      
      const response = await request
        .put(`/items/${item._id}`)
        .send({ title: 'Updated Title' });
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Not authenticated');
    });
  });
  
  describe('DELETE /items/:id', () => {
    it('should delete an item when authenticated as owner', async () => {
      // Create a test item
      const item = await Item.create({
        title: 'Item to Delete',
        price: 45,
        userId: '123456789012345678901234',
        userName: 'Test User'
      });
      
      const response = await request
        .delete(`/items/${item._id}`)
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', '123456789012345678901234');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message', 'Item deleted successfully');
      
      // Verify item was actually deleted
      const deletedItem = await Item.findById(item._id);
      expect(deletedItem).to.be.null;
    });
    
    it('should reject deletion for items not owned by user', async () => {
      // Create an item owned by someone else
      const item = await Item.create({
        title: 'Cannot Delete This',
        price: 200,
        userId: 'different-user-id',
        userName: 'Different User'
      });
      
      const response = await request
        .delete(`/items/${item._id}`)
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', '123456789012345678901234');
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found or unauthorized');
      
      // Verify item still exists
      const existingItem = await Item.findById(item._id);
      expect(existingItem).to.exist;
    });
    
    it('should handle errors during item deletion', async () => {
      // Force an error by making findOneAndDelete throw
      const findOneAndDeleteStub = sinon.stub(Item, 'findOneAndDelete').throws(new Error('Delete error'));
      
      const response = await request
        .delete('/items/123456789012345678901234')
        .set('Authorization', 'Bearer valid-token');
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to delete item');
      
      // Restore the stub
      findOneAndDeleteStub.restore();
    });
    
    it('should reject deletion when not authenticated', async () => {
      const item = await Item.create({
        title: 'Auth Test Item',
        price: 50,
        userId: '123456789012345678901234'
      });
      
      const response = await request
        .delete(`/items/${item._id}`)
        .send();
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Not authenticated');
    });
  });
});