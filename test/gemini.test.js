import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import geminiRoutes from '../src/routes/geminiRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/gemini', geminiRoutes);

describe('Gemini (image analysis)', () => {
  it('400 if no image provided', () =>
    request(app)
      .post('/api/gemini/analyze')
      .send({})
      .expect(400, { error: 'Missing base64 image' })
  );

  it('500 on internal error', () =>
    request(app)
      .post('/api/gemini/analyze')
      .send({ base64Image: 'invalid' })
      .expect(500)
      .then(res => {
        expect(res.body).to.have.property('error', 'Failed to analyze image');
      })
  );
});
