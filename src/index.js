import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/passport.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { itemRoutes } from './routes/items.js';
import { setupGemini } from './utils/gemini.js';
import { authRoutes } from './routes/auth.js';
import cloudinaryUpload from './routes/cloudinaryUpload.js';
import { mkdirSync } from 'fs';

// Load environment variables
dotenv.config();

// File path setup for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/rentit')
  .then(() => console.log('✅ Connected to MongoDB successfully!'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Gemini
setupGemini();

// Ensure uploads directory exists
try {
  mkdirSync(join(__dirname, 'uploads'), { recursive: true });
  console.log('📁 Uploads directory ready');
} catch (error) {
  console.error('❌ Error creating uploads directory:', error);
}

// Mount routes
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/api', cloudinaryUpload); // /api/upload-image

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
    res.redirect('/dashboard');
  }
);
*/

// Fallback to login page for root URL
app.get('/', (req, res) => res.redirect('/auth.html'));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const serverUrl = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log('\n🚀 Server is running!');
  console.log('📡 Available endpoints:');
  console.log(`   - ${serverUrl}/items`);
  console.log(`   - ${serverUrl}/auth/google`);
  console.log(`   - ${serverUrl}/dashboard`);
  console.log('\n🔗 Open in browser:');
  console.log(`   ${serverUrl}`);
  console.log('\n👀 Watching for changes...');
});