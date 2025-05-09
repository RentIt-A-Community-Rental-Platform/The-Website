import { expect } from 'chai';
import request from 'supertest';
import { testApp } from '../setup.js';
import { User } from '../../src/models/User.js';
import sinon from 'sinon';
import passport from 'passport';
import authRoutes from '../../src/routes/auth.js';

// Mount auth routes on test app
testApp.use('/auth', authRoutes);

describe('Auth Routes', () => {
  let testUser;
  let token;

  before(async () => {
    // Create test user
    testUser = await User.create({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User'
    });

    // Get token
    const login = await request(testApp)
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: 'password123'
      });
    token = login.body.token;
  });

  after(async () => {
    await User.deleteMany({});
  });

  describe('POST /auth/register', () => {
    it('should register a new user with full data', async () => {
      const userData = {
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
        phone: '1234567890',
        address: '123 Test St',
        bio: 'Test bio'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token');
      expect(res.body.user).to.exist;
    });

    it('should register with minimal data', async () => {
      const userData = {
        email: 'minimal@test.com',
        password: 'password123',
        name: 'Minimal User'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('token');
      expect(res.body.user).to.exist;
    });

    it('should fail with existing email', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(400);
    });

    it('should fail with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(400);
    });

    it('should fail with short password', async () => {
      const userData = {
        email: 'short@test.com',
        password: '123',
        name: 'Test User'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(400);
    });

    it('should fail with missing required fields', async () => {
      const userData = {
        email: 'missing@test.com'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(400);
    });

    it('should handle server error', async () => {
      const userData = {
        email: 'error@test.com',
        password: 'password123',
        name: 'Error User',
        invalidField: 'This should cause an error'
      };

      const res = await request(testApp)
        .post('/auth/register')
        .send(userData);

      expect(res.status).to.equal(500);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully', async () => {
      const res = await request(testApp)
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password123'
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token');
      expect(res.body.user).to.exist;
    });

    it('should fail with incorrect password', async () => {
      const res = await request(testApp)
        .post('/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(res.status).to.equal(401);
    });

    it('should fail with non-existent user', async () => {
      const res = await request(testApp)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'password123'
        });

      expect(res.status).to.equal(401);
    });

    it('should fail with missing credentials', async () => {
      const res = await request(testApp)
        .post('/auth/login')
        .send({});

      expect(res.status).to.equal(400);
    });

    it('should handle server error', async () => {
      const res = await request(testApp)
        .post('/auth/login')
        .send({
          email: 'error@test.com',
          password: 'password123',
          invalidField: 'This should cause an error'
        });

      expect(res.status).to.equal(500);
    });
  });

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const res = await request(testApp)
        .get('/auth/google');

      expect(res.status).to.equal(302);
      expect(res.header.location).to.include('accounts.google.com');
    });

    it('should handle server error', async () => {
      const stub = sinon.stub(passport, 'authenticate').throws(new Error('Test error'));
      
      const res = await request(testApp)
        .get('/auth/google');

      expect(res.status).to.equal(500);
      stub.restore();
    });
  });

  describe('GET /auth/google/callback', () => {
    it('should handle successful OAuth callback', async () => {
      const stub = sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        callback(null, { id: '123', email: 'google@test.com' });
      });

      const res = await request(testApp)
        .get('/auth/google/callback');

      expect(res.status).to.equal(302);
      stub.restore();
    });

    it('should handle failed OAuth callback', async () => {
      const stub = sinon.stub(passport, 'authenticate').callsFake((strategy, options, callback) => {
        callback(new Error('OAuth error'));
      });

      const res = await request(testApp)
        .get('/auth/google/callback');

      expect(res.status).to.equal(302);
      stub.restore();
    });

    it('should handle server error', async () => {
      const stub = sinon.stub(passport, 'authenticate').throws(new Error('Test error'));

      const res = await request(testApp)
        .get('/auth/google/callback');

      expect(res.status).to.equal(500);
      stub.restore();
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user profile', async () => {
      const res = await request(testApp)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should fail without token', async () => {
      const res = await request(testApp)
        .get('/auth/me');

      expect(res.status).to.equal(401);
    });

    it('should fail with invalid token', async () => {
      const res = await request(testApp)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).to.equal(401);
    });

    it('should handle server error', async () => {
      const res = await request(testApp)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .query({ invalid: true });

      expect(res.status).to.equal(500);
    });
  });

  describe('PUT /auth/profile', () => {
    it('should update user profile with full data', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '9876543210',
        address: '456 New St',
        bio: 'Updated bio'
      };

      const res = await request(testApp)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should update profile with minimal data', async () => {
      const updateData = {
        name: 'Minimal Update'
      };

      const res = await request(testApp)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.exist;
    });

    it('should fail with existing email', async () => {
      await User.create({
        email: 'existing@test.com',
        password: 'password123',
        name: 'Existing User'
      });

      const updateData = {
        email: 'existing@test.com'
      };

      const res = await request(testApp)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(400);
    });

    it('should fail with invalid email', async () => {
      const updateData = {
        email: 'invalid-email'
      };

      const res = await request(testApp)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(400);
    });

    it('should fail without authentication', async () => {
      const res = await request(testApp)
        .put('/auth/profile')
        .send({ name: 'Updated Name' });

      expect(res.status).to.equal(401);
    });

    it('should handle server error', async () => {
      const updateData = {
        name: 'Error User',
        invalidField: 'This should cause an error'
      };

      const res = await request(testApp)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(500);
    });
  });

  describe('PUT /auth/password', () => {
    it('should update password', async () => {
      const updateData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };

      const res = await request(testApp)
        .put('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(200);
    });

    it('should fail with incorrect current password', async () => {
      const updateData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      const res = await request(testApp)
        .put('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(401);
    });

    it('should fail with short new password', async () => {
      const updateData = {
        currentPassword: 'password123',
        newPassword: '123'
      };

      const res = await request(testApp)
        .put('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(400);
    });

    it('should fail without authentication', async () => {
      const res = await request(testApp)
        .put('/auth/password')
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        });

      expect(res.status).to.equal(401);
    });

    it('should handle server error', async () => {
      const updateData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        invalidField: 'This should cause an error'
      };

      const res = await request(testApp)
        .put('/auth/password')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(res.status).to.equal(500);
    });
  });
}); 