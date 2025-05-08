import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { BaseService } from './BaseService.js';

export class MediaService extends BaseService {
    constructor() {
        super(null); // We don't need a model for this service
        
        // Configure Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET
        });
    }

    /**
     * Uploads a file buffer to Cloudinary
     * @param {Buffer} fileBuffer - The file buffer to upload
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} - Cloudinary upload result
     */
    async uploadFile(fileBuffer, options = {}) {
        try {
            const defaultOptions = {
                folder: 'rentit/uploads'
            };

            const uploadOptions = { ...defaultOptions, ...options };

            const result = await this.streamUpload(fileBuffer, uploadOptions);
            return {
                url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                resource_type: result.resource_type
            };
        } catch (error) {
            throw new Error(`Error uploading file: ${error.message}`);
        }
    }

    /**
     * Deletes a file from Cloudinary
     * @param {string} publicId - The public ID of the file to delete
     * @returns {Promise<Object>} - Cloudinary deletion result
     */
    async deleteFile(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new Error(`Error deleting file: ${error.message}`);
        }
    }

    /**
     * Internal method to handle stream upload to Cloudinary
     * @private
     */
    streamUpload(fileBuffer, options) {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                options,
                (error, result) => {
                    if (result) resolve(result);
                    else reject(error);
                }
            );
            streamifier.createReadStream(fileBuffer).pipe(stream);
        });
    }
}