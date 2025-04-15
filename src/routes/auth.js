import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

console.log('🔑 Auth routes initialized');

// Hardcoded test credentials - PLAIN TEXT for testing
const TEST_USER = {
    email: 'test@test.com',
    password: 'test123',
    name: 'Test User',
    // isTestUser: true  // Mark as test user to skip password hashing
};

// Create test user on server start
async function createTestUser() {
    try {
        // Check if test user exists
        let testUser = await User.findOne({ email: TEST_USER.email });

        if (!testUser) {
            // Create new test user with plain text password
            testUser = new User(TEST_USER);
            await testUser.save();
            console.log('✅ Test user created successfully');
        }
    } catch (error) {
        console.error('Failed to create test user:', error);
    }
}

// Initialize test user
createTestUser();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Create user directly
        const user = new User({ email, password, name });
        await user.save();
        
        res.status(201).json({ 
            user: { email, name },
            token: 'dummy-token' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user and check password directly
        const user = await User.findOne({ email, password });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        res.json({ 
            user: { email: user.email, name: user.name },
            token: 'dummy-token'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({ user: req.user });
    }
    res.status(401).json({ error: 'Not authenticated' });
});

// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.status(200).json({ message: 'Logged out successfully' });
        });
    });
});

// Update username
router.patch('/update-username', async (req, res) => {
    try {
        const userId = req.user?._id;
        const { newName, currentPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Check if name is already taken
        const existingUser = await User.findOne({ name: newName });
        if (existingUser && existingUser._id.toString() !== userId.toString()) {
            return res.status(400).json({ error: 'Name is already taken' });
        }

        // Update name
        user.name = newName;
        await user.save();

        res.status(200).json({ message: 'Name updated successfully' });
    } catch (error) {
        console.error('❌ Error updating name:', error);
        res.status(500).json({ error: 'Failed to update name' });
    }
});

// Update password
router.patch('/update-password', async (req, res) => {
    try {
        const userId = req.user?._id;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('❌ Error updating password:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Middleware to check if user is authenticated
export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
};

// Middleware to check if user is already logged in
export const checkAlreadyLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/list.html');
    }
    next();
};

// Middleware to logout if logged in
export const logoutIfLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.logout((err) => {
            if (err) {
                console.error('❌ Logout error:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                console.log('✅ User logged out');
                next();
            });
        });
    } else {
        next();
    }
};

export const authRoutes = router; 