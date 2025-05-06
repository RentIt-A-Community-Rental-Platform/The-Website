class MediaService {
    constructor() {
        this.API_URL = 'http://localhost:3000';
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        let response = {};
        try {
            response = await fetch(`${this.API_URL}/api/upload-image`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const { error } = await response.json();
                throw new Error(error || 'Upload failed');
            }

            const data = await response.json();
            return data.secure_url;
        } catch (err) {
            throw new Error(err.message);
        }
    }
}

export default MediaService;