import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import { User } from '../../src/models/User.js';
import { createTestUser } from '../../src/scripts/createTestUser.js';

describe('Create Test User Script', () => {
  let findOneStub;
  let createStub;
  let consoleStub;
  let connectStub;
  let disconnectStub;

  beforeEach(() => {
    findOneStub = sinon.stub(User, 'findOne');
    createStub = sinon.stub(User.prototype, 'save');
    consoleStub = sinon.stub(console, 'log');
    connectStub = sinon.stub(mongoose, 'connect').resolves();
    disconnectStub = sinon.stub(mongoose, 'disconnect').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create a new test user if none exists', async () => {
    findOneStub.resolves(null);
    createStub.resolves({
      email: 'test@test.com',
      name: 'Test User'
    });

    const result = await createTestUser();

    expect(connectStub.calledOnce).to.be.true;
    expect(findOneStub.calledWith({ email: 'test@test.com' })).to.be.true;
    expect(createStub.calledOnce).to.be.true;
    expect(consoleStub.calledWith('Test user created successfully')).to.be.true;
    expect(disconnectStub.calledOnce).to.be.true;
    expect(result).to.have.property('email', 'test@test.com');
  });

  it('should not create a user if one already exists', async () => {
    const existingUser = {
      email: 'test@test.com',
      name: 'Test User'
    };
    findOneStub.resolves(existingUser);

    const result = await createTestUser();

    expect(connectStub.calledOnce).to.be.true;
    expect(findOneStub.calledWith({ email: 'test@test.com' })).to.be.true;
    expect(createStub.called).to.be.false;
    expect(consoleStub.calledWith('Test user already exists')).to.be.true;
    expect(disconnectStub.calledOnce).to.be.true;
    expect(result).to.deep.equal(existingUser);
  });

  it('should handle database errors', async () => {
    const error = new Error('Database error');
    connectStub.rejects(error);

    try {
      await createTestUser();
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err).to.equal(error);
      expect(consoleStub.calledWith('Error:', error)).to.be.true;
      expect(disconnectStub.calledOnce).to.be.true;
    }
  });

  it('should handle user creation errors', async () => {
    findOneStub.resolves(null);
    const error = new Error('User creation failed');
    createStub.rejects(error);

    try {
      await createTestUser();
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err).to.equal(error);
      expect(consoleStub.calledWith('Error:', error)).to.be.true;
      expect(disconnectStub.calledOnce).to.be.true;
    }
  });
}); 