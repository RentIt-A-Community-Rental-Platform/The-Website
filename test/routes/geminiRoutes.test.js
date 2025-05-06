import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import * as geminiUtils from '../../src/utils/gemini.js';

describe.skip('Gemini Routes Tests', function() {
  this.timeout(10000);
  let app, request, analyzeStub;

  before(async function() {
    // Create test express app
    app = express();
    app.use(express.json({ limit: '10mb' }));
    
    // Create a stub for the analyzeImageFromBase64 function
    analyzeStub = sinon.stub(geminiUtils, 'analyzeImageFromBase64');
    
    // Create a router similar to geminiRoutes.js but using our stub
    const router = express.Router();
    
    router.post('/analyze', async (req, res) => {
      try {
        const { base64Image } = req.body;
    
        if (!base64Image) {
          return res.status(400).json({ error: 'Missing base64 image' });
        }
    
        const result = await analyzeStub(base64Image);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze image' });
      }
    });
    
    app.use('/api/gemini', router);
    request = supertest(app);
  });

  afterEach(() => {
    // Reset the stub after each test
    analyzeStub.reset();
  });

  after(() => {
    // Restore the original function
    analyzeStub.restore();
  });

  describe('POST /api/gemini/analyze', () => {
    it('should analyze image and return results', async () => {
      // Setup the stub to return a successful result
      const mockResult = {
        title: 'Professional DSLR Camera',
        description: 'High-quality Canon DSLR camera with 24MP sensor.',
        suggestedPrice: 25,
        category: 'Photography'
      };
      
      analyzeStub.resolves(mockResult);
      
      const response = await request
        .post('/api/gemini/analyze')
        .send({
          base64Image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(mockResult);
      expect(analyzeStub.calledOnce).to.be.true;
    });

    it('should handle missing base64 image', async () => {
      const response = await request
        .post('/api/gemini/analyze')
        .send({});
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error', 'Missing base64 image');
      expect(analyzeStub.called).to.be.false;
    });

    it('should handle gemini API errors', async () => {
      // Setup the stub to throw an error
      analyzeStub.rejects(new Error('API error'));
      
      const response = await request
        .post('/api/gemini/analyze')
        .send({
          base64Image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
        });
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to analyze image');
      expect(analyzeStub.calledOnce).to.be.true;
    });
  });
});