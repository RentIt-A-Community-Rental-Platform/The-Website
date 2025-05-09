import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BaseService } from '../../src/services/BaseService.js';
import { User } from '../../src/models/User.js';

describe('BaseService', () => {
  let mongoServer;
  let baseService;
  let testUser;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    baseService = new BaseService(User);
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

  describe('findById', () => {
    it('should find a document by id', async () => {
      const foundUser = await baseService.findById(testUser._id);
      expect(foundUser).to.exist;
      expect(foundUser._id.toString()).to.equal(testUser._id.toString());
      expect(foundUser.email).to.equal(testUser.email);
    });

    it('should return null for non-existent id', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const foundUser = await baseService.findById(nonExistentId);
      expect(foundUser).to.be.null;
    });

    it('should throw error for invalid id', async () => {
      try {
        await baseService.findById('invalid-id');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error finding by id');
      }
    });
  });

  describe('create', () => {
    it('should create a document successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      };

      const createdUser = await baseService.create(userData);
      expect(createdUser).to.have.property('_id');
      expect(createdUser.email).to.equal(userData.email);
      expect(createdUser.name).to.equal(userData.name);
    });

    it('should throw error for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email', // Invalid email format
        password: 'short' // Password too short
      };

      try {
        await baseService.create(invalidData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error creating');
      }
    });

    it('should throw error for duplicate unique field', async () => {
      const duplicateData = {
        email: testUser.email, // Using existing email
        password: 'password123',
        name: 'Duplicate User'
      };

      try {
        await baseService.create(duplicateData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error creating');
      }
    });
  });

  describe('findOne', () => {
    it('should find a document by conditions', async () => {
      const foundUser = await baseService.findOne({ email: testUser.email });
      expect(foundUser).to.exist;
      expect(foundUser._id.toString()).to.equal(testUser._id.toString());
    });

    it('should return null when no document matches', async () => {
      const foundUser = await baseService.findOne({ email: 'nonexistent@example.com' });
      expect(foundUser).to.be.null;
    });

    it('should throw error for invalid conditions', async () => {
      try {
        await baseService.findOne({ $invalid: 'operator' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error finding one');
      }
    });
  });
}); 