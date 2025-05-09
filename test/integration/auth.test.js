import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import { app } from '../app.js';
import { User } from '../../src/models/User.js';

// Load environment variables
dotenv.config();

describe('Authentication Routes', () => {
  let mongoServer;

  before(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    process.env.NODE_ENV = 'test';
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).to.have.property('message', 'User registered successfully');
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('email', userData.email);
      expect(response.body.user).to.not.have.property('password');
    });

    it('should not register with invalid email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('email');
    });

    it('should not register with password less than 6 characters', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('password');
    });

    it('should not register with empty name', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: ''
      };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('name');
    });

    it('should not register with existing email', async () => {
      // First registration
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      // Attempt second registration with same email
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Another User'
        })
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('email', 'test@example.com');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Invalid credentials');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Invalid credentials');
    });

    it('should not login with missing email', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: 'password123'
        })
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('email');
    });

    it('should not login with missing password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('password');
    });
  });

  describe('GET /auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property('email', 'test@example.com');
      expect(response.body.user).to.have.property('name', 'Test User');
      expect(response.body.user).to.not.have.property('password');
    });

    it('should not get profile without authentication', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('authentication');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('invalid');
    });

    it('should not get profile with malformed token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'invalid-token')
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('invalid');
    });
  });

  describe('POST /auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login
      await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('message', 'Logged out successfully');
    });

    it('should not logout without authentication', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('authentication');
    });
  });
}); 