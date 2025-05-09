import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthService } from '../../src/services/AuthService.js';
import { User } from '../../src/models/User.js';

describe('AuthService', () => {
  let mongoServer;
  let authService;
  let testUser;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    authService = new AuthService();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };

      const result = await authService.register(userData);
      expect(result).to.have.property('user');
      expect(result).to.have.property('token');
      expect(result.user.email).to.equal(userData.email);
      expect(result.user.name).to.equal(userData.name);
      expect(result.token).to.be.a('string');
    });

    it('should throw error for existing email', async () => {
      const userData = {
        email: testUser.email, // Using existing email
        password: 'password123',
        name: 'Duplicate User'
      };

      try {
        await authService.register(userData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('User already exists');
      }
    });

    it('should throw error for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Invalid User'
      };

      try {
        await authService.register(userData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Registration failed');
      }
    });

    it('should throw error for short password', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'short',
        name: 'Short Password User'
      };

      try {
        await authService.register(userData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Registration failed');
      }
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const credentials = {
        email: testUser.email,
        password: 'password123'
      };

      const result = await authService.login(credentials);
      expect(result).to.have.property('user');
      expect(result).to.have.property('token');
      expect(result.user.email).to.equal(testUser.email);
      expect(result.token).to.be.a('string');
    });

    it('should throw error for non-existent email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      try {
        await authService.login(credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid credentials');
      }
    });

    it('should throw error for incorrect password', async () => {
      const credentials = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      try {
        await authService.login(credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid credentials');
      }
    });

    it('should throw error for missing credentials', async () => {
      const credentials = {
        email: testUser.email
        // Missing password
      };

      try {
        await authService.login(credentials);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid credentials');
      }
    });
  });
}); 