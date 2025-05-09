import { expect } from 'chai';
import { User } from '../../src/models/User.js';

describe('User Model Test', () => {
  it('should create & save user successfully', async () => {
    const validUser = new User({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    const savedUser = await validUser.save();
    
    expect(savedUser._id).to.exist;
    expect(savedUser.email).to.equal('test@example.com');
    expect(savedUser.name).to.equal('Test User');
    expect(savedUser.password).to.equal('password123');
  });

  it('should create user with Google authentication', async () => {
    const googleUser = new User({
      email: 'google@example.com',
      name: 'Google User',
      googleId: 'google123'
    });

    const savedUser = await googleUser.save();
    
    expect(savedUser._id).to.exist;
    expect(savedUser.googleId).to.equal('google123');
    expect(savedUser.email).to.equal('google@example.com');
  });

  it('should allow multiple users without googleId', async () => {
    const user1 = new User({
      email: 'user1@example.com',
      name: 'User 1'
    });

    const user2 = new User({
      email: 'user2@example.com',
      name: 'User 2'
    });

    await user1.save();
    const savedUser2 = await user2.save();

    expect(savedUser2._id).to.exist;
    expect(savedUser2.email).to.equal('user2@example.com');
  });

  it('should prevent duplicate googleId', async () => {
    const user1 = new User({
      email: 'user1@example.com',
      name: 'User 1',
      googleId: 'duplicate123'
    });

    const user2 = new User({
      email: 'user2@example.com',
      name: 'User 2',
      googleId: 'duplicate123'
    });

    await user1.save();
    
    let err;
    try {
      await user2.save();
    } catch (error) {
      err = error;
    }

    expect(err).to.exist;
    expect(err.code).to.equal(11000); // MongoDB duplicate key error
  });
}); 