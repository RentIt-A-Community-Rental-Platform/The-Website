import express from 'express';
import passport from '../config/passport.js';
import { AuthService } from '../services/AuthService.js';

const router = express.Router();
const authService = new AuthService();

console.log('> Auth routes initialized');

// Register
router.post('/register', async (req, res) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const result = await authService.login(req.body);
        
        // Store user in session for traditional auth
        req.login(result.user, (err) => {
            if (err) {
                console.error('Session login error:', err);
            }
        });
        
        res.json(result);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
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
            console.error('> Logout error:', err);
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

        const result = await authService.updateUsername(userId, newName, currentPassword);
        res.status(200).json(result);
    } catch (error) {
        console.error('> Error updating name:', error);
        res.status(500).json({ error: error.message });
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

        const result = await authService.updatePassword(userId, currentPassword, newPassword);
        res.status(200).json(result);
    } catch (error) {
        console.error('> Error updating password:', error);
        res.status(500).json({ error: error.message });
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
            console.log('> Verifying JWT token...');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
            console.log('> Decoded token:', decoded);
            
            if (decoded) {
                // Handle both id and _id cases
                const userId = decoded.id || decoded._id;
                if (userId) {
                    console.log('> Looking up user with ID:', userId);
                    const user = await User.findById(userId);
                    if (user) {
                        console.log('> User found:', user.email);
                        req.user = user;
                        return next();
                    }
                    console.log('> User not found in database');
                }
            }
        } catch (error) {
            console.error('> Token verification error:', error);
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

export const authRoutes = router;