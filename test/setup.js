// Global test setup
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables
dotenv.config({ path: '.env.test' });

// Use in-memory MongoDB for testing to avoid dependency on external database
let mongoServer;

// Setup MongoDB connection for testing
before(async function() {
  this.timeout(30000); // Allow 30 seconds for in-memory MongoDB setup
  
  // Create in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoURI = mongoServer.getUri();
  
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('> Connected to in-memory test database');
  } catch (err) {
    console.error('> Test database connection error:', err);
    process.exit(1);
  }
});

// Clean up database after all tests
after(async function() {
  this.timeout(5000);
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('> Test database dropped and connection closed');
  }
});

// Clear collections between tests to ensure test isolation
afterEach(async function() {
  this.timeout(5000);
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});