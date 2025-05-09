import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

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
  await Promise.all([
    mongoose.connection.collections.users?.deleteMany({}),
    mongoose.connection.collections.items?.deleteMany({}),
    mongoose.connection.collections.rentals?.deleteMany({}),
    mongoose.connection.collections.reviews?.deleteMany({})
  ]);
};

export const createTestUser = async (app, userData = {}) => {
  const defaultUserData = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
    ...userData
  };

  await request(app)
    .post('/auth/register')
    .send(defaultUserData);

  const loginResponse = await request(app)
    .post('/auth/login')
    .send({
      email: defaultUserData.email,
      password: defaultUserData.password
    });

  return {
    user: defaultUserData,
    token: loginResponse.body.token
  };
};

export const createTestItem = async (app, authToken, itemData = {}) => {
  const defaultItemData = {
    title: 'Test Item',
    description: 'This is a test item',
    price: 100,
    category: 'Electronics',
    condition: 'New',
    ...itemData
  };

  const response = await request(app)
    .post('/items')
    .set('Authorization', `Bearer ${authToken}`)
    .send(defaultItemData);

  return response.body.item;
};

export const createTestRental = async (app, authToken, itemId, rentalData = {}) => {
  const defaultRentalData = {
    itemId,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalPrice: 700,
    ...rentalData
  };

  const response = await request(app)
    .post('/rentals')
    .set('Authorization', `Bearer ${authToken}`)
    .send(defaultRentalData);

  return response.body.rental;
};

export const createTestReview = async (app, authToken, itemId, reviewData = {}) => {
  const defaultReviewData = {
    itemId,
    rating: 5,
    comment: 'Great item, exactly as described!',
    title: 'Excellent Experience',
    ...reviewData
  };

  const response = await request(app)
    .post('/review')
    .set('Authorization', `Bearer ${authToken}`)
    .send(defaultReviewData);

  return response.body.review;
};

export const generateAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`
}); 