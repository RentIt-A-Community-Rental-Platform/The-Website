// test/items.test.js

import 'dotenv/config';
import mongoose from 'mongoose';
import { expect } from 'chai';
import request from 'supertest';

import express from 'express';
import session from 'express-session';
import passport from '../src/config/passport.js';
import { itemRoutes } from '../src/routes/items.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ─── Build a standalone test app ───────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard_cat',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use('/items', itemRoutes);

// ─── Global DB setup / teardown with MONGODB_TEST_URI only ─────────────────────
before(async function() {
  this.timeout(15000);

  const mongoURI = process.env.MONGODB_TEST_URI;
  if (!mongoURI) {
    throw new Error('Please set MONGODB_TEST_URI in your environment for tests');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

after(async function() {
  this.timeout(10000);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

// ─── Seed a user & JWT (with cleanup) ─────────────────────────────────────────
let token;
before(async () => {
  // Clear out any existing test users first
  if (process.env.NODE_ENV === 'test') {
    await User.deleteMany({});
  }

  // Create a fresh test user
  const hash = await bcrypt.hash('pass123', 10);
  const user = await User.create({
    email: 'item@test.com',
    password: hash,
    name: 'ItemUser',
  });

  // Generate a valid JWT for bearer auth
  token = jwt.sign(
    { _id: user._id, email: user.email },
    process.env.JWT_SECRET || 'your-jwt-secret-key',
    { expiresIn: '7d' }
  );
});

// ─── Clean items before each test ───────────────────────────────────────────────
beforeEach(async () => {
  if (process.env.NODE_ENV === 'test') {
    await Item.deleteMany({});
  }
});

// ─── Tests ──────────────────────────────────────────────────────────────────────
describe('Items Routes', function() {
  it('GET /items → 200 & empty array', async () => {
    const res = await request(app).get('/items');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').that.is.empty;
  });

  it('POST /items without token → 401 or 403', async () => {
    const res = await request(app)
      .post('/items')
      .send({ title: 'NoAuth', description: 'X', price: 10 });
    expect(res.status).to.be.oneOf([401, 403]);
  });

  it('POST /items with valid token → 201 & item object', async () => {
    const payload = { title: 'Test Item', description: 'Desc', price: 100 };
    const res = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).to.equal(201);
    expect(res.body).to.include.keys('_id', 'title', 'description', 'price', 'userId');
  });

  it('GET /items after create → returns array with one item', async () => {
    // Create one item
    await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Second', description: 'Desc2', price: 456 });

    // Fetch items
    const res = await request(app)
      .get('/items')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(1);
    expect(res.body[0]).to.include({
      title: 'Second',
      description: 'Desc2',
      price: 456,
    });
  });
});
