import os
import google.generativeai as genai
from PIL import Image
from typing import Optional
from ..schemas import GeminiResponse

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro-vision')

    async def analyze_image(self, image_path: str) -> Optional[GeminiResponse]:
        try:
            # Load and prepare the image
            image = Image.open(image_path)
            
            # Generate content using the model
            response = self.model.generate_content([
                "Analyze this image and provide:",
                "1. A concise title (max 50 characters)",
                "2. A detailed description (max 200 characters)",
                "3. A category (e.g., Electronics, Furniture, Books, etc.)",
                image
            ])
            
            # Parse the response
            text = response.text
            lines = text.strip().split('\n')
            
            if len(lines) >= 3:
                return GeminiResponse(
                    title=lines[0].strip(),
                    description=lines[1].strip(),
                    category=lines[2].strip()
                )
            return None
            
        except Exception as e:
            print(f"Error analyzing image with Gemini: {str(e)}")
            return None 