import express from 'express';
import { User } from '../models/User.js';
import { isAuthenticated } from './auth.js';

const router = express.Router();

// Get user by ID
router.get('/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select('-password -googleId'); // Exclude sensitive information
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user information' });
    }
});

export const userRoutes = router;