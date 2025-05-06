// This file is a wrapper for testing the gemini.js file
// It allows us to control the GoogleGenerativeAI behavior for testing
import path from 'path';
import sinon from 'sinon';

// Set up mocks
const setupMocks = (responseTextProvider) => {
  // Mock fetch for ES modules
  global.fetch = () => {};
  
  // Mock GenerativeAI with a function that returns our controllable mock
  global.GoogleGenerativeAI = function() {
    return {
      getGenerativeModel: function() {
        return {
          generateContent: async function() {
            return {
              response: {
                text: responseTextProvider
              }
            };
          }
        };
      }
    };
  };
};

// Run a test with a specific mock response
export const runWithMockResponse = async (responseTextFn) => {
  // Set up the mocks with our response
  setupMocks(responseTextFn);
  
  // Import the real gemini module (which will use our mocks)
  const geminiPath = path.resolve(process.cwd(), 'src/utils/gemini.js');
  return await import(geminiPath);
};

// Clean up mocks
export const cleanupMocks = () => {
  // Remove global mocks
  if (global.GoogleGenerativeAI) {
    delete global.GoogleGenerativeAI;
  }
  
  if (global.fetch) {
    delete global.fetch;
  }
};