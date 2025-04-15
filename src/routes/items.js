import express from 'express';
import multer from 'multer';
import { Item } from '../models/Item.js';
import { analyzeImage } from '../utils/gemini.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Get all items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Create new item
router.post('/', async (req, res) => {
    try {
        const { title, description, price } = req.body;
        
        const item = new Item({
            title,
            description,
            price
        });
        
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create item' });
    }
});

// Update item
router.put('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
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
router.delete('/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        await item.deleteOne();
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

export const itemRoutes = router; 