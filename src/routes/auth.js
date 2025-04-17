import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

console.log('🔑 Auth routes initialized');

// Hardcoded test credentials - PLAIN TEXT for testing
// const TEST_USER = {
//     email: 'test@test.com',
//     password: 'test123',
//     name: 'Test User',
//     // isTestUser: true  // Mark as test user to skip password hashing
// };

// // Create test user on server start
// async function createTestUser() {
//     try {
//         // Check if test user exists
//         let testUser = await User.findOne({ email: TEST_USER.email });

//         if (!testUser) {
//             // Create new test user with plain text password
//             testUser = new User(TEST_USER);
//             await testUser.save();
//             console.log('✅ Test user created successfully');
//         }
//     } catch (error) {
//         console.error('Failed to create test user:', error);
//     }
// }

// // Initialize test user
// createTestUser();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
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
            user: { email, name },
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
        
        // Generate JWT token with consistent field names
        const token = jwt.sign(
            { _id: user._id, email: user.email },  // Use _id instead of id
            process.env.JWT_SECRET || 'your-jwt-secret-key',
            { expiresIn: '7d' }
        );
        
        // Store user in session for traditional auth
        req.login(user, (err) => {
            if (err) {
                console.error('Session login error:', err);
            }
        });
        
        res.json({ 
            user: { email: user.email, name: user.name },
            token
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

// Google OAuth flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth.html' }),
    (req, res) => {
      res.redirect('/');
    }
);

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
export const isAuthenticated = async (req, res, next) => {
    // First check session-based auth
    if (req.isAuthenticated()) {
        return next();
    }

    // Then check JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            console.log('🔑 Verifying JWT token...');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
            console.log('📦 Decoded token:', decoded);
            
            if (decoded) {
                // Handle both id and _id cases
                const userId = decoded.id || decoded._id;
                if (userId) {
                    console.log('🔍 Looking up user with ID:', userId);
                    const user = await User.findById(userId);
                    if (user) {
                        console.log('✅ User found:', user.email);
                        req.user = user;
                        return next();
                    }
                    console.log('❌ User not found in database');
                }
            }
        } catch (error) {
            console.error('❌ Token verification error:', error);
        }
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

export const authRoutes = router; 