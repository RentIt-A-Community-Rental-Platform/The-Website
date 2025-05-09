import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';

let mongoServer;

export const setupTestDB = async () => {
  try {
    // Stop any existing server
    if (mongoServer) {
      await mongoServer.stop();
    }

    // Create new server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Disconnect from any existing connection
    await mongoose.disconnect();

    // Connect to the new server
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Set environment variables
    process.env.MONGODB_URI = mongoUri;
    process.env.NODE_ENV = 'test';

    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
};

export const teardownTestDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('Test database disconnected successfully');
  } catch (error) {
    console.error('Error tearing down test database:', error);
    throw error;
  }
};

export const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const createTestUser = async (app) => {
  const userData = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  };

  const user = await User.create(userData);
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  return { user, token };
};

export const createTestItem = async (app, authToken) => {
  const itemData = {
    title: 'Test Item',
    description: 'This is a test item',
    price: 100,
    category: 'Electronics',
    condition: 'New',
    location: 'New York',
    availability: true
  };

  const response = await request(app)
    .post('/items')
    .set('Authorization', `Bearer ${authToken}`)
    .send(itemData);

  return response.body.item;
};

export const generateAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`
});

export const createTestRental = async (app, authToken, itemId) => {
  const rentalData = {
    itemId,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalPrice: 700
  };

  const response = await request(app)
    .post('/rentals')
    .set('Authorization', `Bearer ${authToken}`)
    .send(rentalData);

  return response.body.rental;
};

export const createTestReview = async (app, authToken, itemId) => {
  const reviewData = {
    itemId,
    rating: 5,
    comment: 'Great item, exactly as described!',
    title: 'Excellent Experience'
  };

  const response = await request(app)
    .post('/review')
    .set('Authorization', `Bearer ${authToken}`)
    .send(reviewData);

  return response.body.review;
}; 