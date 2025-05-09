import { expect } from 'chai';
import request from 'supertest';
import { testApp } from './setup.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import mongoose from 'mongoose';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Application Setup', () => {


  describe('MongoDB Connection', () => {
    it('should have mongoose connection in test environment', () => {
      expect(mongoose.connection.readyState).to.equal(1); // 1 = connected
    });
  });

}); 