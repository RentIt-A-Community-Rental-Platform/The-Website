import express from 'express';
import { analyzeImageFromBase64 } from '../utils/gemini.js'; // Adjust path if needed

const router = express.Router();

router.post('/analyze', async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      console.log('> No image provided');
      return res.status(400).json({ error: 'Missing base64 image' });
    }

    const result = await analyzeImageFromBase64(base64Image);

    res.json(result);
  } catch (error) {
    console.error('> Failed to analyze image:', error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

export default router;
