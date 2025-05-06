import { expect } from 'chai';
import sinon from 'sinon';

// Full coverage test suite for gemini.js
describe('Gemini.js Full Coverage Test Suite', function() {
  this.timeout(15000);
  
  // Mock objects and modules
  let mockGenerativeModel, mockGenerativeAI, geminiModule;
  let consoleLogStub, consoleErrorStub;
  
  before(async function() {
    // Stub console methods
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
    
    // Mock fetch for ESM
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
  
  // Tests targeting lines 31-49
  describe('analyzeImageFromBase64 - Response Processing (lines 31-49)', () => {
    it('should process successful API response with valid JSON', async () => {
      // Set up a successful response
      const mockSuccessResponse = {
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
      mockGenerativeModel.generateContent.resolves(mockSuccessResponse);
      
      try {
        // Call the function
        const result = await geminiModule.analyzeImageFromBase64('test-base64');
        
        // Verify the result
        expect(result).to.have.property('title', 'Test Camera');
        expect(result).to.have.property('description', 'A high-quality camera for testing');
        expect(result).to.have.property('suggestedPrice', 35);
        expect(result).to.have.property('category', 'Photography');
        
        // Verify console logs
        expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
        
        // Check for data object logging
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
      } catch (error) {
        // If it throws unexpectedly, fail the test
        expect.fail(`Function threw unexpected error: ${error.message}`);
      }
    });
    
    it('should log "No JSON found" when response has no JSON format', async () => {
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
    
    it('should handle incomplete JSON data', async () => {
      // Set up response with incomplete data
      const incompleteJsonResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Incomplete Item",
            "description": "Missing price and category fields"
          }
          \`\`\`
          `
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(incompleteJsonResponse);
      
      try {
        // Call the function
        const result = await geminiModule.analyzeImageFromBase64('test-base64');
        
        // If it doesn't throw, verify the incomplete result
        expect(result).to.have.property('title', 'Incomplete Item');
        expect(result).to.have.property('description', 'Missing price and category fields');
        expect(result).to.have.property('suggestedPrice', undefined);
        expect(result).to.have.property('category', undefined);
      } catch (error) {
        // If it throws, that's acceptable too
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
    
    it('should handle response with extra fields', async () => {
      // Set up response with extra fields
      const extraFieldsResponse = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Extra Fields Item",
            "description": "Item with extra fields",
            "suggestedPrice": 45,
            "category": "Kitchen",
            "extraField1": "Should be ignored",
            "extraField2": "Also ignored"
          }
          \`\`\`
          `
        }
      };
      
      // Configure the mock
      mockGenerativeModel.generateContent.resolves(extraFieldsResponse);
      
      try {
        // Call the function
        const result = await geminiModule.analyzeImageFromBase64('test-base64');
        
        // Verify expected fields
        expect(result).to.deep.equal({
          title: "Extra Fields Item",
          description: "Item with extra fields",
          suggestedPrice: 45,
          category: "Kitchen"
        });
        
        // Verify we don't have extra fields
        expect(result).to.not.have.property('extraField1');
        expect(result).to.not.have.property('extraField2');
      } catch (error) {
        // If it throws unexpectedly, fail the test
        expect.fail(`Function threw unexpected error: ${error.message}`);
      }
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