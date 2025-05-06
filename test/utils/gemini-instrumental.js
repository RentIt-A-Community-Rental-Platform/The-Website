// This file creates a testable wrapper around the original gemini.js
// It provides a way to control the module's behavior for testing

import path from 'path';
import sinon from 'sinon';

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Function to instrument the gemini.js file for testing
export async function instrumentGemini() {
  // Replace console methods with spies
  const consoleLogSpy = sinon.spy();
  const consoleErrorSpy = sinon.spy();
  console.log = consoleLogSpy;
  console.error = consoleErrorSpy;
  
  // Mock fetch (required for ESM)
  global.fetch = () => {};
  
  // Create a controlled generateContent response
  const mockGenerateContent = sinon.stub();
  
  // Mock GenerativeAI
  global.GoogleGenerativeAI = function() {
    return {
      getGenerativeModel: function() {
        return {
          generateContent: mockGenerateContent
        };
      }
    };
  };
  
  // Import the original module (with our mocks in place)
  const modulePath = path.resolve(process.cwd(), 'src/utils/gemini.js');
  const geminiModule = await import(modulePath);
  
  // Return useful objects for testing
  return {
    geminiModule,
    mockGenerateContent,
    consoleLogSpy,
    consoleErrorSpy,
    cleanup: () => {
      // Restore original console methods
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      // Clean up global mocks
      if (global.GoogleGenerativeAI) {
        delete global.GoogleGenerativeAI;
      }
      
      if (global.fetch) {
        delete global.fetch;
      }
      
      // Restore all sinon mocks and stubs
      sinon.restore();
    }
  };
}