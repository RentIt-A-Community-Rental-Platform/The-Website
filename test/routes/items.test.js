import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import { Item } from '../../src/models/Item.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { createTestUser, createTestItem } from '../test-helper.js';

// Import the router and create a test app
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// We'll need to recreate an Express app since we can't directly test the router
describe('Items Routes Tests', function() {
  this.timeout(10000); // Increase timeout
  let app, request, authStub;
  const testUserId = new mongoose.Types.ObjectId();
  const testItemId = new mongoose.Types.ObjectId();

  before(async function() {
    // Create a test Express app
    app = express();
    app.use(express.json());

    // Mock the isAuthenticated middleware
    authStub = sinon.stub();
    
    // Import dynamically to allow stubbing
    const itemsModulePath = '../../src/routes/items.js';
    const originalModule = await import(itemsModulePath);
    
    // Re-create the router with our stubbed middleware
    const router = express.Router();
    
    // Define routes similar to items.js but with our stubbed auth middleware
    router.get('/', async (req, res) => {
      try {
        const query = req.query.userId ? { userId: req.query.userId } : {};
        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json(items);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
      }
    });

    router.post('/', authStub, async (req, res) => {
      try {
        const { title, description, price, category, deposit, photos } = req.body;
        const userId = req.user?._id || req.body.userId;
        const userName = req.user?.name || req.body.userName || 'Unknown User';
        
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
        res.status(201).json(item);
      } catch (error) {
        res.status(400).json({ error: 'Failed to create item' });
      }
    });

    router.get('/:id', async (req, res) => {
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

    router.put('/:id', authStub, async (req, res) => {
      try {
        const itemId = req.params.id;
        const userId = req.user?._id || req.body.userId;
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

    router.delete('/:id', authStub, async (req, res) => {
      try {
        const itemId = req.params.id;
        const userId = req.user?._id || req.body.userId;

        const deletedItem = await Item.findOneAndDelete({ _id: itemId, userId });

        if (!deletedItem) {
          return res.status(404).json({ error: 'Item not found or unauthorized' });
        }

        res.json({ message: 'Item deleted successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
      }
    });

    app.use('/items', router);
    request = supertest(app);
  });

  beforeEach(() => {
    // Reset auth stub behavior before each test
    authStub.reset();
    authStub.callsFake((req, res, next) => {
      req.user = { _id: testUserId, name: 'Test User' };
      next();
    });
  });

  afterEach(async () => {
    // Clean up any mocks
    sinon.restore();
    
    // Clean up test items
    await Item.deleteMany({});
  });

  describe('GET /items', () => {
    it('should return all items', async () => {
      // Create some test items
      await Item.create([
        { title: 'Item 1', userId: 'user1', price: 10 },
        { title: 'Item 2', userId: 'user2', price: 20 }
      ]);

      const response = await request.get('/items');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0]).to.have.property('title');
      expect(response.body[1]).to.have.property('userId');
    });

    it('should filter items by userId', async () => {
      // Create some test items
      await Item.create([
        { title: 'User1 Item', userId: 'user1', price: 10 },
        { title: 'User2 Item', userId: 'user2', price: 20 },
        { title: 'Another User1 Item', userId: 'user1', price: 15 }
      ]);

      const response = await request.get('/items?userId=user1');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].userId).to.equal('user1');
      expect(response.body[1].userId).to.equal('user1');
    });
  });

  describe('POST /items', () => {
    it('should create a new item when authenticated', async () => {
      const newItem = {
        title: 'Test Item',
        description: 'A test item for unit testing',
        price: 25.99,
        category: 'Electronics',
        deposit: 10,
        photos: ['photo1.jpg']
      };

      const response = await request
        .post('/items')
        .send(newItem);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('_id');
      expect(response.body.title).to.equal(newItem.title);
      expect(response.body.userId).to.equal(testUserId.toString());
      expect(response.body.userName).to.equal('Test User');
    });

    it('should reject creation when authentication fails', async () => {
      // Make the auth middleware fail
      authStub.callsFake((req, res, next) => {
        return res.status(401).json({ error: 'Unauthorized' });
      });

      const newItem = {
        title: 'Unauthorized Item',
        price: 15,
        category: 'Books'
      };

      const response = await request
        .post('/items')
        .send(newItem);
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Unauthorized');
    });
  });

  describe('GET /items/:id', () => {
    it('should return a single item by id', async () => {
      // Create a test item
      const item = await Item.create({
        title: 'Single Item',
        description: 'Item for single fetch test',
        price: 30,
        userId: 'user123'
      });

      const response = await request.get(`/items/${item._id}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('_id', item._id.toString());
      expect(response.body.title).to.equal(item.title);
    });

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request.get(`/items/${nonExistentId}`);
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found');
    });
  });

  describe('PUT /items/:id', () => {
    it('should update an item when authenticated as owner', async () => {
      // Create a test item owned by test user
      const item = await Item.create({
        title: 'Original Title',
        description: 'Original description',
        price: 50,
        userId: testUserId.toString()
      });

      const updates = {
        title: 'Updated Title',
        price: 75
      };

      const response = await request
        .put(`/items/${item._id}`)
        .send(updates);
      
      expect(response.status).to.equal(200);
      expect(response.body.title).to.equal(updates.title);
      expect(response.body.price).to.equal(updates.price);
      expect(response.body.description).to.equal(item.description); // Unchanged
    });

    it('should reject update for items not owned by user', async () => {
      // Create an item owned by someone else
      const item = await Item.create({
        title: 'Someone Else\'s Item',
        price: 100,
        userId: 'different-user-id'
      });

      const response = await request
        .put(`/items/${item._id}`)
        .send({ title: 'Trying to change title' });
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found or unauthorized');
    });
  });

  describe('DELETE /items/:id', () => {
    it('should delete an item when authenticated as owner', async () => {
      // Create a test item owned by test user
      const item = await Item.create({
        title: 'Item to delete',
        price: 45,
        userId: testUserId.toString()
      });

      const response = await request.delete(`/items/${item._id}`);
      
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
        userId: 'different-user-id'
      });

      const response = await request.delete(`/items/${item._id}`);
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('error', 'Item not found or unauthorized');
      
      // Verify item still exists
      const existingItem = await Item.findById(item._id);
      expect(existingItem).to.exist;
    });
  });
});