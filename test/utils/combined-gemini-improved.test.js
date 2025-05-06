import { expect } from 'chai';
import sinon from 'sinon';

// Test file specifically targeting the uncovered lines 31-49 in gemini.js
describe('Gemini Utility Improved Tests', function() {
  this.timeout(10000);
  
  let mockGenerativeModel, mockGenerativeAI, geminiModule;
  let consoleLogStub, consoleErrorStub;
  
  before(async function() {
    // Save original console.log
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Stub console methods
    consoleLogStub = sinon.stub(console, 'log');
    consoleErrorStub = sinon.stub(console, 'error');
    
    // Set up Node Fetch mock for ES module
    global.fetch = () => {};
    
    // Set up the mock response for successful API call
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
    
    // Set up the mock for GoogleGenerativeAI
    global.GoogleGenerativeAI = function(apiKey) {
      return {
        getGenerativeModel: function() {
          return {
            generateContent: async function() {
              return mockSuccessResponse;
            }
          };
        }
      };
    };
    
    // Import the module after setting up mocks
    geminiModule = await import('../../src/utils/gemini.js');
  });
  
  after(function() {
    // Clean up global mocks
    if (global.GoogleGenerativeAI) {
      delete global.GoogleGenerativeAI;
    }
    
    if (global.fetch) {
      delete global.fetch;
    }
    
    // Restore all stubs
    sinon.restore();
  });
  
  // Test that covers the successful path through lines 31-49
  it('should successfully parse JSON and extract data (lines 31-49)', async () => {
    // Set up the mock response at test time to ensure fresh state
    const mockResponse = {
      response: {
        text: () => `
        Here's my analysis of the image:

        \`\`\`json
        {
          "title": "Test Camera",
          "description": "A test camera description",
          "suggestedPrice": 30,
          "category": "Photography"
        }
        \`\`\`
        `
      }
    };
    
    // Update the global mock
    global.GoogleGenerativeAI = function() {
      return {
        getGenerativeModel: function() {
          return {
            generateContent: async function() {
              return mockResponse;
            }
          };
        }
      };
    };
    
    // Reset console stubs for this test
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
    
    const result = await geminiModule.analyzeImageFromBase64('test-base64');
    
    // Verify result
    expect(result).to.deep.equal({
      title: "Test Camera",
      description: "A test camera description",
      suggestedPrice: 30,
      category: "Photography"
    });
    
    // Verify all console.log calls were made
    // These checks specifically target lines 34, 42, 44
    expect(consoleLogStub.calledWith("GEMINI TEXT: ", sinon.match.string)).to.be.true;
    
    // Find the call that logged the parsed data object
    let dataLogFound = false;
    for (let i = 0; i < consoleLogStub.callCount; i++) {
      const call = consoleLogStub.getCall(i);
      if (call.args[0] && typeof call.args[0] === 'object' && call.args[0].title === "Test Camera") {
        dataLogFound = true;
        break;
      }
    }
    expect(dataLogFound).to.be.true;
  });
  
  // Test for the case when no JSON is found (line 44)
  it('should log "No JSON found" when response lacks JSON format (line 44)', async () => {
    // Set up a mock response without JSON
    global.GoogleGenerativeAI = function() {
      return {
        getGenerativeModel: function() {
          return {
            generateContent: async function() {
              return {
                response: {
                  text: () => "This is a response without any JSON formatting"
                }
              };
            }
          };
        }
      };
    };
    
    // Reset console stubs for this test
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
    
    try {
      await geminiModule.analyzeImageFromBase64('test-base64');
      // If it doesn't throw, the test should fail
      expect.fail('Function should have thrown an error');
    } catch (error) {
      // Expected behavior
      expect(error.message).to.equal('Failed to analyze image');
      
      // Check if "No JSON found" was logged (line 44)
      expect(consoleLogStub.calledWith("No JSON found")).to.be.true;
    }
  });
  
  // Test for the JSON parsing step (line 41)
  it('should parse JSON string from response (line 41)', async () => {
    // Set up a mock response with JSON
    global.GoogleGenerativeAI = function() {
      return {
        getGenerativeModel: function() {
          return {
            generateContent: async function() {
              return {
                response: {
                  text: () => `
                  \`\`\`json
                  {
                    "title": "JSON Test",
                    "description": "Testing JSON parsing",
                    "suggestedPrice": 15,
                    "category": "Electronics"
                  }
                  \`\`\`
                  `
                }
              };
            }
          };
        }
      };
    };
    
    // Reset console stubs for this test
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
    
    const result = await geminiModule.analyzeImageFromBase64('test-base64');
    
    // Verify JSON was parsed correctly
    expect(result).to.deep.equal({
      title: "JSON Test",
      description: "Testing JSON parsing",
      suggestedPrice: 15,
      category: "Electronics"
    });
  });
  
  // Test for destructuring the data object (line 47)
  it('should destructure data object into component parts (line 47)', async () => {
    // Set up a mock response with different property values
    global.GoogleGenerativeAI = function() {
      return {
        getGenerativeModel: function() {
          return {
            generateContent: async function() {
              return {
                response: {
                  text: () => `
                  \`\`\`json
                  {
                    "title": "Destructuring Test",
                    "description": "Testing object destructuring",
                    "suggestedPrice": 25,
                    "category": "Tools"
                  }
                  \`\`\`
                  `
                }
              };
            }
          };
        }
      };
    };
    
    // Reset console stubs for this test
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
    
    const result = await geminiModule.analyzeImageFromBase64('test-base64');
    
    // Verify each property was correctly destructured
    expect(result.title).to.equal("Destructuring Test");
    expect(result.description).to.equal("Testing object destructuring");
    expect(result.suggestedPrice).to.equal(25);
    expect(result.category).to.equal("Tools");
  });
  
  // Test for error handling during JSON parsing (covers error path)
  it('should handle JSON parsing errors (error path)', async () => {
    // Set up a mock response with invalid JSON
    global.GoogleGenerativeAI = function() {
      return {
        getGenerativeModel: function() {
          return {
            generateContent: async function() {
              return {
                response: {
                  text: () => `
                  \`\`\`json
                  {
                    "title": "Invalid JSON,
                    "description": "This has syntax errors
                    "category": Electronics
                  }
                  \`\`\`
                  `
                }
              };
            }
          };
        }
      };
    };
    
    // Reset console stubs for this test
    consoleLogStub.resetHistory();
    consoleErrorStub.resetHistory();
    
    try {
      await geminiModule.analyzeImageFromBase64('test-base64');
      expect.fail('Function should have thrown an error');
    } catch (error) {
      expect(error.message).to.equal('Failed to analyze image');
      expect(consoleErrorStub.called).to.be.true;
    }
  });
});