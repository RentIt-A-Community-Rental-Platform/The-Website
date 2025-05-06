import { expect } from 'chai';
import sinon from 'sinon';
import { analyzeImageFromBase64 } from '../../src/utils/gemini.js';

// Mock the Google Generative AI module
class MockGenerativeModel {
  constructor() {
    this.generateContent = sinon.stub();
  }
}

class MockGoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.getGenerativeModel = sinon.stub();
  }
}

describe.skip('Gemini Utility Tests', function() {
  this.timeout(10000); // Increase timeout
  let mockModel, mockAI;

  beforeEach(() => {
    // Create mock instances
    mockModel = new MockGenerativeModel();
    mockAI = new MockGoogleGenerativeAI('fake-api-key');
    
    // Set up the mock to return our mock model
    mockAI.getGenerativeModel.returns(mockModel);
    
    // Replace the module import instead of global
    global.GoogleGenerativeAI = function() {
      return mockAI;
    };
  });

  afterEach(() => {
    // Clean up
    sinon.restore();
  });

  it('should extract data from gemini response correctly', async () => {
    // Sample base64 image
    const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...';
    
    // Mock response from Gemini
    const mockResponse = {
      response: {
        text: () => `
        Here's my analysis of the image:

        \`\`\`json
        {
          "title": "Professional DSLR Camera",
          "description": "High-quality Canon DSLR camera with 24MP sensor, excellent condition, includes lens cap and strap. Perfect for photography students or enthusiasts.",
          "suggestedPrice": 25,
          "category": "Photography"
        }
        \`\`\`
        `
      }
    };

    // Configure mock to return our sample response
    mockModel.generateContent.resolves(mockResponse);

    // Call the function
    const result = await analyzeImageFromBase64(sampleBase64);

    // Verify the result
    expect(result).to.have.property('title', 'Professional DSLR Camera');
    expect(result).to.have.property('description', 'High-quality Canon DSLR camera with 24MP sensor, excellent condition, includes lens cap and strap. Perfect for photography students or enthusiasts.');
    expect(result).to.have.property('suggestedPrice', 25);
    expect(result).to.have.property('category', 'Photography');

    // Check that the model was properly invoked
    expect(mockAI.getGenerativeModel.calledOnce).to.be.true;
    expect(mockModel.generateContent.calledOnce).to.be.true;
  });

  it('should handle errors gracefully', async () => {
    // Sample base64 image
    const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...';
    
    // Make the mock throw an error
    mockModel.generateContent.rejects(new Error('API Error'));

    try {
      await analyzeImageFromBase64(sampleBase64);
      // If we reach this point, the test should fail
      expect.fail('Function should have thrown an error');
    } catch (error) {
      expect(error).to.be.an('error');
      expect(error.message).to.equal('Failed to analyze image');
    }
  });

  it('should handle malformed JSON response', async () => {
    // Sample base64 image
    const sampleBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/...';
    
    // Mock response with no JSON
    const mockBadResponse = {
      response: {
        text: () => 'Sorry, I could not analyze this image properly.'
      }
    };

    // Configure mock to return our bad response
    mockModel.generateContent.resolves(mockBadResponse);

    try {
      await analyzeImageFromBase64(sampleBase64);
      // If we reach this point, the test should fail
      expect.fail('Function should have thrown an error');
    } catch (error) {
      expect(error).to.be.an('error');
      // The error would occur when trying to parse JSON
      expect(error.message).to.include('Failed to analyze image');
    }
  });
});