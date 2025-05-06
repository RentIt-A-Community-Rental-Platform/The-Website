import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import { User } from '../../src/models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createTestUser } from '../test-helper.js';

// Create stubs for passport middleware
const passportStub = {
  initialize: () => (req, res, next) => next(),
  authenticate: () => (req, res, next) => next(),
  session: () => (req, res, next) => next(),
  serializeUser: (fn) => fn({}, (err, id) => id),
  deserializeUser: (fn) => fn({}, (err, user) => user)
};

describe.skip('Auth Routes Tests', function() {
  this.timeout(10000); // Increase timeout
  let app, request, authRoutes;

  before(async function() {
    this.timeout(5000);
    
    // Create test express app
    app = express();
    app.use(express.json());
    
    // Stub passport and session methods
    app.use((req, res, next) => {
      req.isAuthenticated = sinon.stub().returns(false);
      req.login = sinon.stub().callsFake((user, opts, done) => {
        req.user = user;
        if (done) done();
        else if (opts) opts();
      });
      req.logout = sinon.stub().callsFake((done) => {
        req.user = null;
        if (done) done();
      });
      req.session = {
        destroy: sinon.stub().callsFake(cb => cb())
      };
      res.clearCookie = sinon.stub();
      next();
    });

    // Import routes dynamically after setting up stubs
    const authModule = await import('../../src/routes/auth.js');
    authRoutes = authModule.authRoutes;
    
    // Mount routes
    app.use('/auth', authRoutes);
    request = supertest(app);
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
    
    // Reset stubs
    sinon.restore();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request
        .post('/auth/register')
        .send(userData);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('user');
      expect(response.body).to.have.property('token');
      expect(response.body.user.email).to.equal(userData.email);
      expect(response.body.user.name).to.equal(userData.name);
      expect(response.body.user).to.not.have.property('password');
      
      // Verify user was saved to DB
      const userInDb = await User.findOne({ email: userData.email });
      expect(userInDb).to.exist;
      expect(userInDb.name).to.equal(userData.name);
      
      // Verify password was hashed
      expect(userInDb.password).to.not.equal(userData.password);
      const passwordMatch = await bcrypt.compare(userData.password, userInDb.password);
      expect(passwordMatch).to.be.true;
    });

    it('should return error for duplicate email', async () => {
      // Create a user first
      const existingUser = new User({
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Existing User'
      });
      await existingUser.save();

      // Try to register with the same email
      const response = await request
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'newpassword',
          name: 'New User'
        });
      
      // Registration should fail
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'login@example.com',
        password: hashedPassword,
        name: 'Login Test User'
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('user');
      expect(response.body).to.have.property('token');
      expect(response.body.user.email).to.equal('login@example.com');
      
      // Verify JWT token is valid
      const token = response.body.token;
      const secret = process.env.JWT_SECRET || 'your-jwt-secret-key';
      const decoded = jwt.verify(token, secret);
      expect(decoded).to.have.property('_id');
      expect(decoded.email).to.equal('login@example.com');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user data when authenticated', async () => {
      const testUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'current@example.com',
        name: 'Current User'
      };
      
      // Stub isAuthenticated to return true
      app.use('/auth/me', (req, res, next) => {
        req.isAuthenticated = () => true;
        req.user = testUser;
        next();
      });

      const response = await request.get('/auth/me');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.deep.equal(testUser);
    });

    it('should return 401 when not authenticated', async () => {
      // Default stub returns false for isAuthenticated
      const response = await request.get('/auth/me');
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Not authenticated');
    });
  });

  describe('POST /auth/logout', () => {
    it('should log out successfully', async () => {
      // Setup authenticated session
      const logoutStub = sinon.stub().callsFake((cb) => cb());
      app.use('/auth/logout', (req, res, next) => {
        req.isAuthenticated = () => true;
        req.logout = logoutStub;
        next();
      });

      const response = await request.post('/auth/logout');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('message', 'Logged out successfully');
      expect(logoutStub.called).to.be.true;
    });
  });

  describe('GET /auth/status', () => {
    it('should return authenticated status for session user', async () => {
      const testUser = {
        _id: new mongoose.Types.ObjectId(),
        email: 'session@example.com',
        name: 'Session User'
      };
      
      // Stub isAuthenticated to return true for this route
      app.use('/auth/status', (req, res, next) => {
        req.isAuthenticated = () => true;
        req.user = testUser;
        next();
      });

      const response = await request.get('/auth/status');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('isAuthenticated', true);
      expect(response.body).to.have.property('user');
      expect(response.body.user.email).to.equal(testUser.email);
    });

    it('should return authenticated status for valid JWT token', async () => {
      // Create a test user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        email: 'token@example.com',
        name: 'Token User'
      });
      await user.save();
      
      // Create valid JWT token
      const token = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || 'your-jwt-secret-key',
        { expiresIn: '1h' }
      );

      // Stub User.findById to return our test user
      sinon.stub(User, 'findById').resolves(user);

      const response = await request
        .get('/auth/status')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('isAuthenticated', true);
    });

    it('should return not authenticated with invalid token', async () => {
      const response = await request
        .get('/auth/status')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('isAuthenticated', false);
    });

    it('should return not authenticated without token', async () => {
      const response = await request.get('/auth/status');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('isAuthenticated', false);
    });
  });

  describe('isAuthenticated middleware', () => {
    let isAuthenticated;
    
    before(async () => {
      // Import the middleware
      const authModule = await import('../../src/routes/auth.js');
      isAuthenticated = authModule.isAuthenticated;
      
      // Create a test route using the middleware
      app.get('/protected', isAuthenticated, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow access with session authentication', async () => {
      // Setup authenticated session
      app.use('/protected', (req, res, next) => {
        req.isAuthenticated = () => true;
        req.user = { _id: 'user123', name: 'Session User' };
        next(); // Continue to the actual middleware
      }, isAuthenticated);

      const response = await request.get('/protected');
      expect(response.status).to.equal(200);
    });

    it('should allow access with valid JWT token', async () => {
      // Create test user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        email: 'jwt@example.com',
        name: 'JWT User'
      });
      await user.save();
      
      // Create valid token
      const token = jwt.sign(
        { _id: userId },
        process.env.JWT_SECRET || 'your-jwt-secret-key',
        { expiresIn: '1h' }
      );
      
      // Use the actual middleware for this test
      const findByIdStub = sinon.stub(User, 'findById').resolves(user);

      const response = await request
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).to.equal(200);
      expect(findByIdStub.called).to.be.true;
    });

    it('should reject access without authentication', async () => {
      const response = await request.get('/protected');
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Not authenticated');
    });
  });
});