import { expect } from 'chai';
import sinon from 'sinon';

describe('Gemini Improved Tests', function() {
  this.timeout(15000);
  
  let mockGenerativeModel, mockGenerativeAI, geminiModule;
  let consoleLogStub, consoleErrorStub;
  
  before(async function() {
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    
    // Create mock for model
    mockGenerativeModel = {
      generateContent: sinon.stub()
    };
    
    // Create mock for GenerativeAI
    mockGenerativeAI = {
      getGenerativeModel: sinon.stub().returns(mockGenerativeModel)
    };
    
    // Mock GoogleGenerativeAI constructor
    global.GoogleGenerativeAI = function() {
      return mockGenerativeAI;
    };
    
    // Mock fetch for ESM
    global.fetch = () => {};
    
    // Import the module
    geminiModule = await import('../../src/utils/gemini-improved.js');
  });
  
  afterEach(function() {
    // Reset mocks between tests
    mockGenerativeModel.generateContent.reset();
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
  });
  
  after(function() {
    // Clean up global mocks
    if (global.GoogleGenerativeAI) {
      delete global.GoogleGenerativeAI;
    }
    
    if (global.fetch) {
      delete global.fetch;
    }
    
    // Restore console stubs
    consoleLogStub.restore();
    consoleErrorStub.restore();
  });
  
  describe('analyzeImageFromBase64', () => {
    it('should successfully process response with valid JSON', async () => {
      // Set up successful response
      const successResponse = {
        response: {
          text: () => `
          Here's my analysis of the image:

          \`\`\`json
          {
            "title": "Test Camera",
            "description": "A high-quality camera for testing",
            "suggestedPrice": 35,
            "category": "Photography"
          }
          \`\`\`
          `
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(successResponse);
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify the result
      expect(result).to.deep.equal({
        title: "Test Camera",
        description: "A high-quality camera for testing",
        suggestedPrice: 35,
        category: "Photography"
      });
      
      // Verify console logs
      expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
      
      // Verify data object logging
      let dataLogged = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] && 
            typeof call.args[0] === 'object' && 
            call.args[0].title === 'Test Camera') {
          dataLogged = true;
          break;
        }
      }
      expect(dataLogged).to.be.true;
    });
    
    it('should throw an error when response has no JSON format', async () => {
      // Set up response with no JSON
      const noJsonResponse = {
        response: {
          text: () => 'This response has no JSON blocks'
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(noJsonResponse);
      
      try {
        // Call the function
        await geminiModule.analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
    });
    
    it('should handle JSON parsing errors', async () => {
      // Set up response with invalid JSON
      const invalidJsonResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Malformed JSON,
            "description": "This has syntax errors
            "category": "Electronics"
          }
          \`\`\`
          `
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(invalidJsonResponse);
      
      try {
        // Call the function
        await geminiModule.analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should properly destructure data from JSON response', async () => {
      // Set up response with all fields
      const completeResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Destructuring Test",
            "description": "Testing field extraction",
            "suggestedPrice": 55,
            "category": "Electronics"
          }
          \`\`\`
          `
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(completeResponse);
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify field extraction
      expect(result.title).to.equal("Destructuring Test");
      expect(result.description).to.equal("Testing field extraction");
      expect(result.suggestedPrice).to.equal(55);
      expect(result.category).to.equal("Electronics");
    });
    
    it('should handle incomplete data with missing fields', async () => {
      // Set up response with missing fields
      const incompleteResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Incomplete Data",
            "description": "Missing price and category"
          }
          \`\`\`
          `
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(incompleteResponse);
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify fields
      expect(result.title).to.equal("Incomplete Data");
      expect(result.description).to.equal("Missing price and category");
      expect(result.suggestedPrice).to.be.undefined;
      expect(result.category).to.be.undefined;
    });
    
    it('should handle API errors', async () => {
      // Configure the mock to throw an error
      mockGenerativeModel.generateContent.rejects(new Error('API Error'));
      
      try {
        // Call the function
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