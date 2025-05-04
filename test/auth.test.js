import 'dotenv/config';
import mongoose from 'mongoose';
import { expect } from 'chai';
import request from 'supertest';
import app     from '../src/index.js';
import { User } from '../src/models/User.js';

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true,
  });
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await mongoose.disconnect();
});

describe('Auth Routes', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'foo@bar.com', password: 'pass123', name: 'Foo' });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('token');
  });
});
