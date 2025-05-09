// routes/cloudinaryUpload.js
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import streamifier from 'streamifier';
import { isAuthenticated } from './auth.js';

config(); // Load .env

const router = express.Router();
const upload = multer(); // Handles multipart/form-data in memory

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/upload-image', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type. Only images are allowed.' });
        }

        const streamUpload = (fileBuffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'rentit/uploads'
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Upload failed:', error);
                            reject(new Error('Invalid image file'));
                        } else {
                            resolve(result);
                        }
                    }
                );
                streamifier.createReadStream(fileBuffer).pipe(stream);
            });
        };

        const result = await streamUpload(req.file.buffer);
        res.json({ url: result.secure_url });

    } catch (err) {
        console.error('Upload failed:', err);
        if (err.message === 'Invalid image file') {
            res.status(400).json({ error: err.message });
        } else {
            res.status(500).json({ error: 'Failed to upload image' });
        }
    }
});

export default router;
