import { expect } from 'chai';
import sinon from 'sinon';
import { runWithMockResponse, cleanupMocks } from './gemini-test-wrapper.js';

describe('Gemini Utility High Coverage Tests', function() {
  this.timeout(15000);
  
  let consoleLogStub, consoleErrorStub;
  
  beforeEach(function() {
    // Stub console methods to avoid polluting test output
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
  });
  
  afterEach(function() {
    // Restore console methods after each test
    consoleLogStub.restore();
    consoleErrorStub.restore();
    // Clean up any remaining mocks
    cleanupMocks();
  });
  
  describe('analyzeImageFromBase64 - targeting lines 31-49', () => {
    it('should handle successful JSON extraction and parsing', async () => {
      // Create a response with valid JSON
      const successResponse = () => `
      Here's my analysis of the image:

      \`\`\`json
      {
        "title": "Test Camera",
        "description": "A test camera description",
        "suggestedPrice": 30,
        "category": "Photography"
      }
      \`\`\`
      `;
      
      // Import the module with our mock response
      const geminiModule = await runWithMockResponse(successResponse);
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64-data');
      
      // Verify the result
      expect(result).to.have.property('title', 'Test Camera');
      expect(result).to.have.property('description', 'A test camera description');
      expect(result).to.have.property('suggestedPrice', 30);
      expect(result).to.have.property('category', 'Photography');
      
      // Verify console.log was called with the text response
      expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
      
      // Verify the data object was logged
      let objectLogged = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const args = consoleLogStub.getCall(i).args;
        if (args.length > 0 && 
            typeof args[0] === 'object' && 
            args[0].title === 'Test Camera') {
          objectLogged = true;
          break;
        }
      }
      expect(objectLogged).to.be.true;
    });
    
    it('should log "No JSON found" when no JSON blocks in response', async () => {
      // Create a response with no JSON
      const noJsonResponse = () => 'This is a response with no JSON blocks';
      
      // Import the module with our mock response
      const geminiModule = await runWithMockResponse(noJsonResponse);
      
      try {
        // Call the function
        await geminiModule.analyzeImageFromBase64('test-base64-data');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
    });
    
    it('should handle JSON with missing fields', async () => {
      // Create response with incomplete JSON (missing fields)
      const incompleteJsonResponse = () => `
      \`\`\`json
      {
        "title": "Incomplete Item",
        "description": "This item is missing price and category"
      }
      \`\`\`
      `;
      
      // Import the module with our mock response
      const geminiModule = await runWithMockResponse(incompleteJsonResponse);
      
      // Call the function (may throw or return partial results)
      try {
        const result = await geminiModule.analyzeImageFromBase64('test-base64-data');
        
        // If it doesn't throw, check for undefined fields
        expect(result).to.have.property('title', 'Incomplete Item');
        expect(result).to.have.property('description', 'This item is missing price and category');
        expect(result).to.have.property('suggestedPrice', undefined);
        expect(result).to.have.property('category', undefined);
      } catch (error) {
        // It's also valid if it throws an error
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
    
    it('should handle malformed JSON errors', async () => {
      // Create response with malformed JSON that will cause JSON.parse to fail
      const malformedJsonResponse = () => `
      \`\`\`json
      {
        "title": "Malformed JSON,
        "description": "This JSON has syntax errors,
        "category": Electronics
      }
      \`\`\`
      `;
      
      // Import the module with our mock response
      const geminiModule = await runWithMockResponse(malformedJsonResponse);
      
      try {
        // Call the function
        await geminiModule.analyzeImageFromBase64('test-base64-data');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should handle additional fields in JSON response', async () => {
      // Create response with extra fields beyond what we destructure
      const extraFieldsResponse = () => `
      \`\`\`json
      {
        "title": "Extra Fields Item",
        "description": "This item has extra fields",
        "suggestedPrice": 45,
        "category": "Electronics",
        "extraField1": "This should be ignored",
        "extraField2": "Also ignored"
      }
      \`\`\`
      `;
      
      // Import the module with our mock response
      const geminiModule = await runWithMockResponse(extraFieldsResponse);
      
      // Call the function
      const result = await geminiModule.analyzeImageFromBase64('test-base64-data');
      
      // Verify the expected fields are returned
      expect(result).to.have.property('title', 'Extra Fields Item');
      expect(result).to.have.property('description', 'This item has extra fields');
      expect(result).to.have.property('suggestedPrice', 45);
      expect(result).to.have.property('category', 'Electronics');
      
      // Verify we don't have the extra fields
      expect(result).to.not.have.property('extraField1');
      expect(result).to.not.have.property('extraField2');
    });
    
    it('should handle API errors', async () => {
      // Set up a mock that will cause the API call to fail
      global.GoogleGenerativeAI = function() {
        return {
          getGenerativeModel: function() {
            return {
              generateContent: async function() {
                throw new Error('API call failed');
              }
            };
          }
        };
      };
      
      // Import the real module
      const geminiPath = 'file://' + process.cwd() + '/src/utils/gemini.js';
      const geminiModule = await import(geminiPath);
      
      try {
        // Call the function
        await geminiModule.analyzeImageFromBase64('test-base64-data');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
  });
});