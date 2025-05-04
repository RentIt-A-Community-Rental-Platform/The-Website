// test/items.test.js

import 'dotenv/config';
import mongoose from 'mongoose';
import sinon from 'sinon';
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

let token;
let seededUser;
let findByIdStub;

before(async function() {
  this.timeout(15000);
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri) throw new Error('MONGODB_TEST_URI must be set for tests');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  // Clear collections
  await User.deleteMany({});
  await Item.deleteMany({});

  // Seed one user
  const hash = await bcrypt.hash('pass123', 10);
  seededUser = await User.create({
    email: 'item@test.com',
    password: hash,
    name: 'ItemUser',
  });

  // Generate a JWT for that user (id as string)
  token = jwt.sign(
    { id: seededUser._id.toString(), email: seededUser.email },
    process.env.JWT_SECRET || 'your-jwt-secret-key',
    { expiresIn: '7d' }
  );

  // Stub User.findById so our auth middleware always finds this user
  findByIdStub = sinon
    .stub(User, 'findById')
    .callsFake((id) =>
      id.toString() === seededUser._id.toString()
        ? Promise.resolve(seededUser)
        : User.collection.findOne({ _id: id })
    );
});

after(async function() {
  // Restore stub
  if (findByIdStub && findByIdStub.restore) {
    findByIdStub.restore();
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

beforeEach(async () => {
  // Clear items before each test
  await Item.deleteMany({});
});

describe('Items Routes', function() {
  it('GET /items → 200 & empty array', async () => {
    const res = await request(app).get('/items');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').that.is.empty;
  });

  it('POST /items without token → 401 or 403', async () => {
    const res = await request(app)
      .post('/items')
      .send({ title: 'NoAuth', description: 'X', price: 10, deposit: 0, category: 'misc' });
    expect(res.status).to.be.oneOf([401, 403]);
  });

  it('POST /items with valid token → 201 & item object', async () => {
    const payload = {
      title: 'Test Item',
      description: 'Desc',
      price: 100,
      deposit: 0,
      category: 'misc',
      photos: []
    };

    const res = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).to.equal(201);
    expect(res.body).to.include.keys(
      '_id',
      'title',
      'description',
      'price',
      'userId'
    );
  });

  it('GET /items after create → returns array with one item', async () => {
    await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Second',
        description: 'Desc2',
        price: 456,
        deposit: 0,
        category: 'misc',
        photos: []
      });

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
