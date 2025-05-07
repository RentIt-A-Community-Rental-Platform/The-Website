class ListingAnalyzer {
    constructor() {
        this.API_URL = 'http://localhost:3000';
    }

    async analyzeImage(imageFile) {
        try {
            const base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.readAsDataURL(imageFile);
            });

            const response = await fetch(`${this.API_URL}/api/gemini/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Image })
            });

            if (!response.ok) {
                throw new Error('Failed to analyze image');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error analyzing image:', error);
            throw error;
        }
    }

    async analyzeListing(images) {
        try {
            const analysisResults = await Promise.all(
                images.map(image => this.analyzeImage(image))
            );
            return analysisResults;
        } catch (error) {
            console.error('Error analyzing listing:', error);
            throw error;
        }
    }
}

export default ListingAnalyzer;