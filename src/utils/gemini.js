import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

let genAI;

export function setupGemini() {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function analyzeImage(imagePath) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    // Read the image file
    const imageData = fs.readFileSync(imagePath);
    const imageBase64 = imageData.toString('base64');
    
    const result = await model.generateContent([
      'Analyze this image and provide:',
      '1. A concise title (max 50 characters)',
      '2. A detailed description (max 200 characters)',
      '3. A category (e.g., Electronics, Furniture, Books, etc.)',
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const response = await result.response;
    const text = response.text();
    const [title, description, category] = text.split('\n').map(line => line.trim());
    
    return {
      title,
      description,
      category
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze image');
  }
} 