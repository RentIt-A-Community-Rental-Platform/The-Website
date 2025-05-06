import { expect } from 'chai';
import sinon from 'sinon';

// Test file specifically targeting gemini.js to improve coverage
describe('Gemini Utility Combined Tests', function() {
  this.timeout(10000);
  
  // Mock objects for the GoogleGenerativeAI module
  let mockGenerativeModel, mockGenerativeAI, geminiModule;
  let consoleLogStub, consoleErrorStub;
  
  before(async function() {
    // Stub console methods to avoid polluting test output and track calls
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    
    // Create mock for the GenerativeModel class
    mockGenerativeModel = {
      generateContent: sinon.stub()
    };
    
    // Create mock for the GoogleGenerativeAI class
    mockGenerativeAI = {
      getGenerativeModel: sinon.stub().returns(mockGenerativeModel)
    };
    
    // Set up the mock GoogleGenerativeAI constructor
    global.GoogleGenerativeAI = function(apiKey) {
      return mockGenerativeAI;
    };
    
    // Configure mock fetch for ES module
    global.fetch = () => {};
    
    // Import the module after setting up mocks
    geminiModule = await import('../../src/utils/gemini.js');
  });
  
  afterEach(function() {
    // Reset stubs after each test
    mockGenerativeModel.generateContent.reset();
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
  });
  
  after(function() {
    // Clean up global mocks and restore console methods
    if (global.GoogleGenerativeAI) {
      delete global.GoogleGenerativeAI;
    }
    
    if (global.fetch) {
      delete global.fetch;
    }
    
    // Restore all stubs
    sinon.restore();
  });
  
  describe('analyzeImageFromBase64', () => {
    // Basic success test
    it('should successfully analyze an image and extract data', async () => {
      const mockSuccessResponse = {
        response: {
          text: () => `
          Here's my analysis of the image:

          \`\`\`json
          {
            "title": "Professional DSLR Camera",
            "description": "High-quality Canon DSLR camera with 24MP sensor",
            "suggestedPrice": 25,
            "category": "Photography"
          }
          \`\`\`
          `
        }
      };
      
      mockGenerativeModel.generateContent.resolves(mockSuccessResponse);
      
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify results
      expect(result).to.have.property('title', 'Professional DSLR Camera');
      expect(result).to.have.property('description', 'High-quality Canon DSLR camera with 24MP sensor');
      expect(result).to.have.property('suggestedPrice', 25);
      expect(result).to.have.property('category', 'Photography');
      
      // Verify console logs were called
      expect(consoleLogStub.called).to.be.true;
    });
    
    // Test for no JSON in response
    it('should handle response with no JSON format', async () => {
      const noJsonResponse = {
        response: {
          text: () => 'This response has no JSON format'
        }
      };
      
      mockGenerativeModel.generateContent.resolves(noJsonResponse);
      
      try {
        await geminiModule.analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged
      let noJsonCallFound = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] === "No JSON found") {
          noJsonCallFound = true;
          break;
        }
      }
      expect(noJsonCallFound).to.be.true;
    });
    
    // Test for malformed JSON
    it('should handle malformed JSON response', async () => {
      const malformedResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Broken JSON,
            "description": "This JSON is malformed"
            "suggestedPrice": 20,
          }
          \`\`\`
          `
        }
      };
      
      mockGenerativeModel.generateContent.resolves(malformedResponse);
      
      try {
        await geminiModule.analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    // Test for incomplete JSON data
    it('should handle incomplete JSON data', async () => {
      const incompleteJsonResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Incomplete Item",
            "description": "Missing fields"
          }
          \`\`\`
          `
        }
      };
      
      mockGenerativeModel.generateContent.resolves(incompleteJsonResponse);
      
      try {
        const result = await geminiModule.analyzeImageFromBase64('test-base64');
        
        // Should still return a result with undefined values for missing properties
        expect(result).to.have.property('title', 'Incomplete Item');
        expect(result).to.have.property('description', 'Missing fields');
        expect(result).to.have.property('suggestedPrice', undefined);
        expect(result).to.have.property('category', undefined);
      } catch (error) {
        // If it throws, that's fine too
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
    
    // Test for API error
    it('should handle Gemini API errors', async () => {
      // Configure the mock to throw an error
      mockGenerativeModel.generateContent.rejects(new Error('API Error'));
      
      try {
        await geminiModule.analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
  });
});