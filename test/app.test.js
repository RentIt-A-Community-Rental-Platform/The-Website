import { expect } from 'chai';
import request from 'supertest';
import { testApp } from './setup.js';

describe('Application Tests', () => {
  describe('API Root Endpoint', () => {
    it('should return API information', async () => {
      const res = await request(testApp)
        .get('/api')
        .expect(200);

      expect(res.body).to.have.property('status', 'success');
      expect(res.body).to.have.property('message', 'University Rentals API is running!');
      expect(res.body).to.have.property('timestamp');
      expect(res.body).to.have.property('endpoints');
    });
  });

  describe('Authentication Endpoints', () => {
    it('should redirect to auth page when accessing dashboard without authentication', async () => {
      const res = await request(testApp)
        .get('/dashboard')
        .expect(302);

      expect(res.header.location).to.equal('/auth.html');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(testApp)
        .get('/non-existent-route')
        .expect(404);

      expect(res.body).to.have.property('error', 'Not Found');
      expect(res.body).to.have.property('message', 'The requested resource does not exist');
    });

    it('should handle server errors gracefully', async () => {
      // Simulate an error by accessing an invalid route that triggers an error
      const res = await request(testApp)
        .get('/api/error-test')
        .expect(500);

      expect(res.body).to.have.property('error', 'Something went wrong!');
      expect(res.body).to.have.property('message');
      expect(res.body).to.have.property('timestamp');
    });
  });
}); 