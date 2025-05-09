import mongoose from 'mongoose';
import { User } from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const TEST_USER = {
    email: 'test@test.com',
    password: 'test123',
    name: 'Test User'
};

export async function createTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if test user already exists
        const existingUser = await User.findOne({ email: TEST_USER.email });
        if (existingUser) {
            console.log('Test user already exists');
            return existingUser;
        }

        // Create test user
        const user = new User(TEST_USER);
        await user.save();
        console.log('Test user created successfully');
        return user;
        
    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

// Only run if this file is executed directly
if (process.argv[1] === import.meta.url) {
    createTestUser()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
} 