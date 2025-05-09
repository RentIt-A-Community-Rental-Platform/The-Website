import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import passport from './config/passport.js';
import { itemRoutes } from './routes/items.js';
import { authRoutes } from './routes/auth.js';
import { rentalRoutes } from './routes/rentals.js';
import { reviewRoutes } from './routes/review.js';
import { userRoutes } from './routes/users.js';
import cloudinaryUpload from './routes/cloudinaryUpload.js';
import geminiRoutes from './routes/geminiRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/rentals', rentalRoutes);
app.use('/users', userRoutes);
app.use('/api', cloudinaryUpload);
app.use('/api/gemini', geminiRoutes);
app.use('/review', reviewRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app; 