import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();

console.log('🔑 Auth routes initialized');

// Register new user
router.post('/register', async (req, res) => {
    try {
        console.log('📝 Registration attempt:', req.body);
        const { email, password, name } = req.body;
        
        if (!email || !password || !name) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Create new user
        const user = new User({
            email,
            password,
            name,
            googleId: undefined
        });
        
        await user.save();
        console.log('✅ User created successfully:', email);
        
        // Log in the user after registration
        req.login(user, (err) => {
            if (err) {
                console.error('❌ Login after registration failed:', err);
                return res.status(500).json({ error: 'Login after registration failed' });
            }
            res.status(201).json({ user });
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ 
            error: 'Registration failed',
            details: error.message 
        });
    }
});

// Login with email/password
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).json({ error: info.message });
        }
        req.login(user, (err) => {
            if (err) {
                return next(err);
            }
            res.json({ user });
        });
    })(req, res, next);
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