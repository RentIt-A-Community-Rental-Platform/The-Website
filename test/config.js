export const testConfig = {
  port: 3001,
  sessionSecret: 'test_secret',
  jwtSecret: 'test_jwt_secret',
  cloudinary: {
    cloudName: 'test_cloud',
    apiKey: 'test_key',
    apiSecret: 'test_secret'
  },
  google: {
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    callbackUrl: 'http://localhost:3001/auth/google/callback'
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