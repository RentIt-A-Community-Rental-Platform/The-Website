// routes/cloudinaryUpload.js
import express from 'express';
import multer from 'multer';
import { config } from 'dotenv';
import { MediaService } from '../services/MediaService.js';

config(); // Load .env

const router = express.Router();
const upload = multer(); // Handles multipart/form-data in memory
const mediaService = new MediaService();

router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('> No file received');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('> File received:', req.file.originalname, req.file.mimetype);

        const result = await mediaService.uploadFile(req.file.buffer);
        console.log('> Uploaded to Cloudinary:', result.url);
        res.json({ secure_url: result.url });

    } catch (err) {
        console.error('> Upload failed:', err);
        res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
});

export default router;
