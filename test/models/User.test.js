import { expect } from 'chai';
import { User } from '../../src/models/User.js';

describe('User Model Tests', function() {
  this.timeout(10000); // Increase timeout to 10 seconds
  it('should create a new user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser).to.have.property('_id');
    expect(savedUser.email).to.equal(userData.email);
    expect(savedUser.password).to.equal(userData.password);
    expect(savedUser.name).to.equal(userData.name);
  });

  it('should create a new user with googleId', async () => {
    const userData = {
      email: 'google@example.com',
      name: 'Google User',
      googleId: '123456789'
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser).to.have.property('_id');
    expect(savedUser.email).to.equal(userData.email);
    expect(savedUser.name).to.equal(userData.name);
    expect(savedUser.googleId).to.equal(userData.googleId);
  });

  it('should not save duplicate googleId', async () => {
    // Create first user
    const user1 = new User({
      email: 'user1@example.com',
      name: 'User One',
      googleId: 'duplicate123'
    });
    await user1.save();

    // Try to create second user with same googleId
    const user2 = new User({
      email: 'user2@example.com',
      name: 'User Two',
      googleId: 'duplicate123'
    });

    try {
      await user2.save();
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.exist;
      expect(error.name).to.equal('MongoServerError');
      expect(error.code).to.equal(11000); // Duplicate key error
    }
  });

  it('should allow null googleId', async () => {
    const user = new User({
      email: 'nogoogle@example.com',
      password: 'password123',
      name: 'No Google User'
    });
    
    const savedUser = await user.save();
    expect(savedUser.googleId).to.be.undefined;
  });
});