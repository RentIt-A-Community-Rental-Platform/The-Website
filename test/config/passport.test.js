import { expect } from 'chai';
import sinon from 'sinon';
import passport from 'passport';
import { User } from '../../src/models/User.js';
import '../../src/config/passport.js';

describe('Passport Configuration', () => {
    let user;
    let findOneStub;
    let createStub;
    let comparePasswordStub;

    beforeEach(() => {
        user = {
            _id: '123',
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
            googleId: 'google123'
        };

        findOneStub = sinon.stub(User, 'findOne');
        createStub = sinon.stub(User, 'create');
        comparePasswordStub = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('Local Strategy', () => {
        it('should authenticate user with correct credentials', async () => {
            findOneStub.resolves(user);
            comparePasswordStub.resolves(true);
            user.comparePassword = comparePasswordStub;

            const done = sinon.spy();
            const strategy = passport._strategies.local;

            await strategy._verify('test@example.com', 'password123', done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, user)).to.be.true;
            expect(findOneStub.calledWith({ email: 'test@example.com' })).to.be.true;
            expect(comparePasswordStub.calledWith('password123')).to.be.true;
        });

        it('should reject user with incorrect password', async () => {
            findOneStub.resolves(user);
            comparePasswordStub.resolves(false);
            user.comparePassword = comparePasswordStub;

            const done = sinon.spy();
            const strategy = passport._strategies.local;

            await strategy._verify('test@example.com', 'wrongpassword', done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, false, { message: 'Incorrect password' })).to.be.true;
        });

        it('should reject non-existent user', async () => {
            findOneStub.resolves(null);

            const done = sinon.spy();
            const strategy = passport._strategies.local;

            await strategy._verify('nonexistent@example.com', 'password123', done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, false, { message: 'User not found' })).to.be.true;
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            findOneStub.rejects(error);

            const done = sinon.spy();
            const strategy = passport._strategies.local;

            await strategy._verify('test@example.com', 'password123', done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(error)).to.be.true;
        });
    });

    describe('Google Strategy', () => {
        const profile = {
            id: 'google123',
            displayName: 'Test User',
            emails: [{ value: 'test@example.com' }]
        };

        it('should find existing user by googleId', async () => {
            findOneStub.resolves(user);

            const done = sinon.spy();
            const strategy = passport._strategies.google;

            await strategy._verify('access-token', 'refresh-token', profile, done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, user)).to.be.true;
            expect(findOneStub.calledWith({ googleId: 'google123' })).to.be.true;
        });

        it('should create new user if not found', async () => {
            findOneStub.resolves(null);
            createStub.resolves(user);

            const done = sinon.spy();
            const strategy = passport._strategies.google;

            await strategy._verify('access-token', 'refresh-token', profile, done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, user)).to.be.true;
            expect(createStub.calledWith({
                googleId: 'google123',
                email: 'test@example.com',
                name: 'Test User'
            })).to.be.true;
        });

        it('should handle database errors', async () => {
            const error = new Error('Database error');
            findOneStub.rejects(error);

            const done = sinon.spy();
            const strategy = passport._strategies.google;

            await strategy._verify('access-token', 'refresh-token', profile, done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(error)).to.be.true;
        });
    });

    describe('Session Serialization', () => {
        it('should serialize user id', () => {
            const done = sinon.spy();
            passport._serializers[0](user, done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, '123')).to.be.true;
        });

        it('should deserialize user', async () => {
            findOneStub.resolves(user);

            const done = sinon.spy();
            await passport._deserializers[0]('123', done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(null, user)).to.be.true;
            expect(findOneStub.calledWith('123')).to.be.true;
        });

        it('should handle deserialization errors', async () => {
            const error = new Error('Database error');
            findOneStub.rejects(error);

            const done = sinon.spy();
            await passport._deserializers[0]('123', done);

            expect(done.calledOnce).to.be.true;
            expect(done.calledWith(error)).to.be.true;
        });
    });
}); 