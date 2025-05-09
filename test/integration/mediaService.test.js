import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MediaService } from '../../src/services/MediaService.js';
import { User } from '../../src/models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import { setupTestDB, teardownTestDB, clearCollections } from '../helpers/testUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MediaService', () => {
  let mongoServer;
  let mediaService;
  let testUser;

  before(async () => {
    await setupTestDB();
    mediaService = new MediaService();
  });

  after(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const fileBuffer = await fs.readFile(testFilePath);

      const result = await mediaService.uploadFile(fileBuffer, testUser._id);

      expect(result).to.have.property('public_id');
      expect(result).to.have.property('format');
      expect(result).to.have.property('resource_type');
      expect(result).to.have.property('url');
    });

    it('should upload a file with custom options', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const fileBuffer = await fs.readFile(testFilePath);
      const options = {
        folder: 'test-folder',
        resource_type: 'image'
      };

      const result = await mediaService.uploadFile(fileBuffer, testUser._id, options);

      expect(result).to.have.property('public_id');
      expect(result.public_id).to.include('test-folder');
      expect(result).to.have.property('format');
      expect(result).to.have.property('resource_type', 'image');
    });

    it('should throw error for invalid file buffer', async () => {
      const invalidBuffer = Buffer.from('invalid data');

      try {
        await mediaService.uploadFile(invalidBuffer, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error uploading file');
      }
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const fileBuffer = await fs.readFile(testFilePath);
      const uploadedFile = await mediaService.uploadFile(fileBuffer, testUser._id);

      const result = await mediaService.deleteFile(uploadedFile.public_id);

      expect(result).to.have.property('result', 'ok');
    });

    it('should throw error for non-existent file', async () => {
      try {
        await mediaService.deleteFile('non-existent-file');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error deleting file');
      }
    });

    it('should throw error for invalid public_id', async () => {
      try {
        await mediaService.deleteFile('');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error deleting file');
      }
    });
  });

  describe('streamUpload', () => {
    it('should handle stream upload error', async () => {
      const invalidBuffer = Buffer.from('invalid data');

      try {
        await mediaService.streamUpload(invalidBuffer);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Error uploading file');
      }
    });
  });

  describe('getUserFiles', () => {
    it('should get all files for a user', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const fileBuffer = await fs.readFile(testFilePath);
      await mediaService.uploadFile(fileBuffer, testUser._id);

      const files = await mediaService.getUserFiles(testUser._id);

      expect(files).to.be.an('array');
      expect(files[0]).to.have.property('public_id');
      expect(files[0]).to.have.property('url');
    });
  });

  describe('validateFileType', () => {
    it('should validate image file types', async () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      
      for (const type of validTypes) {
        const isValid = await mediaService.validateFileType({ mimetype: type });
        expect(isValid).to.be.true;
      }
    });

    it('should reject invalid file types', async () => {
      const invalidTypes = ['application/pdf', 'text/plain', 'video/mp4'];
      
      for (const type of invalidTypes) {
        const isValid = await mediaService.validateFileType({ mimetype: type });
        expect(isValid).to.be.false;
      }
    });
  });
}); 