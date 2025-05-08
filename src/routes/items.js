import express from 'express';
import { isAuthenticated } from './auth.js';
import { ItemService } from '../services/ItemService.js';

const router = express.Router();
const itemService = new ItemService();

// Get all items
router.get('/', async (req, res) => {
    try {
        let items;
        if (req.query.userId) {
            items = await itemService.getUserItems(req.query.userId);
        } else if (req.query.excludeUserId) {
            items = await itemService.getExcludeUserItems(req.query.excludeUserId);
        } else {
            items = await itemService.getAllItems();
        }
        res.json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new item
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const item = await itemService.createItem(
            req.body,
            req.user._id,
            req.user.name || 'Unknown User'
        );
        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(400).json({ error: error.message });
    }
});


// Get item by ID
router.get('/:id', async (req, res) => {
    try {
        const item = await itemService.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// Update item (PUT)
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.user._id;
        const updateData = req.body;

        // First check if the item belongs to the user
        const existingItem = await itemService.findOne({ _id: itemId, userId });
        if (!existingItem) {
            return res.status(404).json({ error: 'Item not found or unauthorized' });
        }

        const updatedItem = await itemService.update(itemId, updateData);
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Delete item (DELETE)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const itemId = req.params.id;
        const userId = req.user._id;

        const deletedItem = await itemService.delete(itemId);

        if (!deletedItem) {
            return res.status(404).json({ error: 'Item not found or unauthorized' });
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

export const itemRoutes = router;