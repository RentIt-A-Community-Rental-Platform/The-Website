# University Rentals Platform Backend

A Node.js/Express.js backend for a university rental platform that allows students to rent items from each other.

## Features

- Google OAuth2 authentication (restricted to NYU email addresses)
- Image upload and analysis using Google's Gemini API
- Item listing management
- Availability period tracking
- MongoDB database integration

## Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Google Cloud Project with OAuth2 credentials
- Gemini API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd university-rentals
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your credentials:
- Add your MongoDB connection string
- Add your Google OAuth2 credentials
- Add your Gemini API key
- Add a JWT secret for authentication

5. Create the uploads directory:
```bash
mkdir -p src/uploads
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/login/google`: Google OAuth2 login
- `GET /auth/me`: Get current user profile

### Items
- `POST /items/upload-image`: Upload image and get Gemini suggestions
- `POST /items`: Create a new item listing
- `GET /items`: List all items

## Security

- All endpoints except `/auth/login/google` require authentication
- Only NYU email addresses are allowed to register
- File uploads are restricted to JPEG and PNG images under 10MB
- All sensitive data is stored in environment variables

## Development

The application uses:
- Express.js for the web framework
- MongoDB with Mongoose for the database
- JWT for authentication
- Multer for file uploads
- Google Generative AI for image analysis

## License

MIT 