import { expect } from 'chai';
import request from 'supertest';
import { testApp } from '../setup.js';
import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';
import itemRoutes from '../../src/routes/items.js';

// Mount item routes on test app
testApp.use('/items', itemRoutes);

describe('Item Routes', () => {
  let testUser;
  let testItem;
  let token;

  before(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User'
    });

    // Get token
    const login = await request(testApp)
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: 'password123'
      });
    token = login.body.token;

    // Create test item
    testItem = await Item.create({
      title: 'Test Item',
      description: 'A test item',
      price: 50,
      condition: 'Good',
      category: 'Electronics',
      userId: testUser._id,
      userName: testUser.name,
      photos: ['photo1.jpg', 'photo2.jpg'],
      location: {
        type: 'Point',
        coordinates: [-73.935242, 40.730610]
      },
      availability: {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  });

  after(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
  });

  describe('POST /items', () => {
    it('should create a new item with full data', async () => {
      const itemData = {
        title: 'New Item',
        description: 'A new item',
        price: 100,
        condition: 'New',
        category: 'Electronics',
        photos: ['photo1.jpg', 'photo2.jpg'],
        location: {
          type: 'Point',
          coordinates: [-73.935242, 40.730610]
        },
        availability: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      };

      const res = await request(testApp)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      expect(res.status).to.equal(201);
      expect(res.body).to.exist;
    });

    it('should create item with minimal data', async () => {
      const itemData = {
        title: 'Minimal Item',
        description: 'Minimal description',
        price: 50,
        category: 'Electronics'
      };

      const res = await request(testApp)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      expect(res.status).to.equal(201);
      expect(res.body).to.exist;
    });

    it('should create item with stringified photos', async () => {
      const itemData = {
        title: 'Stringified Photos Item',
        description: 'Item with stringified photos',
        price: 50,
        category: 'Electronics',
        photos: JSON.stringify(['photo1.jpg', 'photo2.jpg'])
      };

      const res = await request(testApp)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      expect(res.status).to.equal(201);
      expect(res.body).to.exist;
    });

    it('should fail without authentication', async () => {
      const res = await request(testApp)
        .post('/items')
        .send({ title: 'New Item' });

      expect(res.status).to.equal(401);
    });

    it('should handle server error', async () => {
      const itemData = {
        title: 'Error Item',
        description: 'Item that causes error',
        price: 'invalid-price',
        category: 'Electronics'
      };

      const res = await request(testApp)
        .post('/items')
        .set('Authorization', `Bearer ${token}`)
        .send(itemData);

      expect(res.status).to.equal(500);
    });
  });

  describe('GET /items', () => {
    it('should get all items', async () => {
      const res = await request(testApp)
        .get('/items');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should filter items by category', async () => {
      const res = await request(testApp)
        .get('/items?category=Electronics');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should filter items by price range', async () => {
      const res = await request(testApp)
        .get('/items?minPrice=0&maxPrice=100');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should search items by title', async () => {
      const res = await request(testApp)
        .get('/items?search=Test');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should filter items by userId', async () => {
      const res = await request(testApp)
        .get(`/items?userId=${testUser._id}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should exclude items by userId', async () => {
      const res = await request(testApp)
        .get(`/items?excludeUserId=${testUser._id}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should filter items by location', async () => {
      const res = await request(testApp)
        .get('/items?lat=40.730610&lng=-73.935242&radius=10');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should filter items by availability', async () => {
      const res = await request(testApp)
        .get('/items?startDate=' + new Date().toISOString() + '&endDate=' + new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should handle empty results', async () => {
      await Item.deleteMany({});
      const res = await request(testApp)
        .get('/items');

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').that.is.empty;
    });

    it('should handle server error', async () => {
      const res = await request(testApp)
        .get('/items?invalid=true');

      expect(res.status).to.equal(500);
    });
  });

  describe('GET /items/:id', () => {
    it('should get item by id', async () => {
      const res = await request(testApp)
        .get(`/items/${testItem._id}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should fail with non-existent item', async () => {
      const res = await request(testApp)
        .get('/items/507f1f77bcf86cd799439011');

      expect(res.status).to.equal(404);
    });

    it('should handle server error', async () => {
      const res = await request(testApp)
        .get('/items/invalid-id');

      expect(res.status).to.equal(500);
    });
  });

  describe('PUT /items/:id', () => {
    it('should update item with full data', async () => {
      const updateData = {
        title: 'Updated Item',
        description: 'Updated description',
        price: 75,
        condition: 'Like New',
        category: 'Electronics',
        photos: ['photo3.jpg', 'photo4.jpg'],
        location: {
          type: 'Point',
          coordinates: [-73.935242, 40.730610]
        },
        availability: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      };

      const res = await request(testApp)
        .put(`/items/${testItem._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should update item with minimal data', async () => {
      const updateData = {
        title: 'Minimal Update'
      };

      const res = await request(testApp)
        .put(`/items/${testItem._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should update item with stringified photos', async () => {
      const updateData = {
        photos: JSON.stringify(['photo3.jpg', 'photo4.jpg'])
      };

      const res = await request(testApp)
        .put(`/items/${testItem._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should fail without authentication', async () => {
      const res = await request(testApp)
        .put(`/items/${testItem._id}`)
        .send({ title: 'Updated Item' });

      expect(res.status).to.equal(401);
    });

    it('should fail with non-existent item', async () => {
      const res = await request(testApp)
        .put('/items/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Item' });

      expect(res.status).to.equal(404);
    });

    it('should handle server error', async () => {
      const res = await request(testApp)
        .put('/items/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Item' });

      expect(res.status).to.equal(500);
    });
  });

  describe('DELETE /items/:id', () => {
    it('should delete item', async () => {
      const res = await request(testApp)
        .delete(`/items/${testItem._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
    });

    it('should fail without authentication', async () => {
      const res = await request(testApp)
        .delete(`/items/${testItem._id}`);

      expect(res.status).to.equal(401);
    });

    it('should fail with non-existent item', async () => {
      const res = await request(testApp)
        .delete('/items/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(404);
    });

    it('should handle server error', async () => {
      const res = await request(testApp)
        .delete('/items/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(500);
    });
  });
}); 