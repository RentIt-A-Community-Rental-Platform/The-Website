import express from 'express';
import multer from 'multer';
import { Item } from '../models/Item.js';
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
    }
});

// Get all items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// Create new item - no auth check
router.post('/', upload.array('photos', 5), async (req, res) => {
    try {
        console.log('Received item data:', req.body);
        
        const { title, description, price, category, deposit } = req.body;
        
        // Create item with dummy user
        const item = new Item({
            title,
            description,
            price: parseFloat(price),
            category,
            deposit: parseFloat(deposit),
            userId: '123', // Dummy user ID
            photos: req.files ? req.files.map(file => file.filename) : []
        });
        
        await item.save();
        console.log('Item created successfully:', item);
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