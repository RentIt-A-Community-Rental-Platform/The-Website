import { expect } from 'chai';
import sinon from 'sinon';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeImageFromBase64 } from '../../src/utils/gemini.js';
import { analyzeImageFromBase64 as analyzeImageFromBase64Improved } from '../../src/utils/gemini-improved.js';

describe('Gemini Utilities', () => {
  let genAIStub;
  let modelStub;
  let generateContentStub;
  let responseStub;

  beforeEach(() => {
    // Create stubs for the Gemini API
    genAIStub = sinon.stub(GoogleGenerativeAI.prototype, 'getGenerativeModel');
    modelStub = {
      generateContent: sinon.stub()
    };
    generateContentStub = sinon.stub();
    responseStub = {
      text: sinon.stub()
    };

    genAIStub.returns(modelStub);
    modelStub.generateContent = generateContentStub;
    generateContentStub.resolves({ response: responseStub });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('analyzeImageFromBase64', () => {
    const mockBase64Image = 'base64-encoded-image-data';
    const mockResponse = {
      title: 'Test Item',
      description: 'Test Description',
      suggestedPrice: 10,
      category: 'Electronics'
    };

    it('should successfully analyze an image', async () => {
      responseStub.text.returns('```json\n' + JSON.stringify(mockResponse) + '\n```');

      const result = await analyzeImageFromBase64(mockBase64Image);

      expect(result).to.deep.equal(mockResponse);
      expect(genAIStub.calledOnce).to.be.true;
      expect(generateContentStub.calledOnce).to.be.true;
    });

    it('should handle invalid base64 data', async () => {
      responseStub.text.returns('Invalid response');

      try {
        await analyzeImageFromBase64('invalid-base64');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle API errors', async () => {
      generateContentStub.rejects(new Error('API Error'));

      try {
        await analyzeImageFromBase64(mockBase64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle missing image data', async () => {
      try {
        await analyzeImageFromBase64();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
  });

  describe('analyzeImageFromBase64 (Improved Version)', () => {
    const mockBase64Image = 'base64-encoded-image-data';
    const mockResponse = {
      title: 'Test Item',
      description: 'Test Description',
      suggestedPrice: 10,
      category: 'Electronics'
    };

    it('should successfully analyze an image', async () => {
      responseStub.text.returns('```json\n' + JSON.stringify(mockResponse) + '\n```');

      const result = await analyzeImageFromBase64Improved(mockBase64Image);

      expect(result).to.deep.equal(mockResponse);
      expect(genAIStub.calledOnce).to.be.true;
      expect(generateContentStub.calledOnce).to.be.true;
    });

    it('should handle invalid base64 data', async () => {
      responseStub.text.returns('Invalid response');

      try {
        await analyzeImageFromBase64Improved('invalid-base64');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle API errors', async () => {
      generateContentStub.rejects(new Error('API Error'));

      try {
        await analyzeImageFromBase64Improved(mockBase64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle missing image data', async () => {
      try {
        await analyzeImageFromBase64Improved();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle malformed JSON response', async () => {
      responseStub.text.returns('```json\n{invalid json}\n```');

      try {
        await analyzeImageFromBase64Improved(mockBase64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
  });
}); 