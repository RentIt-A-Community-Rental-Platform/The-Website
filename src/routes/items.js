import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { Item } from '../models/Item.js';
import { User } from '../models/User.js';
import { analyzeImage } from '../utils/gemini.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import passport from 'passport';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
console.log('📦 Items routes initialized');

// Test MongoDB connection
router.get('/test-db', async (req, res) => {
    console.log('🔍 Testing MongoDB connection...');
    try {
        // Try to count items
        const count = await Item.countDocuments();
        console.log('✅ MongoDB connection test successful');
        console.log(`📊 Total items in database: ${count}`);
        res.json({
            status: 'success',
            message: 'MongoDB connection is working',
            itemCount: count
        });
    } catch (error) {
        console.error('❌ MongoDB test failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'MongoDB connection failed',
            error: error.message
        });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Setting upload destination');
    cb(null, join(__dirname, '../uploads'));
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

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('🔐 Verifying token for request:', req.path);
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    console.log('🔑 Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified, user ID:', decoded.userId);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = user;
    console.log('✅ User authenticated:', user.email);
    next();
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Upload image and get Gemini suggestions
router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  console.log('📸 Image upload request');
  try {
    if (!req.file) {
      console.log('❌ No image file provided');
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    console.log('✅ Image uploaded:', {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    });
    
    const imagePath = req.file.path;
    
    console.log('🤖 Analyzing image with Gemini...');
    const suggestions = await analyzeImage(imagePath);
    console.log('✅ Image analysis complete:', suggestions);
    
    res.json({
      imageUrl: `/uploads/${req.file.filename}`,
      suggestions
    });
  } catch (error) {
    console.error('❌ Image upload error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Get all items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().populate('userId', 'name email');
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Create new item
router.post('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const { title, description, price } = req.body;
        
        const item = new Item({
            title,
            description,
            price,
            userId: req.user._id
        });
        
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create item' });
    }
});

// Get item by ID
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).populate('userId', 'name email');
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// Update item
router.put('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        if (item.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        const { title, description, price } = req.body;
        item.title = title;
        item.description = description;
        item.price = price;
        
        await item.save();
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update item' });
    }
});

// Delete item
router.delete('/:id', passport.authenticate('jwt', { session: false }), async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        if (item.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        await item.deleteOne();
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

export const itemRoutes = router; 