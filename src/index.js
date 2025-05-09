import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/passport.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import itemRoutes from './routes/itemRoutes.js';
import authRoutes from './routes/auth.js';
import cloudinaryRoutes from './routes/cloudinaryUpload.js';
import geminiRoutes from './routes/geminiRoutes.js';
import { mkdirSync } from 'fs';
import rentalRoutes from './routes/rentalRoutes.js';

// Load environment variables
dotenv.config();

// File path setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static('public'));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Session & Passport setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard_cat',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());

// Root API test
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'University Rentals API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      items: {
        list: '/items',
        create: '/items',
        update: '/items/:id',
        delete: '/items/:id'
      },
      auth: {
        login: '/auth/login',
        register: '/auth/register',
        google: '/auth/google',
        logout: '/auth/logout'
      }
    }
  });
});

// Connect to MongoDB (skip in test environment since it's handled by test/setup.js)
if (process.env.NODE_ENV !== 'test') {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/rentit';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
    .then(() => console.log('> Connected to MongoDB'))
  .catch(err => {
    console.error('> MongoDB connection error:', err);
    process.exit(1);
  });
}

// Initialize Gemini
// setupGemini();

// Ensure uploads directory exists
try {
  mkdirSync(join(__dirname, 'uploads'), { recursive: true });
  console.log('> Uploads directory ready');
} catch (error) {
  console.error('> Error creating uploads directory:', error);
}

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', cloudinaryRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/rentals', rentalRoutes);

// Protected dashboard example
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth.html');
  }
  res.send(`
    <h1>Welcome, ${req.user?.name || req.user?.displayName || 'User'}</h1>
    <p>You're logged in!</p>
    <a href="/auth/logout">Logout</a>
    <a href="/">Back to Home</a>
  `);
});

// Google OAuth callback handler (if using root as callback)
// Uncomment if you want the callback at root level
/* 
app.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth.html' }),
  (req, res) => {
    res.redirect('/');
  }
);
*/

// Fallback to login page for root URL
app.get('/dashboard', (req, res) => res.redirect('/auth.html'));

// Error test route
app.get('/api/error-test', (req, res, next) => {
    next(new Error('Test error'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource does not exist'
    });
});

// Register routes
app.use('/rentals', rentalRoutes);

// Start server
const PORT = process.env.PORT || 3000;
const serverUrl = `http://localhost:${PORT}`;

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test' && process.env.TEST_MODE !== 'true') {
  app.listen(PORT, () => {
    console.log('\n> Server is running!');
    console.log('> Available endpoints:');
    console.log(`   - ${serverUrl}/items`);
    console.log(`   - ${serverUrl}/auth/google`);
    console.log(`   - ${serverUrl}/dashboard`);
    console.log('\n> Open in browser:');
    console.log(`   ${serverUrl}`);
    console.log('\n> Watching for changes...');
  });
} else {
  console.log('\n> Running in test mode - server not started');
}

export default app;