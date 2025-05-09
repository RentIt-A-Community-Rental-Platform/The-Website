import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MediaService } from '../../src/services/MediaService.js';
import { User } from '../../src/models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('MediaService', () => {
  let mongoServer;
  let mediaService;
  let testUser;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    mediaService = new MediaService();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const result = await mediaService.uploadFile(testFilePath, testUser._id);
      
      expect(result).to.have.property('url');
      expect(result).to.have.property('filename');
      expect(result.url).to.be.a('string');
      expect(result.filename).to.be.a('string');
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentPath = path.join(__dirname, '../fixtures/nonexistent.jpg');
      
      try {
        await mediaService.uploadFile(nonExistentPath, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('no such file or directory');
      }
    });

    it('should throw error for invalid file type', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test.txt');
      
      try {
        await mediaService.uploadFile(testFilePath, testUser._id);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Invalid file type');
      }
    });
  });

  describe('deleteFile', () => {
    let uploadedFile;

    beforeEach(async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      uploadedFile = await mediaService.uploadFile(testFilePath, testUser._id);
    });

    it('should delete a file successfully', async () => {
      const result = await mediaService.deleteFile(uploadedFile.filename);
      expect(result).to.be.true;
    });

    it('should throw error for non-existent file', async () => {
      try {
        await mediaService.deleteFile('nonexistent.jpg');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('File not found');
      }
    });
  });

  describe('getUserFiles', () => {
    beforeEach(async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      await mediaService.uploadFile(testFilePath, testUser._id);
      await mediaService.uploadFile(testFilePath, testUser._id);
    });

    it('should get all files for a user', async () => {
      const files = await mediaService.getUserFiles(testUser._id);
      expect(files).to.be.an('array');
      expect(files).to.have.lengthOf(2);
      expect(files[0]).to.have.property('url');
      expect(files[0]).to.have.property('filename');
    });

    it('should return empty array for user with no files', async () => {
      const files = await mediaService.getUserFiles(new mongoose.Types.ObjectId());
      expect(files).to.be.an('array').that.is.empty;
    });
  });

  describe('validateFileType', () => {
    it('should validate image file types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      validTypes.forEach(type => {
        expect(mediaService.validateFileType(type)).to.be.true;
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];
      invalidTypes.forEach(type => {
        expect(mediaService.validateFileType(type)).to.be.false;
      });
    });
  });
}); 