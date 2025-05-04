// test/rentals.test.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { expect } from 'chai';
import request from 'supertest';

import express from 'express';
import session from 'express-session';
import passport from '../src/config/passport.js';
import { authRoutes } from '../src/routes/auth.js';
import { itemRoutes } from '../src/routes/items.js';
import { rentalRoutes } from '../src/routes/rentals.js';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { Rental } from '../src/models/Rental.js';

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
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/rentals', rentalRoutes);

let agent, itemId, rentalId;

before(async function() {
  this.timeout(10_000);
  const uri = process.env.MONGODB_TEST_URI;
  if (!uri) throw new Error('MONGODB_TEST_URI must be set for tests');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
  // Clear
  await User.deleteMany({});
  await Item.deleteMany({});
  await Rental.deleteMany({});

  // Login via session
  agent = request.agent(app);
  await agent
    .post('/auth/register')
    .send({ email: 'rent@test.com', password: 'pass123', name: 'Renter' });
  await agent
    .post('/auth/login')
    .send({ email: 'rent@test.com', password: 'pass123' });

  // Create an item
  const it = await agent
    .post('/items')
    .send({
      title: 'TestItem',
      description: 'Desc',
      price: 50,
      category: 'misc',
      deposit: 10,
      photos: [],
    });
  itemId = it.body._id;
});

after(async function() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Rental Routes (session auth)', () => {
  it('POST /rentals → 201 & returns rental', async () => {
    const res = await agent
      .post('/rentals')
      .send({
        itemId,
        paymentMethod: 'card',
        meetingDate: '2025-06-01',
        meetingTime: '11:00',
        meetingLocation: 'Office',
        notes: 'Please confirm',
        startDate: '2025-06-01',
        endDate: '2025-06-03',
        chatHistory: [],
      });
    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('rental');
    rentalId = res.body.rental._id;
  });

  it('GET /rentals/pending → 200 & array length ≥1', async () => {
    const res = await agent.get('/rentals/pending');
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').that.is.not.empty;
  });

  it('POST /rentals/:id/accept → 200 & message', async () => {
    const res = await agent.post(`/rentals/${rentalId}/accept`);
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('message', 'Rental request accepted');
  });

  it('POST /rentals/:id/reject → 404 (already accepted)', async () => {
    const res = await agent.post(`/rentals/${rentalId}/reject`);
    expect(res.status).to.equal(404);
  });

  it('PUT /rentals/:id → 200 & modified', async () => {
    const res = await agent
      .put(`/rentals/${rentalId}`)
      .send({ meetingDetails: { notes: 'Updated note' } });
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property(
      'message',
      'Rental request modified successfully'
    );
  });
});
