import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from '../src/config/passport.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

// Load test environment variables
dotenv.config();

// Create test app instance
const testApp = express();

// File path setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
testApp.use(cors());
testApp.use(express.json({ limit: '10mb' }));
testApp.use(express.urlencoded({ extended: true, limit: '10mb' }));
testApp.use(express.static('public'));
testApp.use('/uploads', express.static(join(__dirname, '../src/uploads')));

// Session & Passport setup
testApp.use(session({
    secret: process.env.SESSION_SECRET || 'test-secret',
    resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));
testApp.use(passport.initialize());
testApp.use(passport.session());

// Root API test
testApp.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'University Rentals API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      items: {
        list: '/items',
        create: '/items',
        update: '/items/:id',
        delete: '/items/:id'
      },
      auth: {
        login: '/auth/login',
        register: '/auth/register',
        google: '/auth/google',
        logout: '/auth/logout'
      }
    }
  });
});

// Error test route
testApp.get('/api/error-test', (req, res, next) => {
  next(new Error('Test error'));
});

// Error handling middleware
testApp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
testApp.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Ensure uploads directory exists
try {
  mkdirSync(join(__dirname, '../src/uploads'), { recursive: true });
  console.log('> Uploads directory ready');
} catch (error) {
  console.error('> Error creating uploads directory:', error);
}

let mongod;

before(async function() {
  this.timeout(10000);
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

after(async function() {
  this.timeout(5000);
  await mongoose.connection.close();
  await mongod.stop();
});

// Increase the timeout for the beforeEach hook
beforeEach(async function() {
  this.timeout(5000); // 5 seconds timeout
  try {
    // Clear all collections between tests
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
});

export { testApp }; 