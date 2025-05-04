// // test/utils/gemini.test.js
// import 'dotenv/config';
// import { expect } from 'chai';
// import sinon from 'sinon';
// import { analyzeImageFromBase64 } from '../../src/utils/gemini.js';

// describe('Gemini Utility', () => {
//   afterEach(() => {
//     sinon.restore();
//   });
  
//   it('should analyze base64 image data correctly', async function() {
//     this.timeout(5000); // Increase timeout for this test
    
//     // Create a stub for the Gemini API response
//     const mockResponse = {
//       text: () => '```json\n{"title":"Test Camera","description":"A digital camera for photography","suggestedPrice":15,"category":"Photography"}\n```'
//     };
    
//     const generateContentStub = sinon.stub().resolves({
//       response: mockResponse
//     });
    
//     const mockModel = {
//       generateContent: generateContentStub
//     };
    
//     const getGenerativeModelStub = sinon.stub().returns(mockModel);
    
//     // Create a class to match GoogleGenerativeAI structure
//     class MockGoogleGenerativeAI {
//       constructor() {
//         this.getGenerativeModel = getGenerativeModelStub;
//       }
//     }
    
//     // Replace the real GoogleGenerativeAI with our mock
//     const originalModule = await import('@google/generative-ai');
//     const originalGoogleGenerativeAI = originalModule.GoogleGenerativeAI;
//     originalModule.GoogleGenerativeAI = MockGoogleGenerativeAI;
    
//     try {
//       // Test with a dummy base64 string
//       const base64Image = "dummy_base64_string";
//       const result = await analyzeImageFromBase64(base64Image);
      
//       // Verify the result matches our mock
//       expect(result).to.deep.equal({
//         title: "Test Camera",
//         description: "A digital camera for photography",
//         suggestedPrice: 15,
//         category: "Photography"
//       });
      
//       // Verify the stub was called with the right arguments
//       expect(generateContentStub.calledOnce).to.be.true;
//       const callArgs = generateContentStub.firstCall.args[0];
//       expect(callArgs).to.be.an('array');
//       expect(callArgs).to.have.lengthOf(5);
//       expect(callArgs[4].inlineData.data).to.equal(base64Image);
      
//     } finally {
//       // Restore the original module
//       originalModule.GoogleGenerativeAI = originalGoogleGenerativeAI;
//     }
//   });
  
//   it('should handle errors gracefully', async function() {
//     this.timeout(5000);
    
//     // Create a stub that throws an error
//     const generateContentStub = sinon.stub().rejects(new Error('API Error'));
    
//     const mockModel = {
//       generateContent: generateContentStub
//     };
    
//     const getGenerativeModelStub = sinon.stub().returns(mockModel);
    
//     class MockGoogleGenerativeAI {
//       constructor() {
//         this.getGenerativeModel = getGenerativeModelStub;
//       }
//     }
    
//     const originalModule = await import('@google/generative-ai');
//     const originalGoogleGenerativeAI = originalModule.GoogleGenerativeAI;
//     originalModule.GoogleGenerativeAI = MockGoogleGenerativeAI;
    
//     try {
//       // Test with a dummy base64 string
//       const base64Image = "dummy_base64_string";
      
//       // The function should throw an error
//       let error;
//       try {
//         await analyzeImageFromBase64(base64Image);
//       } catch (err) {
//         error = err;
//       }
      
//       expect(error).to.exist;
//       expect(error.message).to.equal('Failed to analyze image');
      
//     } finally {
//       // Restore the original module
//       originalModule.GoogleGenerativeAI = originalGoogleGenerativeAI;
//     }
//   });
// });