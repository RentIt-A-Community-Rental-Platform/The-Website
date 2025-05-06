// This is a modified version of src/utils/gemini.js for testing purposes
// It has the same implementation but with enhanced testability

// Stub external dependencies
import fetch from 'node-fetch';
globalThis.fetch = fetch;

// Import needed test tools
import sinon from 'sinon';

// Create mock objects
let mockResult = {
  response: {
    text: () => "Default mock response"
  }
};

// Mock GoogleGenerativeAI
class MockGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey || "test-api-key";
  }
  
  getGenerativeModel() {
    return {
      generateContent: async () => mockResult
    };
  }
}

// Export for testing
export const GoogleGenerativeAI = MockGenerativeAI;

// Initialize with the mock
const genAI = new MockGenerativeAI("test-api-key");

// The main function is identical to the original
export async function analyzeImageFromBase64(base64Image) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      "THIS IS VERY IMPORTANT TO REMEMBER WHILE GENERATING THE RESPONSE FOR YOU: ALWAYS ANSWER IN THE FOLLOWING FORMAT: {title:'the title of the item',description:'a decription of the item',suggestedPrice:'a suggested daily rate price for the item to be rented out. Don't make it too expensive. should be a number only, don't use any currency symbols',category:'category of the item between Kitchen,Tools,Music,Books,Party & Events, Sports, Photography,Electronics,Other [PICK ONLY ONE FROM THESE]'}",
      'Here is the task, please fill the given template as instructed. Analyze this image and provide:',
      '1. A concise title (max 50 characters)',
      '2. A detailed description (max 200 characters)',
      '3. Suggested Price (number only)',
      '4. A category (e.g., Electronics, Furniture, Books, etc.)',
      {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    console.log("GEMINI TEXT: ", text);

    const match = text.match(/```json\s*([\s\S]*?)\s*```/);

    let data;
    if (match) {
      const jsonString = match[1];
      data = JSON.parse(jsonString);
      console.log(data); // now usable as a JS object
    } else {
      console.log("No JSON found");
    }

    const {title, description, suggestedPrice, category} = data;

    return { title, description, suggestedPrice, category };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze image');
  }
}

// Add test helpers
export const __testHelpers = {
  // Set the response text for the next API call
  setMockResponseText: (text) => {
    mockResult = {
      response: {
        text: () => text
      }
    };
  },
  
  // Make the next API call throw an error
  setMockError: () => {
    genAI.getGenerativeModel = () => ({
      generateContent: async () => {
        throw new Error('Simulated API error');
      }
    });
  },
  
  // Reset the mock to default behavior
  resetMock: () => {
    mockResult = {
      response: {
        text: () => "Default mock response"
      }
    };
    
    genAI.getGenerativeModel = () => ({
      generateContent: async () => mockResult
    });
  }
};