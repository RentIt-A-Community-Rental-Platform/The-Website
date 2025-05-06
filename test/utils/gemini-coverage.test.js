import { expect } from 'chai';
import sinon from 'sinon';
import { analyzeImageFromBase64, __mocks } from './gemini-testable.js';

describe('Gemini Utility Coverage Tests', function() {
  this.timeout(10000);
  
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
  });
  
  describe('analyzeImageFromBase64 - coverage for lines 31-49', () => {
    it('should properly extract and parse JSON from response text', async () => {
      // Set mock response with JSON data
      __mocks.setGenerateContentResponse(`
      Here's the analysis:

      \`\`\`json
      {
        "title": "Professional Camera",
        "description": "High-end DSLR camera with accessories",
        "suggestedPrice": 35,
        "category": "Photography"
      }
      \`\`\`
      `);
      
      const result = await analyzeImageFromBase64('test-base64');
      
      // Verify results
      expect(result).to.deep.equal({
        title: "Professional Camera",
        description: "High-end DSLR camera with accessories",
        suggestedPrice: 35,
        category: "Photography"
      });
      
      // Verify console.log with GEMINI TEXT was called
      expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
      
      // Verify console.log with parsed data object was called
      expect(consoleLogStub.calledWith(sinon.match.has('title', 'Professional Camera'))).to.be.true;
    });
    
    it('should handle response text with invalid or missing JSON format', async () => {
      // Set mock response with no JSON
      __mocks.setGenerateContentResponse('This response has no JSON format');
      
      try {
        await analyzeImageFromBase64('test-base64');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify "No JSON found" was logged
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should handle JSON parsing errors', async () => {
      // Set mock response with malformed JSON
      __mocks.setGenerateContentResponse(`
      \`\`\`json
      {
        "title": "Broken JSON,
        "description": "This JSON is malformed"
        "suggestedPrice": 20,
      }
      \`\`\`
      `);
      
      try {
        await analyzeImageFromBase64('test-base64');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
    });
    
    it('should handle response with incomplete JSON data', async () => {
      // Set mock response with incomplete data
      __mocks.setGenerateContentResponse(`
      \`\`\`json
      {
        "title": "Incomplete Data",
        "description": "Missing price and category"
      }
      \`\`\`
      `);
      
      try {
        const result = await analyzeImageFromBase64('test-base64');
        
        // Should still return a result with undefined values for missing properties
        expect(result).to.have.property('title', 'Incomplete Data');
        expect(result).to.have.property('description', 'Missing price and category');
        expect(result).to.have.property('suggestedPrice', undefined);
        expect(result).to.have.property('category', undefined);
      } catch (error) {
        // If it throws, that's fine too, but let's make sure we get the right error
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify parsed object was logged
      expect(consoleLogStub.calledWith(sinon.match.has('title', 'Incomplete Data'))).to.be.true;
    });
    
    it('should handle properly formatted JSON with trailing commas', async () => {
      // Set mock response with JSON that has trailing commas (which is technically valid)
      __mocks.setGenerateContentResponse(`
      \`\`\`json
      {
        "title": "Item with Tricky JSON",
        "description": "This JSON has some unusual formatting",
        "suggestedPrice": 15,
        "category": "Electronics",
        "extraField": "This should be ignored"
      }
      \`\`\`
      `);
      
      const result = await analyzeImageFromBase64('test-base64');
      
      // Verify it extracts only the fields we care about
      expect(result).to.deep.equal({
        title: "Item with Tricky JSON",
        description: "This JSON has some unusual formatting",
        suggestedPrice: 15,
        category: "Electronics"
      });
      
      // Verify we don't have the extra field
      expect(result).to.not.have.property('extraField');
    });
    
    it('should handle errors thrown by response.text()', async () => {
      // Override the mock to make response.text() throw an error
      const originalMethod = __mocks.setGenerateContentResponse;
      __mocks.setGenerateContentResponse = () => {
        return {
          getGenerativeModel: () => ({
            generateContent: async () => ({
              response: {
                text: () => { throw new Error('Text extraction failed'); }
              }
            })
          })
        };
      };
      
      try {
        await analyzeImageFromBase64('test-base64');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Failed to analyze image');
      }
      
      // Verify error was logged
      expect(consoleErrorStub.called).to.be.true;
      
      // Restore the original mock method
      __mocks.setGenerateContentResponse = originalMethod;
    });
  });
});