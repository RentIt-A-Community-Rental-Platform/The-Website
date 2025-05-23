import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseService } from './BaseService.js';

export class GeminiService extends BaseService {
    constructor() {
        super(null); // No model needed for this service
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    async analyzeImageFromBase64(base64Image) {
        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

            const match = text.match(/```json\s*([\s\S]*?)\s*```/);

            let data;
            if (match) {
                const jsonString = match[1];
                data = JSON.parse(jsonString);
            } else {
                throw new Error('No valid JSON response found');
            }

            const { title, description, suggestedPrice, category } = data;
            return { title, description, suggestedPrice, category };
        } catch (error) {
            throw new Error(`Failed to analyze image: ${error.message}`);
        }
    }
}