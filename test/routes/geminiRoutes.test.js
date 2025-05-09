import { expect } from 'chai';
import request from 'supertest';
import { testApp } from '../setup.js';
import { User } from '../../src/models/User.js';
import sinon from 'sinon';
import * as geminiUtils from '../../src/utils/gemini.js';
import geminiRoutes from '../../src/routes/geminiRoutes.js';

// Mount Gemini routes on test app
testApp.use('/api/gemini', geminiRoutes);

describe('Gemini Routes', () => {
  let token;
  let geminiStub;

  before(async () => {
    // Create test user and get token
    const user = await User.create({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test User'
    });

    const login = await request(testApp)
      .post('/auth/login')
      .send({
        email: 'test@test.com',
        password: 'password123'
      });
    token = login.body.token;

    // Stub the Gemini API
    geminiStub = sinon.stub(geminiUtils, 'analyzeImageFromBase64');
  });

  after(() => {
    geminiStub.restore();
  });

  beforeEach(() => {
    geminiStub.reset();
  });

  describe('POST /api/gemini/analyze', () => {
    it('should analyze image successfully', async () => {
      const mockAnalysis = {
        title: 'Test Item',
        description: 'A test item',
        suggestedPrice: 50,
        category: 'Electronics'
      };

      geminiStub.resolves(mockAnalysis);

      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('title');
    });

    it('should handle missing image data', async () => {
      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).to.equal(400);
    });

    it('should handle invalid base64 data', async () => {
      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          imageData: 'invalid-base64-data'
        });

      expect(res.status).to.equal(400);
    });

    it('should handle analysis failure', async () => {
      geminiStub.rejects(new Error('Analysis failed'));

      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        });

      expect(res.status).to.equal(500);
    });

    it('should handle large image data', async () => {
      const largeImageData = 'data:image/jpeg;base64,' + 'a'.repeat(5 * 1024 * 1024); // 5MB

      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          imageData: largeImageData
        });

      expect(res.status).to.equal(400);
    });

    it('should handle different image formats', async () => {
      const mockAnalysis = {
        title: 'Test Item',
        description: 'A test item',
        suggestedPrice: 50,
        category: 'Electronics'
      };

      geminiStub.resolves(mockAnalysis);

      const formats = ['jpeg', 'png', 'gif', 'webp'];
      for (const format of formats) {
        const res = await request(testApp)
          .post('/api/gemini/analyze')
          .set('Authorization', `Bearer ${token}`)
          .send({
            imageData: `data:image/${format};base64,/9j/4AAQSkZJRg==`
          });

        expect(res.status).to.equal(200);
      }
    });

    it('should handle timeout scenarios', async () => {
      geminiStub.returns(new Promise(resolve => setTimeout(resolve, 10000)));

      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send({
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        });

      expect(res.status).to.equal(500);
    });

    it('should handle malformed JSON', async () => {
      const res = await request(testApp)
        .post('/api/gemini/analyze')
        .set('Authorization', `Bearer ${token}`)
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(res.status).to.equal(400);
    });
  });
}); 