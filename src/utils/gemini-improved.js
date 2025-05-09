// src/lib/gemini.js
import fetch from 'node-fetch'       
globalThis.fetch = fetch 
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const models = await genAI.listModels();
// models.forEach(m => console.log(m.name));

/**
 * Analyzes an image from base64 encoding using Gemini API
 * @param {string} base64Image - The base64-encoded image data
 * @returns {Promise<{title: string, description: string, suggestedPrice: number, category: string}>} Structured data extracted from the image
 * @throws {Error} Throws an error if analysis fails
 */
export async function analyzeImageFromBase64(base64Image) {
  if (!base64Image) {
    throw new Error('No image data provided');
  }

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

    // Get the response text
    const response = await result.response;
    const text = response.text();
    console.log("GEMINI TEXT: ", text);

    if (!text) {
      throw new Error('No response from Gemini API');
    }

    // Try to extract JSON from the response using a regex pattern
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);

    // Initialize data
    let data;
    
    // If JSON was found, parse it
    if (match) {
      const jsonString = match[1];
      try {
        data = JSON.parse(jsonString);
        console.log(data); // Log the parsed object
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        throw new Error('Failed to parse JSON response');
      }
    } else {
      console.log("No JSON found");
      throw new Error('No JSON data found in response');
    }

    // Validate required fields
    const { title, description, suggestedPrice, category } = data;
    if (!title || !description || !suggestedPrice || !category) {
      throw new Error('Missing required fields in response');
    }

    // Validate price is a number
    if (typeof suggestedPrice !== 'number') {
      throw new Error('Invalid price format');
    }

    // Validate category is one of the allowed values
    const allowedCategories = ['Kitchen', 'Tools', 'Music', 'Books', 'Party & Events', 'Sports', 'Photography', 'Electronics', 'Other'];
    if (!allowedCategories.includes(category)) {
      throw new Error('Invalid category');
    }

    // Return the structured data
    return { title, description, suggestedPrice, category };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}