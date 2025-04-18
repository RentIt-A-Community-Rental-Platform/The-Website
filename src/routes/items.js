import express from 'express';
import multer from 'multer';
import { Item } from '../models/Item.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isAuthenticated } from './auth.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
console.log('📦 Items routes initialized');

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
    }
});

// Get all items
// GET /items?userId=123
router.get('/', async (req, res) => {
    try {
      const query = req.query.userId ? { userId: req.query.userId } : {};
      const items = await Item.find(query).sort({ createdAt: -1 });
      res.json(items);
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

// Create new item with authentication
router.post('/', isAuthenticated, async (req, res) => {
    try {
        console.log('Received item data:', req.body);

        const { title, description, price, category, deposit, photos } = req.body;
        
        // Get the authenticated user information
        const userId = req.user._id;
        const userName = req.user.name || 'Unknown User';

        // Parse the photos if needed (in case it's sent as a stringified array)
        const parsedPhotos = typeof photos === 'string' ? JSON.parse(photos) : photos;

        const item = new Item({
            title,
            description,
            price: parseFloat(price),
            category,
            deposit: parseFloat(deposit),
            userId: userId,
            userName: userName,  // Add the user's name
            photos: parsedPhotos || []
        });

        await item.save();
        console.log('Item created successfully by user:', userName);
        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(400).json({ error: 'Failed to create item' });
    }
});


// Get item by ID
router.get('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});



export const itemRoutes = router; 