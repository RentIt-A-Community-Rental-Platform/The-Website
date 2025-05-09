import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import request from 'supertest';
import { app } from '../app.js';

describe('Application Entry Point', () => {
  let mongoServer;
  let server;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    dotenv.config();
    server = app.listen(0); // Random port for testing
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    await server.close();
  });

  describe('Server Initialization', () => {
    it('should start the server successfully', () => {
      expect(server.listening).to.be.true;
    });

    it('should have correct environment configuration', () => {
      expect(process.env.NODE_ENV).to.equal('test');
      expect(app.get('env')).to.equal('test');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK for health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).to.have.property('status', 'ok');
      expect(response.body).to.have.property('timestamp');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .expect(404);
      
      expect(response.body).to.have.property('error');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
      
      expect(response.body).to.have.property('error');
    });
  });

  describe('Middleware', () => {
    it('should handle CORS', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);
      
      expect(response.headers).to.have.property('access-control-allow-origin');
    });

    it('should handle rate limiting', async () => {
      const requests = Array(100).fill().map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(requests);
      const tooManyRequests = responses.some(res => res.status === 429);
      
      expect(tooManyRequests).to.be.true;
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.headers).to.have.property('x-content-type-options');
      expect(response.headers).to.have.property('x-frame-options');
      expect(response.headers).to.have.property('x-xss-protection');
    });
  });
}); 