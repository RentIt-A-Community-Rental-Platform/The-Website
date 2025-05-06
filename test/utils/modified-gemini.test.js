import { expect } from 'chai';
import sinon from 'sinon';
import { analyzeImageFromBase64, __testHelpers } from './modified-gemini.js';

describe('Modified Gemini Tests for Maximum Coverage', function() {
  this.timeout(10000);
  
  let consoleLogStub, consoleErrorStub;
  
  beforeEach(function() {
    // Reset the mock to default behavior
    __testHelpers.resetMock();
    
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
  });
  
  afterEach(function() {
    // Restore console stubs
    consoleLogStub.restore();
    consoleErrorStub.restore();
  });
  
  describe('analyzeImageFromBase64 function', () => {
    it('should successfully extract and parse JSON data', async () => {
      // Set up mock response with valid JSON
      __testHelpers.setMockResponseText(`
      Here's my analysis of the image:

      \`\`\`json
      {
        "title": "Test Camera",
        "description": "A high-quality camera for testing",
        "suggestedPrice": 35,
        "category": "Photography"
      }
      \`\`\`
      `);
      
      // Call the function
      const result = await analyzeImageFromBase64('test-base64');
      
      // Verify result object
      expect(result).to.deep.equal({
        title: "Test Camera",
        description: "A high-quality camera for testing",
        suggestedPrice: 35,
        category: "Photography"
      });
      
      // Verify console.log was called with response text (line 34)
      expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
      
      // Verify parsed data object was logged (line 42)
      let dataLogFound = false;
      for (let i = 0; i < consoleLogStub.callCount; i++) {
        const call = consoleLogStub.getCall(i);
        if (call.args[0] && 
            typeof call.args[0] === 'object' && 
            call.args[0].title === "Test Camera") {
          dataLogFound = true;
          break;
        }
      }
      expect(dataLogFound).to.be.true;
    });
    
    it('should log "No JSON found" when response lacks JSON format', async () => {
      // Set up mock response with no JSON
      __testHelpers.setMockResponseText('This response contains no JSON blocks');
      
      try {
        // Call the function
        await analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged (line 44)
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should handle JSON parsing errors', async () => {
      // Set up mock response with invalid JSON
      __testHelpers.setMockResponseText(`
      \`\`\`json
      {
        "title": "Malformed JSON,
        "description": "This has syntax errors
        "category": "Electronics"
      }
      \`\`\`
      `);
      
      try {
        // Call the function
        await analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should handle API errors', async () => {
      // Set up mock to throw an error
      __testHelpers.setMockError();
      
      try {
        // Call the function
        await analyzeImageFromBase64('test-base64');
        expect.fail('Function should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should handle missing fields in JSON response', async () => {
      // Set up mock response with incomplete data
      __testHelpers.setMockResponseText(`
      \`\`\`json
      {
        "title": "Incomplete Item",
        "description": "This item is missing price and category"
      }
      \`\`\`
      `);
      
      try {
        // Call the function
        const result = await analyzeImageFromBase64('test-base64');
        
        // Verify the object has undefined fields
        expect(result).to.have.property('title', 'Incomplete Item');
        expect(result).to.have.property('description', 'This item is missing price and category');
        expect(result).to.have.property('suggestedPrice', undefined);
        expect(result).to.have.property('category', undefined);
      } catch (error) {
        // If it throws, that's acceptable too
        expect(error.message).to.equal('Failed to analyze image');
      }
    });
    
    it('should correctly extract and return all fields', async () => {
      // Set up mock response with all fields and extra ones
      __testHelpers.setMockResponseText(`
      \`\`\`json
      {
        "title": "Complete Item",
        "description": "This item has all required fields",
        "suggestedPrice": 25,
        "category": "Electronics",
        "extraField1": "Should be ignored",
        "extraField2": "Also ignored"
      }
      \`\`\`
      `);
      
      // Call the function
      const result = await analyzeImageFromBase64('test-base64');
      
      // Verify the returned object has only the expected fields
      expect(result).to.deep.equal({
        title: "Complete Item",
        description: "This item has all required fields",
        suggestedPrice: 25,
        category: "Electronics"
      });
      
      // Verify it doesn't have extra fields
      expect(result).to.not.have.property('extraField1');
      expect(result).to.not.have.property('extraField2');
    });
  });
});