import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import request from 'supertest';
import app from '../src/index.js';
import { User } from '../src/models/User.js';

// Set up Mongoose connection management for tests
before(async function() {
  this.timeout(15000); // Increase timeout for connection
  
  try {
    // Use default test URI if environment variable isn't available
    const mongoURI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/university-rental-platform-test';
    
    // Connect with proper error handling
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Test Connection Successful');
  } catch (error) {
    console.error('MongoDB Test Connection Error:', error);
    throw error; // Rethrow to fail the tests
  }
});

after(async function() {
  this.timeout(10000); // Increase timeout for disconnection
  
  try {
    await mongoose.connection.close();
    console.log('MongoDB Test Connection Closed');
  } catch (error) {
    console.error('MongoDB Test Disconnection Error:', error);
    throw error;
  }
});

describe('Auth Routes', () => {
  const email = 'auth@test.com';
  const password = 'secret123';

  beforeEach(async () => {
    // Clear out users between specs
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email, password, name: 'AuthUser' });

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token').that.is.a('string');
      expect(res.body).to.have.property('user');
      expect(res.body.user).to.include.keys('_id', 'email', 'name');
      expect(res.body.user.email).to.equal(email);
    });

    it('should reject duplicate email registration', async () => {
      // first registration
      await request(app).post('/auth/register').send({ email, password, name: 'AuthUser' });
      // second attempt
      const res = await request(app)
        .post('/auth/register')
        .send({ email, password, name: 'AuthUser' });

      expect(res.status).to.be.oneOf([400, 409, 500]);
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should reject registration with missing email', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ password: 'secret123', name: 'MissingEmail' });
      
      expect(res.status).to.equal(400);
    });
    
    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'secret123', name: 'InvalidEmail' });
      
      expect(res.status).to.equal(400);
    });
    
    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'short@test.com', password: 'short', name: 'ShortPass' });
      
      expect(res.status).to.equal(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // seed a user for login
      const hash = await bcrypt.hash(password, 10);
      await User.create({ email, password: hash, name: 'AuthUser' });
    });

    it.skip('should log in with correct credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token').that.is.a('string');
      expect(res.body.user.email).to.equal(email);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password: 'wrongpass' });

      expect(res.status).to.equal(401);
    });

    it('should reject login for non-existent user', async () => {
      // wipe users
      await User.deleteMany({});
      const res = await request(app)
        .post('/auth/login')
        .send({ email, password });

      expect(res.status).to.equal(401);
    });
  });

  describe('GET /auth/me (session-based)', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).to.equal(401);
    });
    // session-based tests would go here if you set up supertest with cookies
  });

  describe('GET /auth/status (token-based)', () => {
    let token;

    beforeEach(async () => {
      // seed & generate token
      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ email, password: hash, name: 'AuthUser' });
      token = jwt.sign(
        { _id: user._id, email: user.email },
        process.env.JWT_SECRET || 'your-jwt-secret-key',
        { expiresIn: '7d' }
      );
    });

    it('should report not authenticated without token', async () => {
      const res = await request(app).get('/auth/status');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('isAuthenticated', false);
    });

    it('should report authenticated with valid token', async () => {
      const res = await request(app)
        .get('/auth/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('isAuthenticated', true);
      expect(res.body.user).to.include({ email });
    });
  });
});