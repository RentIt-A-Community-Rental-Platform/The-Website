import { expect } from 'chai';
import request from 'supertest';
import app from '../../src/app.js';

describe('App', () => {
  it('should be defined', () => {
    expect(app).to.exist;
  });

  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).to.deep.equal({ status: 'ok' });
  });
}); 