// test/models/User.test.js
import { expect } from 'chai';
import { User } from '../../src/models/User.js';

describe('User Model', () => {
  it('should validate a valid user', () => {
    const validUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    
    const validationError = validUser.validateSync();
    expect(validationError).to.be.undefined;
  });
  
  it.skip('should invalidate a user without required fields', () => {
    const invalidUser = new User({});
    
    const validationError = invalidUser.validateSync();
    expect(validationError).to.exist;
    expect(validationError.errors).to.have.property('email');
  });
});