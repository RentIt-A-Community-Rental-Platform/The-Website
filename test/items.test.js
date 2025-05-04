import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import request from 'supertest';
import app from '../src/index.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';

before(function() {
    this.timeout(10000);
    // only connect if not already connected
    if (mongoose.connection.readyState === 0) {
      return mongoose.connect(process.env.MONGODB_TEST_URI, {
        useNewUrlParser:    true,
        useUnifiedTopology: true,
      });
    }
  });
  
  after(function() {
    this.timeout(5000);
    // only disconnect if still connected
    if (mongoose.connection.readyState !== 0) {
      return mongoose.disconnect();
    }
  });
  
describe('Items Routes', () => {
  let token;

  before(async () => {
    // Create & save a user directly
    const hash = await bcrypt.hash('pass123', 10);
    const user = await User.create({
      email:    'item@test.com',
      password: hash,
      name:     'ItemUser'
    });

    // Forge a JWT that matches your middleware’s expectation
    token = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '7d' }
    );
  });

  beforeEach(async () => {
    // Clear items before each test
    await Item.deleteMany({});
  });

  it('GET /items should return an empty array initially', async () => {
    const res = await request(app).get('/items');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').that.is.empty;
  });

  it('POST /items should reject without auth token', async () => {
    const res = await request(app)
      .post('/items')
      .send({ title: 'NoAuth', description: 'X', price: 10 });
    expect(res.status).to.be.oneOf([401, 403]);
  });

  // The following tests are commented out temporarily
  /*
  it('POST /items should create an item when authenticated', async () => {
    const payload = { title: 'MyTestItem', description: 'Desc', price: 123 };
    const res = await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).to.equal(201);
    expect(res.body).to.include.keys('_id', 'title', 'description', 'price', 'userId');
    expect(res.body).to.include({
      title: payload.title,
      description: payload.description,
      price: payload.price
    });
  });

  it('GET /items should now return the newly created item', async () => {
    // Create the item
    await request(app)
      .post('/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'SecondItem', description: 'Desc2', price: 456 });

    // Fetch items
    const res = await request(app)
      .get('/items')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.lengthOf(1);
    expect(res.body[0]).to.include({
      title:       'SecondItem',
      description: 'Desc2',
      price:       456
    });
    expect(res.body[0]._id).to.be.a('string');
  });
  */
});
