import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import passport from 'passport';
import session from 'express-session';
import { authRoutes, isAuthenticated, checkAlreadyLoggedIn, logoutIfLoggedIn } from './routes/auth.js';
import { itemRoutes } from './routes/items.js';
import { setupGemini } from './utils/gemini.js';
import './config/passport.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Root route for testing
app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    message: 'University Rentals API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: '/auth/login/google',
        profile: '/auth/me'
      },
      items: {
        upload: '/items/upload-image',
        list: '/items'
      }
    }
  });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Setting upload destination');
    cb(null, join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    console.log('📄 Generated filename:', uniqueSuffix + '-' + file.originalname);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Checking file type:', file.mimetype);
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      console.log('✅ File type accepted');
      cb(null, true);
    } else {
      console.log('❌ Invalid file type');
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

// Connect to MongoDB with detailed logging
console.log('🔄 Connecting to MongoDB...');
console.log('📡 MongoDB URI:', process.env.MONGODB_URI ? '✅ Configured' : '❌ Not configured');

mongoose.connection.on('connecting', () => {
  console.log('🔄 Attempting to connect to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ Successfully connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    console.log('📊 Database name:', mongoose.connection.name);
    console.log('🔌 Connection state:', mongoose.connection.readyState);
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.error('💡 Check your MONGODB_URI in .env file');
    process.exit(1);
  });

// Initialize Gemini
console.log('🔄 Initializing Gemini API...');
console.log('📡 Gemini API Key:', process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured');
setupGemini();
console.log('✅ Gemini API initialized successfully!');

// Routes
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
const serverUrl = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log('\n🚀 Server is running!');
  console.log('📡 Available endpoints:');
  console.log(`   - ${serverUrl}/auth/login/google`);
  console.log(`   - ${serverUrl}/auth/me`);
  console.log(`   - ${serverUrl}/items/upload-image`);
  console.log(`   - ${serverUrl}/items`);
  console.log('\n🔗 Click here to open in browser:');
  console.log(`   ${serverUrl}`);
  console.log('\n👀 Watching for changes...');
  console.log('\n🔍 Debug Information:');
  console.log(`   - Node.js Version: ${process.version}`);
  console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   - Port: ${PORT}`);
  console.log(`   - Upload Directory: ${join(__dirname, 'uploads')}`);
  console.log(`   - MongoDB State: ${mongoose.connection.readyState}`);
}); 