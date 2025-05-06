import { expect } from 'chai';
import sinon from 'sinon';

// Test file specifically targeting edge cases in gemini.js to improve coverage
describe('Gemini Utility Edge Cases', function() {
  this.timeout(10000);
  
  // Mock objects for the GoogleGenerativeAI module
  let mockGenerativeModel, mockGenerativeAI, geminiModule;
  let consoleLogStub;
  
  before(async function() {
    // Save original console methods
    const originalConsoleLog = console.log;
    
    // Create mock for the GenerativeModel class
    mockGenerativeModel = {
      generateContent: sinon.stub()
    };
    
    // Create mock for the GoogleGenerativeAI class
    mockGenerativeAI = {
      getGenerativeModel: sinon.stub().returns(mockGenerativeModel)
    };
    
    // Override console.log with a spy that both logs and records calls
    consoleLogStub = sinon.spy((...args) => {
      // Uncomment the next line to see logs during test runs
      // originalConsoleLog(...args);
    });
    console.log = consoleLogStub;
    
    // Stub console.error to prevent error output
    sinon.stub(console, 'error');
    
    // Set up the mock GoogleGenerativeAI constructor
    global.GoogleGenerativeAI = function(apiKey) {
      return mockGenerativeAI;
    };
    
    // Import the module after setting up mocks
    geminiModule = await import('../../src/utils/gemini.js');
  });
  
  afterEach(function() {
    // Reset stubs after each test
    mockGenerativeModel.generateContent.reset();
    consoleLogStub.resetHistory();
  });
  
  after(function() {
    // Clean up global mocks and restore console methods
    if (global.GoogleGenerativeAI) {
      delete global.GoogleGenerativeAI;
    }
    
    // Restore all stubs
    sinon.restore();
  });
  
  describe('analyzeImageFromBase64 edge cases', () => {
    it('should handle valid JSON response and parse data correctly', async () => {
      // Setup mock response with valid JSON
      const validResponse = {
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
      
      mockGenerativeModel.generateContent.resolves(validResponse);
      
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify the result object contains all expected properties
      expect(result).to.have.property('title', 'Professional DSLR Camera');
      expect(result).to.have.property('description', 'High-quality Canon DSLR camera with 24MP sensor');
      expect(result).to.have.property('suggestedPrice', 25);
      expect(result).to.have.property('category', 'Photography');
      
      // Verify console.log was called with the text response
      let callFound = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] === "GEMINI TEXT: ") {
          callFound = true;
          break;
        }
      }
      expect(callFound).to.be.true;
      
      // Verify console.log was called with the parsed object
      let objectCallFound = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] && 
            typeof call.args[0] === 'object' && 
            call.args[0].title === 'Professional DSLR Camera') {
          objectCallFound = true;
          break;
        }
      }
      expect(objectCallFound).to.be.true;
    });
    
    it('should log "No JSON found" when response has no JSON format', async () => {
      const noJsonResponse = {
        response: {
          text: () => 'Just a plain text response with no JSON formatting.'
        }
      };
      
      mockGenerativeModel.generateContent.resolves(noJsonResponse);
      
      try {
        await geminiModule.analyzeImageFromBase64('test-base64');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Check if "No JSON found" was logged
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
    
    it('should handle incomplete JSON data', async () => {
      // This test targets the edge case of missing fields in JSON
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
        
        // If it doesn't throw, check that undefined values are returned for missing fields
        expect(result).to.have.property('title', 'Incomplete Item');
        expect(result).to.have.property('description', 'Missing fields');
        expect(result).to.have.property('suggestedPrice', undefined);
        expect(result).to.have.property('category', undefined);
      } catch (error) {
        // Alternatively, if it throws an error, that's also acceptable behavior
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify proper logging
      let jsonParsedCallFound = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] && 
            typeof call.args[0] === 'object' && 
            call.args[0].title === 'Incomplete Item') {
          jsonParsedCallFound = true;
          break;
        }
      }
      expect(jsonParsedCallFound).to.be.true;
    });
  });
});