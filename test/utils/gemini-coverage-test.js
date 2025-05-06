import { expect } from 'chai';
import { instrumentGemini } from './gemini-instrumental.js';

describe('Gemini Utility Coverage Tests', function() {
  this.timeout(15000); // Longer timeout for dynamic imports
  
  let instrument;
  
  beforeEach(async function() {
    // Set up instrumentation for each test
    instrument = await instrumentGemini();
  });
  
  afterEach(function() {
    // Clean up after each test
    if (instrument && instrument.cleanup) {
      instrument.cleanup();
    }
  });
  
  // This test targets lines 31-49 - processing the response text, JSON extraction, etc.
  it('should successfully process API response and extract JSON data', async function() {
    // Configure the mock to return a successful response
    const successResponse = {
      response: {
        text: () => `
        Here's my analysis of the image:

        \`\`\`json
        {
          "title": "Test Camera",
          "description": "A test camera description",
          "suggestedPrice": 35,
          "category": "Photography"
        }
        \`\`\`
        `
      }
    };
    
    instrument.mockGenerateContent.resolves(successResponse);
    
    // Call the function
    const result = await instrument.geminiModule.analyzeImageFromBase64('test-base64');
    
    // Verify the result
    expect(result).to.have.property('title', 'Test Camera');
    expect(result).to.have.property('description', 'A test camera description');
    expect(result).to.have.property('suggestedPrice', 35);
    expect(result).to.have.property('category', 'Photography');
    
    // Verify console.log was called with the text (line 34)
    expect(instrument.consoleLogSpy.calledWith("GEMINI TEXT: ", 
      `
        Here's my analysis of the image:

        \`\`\`json
        {
          "title": "Test Camera",
          "description": "A test camera description",
          "suggestedPrice": 35,
          "category": "Photography"
        }
        \`\`\`
        `)).to.be.true;
    
    // Verify the data object was logged (line 42)
    let dataLogFound = false;
    for (let i = 0; i < instrument.consoleLogSpy.callCount; i++) {
      const call = instrument.consoleLogSpy.getCall(i);
      if (call.args[0] && 
          typeof call.args[0] === 'object' && 
          call.args[0].title === 'Test Camera') {
        dataLogFound = true;
        break;
      }
    }
    expect(dataLogFound).to.be.true;
  });
  
  it('should log "No JSON found" when response lacks JSON format', async function() {
    // Configure the mock to return a response with no JSON
    const noJsonResponse = {
      response: {
        text: () => 'This response contains no JSON blocks'
      }
    };
    
    instrument.mockGenerateContent.resolves(noJsonResponse);
    
    try {
      // Call the function
      await instrument.geminiModule.analyzeImageFromBase64('test-base64');
      expect.fail('Function should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('Failed to analyze image');
    }
    
    // Verify "No JSON found" was logged (line 44)
    expect(instrument.consoleLogSpy.calledWith("No JSON found")).to.be.true;
  });
  
  it('should handle JSON parsing errors', async function() {
    // Configure the mock to return invalid JSON
    const invalidJsonResponse = {
      response: {
        text: () => `
        \`\`\`json
        {
          "title": "Invalid JSON,
          "description": "This has syntax errors
          "suggestedPrice": 20,
        }
        \`\`\`
        `
      }
    };
    
    instrument.mockGenerateContent.resolves(invalidJsonResponse);
    
    try {
      // Call the function
      await instrument.geminiModule.analyzeImageFromBase64('test-base64');
      expect.fail('Function should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('Failed to analyze image');
    }
    
    // Verify error was logged
    expect(instrument.consoleErrorSpy.called).to.be.true;
  });
  
  it('should correctly destructure object properties', async function() {
    // Configure the mock with a response containing all required properties
    const completeJsonResponse = {
      response: {
        text: () => `
        \`\`\`json
        {
          "title": "Destructuring Test",
          "description": "Testing the destructuring operation",
          "suggestedPrice": 50,
          "category": "Electronics" 
        }
        \`\`\`
        `
      }
    };
    
    instrument.mockGenerateContent.resolves(completeJsonResponse);
    
    // Call the function
    const result = await instrument.geminiModule.analyzeImageFromBase64('test-base64');
    
    // Verify all properties were correctly destructured (line 47)
    expect(result.title).to.equal("Destructuring Test");
    expect(result.description).to.equal("Testing the destructuring operation");
    expect(result.suggestedPrice).to.equal(50);
    expect(result.category).to.equal("Electronics");
  });
  
  it('should handle incomplete data with missing fields', async function() {
    // Configure the mock with a response missing some properties
    const incompleteJsonResponse = {
      response: {
        text: () => `
        \`\`\`json
        {
          "title": "Incomplete Data",
          "description": "Missing price and category fields"
        }
        \`\`\`
        `
      }
    };
    
    instrument.mockGenerateContent.resolves(incompleteJsonResponse);
    
    try {
      // Call the function
      const result = await instrument.geminiModule.analyzeImageFromBase64('test-base64');
      
      // If it doesn't throw, verify the returned object has undefined fields
      expect(result.title).to.equal("Incomplete Data");
      expect(result.description).to.equal("Missing price and category fields");
      expect(result.suggestedPrice).to.be.undefined;
      expect(result.category).to.be.undefined;
    } catch (error) {
      // If it throws, that's also acceptable
      expect(error.message).to.equal('Failed to analyze image');
    }
  });
  
  it('should handle API errors', async function() {
    // Configure the mock to throw an error
    instrument.mockGenerateContent.rejects(new Error('API Error'));
    
    try {
      // Call the function
      await instrument.geminiModule.analyzeImageFromBase64('test-base64');
      expect.fail('Function should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('Failed to analyze image');
    }
    
    // Verify error was logged
    expect(instrument.consoleErrorSpy.called).to.be.true;
  });
});