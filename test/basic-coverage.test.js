// test/basic-coverage.test.js
import 'dotenv/config';
import { expect } from 'chai';
import mongoose from 'mongoose';

// Import all modules to ensure they're included in coverage
import '../src/index.js';
import '../src/config/passport.js';
import '../src/models/ChatEntry.js';
import '../src/models/Item.js';
import '../src/models/Rental.js';
import '../src/models/User.js';
import '../src/routes/auth.js';
import '../src/routes/cloudinaryUpload.js';
import '../src/routes/geminiRoutes.js';
import '../src/routes/items.js';
import '../src/routes/rentals.js';
import '../src/utils/gemini.js';

// This file doesn't actually test functionality,
// but makes sure nyc sees all the files for coverage reporting

describe('Basic Coverage Test', () => {
  it('should import all files for coverage measurement', () => {
    // Just a placeholder test
    expect(true).to.be.true;
  });
});