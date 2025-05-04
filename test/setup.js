// test/setup.js
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';

export const mochaHooks = {
  beforeAll: async function() {
    this.timeout(10000);
    await mongoose.connect(process.env.MONGODB_TEST_URI, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
    });
  },

  afterAll: async function() {
    this.timeout(5000);
    await mongoose.disconnect();
  },

  beforeEach: async function() {
    // wipe all collections between tests
    await User.deleteMany({});
    await Item.deleteMany({});
  }
};
