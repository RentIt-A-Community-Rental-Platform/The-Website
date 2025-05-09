import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import passport from '../../src/config/passport.js';
import { User } from '../../src/models/User.js';

describe('Application Configuration', () => {
  let mongoServer;
  let testUser;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    dotenv.config();
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

  describe('Passport Configuration', () => {
    it('should serialize user correctly', (done) => {
      passport.serializeUser(testUser, (err, id) => {
        expect(err).to.be.null;
        expect(id).to.equal(testUser._id.toString());
        done();
      });
    });

    it('should deserialize user correctly', (done) => {
      passport.deserializeUser(testUser._id, (err, user) => {
        expect(err).to.be.null;
        expect(user).to.have.property('email', testUser.email);
        expect(user).to.have.property('name', testUser.name);
        done();
      });
    });

    it('should handle local strategy authentication', (done) => {
      const strategy = passport._strategies.local;
      strategy._verify(testUser.email, 'password123', (err, user) => {
        expect(err).to.be.null;
        expect(user).to.have.property('email', testUser.email);
        done();
      });
    });

    it('should reject invalid credentials', (done) => {
      const strategy = passport._strategies.local;
      strategy._verify(testUser.email, 'wrongpassword', (err, user) => {
        expect(err).to.be.null;
        expect(user).to.be.false;
        done();
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should have required environment variables', () => {
      expect(process.env.NODE_ENV).to.exist;
      expect(process.env.JWT_SECRET).to.exist;
      expect(process.env.SESSION_SECRET).to.exist;
      expect(process.env.MONGODB_URI).to.exist;
    });

    it('should have correct environment values in test mode', () => {
      expect(process.env.NODE_ENV).to.equal('test');
      expect(process.env.JWT_SECRET).to.equal('test-jwt-secret');
      expect(process.env.SESSION_SECRET).to.equal('test-session-secret');
    });
  });

  describe('MongoDB Configuration', () => {
    it('should connect to MongoDB successfully', async () => {
      expect(mongoose.connection.readyState).to.equal(1);
    });

    it('should handle MongoDB connection errors', async () => {
      const originalUri = mongoose.connection.client.s.url;
      mongoose.connection.client.s.url = 'mongodb://invalid:27017';
      
      try {
        await mongoose.connect('mongodb://invalid:27017');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      } finally {
        mongoose.connection.client.s.url = originalUri;
      }
    });
  });
}); 