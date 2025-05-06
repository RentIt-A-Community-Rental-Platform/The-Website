import { expect } from 'chai';
import sinon from 'sinon';
import { analyzeImageFromBase64, testHelpers } from './test-gemini.js';

describe('Gemini Utility Direct Tests', function() {
  this.timeout(10000);
  
  let consoleLogStub, consoleErrorStub;
  
  beforeEach(function() {
    // Reset test state
    testHelpers.reset();
    
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
  });
  
  afterEach(function() {
    // Restore console methods
    consoleLogStub.restore();
    consoleErrorStub.restore();
  });
  
  // Tests specifically targeting lines 31-49
  describe('analyzeImageFromBase64 - lines 31-49 coverage', () => {
    it('should process successful API response and extract data', async () => {
      // Set up successful response with valid JSON
      testHelpers.setResponseText(`
      Here's my analysis of the image:

      \`\`\`json
      {
        "title": "Test Camera",
        "description": "A quality camera for testing",
        "suggestedPrice": 35,
        "category": "Photography"
      }
      \`\`\`
      `);
      
      const result = await analyzeImageFromBase64('test-base64');
      
      // Verify result object
      expect(result).to.deep.equal({
        title: "Test Camera",
        description: "A quality camera for testing",
        suggestedPrice: 35,
        category: "Photography"
      });
      
      // Verify console logs (line 34)
      expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
      
      // Verify data object was logged (line 42)
      let dataLoggedProperly = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] && 
            typeof call.args[0] === 'object' && 
            call.args[0].title === "Test Camera") {
          dataLoggedProperly = true;
          break;
        }
      }
      expect(dataLoggedProperly).to.be.true;
    });
    
    it('should log "No JSON found" when response lacks JSON format', async () => {
      // Set response with no JSON blocks
      testHelpers.setResponseText('This response does not contain any JSON blocks');
      
      try {
        await analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged (line 44)
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
    });
    
    it('should handle JSON parsing errors', async () => {
      // Set response with invalid JSON syntax
      testHelpers.setResponseText(`
      \`\`\`json
      {
        "title": "Invalid JSON,
        "description": "This JSON has syntax errors
        "category": "Electronics"
      }
      \`\`\`
      `);
      
      try {
        await analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should correctly destructure fields from the data object', async () => {
      // Set response with complete valid JSON
      testHelpers.setResponseText(`
      \`\`\`json
      {
        "title": "Destructuring Test",
        "description": "Testing object destructuring",
        "suggestedPrice": 25,
        "category": "Electronics"
      }
      \`\`\`
      `);
      
      const result = await analyzeImageFromBase64('test-base64');
      
      // Verify individual properties (testing line 47)
      expect(result.title).to.equal("Destructuring Test");
      expect(result.description).to.equal("Testing object destructuring");
      expect(result.suggestedPrice).to.equal(25);
      expect(result.category).to.equal("Electronics");
    });
    
    it('should handle incomplete data with missing fields', async () => {
      // Set response with incomplete data (missing fields)
      testHelpers.setResponseText(`
      \`\`\`json
      {
        "title": "Incomplete Data",
        "description": "Missing price and category"
      }
      \`\`\`
      `);
      
      try {
        const result = await analyzeImageFromBase64('test-base64');
        
        // If the function doesn't throw, verify the returned object
        expect(result.title).to.equal("Incomplete Data");
        expect(result.description).to.equal("Missing price and category");
        expect(result.suggestedPrice).to.be.undefined;
        expect(result.category).to.be.undefined;
      } catch (error) {
        // If it throws, that's also acceptable
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
    
    it('should handle API errors', async () => {
      // Configure the mock to throw an error during the API call
      testHelpers.setShouldThrowError(true);
      
      try {
        await analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
  });
});