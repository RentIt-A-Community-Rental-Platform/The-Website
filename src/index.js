import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { itemRoutes } from './routes/items.js';
import { setupGemini } from './utils/gemini.js';
import { authRoutes } from './routes/auth.js';
import { mkdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Root route for testing
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
      }
    }
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/rentit')
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Gemini
setupGemini();

// Routes
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);

// Create uploads directory if it doesn't exist
try {
    mkdirSync(join(__dirname, 'uploads'), { recursive: true });
    console.log('📁 Uploads directory ready');
} catch (error) {
    console.error('Error creating uploads directory:', error);
}

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
  console.log(`   - ${serverUrl}/items`);
  console.log('\n🔗 Click here to open in browser:');
  console.log(`   ${serverUrl}`);
  console.log('\n👀 Watching for changes...');
}); 