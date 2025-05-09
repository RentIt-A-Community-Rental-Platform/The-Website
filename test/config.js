const testConfig = {
  port: 3001,
  sessionSecret: 'test-session-secret',
  jwtSecret: 'test-jwt-secret',
  cloudinary: {
    cloudName: 'test-cloud',
    apiKey: 'test-key',
    apiSecret: 'test-secret'
  },
  google: {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackUrl: 'http://localhost:3001/auth/google/callback'
  },
  gemini: {
    apiKey: 'test-gemini-key'
  }
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = testConfig.port;
process.env.SESSION_SECRET = testConfig.sessionSecret;
process.env.JWT_SECRET = testConfig.jwtSecret;
process.env.CLOUDINARY_CLOUD_NAME = testConfig.cloudinary.cloudName;
process.env.CLOUDINARY_API_KEY = testConfig.cloudinary.apiKey;
process.env.CLOUDINARY_API_SECRET = testConfig.cloudinary.apiSecret;
process.env.GOOGLE_CLIENT_ID = testConfig.google.clientId;
process.env.GOOGLE_CLIENT_SECRET = testConfig.google.clientSecret;
process.env.GOOGLE_CALLBACK_URL = testConfig.google.callbackUrl;
process.env.GEMINI_API_KEY = testConfig.gemini.apiKey;

export default testConfig; 