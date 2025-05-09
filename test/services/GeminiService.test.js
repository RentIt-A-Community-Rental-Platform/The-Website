import { expect } from 'chai';
import sinon from 'sinon';
import { GeminiService } from '../../src/services/GeminiService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('GeminiService', () => {
    let geminiService;
    let mockModel;
    let mockResponse;
    let mockResult;

    beforeEach(() => {
        // Create mock response
        mockResponse = {
            text: () => `\`\`\`json
            {
                "title": "Professional Camera",
                "description": "High-quality DSLR camera perfect for photography enthusiasts",
                "suggestedPrice": "25",
                "category": "Photography"
            }
            \`\`\``
        };

        // Create mock result
        mockResult = {
            response: Promise.resolve(mockResponse)
        };

        // Create mock model
        mockModel = {
            generateContent: sinon.stub().resolves(mockResult)
        };

        // Create mock GoogleGenerativeAI
        const mockGenAI = {
            getGenerativeModel: sinon.stub().returns(mockModel)
        };

        // Stub the GoogleGenerativeAI constructor
        sinon.stub(GoogleGenerativeAI.prototype, 'constructor').returns(mockGenAI);
        
        geminiService = new GeminiService();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('analyzeImageFromBase64', () => {
        it('should successfully analyze an image and return structured data', async () => {
            const base64Image = 'base64-encoded-image-data';
            const expectedResult = {
                title: 'Professional Camera',
                description: 'High-quality DSLR camera perfect for photography enthusiasts',
                suggestedPrice: '25',
                category: 'Photography'
            };

            const result = await geminiService.analyzeImageFromBase64(base64Image);

            expect(result).to.deep.equal(expectedResult);
            expect(mockModel.generateContent.calledOnce).to.be.true;
            expect(mockModel.generateContent.firstCall.args[0]).to.deep.equal([
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
        });

        it('should handle invalid JSON response', async () => {
            const base64Image = 'base64-encoded-image-data';
            mockResponse.text = () => 'Invalid response without JSON';

            try {
                await geminiService.analyzeImageFromBase64(base64Image);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Failed to analyze image: No valid JSON response found');
            }
        });

        it('should handle malformed JSON response', async () => {
            const base64Image = 'base64-encoded-image-data';
            mockResponse.text = () => `\`\`\`json
            {
                "title": "Professional Camera",
                "description": "High-quality DSLR camera",
                "suggestedPrice": "25",
                "category": "Photography"
            \`\`\``; // Missing closing brace

            try {
                await geminiService.analyzeImageFromBase64(base64Image);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to analyze image');
            }
        });

        it('should handle missing required fields in response', async () => {
            const base64Image = 'base64-encoded-image-data';
            mockResponse.text = () => `\`\`\`json
            {
                "title": "Professional Camera",
                "description": "High-quality DSLR camera"
            }
            \`\`\``;

            try {
                await geminiService.analyzeImageFromBase64(base64Image);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to analyze image');
            }
        });

        it('should handle API errors', async () => {
            const base64Image = 'base64-encoded-image-data';
            mockModel.generateContent.rejects(new Error('API Error'));

            try {
                await geminiService.analyzeImageFromBase64(base64Image);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Failed to analyze image: API Error');
            }
        });

        it('should validate category is from allowed list', async () => {
            const base64Image = 'base64-encoded-image-data';
            mockResponse.text = () => `\`\`\`json
            {
                "title": "Professional Camera",
                "description": "High-quality DSLR camera",
                "suggestedPrice": "25",
                "category": "InvalidCategory"
            }
            \`\`\``;

            try {
                await geminiService.analyzeImageFromBase64(base64Image);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to analyze image');
            }
        });

        it('should validate suggestedPrice is a number', async () => {
            const base64Image = 'base64-encoded-image-data';
            mockResponse.text = () => `\`\`\`json
            {
                "title": "Professional Camera",
                "description": "High-quality DSLR camera",
                "suggestedPrice": "not-a-number",
                "category": "Photography"
            }
            \`\`\``;

            try {
                await geminiService.analyzeImageFromBase64(base64Image);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.include('Failed to analyze image');
            }
        });
    });
}); 