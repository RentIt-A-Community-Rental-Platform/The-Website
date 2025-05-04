import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: { _id: user._id, email: user.email, name: user.name }, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '7d' }
    );

    req.login(user, err => { if (err) console.error('Session login error:', err); });

    res.status(200).json({ user: { _id: user._id, email: user.email, name: user.name }, token });
  } catch (err) {
    console.error('Login error:', err);
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

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/auth.html' }), (req, res) => res.redirect('/'));

// Logout
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      console.error('Logout error:', err);
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

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    if (await User.findOne({ name: newName })) {
      return res.status(400).json({ error: 'Name already taken' });
    }

    user.name = newName;
    await user.save();
    res.status(200).json({ message: 'Name updated successfully' });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({ error: 'Failed to update name' });
  }
});

// Update password
router.patch('/update-password', async (req, res) => {
  try {
    const userId = req.user?._id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Middleware: check auth (session or JWT)
export const isAuthenticated = async (req, res, next) => {
  if (req.isAuthenticated()) return next();

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      console.log('> Verifying JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
      console.log('> Decoded token:', decoded);

      const userId = decoded.id || decoded._id;
      if (userId) {
        console.log('> Looking up user with ID:', userId);
        const user = await User.findById(userId);
        if (user) {
          req.user = user;
          return next();
        }
        console.log('> User not found in database');
      }
    } catch (error) {
      console.error('Token verification error:', error);
    }
  }

  res.status(401).json({ error: 'Not authenticated' });
};

// Middleware: session guards
export const checkAlreadyLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return res.redirect('/list.html');
  next();
};
export const logoutIfLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    req.logout(err => {
      if (err) console.error('Logout error:', err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        next();
      });
    });
  } else next();
};

// Authentication status (session or token)
router.get('/status', async (req, res) => {
  if (req.isAuthenticated() && req.user) {
    return res.json({
      isAuthenticated: true,
      user: {
        id:      req.user._id,
        name:    req.user.name,
        email:   req.user.email,
        picture: req.user.picture || null
      }
    });
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token.trim()) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key');
        const userId = decoded.id || decoded._id;
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            return res.json({
              isAuthenticated: true,
              user: {
                id:      user._id,
                name:    user.name,
                email:   user.email,
                picture: user.picture || null
              }
            });
          }
        }
      } catch (error) {
        console.error('Token verification error:', error);
      }
    }
  }

  res.json({ isAuthenticated: false });
});

export const authRoutes = router;
