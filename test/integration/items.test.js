import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { app } from '../app.js';
import { createTestUser, generateAuthHeader } from '../helpers/testUtils.js';
import { Item } from '../../src/models/Item.js';

// Load environment variables
dotenv.config();

describe('Items Routes', () => {
  let authToken;
  let testItem;
  let mongoServer;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    const { token } = await createTestUser(app);
    authToken = token;
  });

  beforeEach(async () => {
    await Item.deleteMany({});
    testItem = {
      title: 'Test Item',
      description: 'This is a test item',
      price: 100,
      category: 'Electronics',
      condition: 'New',
      location: 'New York',
      availability: true
    };
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /items', () => {
    it('should create a new item', async () => {
      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testItem)
        .expect(201);

      expect(response.body.item).to.have.property('title', testItem.title);
      expect(response.body.item).to.have.property('description', testItem.description);
      expect(response.body.item).to.have.property('price', testItem.price);
      expect(response.body.item).to.have.property('category', testItem.category);
      expect(response.body.item).to.have.property('condition', testItem.condition);
      expect(response.body.item).to.have.property('location', testItem.location);
      expect(response.body.item).to.have.property('availability', testItem.availability);
    });

    it('should not create an item without authentication', async () => {
      const response = await request(app)
        .post('/items')
        .send(testItem)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });

    it('should not create an item with missing required fields', async () => {
      const invalidItem = { ...testItem };
      delete invalidItem.title;

      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItem)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('title');
    });

    it('should not create an item with invalid price', async () => {
      const invalidItem = { ...testItem, price: -100 };

      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItem)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('price');
    });

    it('should not create an item with invalid category', async () => {
      const invalidItem = { ...testItem, category: 'InvalidCategory' };

      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidItem)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('category');
    });
  });

  describe('GET /items', () => {
    beforeEach(async () => {
      // Create multiple items with different categories
      await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testItem);

      await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testItem,
          title: 'Another Item',
          category: 'Furniture'
        });
    });

    it('should get all items', async () => {
      const response = await request(app)
        .get('/items')
        .expect(200);

      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.lengthOf(2);
      expect(response.body.items[0]).to.have.property('title', testItem.title);
    });

    it('should filter items by category', async () => {
      const response = await request(app)
        .get('/items')
        .query({ category: testItem.category })
        .expect(200);

      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.lengthOf(1);
      expect(response.body.items[0]).to.have.property('category', testItem.category);
    });

    it('should filter items by price range', async () => {
      const response = await request(app)
        .get('/items')
        .query({ minPrice: 50, maxPrice: 150 })
        .expect(200);

      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.lengthOf(2);
      response.body.items.forEach(item => {
        expect(item.price).to.be.at.least(50).and.at.most(150);
      });
    });

    it('should filter items by availability', async () => {
      const response = await request(app)
        .get('/items')
        .query({ availability: true })
        .expect(200);

      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.lengthOf(2);
      response.body.items.forEach(item => {
        expect(item.availability).to.be.true;
      });
    });

    it('should sort items by price', async () => {
      const response = await request(app)
        .get('/items')
        .query({ sort: 'price' })
        .expect(200);

      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.lengthOf(2);
      expect(response.body.items[0].price).to.be.at.most(response.body.items[1].price);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/items')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.items).to.be.an('array');
      expect(response.body.items).to.have.lengthOf(1);
      expect(response.body).to.have.property('totalPages');
      expect(response.body).to.have.property('currentPage', 1);
    });
  });

  describe('GET /items/:id', () => {
    let itemId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testItem);
      itemId = response.body.item._id;
    });

    it('should get an item by id', async () => {
      const response = await request(app)
        .get(`/items/${itemId}`)
        .expect(200);

      expect(response.body.item).to.have.property('title', testItem.title);
      expect(response.body.item).to.have.property('_id', itemId);
      expect(response.body.item).to.have.property('owner');
    });

    it('should return 404 for non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/items/${nonExistentId}`)
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('not found');
    });

    it('should return 400 for invalid item id', async () => {
      const response = await request(app)
        .get('/items/invalid-id')
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('invalid');
    });
  });

  describe('PUT /items/:id', () => {
    let itemId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testItem);
      itemId = response.body.item._id;
    });

    it('should update an item', async () => {
      const updates = {
        title: 'Updated Title',
        price: 150,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.item).to.have.property('title', updates.title);
      expect(response.body.item).to.have.property('price', updates.price);
      expect(response.body.item).to.have.property('description', updates.description);
    });

    it('should not update an item without authentication', async () => {
      const updates = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/items/${itemId}`)
        .send(updates)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });

    it('should not update an item with invalid data', async () => {
      const updates = {
        price: -100
      };

      const response = await request(app)
        .put(`/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('price');
    });

    it('should not update a non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updates = {
        title: 'Updated Title'
      };

      const response = await request(app)
        .put(`/items/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('not found');
    });
  });

  describe('DELETE /items/:id', () => {
    let itemId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testItem);
      itemId = response.body.item._id;
    });

    it('should delete an item', async () => {
      await request(app)
        .delete(`/items/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response = await request(app)
        .get(`/items/${itemId}`)
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('not found');
    });

    it('should not delete an item without authentication', async () => {
      const response = await request(app)
        .delete(`/items/${itemId}`)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });

    it('should not delete a non-existent item', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/items/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('not found');
    });

    it('should not delete an item with invalid id', async () => {
      const response = await request(app)
        .delete('/items/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('invalid');
    });
  });
}); 