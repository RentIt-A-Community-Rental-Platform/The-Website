import { BaseService } from './BaseService.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

export class UserService extends BaseService {
  constructor() {
    super();
  }

  async createUser(userData) {
    try {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const user = await User.create(userData);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const user = await User.findOne({ email });
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      if (updateData.email) {
        const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
        if (existingUser) {
          throw new Error('Email already in use');
        }
      }

      const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updatePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      await user.save();
      return user;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async verifyPassword(userId, password) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      return isMatch;
    } catch (error) {
      throw error;
    }
  }

  async searchUsers(query) {
    try {
      const users = await User.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      });
      return users;
    } catch (error) {
      throw error;
    }
  }
} 