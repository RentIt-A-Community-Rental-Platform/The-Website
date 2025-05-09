import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { app } from '../app.js';
import { createTestUser, createTestItem, generateAuthHeader } from '../helpers/testUtils.js';

// Load environment variables
dotenv.config();

describe('Rentals Routes', () => {
  let authToken;
  let itemId;
  let testRental;
  let mongoServer;

  before(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    process.env.NODE_ENV = 'test';

    const { token } = await createTestUser(app);
    authToken = token;

    const item = await createTestItem(app, authToken);
    itemId = item._id;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    testRental = {
      itemId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      totalPrice: 700
    };
  });

  describe('POST /rentals', () => {
    it('should create a new rental', async () => {
      const response = await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental)
        .expect(201);

      expect(response.body.rental).to.have.property('itemId', itemId);
      expect(response.body.rental).to.have.property('totalPrice', testRental.totalPrice);
      expect(response.body.rental).to.have.property('status', 'pending');
    });

    it('should not create a rental without authentication', async () => {
      const response = await request(app)
        .post('/rentals')
        .send(testRental)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });

    it('should not create a rental for an unavailable item', async () => {
      // First rental
      await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental);

      // Second rental for the same period
      const response = await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('not available');
    });
  });

  describe('GET /rentals', () => {
    beforeEach(async () => {
      await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental);
    });

    it('should get all rentals for the user', async () => {
      const response = await request(app)
        .get('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.rentals).to.be.an('array');
      expect(response.body.rentals[0]).to.have.property('itemId', itemId);
    });

    it('should not get rentals without authentication', async () => {
      const response = await request(app)
        .get('/rentals')
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });
  });

  describe('GET /rentals/:id', () => {
    let rentalId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental);
      rentalId = response.body.rental._id;
    });

    it('should get a rental by id', async () => {
      const response = await request(app)
        .get(`/rentals/${rentalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.rental).to.have.property('_id', rentalId);
      expect(response.body.rental).to.have.property('itemId', itemId);
    });

    it('should not get a rental without authentication', async () => {
      const response = await request(app)
        .get(`/rentals/${rentalId}`)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });
  });

  describe('PUT /rentals/:id', () => {
    let rentalId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental);
      rentalId = response.body.rental._id;
    });

    it('should update rental status', async () => {
      const updates = {
        status: 'confirmed'
      };

      const response = await request(app)
        .put(`/rentals/${rentalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.rental).to.have.property('status', updates.status);
    });

    it('should not update rental without authentication', async () => {
      const updates = {
        status: 'confirmed'
      };

      const response = await request(app)
        .put(`/rentals/${rentalId}`)
        .send(updates)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });
  });

  describe('DELETE /rentals/:id', () => {
    let rentalId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/rentals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testRental);
      rentalId = response.body.rental._id;
    });

    it('should cancel a rental', async () => {
      const response = await request(app)
        .delete(`/rentals/${rentalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.rental).to.have.property('status', 'cancelled');
    });

    it('should not cancel rental without authentication', async () => {
      const response = await request(app)
        .delete(`/rentals/${rentalId}`)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });
  });
}); 