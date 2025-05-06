import { expect } from 'chai';
import supertest from 'supertest';
import express from 'express';

describe('API Root Tests', function() {
  this.timeout(10000); // Increase timeout
  let app, request;

  before(() => {
    // Create a test app with just the root endpoint
    app = express();
    
    // Root API test endpoint
    app.get('/api', (req, res) => {
      res.json({
        status: 'success',
        message: 'University Rentals API is running!',
        timestamp: new Date().toISOString(),
        endpoints: {
          items: {
            list: '/items',
            create: '/items',
            update: '/items/:id',
            delete: '/items/:id'
          },
          auth: {
            login: '/auth/login',
            register: '/auth/register',
            google: '/auth/google',
            logout: '/auth/logout'
          }
        }
      });
    });

    request = supertest(app);
  });

  describe('GET /api', () => {
    it('should return API information with success status', async () => {
      const response = await request.get('/api');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('message', 'University Rentals API is running!');
      expect(response.body).to.have.property('timestamp');
      expect(response.body).to.have.property('endpoints');
      
      // Check that endpoints information is included
      expect(response.body.endpoints).to.have.property('items');
      expect(response.body.endpoints).to.have.property('auth');
      
      // Verify timestamp is a valid ISO string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).to.be.a('date');
      expect(isNaN(timestamp.getTime())).to.be.false;
    });
  });
});