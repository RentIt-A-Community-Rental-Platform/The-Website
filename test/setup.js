import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables
dotenv.config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
process.env.CLOUDINARY_API_KEY = 'test-key';
process.env.CLOUDINARY_API_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GEMINI_API_KEY = 'test-gemini-key';

let mongoServer;

// Global test configuration
export const mochaHooks = {
  beforeAll: async function() {
    this.timeout(30000); // Increase timeout for database setup
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    process.env.MONGODB_URI = mongoUri;
  },
  afterAll: async function() {
    this.timeout(30000); // Increase timeout for database teardown
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  },
  beforeEach: async function() {
    this.timeout(10000); // Increase timeout for database clearing
    await Promise.all([
      mongoose.connection.collections.users?.deleteMany({}),
      mongoose.connection.collections.items?.deleteMany({}),
      mongoose.connection.collections.rentals?.deleteMany({}),
      mongoose.connection.collections.reviews?.deleteMany({})
    ]);
  }
};

// Mocha configuration
export const mochaConfig = {
  timeout: 30000, // Increase global timeout
  slow: 1000,
  bail: true,
  exit: true
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Handle mongoose connection errors
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
}); 