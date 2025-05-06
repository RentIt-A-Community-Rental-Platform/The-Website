import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import express from 'express';
import * as geminiUtilsPath from '../../src/utils/gemini.js';

describe('Gemini Routes Full Tests', function() {
  this.timeout(10000);
  let app, request;
  let analyzeImageStub;

  before(async function() {
    // Create a stub for the analyzeImageFromBase64 function
    analyzeImageStub = sinon.stub();
    
    // Create a mock version of the gemini utils
    const mockGeminiUtils = {
      analyzeImageFromBase64: analyzeImageStub
    };
    
    // Create test express app
    app = express();
    app.use(express.json({ limit: '10mb' }));
    
    // Setup the router
    const router = express.Router();
    
    router.post('/analyze', async (req, res) => {
      try {
        const { base64Image } = req.body;
    
        if (!base64Image) {
          console.log('> No image provided');
          return res.status(400).json({ error: 'Missing base64 image' });
        }
    
        const result = await mockGeminiUtils.analyzeImageFromBase64(base64Image);
    
        res.json(result);
      } catch (error) {
        console.error('> Failed to analyze image:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
      }
    });
    
    app.use('/api/gemini', router);
    request = supertest(app);
  });

  afterEach(() => {
    // Reset the stub after each test
    analyzeImageStub.reset();
  });

  describe('POST /api/gemini/analyze', () => {
    it('should successfully analyze an image and return results', async () => {
      // Setup the stub to return a successful result
      const mockResult = {
        title: 'Professional DSLR Camera',
        description: 'High-quality Canon DSLR camera with 24MP sensor.',
        suggestedPrice: 25,
        category: 'Photography'
      };
      
      analyzeImageStub.resolves(mockResult);
      
      const response = await request
        .post('/api/gemini/analyze')
        .send({
          base64Image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
        });
      
      expect(response.status).to.equal(200);
      expect(response.body).to.deep.equal(mockResult);
      expect(analyzeImageStub.calledOnce).to.be.true;
    });

    it('should handle missing base64 image', async () => {
      const response = await request
        .post('/api/gemini/analyze')
        .send({});
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error', 'Missing base64 image');
      expect(analyzeImageStub.called).to.be.false;
    });

    it('should handle empty base64 image', async () => {
      const response = await request
        .post('/api/gemini/analyze')
        .send({ base64Image: '' });
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('error', 'Missing base64 image');
      expect(analyzeImageStub.called).to.be.false;
    });

    it('should handle Gemini API errors', async () => {
      // Setup the stub to throw an error
      analyzeImageStub.rejects(new Error('API error'));
      
      const response = await request
        .post('/api/gemini/analyze')
        .send({
          base64Image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
        });
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('error', 'Failed to analyze image');
      expect(analyzeImageStub.calledOnce).to.be.true;
    });
  });
});