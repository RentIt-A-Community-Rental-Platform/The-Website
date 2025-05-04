// test/api-root.test.js

import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import passport from '../src/config/passport.js'; // ✅ Correct relative path
import { authRoutes } from '../src/routes/auth.js';
import { itemRoutes } from '../src/routes/items.js';
import { rentalRoutes } from '../src/routes/rentals.js';
import cloudinaryUpload from '../src/routes/cloudinaryUpload.js';
import geminiRoutes from '../src/routes/geminiRoutes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'test_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/rentals', rentalRoutes);
app.use('/api', cloudinaryUpload);
app.use('/api/gemini', geminiRoutes);

app.get('/api', (_, res) => {
  res.json({
    status: 'success',
    message: 'University Rentals API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      items: {
        list: '/items',
        create: '/items',
      },
      auth: {
        login: '/auth/login',
        register: '/auth/register',
      },
    },
  });
});

app.use((_, res) => res.status(404).json({ error: 'Not Found' }));

describe('Root API Endpoint', () => {
  it('GET /api should return API status and endpoint list', async () => {
    const res = await request(app).get('/api');
    expect(res.status).to.equal(200);
    expect(res.body).to.include.keys('status', 'message', 'endpoints');
    expect(res.body.status).to.equal('success');
  });

  it('GET /non-existent → 404 JSON', async () => {
    const res = await request(app).get('/non-existent');
    expect(res.status).to.equal(404);
    expect(res.body).to.eql({ error: 'Not Found' });
  });
});
