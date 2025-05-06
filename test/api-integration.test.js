import { expect } from 'chai';
import supertest from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import sinon from 'sinon';
import { Item } from '../src/models/Item.js';
import { User } from '../src/models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create a simplified version of the API for testing
describe('API Integration Tests', function() {
  this.timeout(15000); // Increase timeout
  let app, request, server;
  const testUserId = new mongoose.Types.ObjectId();
  
  before(async function() {
    this.timeout(5000);
    
    // Create test express app
    app = express();
    app.use(express.json());

    // Setup basic API endpoints for testing
    
    // Root endpoint
    app.get('/api', (req, res) => {
      res.json({
        status: 'success',
        message: 'University Rentals API is running!',
        timestamp: new Date().toISOString()
      });
    });
    
    // Users endpoint
    app.post('/auth/register', async (req, res) => {
      try {
        const { email, password, name } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Create user
        const user = new User({
          email,
          password: hashedPassword,
          name
        });
        
        await user.save();
        
        // Create token
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1d' }
        );
        
        res.status(201).json({
          user: { _id: user._id, email, name },
          token
        });
      } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
      }
    });
    
    app.post('/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create token
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1d' }
        );
        
        res.json({
          user: { _id: user._id, email: user.email, name: user.name },
          token
        });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
      }
    });
    
    // Items endpoints
    app.get('/items', async (req, res) => {
      try {
        const query = req.query.userId ? { userId: req.query.userId } : {};
        const items = await Item.find(query).sort({ createdAt: -1 });
        res.json(items);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
      }
    });
    
    app.post('/items', async (req, res) => {
      try {
        // JWT token check
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
          if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Invalid token' });
          }
          
          const user = await User.findById(decoded.id);
          if (!user) {
            return res.status(401).json({ error: 'User not found' });
          }
          
          // Create item
          const { title, description, price, category, deposit, photos } = req.body;
          
          const item = new Item({
            title,
            description,
            price: parseFloat(price),
            category,
            deposit: deposit ? parseFloat(deposit) : 0,
            userId: user._id,
            userName: user.name,
            photos: photos || []
          });
          
          await item.save();
          res.status(201).json(item);
          
        } catch (error) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Failed to create item' });
      }
    });
    
    // Start the server for testing
    request = supertest(app);
  });
  
  beforeEach(async () => {
    // Clear collections before each test
    await User.deleteMany({});
    await Item.deleteMany({});
    
    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.create({
      _id: testUserId,
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User'
    });
  });
  
  after(async () => {
    if (server) server.close();
    sinon.restore();
  });
  
  describe('Authentication Flow', () => {
    it('should register a new user and return token', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'securepass',
        name: 'New User'
      };
      
      const response = await request
        .post('/auth/register')
        .send(userData);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      expect(response.body.user.email).to.equal(userData.email);
      
      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).to.exist;
      expect(user.name).to.equal(userData.name);
    });
    
    it('should login existing user and return token', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const response = await request
        .post('/auth/login')
        .send(loginData);
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      expect(response.body.user.email).to.equal(loginData.email);
    });
    
    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };
      
      const response = await request
        .post('/auth/login')
        .send(loginData);
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error', 'Invalid credentials');
    });
  });
  
  describe('Items API', () => {
    let authToken;
    
    beforeEach(async () => {
      // Log in and get token
      const loginResponse = await request
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });
      
      authToken = loginResponse.body.token;
      
      // Create some test items
      await Item.create([
        {
          title: 'Item 1',
          description: 'Description 1',
          price: 10,
          userId: testUserId,
          userName: 'Test User'
        },
        {
          title: 'Item 2',
          description: 'Description 2',
          price: 20,
          userId: testUserId,
          userName: 'Test User'
        }
      ]);
    });
    
    it('should fetch items list', async () => {
      const response = await request.get('/items');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('array').with.lengthOf(2);
      expect(response.body[0].title).to.be.oneOf(['Item 1', 'Item 2']);
      expect(response.body[1].title).to.be.oneOf(['Item 1', 'Item 2']);
    });
    
    it('should create a new item with valid token', async () => {
      const itemData = {
        title: 'New Test Item',
        description: 'This is a new test item',
        price: 25,
        category: 'Electronics'
      };
      
      const response = await request
        .post('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData);
      
      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('_id');
      expect(response.body.title).to.equal(itemData.title);
      expect(response.body.price).to.equal(itemData.price);
      expect(response.body.userId.toString()).to.equal(testUserId.toString());
      
      // Verify item was created in database
      const item = await Item.findById(response.body._id);
      expect(item).to.exist;
      expect(item.title).to.equal(itemData.title);
    });
    
    it('should reject item creation without authentication', async () => {
      const itemData = {
        title: 'Unauthorized Item',
        description: 'This should fail',
        price: 50
      };
      
      const response = await request
        .post('/items')
        .send(itemData);
      
      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('error');
      
      // Verify item was not created
      const items = await Item.find({});
      expect(items).to.have.lengthOf(2); // Still only the 2 items from beforeEach
    });
  });
});