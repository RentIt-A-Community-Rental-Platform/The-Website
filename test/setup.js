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
    
    // Create new MongoDB Memory Server instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Disconnect from any existing connection
    await mongoose.disconnect();
    
    // Connect to the new server with proper options
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    // Set environment variables
    process.env.MONGODB_URI = mongoUri;
    
    console.log('Test database connected successfully');
  },
  
  afterAll: async function() {
    this.timeout(30000); // Increase timeout for database teardown
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    
    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('Test database disconnected successfully');
  },
  
  beforeEach: async function() {
    this.timeout(10000); // Increase timeout for database clearing
    
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
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

// Handle mongoose connection success
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

// Handle mongoose disconnection
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
  process.exit(0);
}); 