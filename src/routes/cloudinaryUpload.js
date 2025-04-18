// routes/cloudinaryUpload.js
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import streamifier from 'streamifier';

config(); // Load .env

const router = express.Router();
const upload = multer(); // Handles multipart/form-data in memory

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        console.log('> No file received');
        return res.status(400).json({ error: 'No file uploaded' });
      }
  
      console.log('> File received:', req.file.originalname, req.file.mimetype);
  
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'rentit/uploads'
            },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          streamifier.createReadStream(fileBuffer).pipe(stream);
        });
      };
  
      const result = await streamUpload(req.file.buffer);
      console.log('> Uploaded to Cloudinary:', result.secure_url);
      res.json({ secure_url: result.secure_url });
  
    } catch (err) {
      console.error('> Upload failed:', err);
      res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
  });

export default router;
