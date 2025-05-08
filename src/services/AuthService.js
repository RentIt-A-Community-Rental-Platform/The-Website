import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseService } from './BaseService.js';

export class AuthService extends BaseService {
    constructor() {
        super(User);
    }

    async register(userData) {
        try {
            const { email, password, name } = userData;
            
            // Check if user already exists
            const existingUser = await this.findOne({ email });
            if (existingUser) {
                throw new Error('User already exists');
            }

            // Create user with hashed password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            const user = await this.create({ 
                email, 
                password: hashedPassword, 
                name 
            });
            
            // Generate JWT token
            const token = this.generateToken(user);
            
            return { 
                user: { _id: user._id, email, name },
                token
            };
        } catch (error) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    async login(credentials) {
        try {
            const { email, password } = credentials;
            
            // Find user by email
            const user = await this.findOne({ email });
            if (!user) {
                throw new Error('Invalid credentials');
            }
            
            // Check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }
            
            // Generate JWT token
            const token = this.generateToken(user);
            
            return { 
                user: { _id: user._id, email: user.email, name: user.name },
                token
            };
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async updateUsername(userId, newName, currentPassword) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Check if name is already taken
            const existingUser = await this.findOne({ name: newName });
            if (existingUser && existingUser._id.toString() !== userId.toString()) {
                throw new Error('Name is already taken');
            }

            // Update name
            user.name = newName;
            await user.save();

            return { message: 'Name updated successfully' };
        } catch (error) {
            throw new Error(`Failed to update name: ${error.message}`);
        }
    }

    async updatePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            user.password = hashedPassword;
            await user.save();

            return { message: 'Password updated successfully' };
        } catch (error) {
            throw new Error(`Failed to update password: ${error.message}`);
        }
    }

    generateToken(user) {
        return jwt.sign(
            { _id: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-jwt-secret-key',
            { expiresIn: '7d' }
        );
    }
}