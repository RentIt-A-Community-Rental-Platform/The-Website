import { expect } from 'chai';
import sinon from 'sinon';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as geminiUtils from '../../src/utils/gemini-improved.js';

describe('Improved Gemini Utils', () => {
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
    it('should analyze image successfully', async () => {
      const mockResponse = {
        title: 'Test Item',
        description: 'Test Description',
        suggestedPrice: 10,
        category: 'Electronics'
      };

      responseStub.text.returns(`\`\`\`json\n${JSON.stringify(mockResponse)}\n\`\`\``);

      const base64Image = 'test-base64-image';
      const result = await geminiUtils.analyzeImageFromBase64(base64Image);

      expect(result).to.deep.equal(mockResponse);
      expect(genAIStub.calledOnce).to.be.true;
      expect(generateContentStub.calledOnce).to.be.true;
    });

    it('should handle API error', async () => {
      generateContentStub.rejects(new Error('API Error'));

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle invalid JSON in code block', async () => {
      responseStub.text.returns('```json\nInvalid JSON\n```');

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to parse JSON response');
      }
    });

    it('should handle missing JSON code block', async () => {
      responseStub.text.returns('No JSON data here');

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('No JSON data found in response');
      }
    });

    it('should handle missing required fields in response', async () => {
      const mockResponse = {
        title: 'Test Item',
        description: 'Test Description'
        // Missing suggestedPrice and category
      };

      responseStub.text.returns(`\`\`\`json\n${JSON.stringify(mockResponse)}\n\`\`\``);

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
    });

    it('should handle empty response', async () => {
      responseStub.text.returns('');

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('No JSON data found in response');
      }
    });

    it('should handle null response', async () => {
      responseStub.text.returns(null);

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('No JSON data found in response');
      }
    });

    it('should handle malformed JSON in code block', async () => {
      responseStub.text.returns('```json\n{"title": "Test Item", "description": "Test Description", "suggestedPrice": 10, "category": "Electronics"\n```');

      const base64Image = 'test-base64-image';
      try {
        await geminiUtils.analyzeImageFromBase64(base64Image);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to parse JSON response');
      }
    });
  });
}); 