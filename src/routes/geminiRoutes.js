import express from 'express';
import { GeminiService } from '../services/GeminiService.js';

const router = express.Router();
const geminiService = new GeminiService();

router.post('/analyze', async (req, res) => {
    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            console.log('> No image provided');
            return res.status(400).json({ error: 'Missing base64 image' });
        }

        const result = await geminiService.analyzeImageFromBase64(base64Image);
        res.json(result);
    } catch (error) {
        console.error('> Failed to analyze image:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
