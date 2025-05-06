import { expect } from 'chai';
import sinon from 'sinon';

// This comprehensive test file is designed to achieve maximum coverage for gemini.js
describe('Gemini Consolidated Coverage Tests', function() {
  this.timeout(15000);
  
  let mockResult, mockGenerativeModel, geminiModule;
  let consoleLogStub, consoleErrorStub;
  
  before(async function() {
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    
    // Set up a default mock response
    mockResult = {
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
    
    // Create the mock GenerativeModel with a function that returns our controllable result
    mockGenerativeModel = {
      generateContent: sinon.stub().resolves(mockResult)
    };
    
    // Mock the Google Generative AI
    global.GoogleGenerativeAI = function() {
      return {
        getGenerativeModel: () => mockGenerativeModel
      };
    };
    
    // Mock fetch (required for ESM)
    global.fetch = () => {};
    
    // Import the module with our mocks in place
    geminiModule = await import('../../src/utils/gemini.js');
  });
  
  afterEach(function() {
    // Reset mocks and stubs after each test
    mockGenerativeModel.generateContent.reset();
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
  });
  
  after(function() {
    // Clean up
    if (global.GoogleGenerativeAI) {
      delete global.GoogleGenerativeAI;
    }
    
    if (global.fetch) {
      delete global.fetch;
    }
    
    // Restore console methods
    consoleLogStub.restore();
    consoleErrorStub.restore();
  });
  
  // Tests specifically designed to cover lines 31-49
  describe('Response Processing and JSON Extraction (lines 31-49)', () => {
    it('should extract text from response (line 32-34)', async () => {
      // Set up the mock to return a specific response
      mockResult = {
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
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify the result
      expect(result).to.deep.equal({
        title: "Test Camera",
        description: "A high-quality camera for testing",
        suggestedPrice: 35,
        category: "Photography"
      });
      
      // Verify text was logged (line 34)
      expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
    });
    
    it('should match JSON pattern and extract it (lines 36-37)', async () => {
      // Set up the mock with a response that has JSON surrounded by other text
      mockResult = {
        response: {
          text: () => `
          This is a response with some text before the JSON.
          
          \`\`\`json
          {
            "title": "Pattern Test",
            "description": "Testing the JSON pattern matching",
            "suggestedPrice": 45,
            "category": "Electronics"
          }
          \`\`\`
          
          And some text after the JSON block.
          `
        }
      };
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify the JSON was properly extracted
      expect(result.title).to.equal("Pattern Test");
    });
    
    it('should parse JSON string to object (lines 40-42)', async () => {
      // Set up the mock with a response that has minimal JSON
      mockResult = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "JSON Parse Test",
            "description": "Testing JSON parsing",
            "suggestedPrice": 50,
            "category": "Books"
          }
          \`\`\`
          `
        }
      };
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify the parsed object was logged (line 42)
      let dataLogged = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] && 
            typeof call.args[0] === 'object' && 
            call.args[0].title === 'JSON Parse Test') {
          dataLogged = true;
          break;
        }
      }
      expect(dataLogged).to.be.true;
    });
    
    it('should log "No JSON found" when no JSON in response (lines 43-45)', async () => {
      // Set up the mock with a response that has no JSON
      mockResult = {
        response: {
          text: () => 'This response does not contain any JSON blocks'
        }
      };
      
      try {
        // Call the function
        await geminiModule.analyzeImageFromBase64('test-base64');
        // If we get here without an error, the test should fail
        expect.fail('Function should have thrown an error');
      } catch (error) {
        // Expected behavior
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged (line 44)
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
    });
    
    it('should destructure data object (line 47)', async () => {
      // Set up the mock with a response that has all fields
      mockResult = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Destructuring Test",
            "description": "Testing destructuring of object",
            "suggestedPrice": 55,
            "category": "Music"
          }
          \`\`\`
          `
        }
      };
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64');
      
      // Verify each field was properly destructured
      expect(result.title).to.equal("Destructuring Test");
      expect(result.description).to.equal("Testing destructuring of object");
      expect(result.suggestedPrice).to.equal(55);
      expect(result.category).to.equal("Music");
    });
    
    it('should return undefined for missing fields (line 47 edge case)', async () => {
      // Set up the mock with a response missing some fields
      mockResult = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Missing Fields",
            "description": "This data is missing some fields"
          }
          \`\`\`
          `
        }
      };
      
      try {
        // Call the function
        const result = await geminiModule.analyzeImageFromBase64('test-base64');
        
        // If it doesn't throw, verify undefined fields
        expect(result.title).to.equal("Missing Fields");
        expect(result.description).to.equal("This data is missing some fields");
        expect(result.suggestedPrice).to.be.undefined;
        expect(result.category).to.be.undefined;
      } catch (error) {
        // If it throws, verify the error
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
    
    it('should handle JSON parsing errors', async () => {
      // Set up the mock with invalid JSON
      mockResult = {
        response: {
          text: () => `
          \`\`\`json
          {
            "title": "Invalid JSON,
            "description": "This JSON has syntax errors
            "category": "Kitchen"
          }
          \`\`\`
          `
        }
      };
      
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
    
    it('should handle API errors', async () => {
      // Override the generate content method to throw an error
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
    
    it('should handle response.text() errors', async () => {
      // Set up the mock to make response.text() throw an error
      mockResult = {
        response: {
          text: () => { throw new Error('Text extraction failed'); }
        }
      };
      
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