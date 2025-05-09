import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Validate required fields
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Create user with hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const user = new User({ 
            email, 
            password: hashedPassword, 
            name 
        });
        
        await user.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-jwt-secret-key',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({ 
            message: 'User registered successfully',
            user: { _id: user._id, email, name },
            token
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
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET || 'your-jwt-secret-key',
            { expiresIn: '7d' }
        );
        
        res.status(200).json({ 
            user: { _id: user._id, email: user.email, name: user.name },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.status(200).json({ 
            user: { _id: user._id, email: user.email, name: user.name }
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Google OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth.html' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// Update profile
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { email, name } = req.body;

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Check if email is already taken
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            user.email = email;
        }

        if (name) {
            user.name = name;
        }

        await user.save();

        res.status(200).json({ 
            message: 'Profile updated successfully',
            user: { _id: user._id, email: user.email, name: user.name }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Update password
router.put('/password', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        // Update password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Middleware to check if user is authenticated
export const isAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
        
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
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
                console.error('> Logout error:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }
            req.session.destroy(() => {
                res.clearCookie('connect.sid');
                console.log('> User logged out');
                next();
            });
        });
    } else {
        next();
    }
};

// Check authentication status
router.get('/status', (req, res) => {
    // Check for session-based auth (Google OAuth)
    if (req.isAuthenticated() && req.user) {
        return res.json({ 
            isAuthenticated: true,
            user: {
                name: req.user.name,
                email: req.user.email,
                picture: req.user.picture || null
            }
        });
    }
    
    // Check for token-based auth
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Only try to verify if we have a non-empty token
        if (token && token.trim() !== '') {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
                if (decoded && decoded.id) {
                    // Fetch complete user data from database
                    return User.findById(decoded.id)
                        .then(user => {
                            if (user) {
                                return res.json({
                                    isAuthenticated: true,
                                    user: {
                                        id: user._id,
                                        name: user.name,
                                        email: user.email,
                                        picture: user.picture || null
                                    }
                                });
                            }
                            return res.json({ isAuthenticated: false });
                        })
                        .catch(err => {
                            console.error('User lookup error:', err);
                            res.json({ isAuthenticated: false });
                        });
                }
            } catch (error) {
                console.error('Token verification error:', error);
                // Continue to return not authenticated
            }
        }
    }
    
    // Not authenticated
    res.json({ isAuthenticated: false });
});

export default router; 