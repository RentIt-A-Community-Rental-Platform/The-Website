import { expect } from 'chai';
import request from 'supertest';
import { testApp } from '../setup.js';
import { User } from '../../src/models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinaryRoutes from '../../src/routes/cloudinaryUpload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount cloudinary routes on test app
testApp.use('/api', cloudinaryRoutes);

describe('Cloudinary Upload Routes', () => {
  let token;

  before(async () => {
    // Create a test user and get token
    const res = await request(testApp)
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

    token = res.body.token;
  });

  describe('POST /api/upload-image', () => {
    it('should upload image successfully', async () => {
      const res = await request(testApp)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', path.join(__dirname, '../fixtures/test-image.jpg'));

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('url');
      expect(res.body.url).to.be.a('string');
    });

    it('should fail with invalid file type', async () => {
      const res = await request(testApp)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', path.join(__dirname, '../fixtures/test.txt'));

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error');
    });

    it('should fail without authentication', async () => {
      const res = await request(testApp)
        .post('/api/upload-image')
        .attach('image', path.join(__dirname, '../fixtures/test-image.jpg'));

      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('error');
    });

    it('should handle cloudinary upload error', async () => {
      const res = await request(testApp)
        .post('/api/upload-image')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', path.join(__dirname, '../fixtures/invalid-image.jpg'));

      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error');
    });
  });
}); 