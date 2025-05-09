import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { app } from '../app.js';
import { createTestUser, createTestItem } from '../helpers/testUtils.js';

// Load environment variables
dotenv.config();

describe('Reviews Routes', () => {
  let mongoServer;
  let authToken;
  let itemId;

  before(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    process.env.NODE_ENV = 'test';

    // Create test user and item
    const { token } = await createTestUser(app);
    authToken = token;

    const item = await createTestItem(app, authToken);
    itemId = item._id;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /review', () => {
    it('should create a new review', async () => {
      const reviewData = {
        itemId,
        rating: 5,
        comment: 'Great item, exactly as described!',
        title: 'Excellent Experience'
      };

      const response = await request(app)
        .post('/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body).to.have.property('review');
      expect(response.body.review).to.have.property('rating', reviewData.rating);
      expect(response.body.review).to.have.property('comment', reviewData.comment);
    });

    it('should not create a review without authentication', async () => {
      const reviewData = {
        itemId,
        rating: 5,
        comment: 'Great item!'
      };

      const response = await request(app)
        .post('/review')
        .send(reviewData)
        .expect(401);

      expect(response.body).to.have.property('error');
    });

    it('should not create a review with invalid data', async () => {
      const invalidData = {
        itemId,
        rating: 6, // Invalid rating
        comment: ''
      };

      const response = await request(app)
        .post('/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).to.have.property('error');
    });
  });

  describe('GET /review/item/:itemId', () => {
    let reviewId;

    beforeEach(async () => {
      // Create a test review
      const reviewData = {
        itemId,
        rating: 5,
        comment: 'Great item!',
        title: 'Test Review'
      };

      const response = await request(app)
        .post('/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData);

      reviewId = response.body.review._id;
    });

    it('should get all reviews for an item', async () => {
      const response = await request(app)
        .get(`/review/item/${itemId}`)
        .expect(200);

      expect(response.body).to.have.property('reviews');
      expect(response.body.reviews).to.be.an('array');
      expect(response.body.reviews[0]).to.have.property('rating', 5);
    });

    it('should return empty array for item with no reviews', async () => {
      const newItem = await createTestItem(app, authToken);
      
      const response = await request(app)
        .get(`/review/item/${newItem._id}`)
        .expect(200);

      expect(response.body).to.have.property('reviews');
      expect(response.body.reviews).to.be.an('array').that.is.empty;
    });
  });

  describe('DELETE /review/:id', () => {
    let reviewId;

    beforeEach(async () => {
      // Create a test review
      const reviewData = {
        itemId,
        rating: 5,
        comment: 'Great item!',
        title: 'Test Review'
      };

      const response = await request(app)
        .post('/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData);

      reviewId = response.body.review._id;
    });

    it('should delete a review', async () => {
      const response = await request(app)
        .delete(`/review/${reviewId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('message', 'Review deleted successfully');
    });

    it('should not delete a review without authentication', async () => {
      const response = await request(app)
        .delete(`/review/${reviewId}`)
        .expect(401);

      expect(response.body).to.have.property('error');
    });

    it('should not delete a non-existent review', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/review/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).to.have.property('error');
    });
  });
}); 