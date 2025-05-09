import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import app from '../../src/app.js';
import { createTestUser } from '../helpers/testUtils.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('File Upload Routes', () => {
  let mongoServer;
  let authToken;

  before(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_TEST_URI = mongoUri;
    process.env.NODE_ENV = 'test';

    // Create a test user and get auth token
    const { token } = await createTestUser(app);
    authToken = token;
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /upload', () => {
    it('should upload a file successfully', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      
      const response = await request(app)
        .post('/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .expect(200);

      expect(response.body).to.have.property('url');
      expect(response.body.url).to.be.a('string');
    });

    it('should not upload without authentication', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      
      const response = await request(app)
        .post('/upload')
        .attach('file', testFilePath)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });

    it('should not upload without a file', async () => {
      const response = await request(app)
        .post('/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('No file uploaded');
    });

    it('should not upload invalid file types', async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test.txt');
      
      const response = await request(app)
        .post('/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .expect(400);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Invalid file type');
    });
  });

  describe('DELETE /upload/:filename', () => {
    let uploadedFileUrl;

    beforeEach(async () => {
      const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const response = await request(app)
        .post('/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath);
      uploadedFileUrl = response.body.url;
    });

    it('should delete an uploaded file', async () => {
      const filename = path.basename(uploadedFileUrl);
      
      const response = await request(app)
        .delete(`/upload/${filename}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).to.have.property('message');
      expect(response.body.message).to.include('deleted successfully');
    });

    it('should not delete file without authentication', async () => {
      const filename = path.basename(uploadedFileUrl);
      
      const response = await request(app)
        .delete(`/upload/${filename}`)
        .expect(401);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('Authentication required');
    });

    it('should handle non-existent file deletion', async () => {
      const response = await request(app)
        .delete('/upload/nonexistent.jpg')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).to.have.property('error');
      expect(response.body.error).to.include('File not found');
    });
  });
}); 