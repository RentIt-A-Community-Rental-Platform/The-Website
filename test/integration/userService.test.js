import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { UserService } from '../../src/services/UserService.js';
import { User } from '../../src/models/User.js';
import bcrypt from 'bcryptjs';

describe('UserService', () => {
  let mongoServer;
  let userService;
  let testUser;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    userService = new UserService();
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

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'new@example.com',
        password: 'newpassword123',
        name: 'New User'
      };

      const user = await userService.createUser(userData);
      expect(user).to.have.property('_id');
      expect(user.email).to.equal(userData.email);
      expect(user.name).to.equal(userData.name);
      expect(user).to.not.have.property('password');

      // Verify password was hashed
      const savedUser = await User.findById(user._id);
      const isMatch = await bcrypt.compare(userData.password, savedUser.password);
      expect(isMatch).to.be.true;
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com', // Already exists
        password: 'password123',
        name: 'Duplicate User'
      };

      try {
        await userService.createUser(userData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Email already exists');
      }
    });

    it('should throw error for invalid user data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: 'Invalid User'
      };

      try {
        await userService.createUser(invalidUserData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('getUserById', () => {
    it('should get user by id successfully', async () => {
      const user = await userService.getUserById(testUser._id);
      expect(user).to.have.property('_id');
      expect(user.email).to.equal(testUser.email);
      expect(user.name).to.equal(testUser.name);
      expect(user).to.not.have.property('password');
    });

    it('should throw error for non-existent user', async () => {
      try {
        await userService.getUserById(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('User not found');
      }
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email successfully', async () => {
      const user = await userService.getUserByEmail(testUser.email);
      expect(user).to.have.property('_id');
      expect(user.email).to.equal(testUser.email);
      expect(user.name).to.equal(testUser.name);
    });

    it('should return null for non-existent email', async () => {
      const user = await userService.getUserByEmail('nonexistent@example.com');
      expect(user).to.be.null;
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedUser = await userService.updateUser(testUser._id, updateData);
      expect(updatedUser.name).to.equal(updateData.name);
      expect(updatedUser.email).to.equal(updateData.email);
    });

    it('should throw error for non-existent user', async () => {
      try {
        await userService.updateUser(new mongoose.Types.ObjectId(), { name: 'New Name' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('User not found');
      }
    });

    it('should throw error for duplicate email update', async () => {
      const anotherUser = await User.create({
        email: 'another@example.com',
        password: 'password123',
        name: 'Another User'
      });

      try {
        await userService.updateUser(testUser._id, { email: anotherUser.email });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Email already exists');
      }
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const newPassword = 'newpassword123';
      await userService.updatePassword(testUser._id, newPassword);

      const updatedUser = await User.findById(testUser._id);
      const isMatch = await bcrypt.compare(newPassword, updatedUser.password);
      expect(isMatch).to.be.true;
    });

    it('should throw error for non-existent user', async () => {
      try {
        await userService.updatePassword(new mongoose.Types.ObjectId(), 'newpassword123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('User not found');
      }
    });

    it('should throw error for invalid password', async () => {
      try {
        await userService.updatePassword(testUser._id, '123'); // Too short
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      await userService.deleteUser(testUser._id);
      const user = await User.findById(testUser._id);
      expect(user).to.be.null;
    });

    it('should throw error for non-existent user', async () => {
      try {
        await userService.deleteUser(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('User not found');
      }
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const isMatch = await userService.verifyPassword(testUser._id, 'password123');
      expect(isMatch).to.be.true;
    });

    it('should reject incorrect password', async () => {
      const isMatch = await userService.verifyPassword(testUser._id, 'wrongpassword');
      expect(isMatch).to.be.false;
    });

    it('should throw error for non-existent user', async () => {
      try {
        await userService.verifyPassword(new mongoose.Types.ObjectId(), 'password123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('User not found');
      }
    });
  });

  describe('searchUsers', () => {
    beforeEach(async () => {
      await User.create([
        {
          email: 'john@example.com',
          password: 'password123',
          name: 'John Doe'
        },
        {
          email: 'jane@example.com',
          password: 'password123',
          name: 'Jane Smith'
        }
      ]);
    });

    it('should search users by name', async () => {
      const users = await userService.searchUsers({ query: 'John' });
      expect(users).to.have.lengthOf(1);
      expect(users[0].name).to.equal('John Doe');
    });

    it('should search users by email', async () => {
      const users = await userService.searchUsers({ query: 'jane@example.com' });
      expect(users).to.have.lengthOf(1);
      expect(users[0].name).to.equal('Jane Smith');
    });

    it('should return empty array for no matches', async () => {
      const users = await userService.searchUsers({ query: 'nonexistent' });
      expect(users).to.be.an('array').that.is.empty;
    });
  });
}); 