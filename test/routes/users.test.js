import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { userRoutes } from '../../src/routes/users.js';
import { User } from '../../src/models/User.js';
import { isAuthenticated } from '../../src/routes/auth.js';

describe('User Routes', () => {
    let app;
    let findByIdStub;
    let isAuthenticatedStub;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/users', userRoutes);

        // Create stubs
        findByIdStub = sinon.stub(User, 'findById');
        isAuthenticatedStub = sinon.stub();
        
        // Replace the isAuthenticated middleware with our stub
        sinon.stub(express.Router, 'use').callsFake((path, middleware) => {
            if (middleware === isAuthenticated) {
                return isAuthenticatedStub;
            }
            return middleware;
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('GET /api/users/:userId', () => {
        it('should return user data when user exists', async () => {
            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com',
                toObject: () => ({
                    _id: '123',
                    username: 'testuser',
                    email: 'test@example.com'
                })
            };
            findByIdStub.returns({
                select: () => Promise.resolve(mockUser)
            });

            const response = await request(app)
                .get('/api/users/123');

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal(mockUser);
            expect(findByIdStub.calledWith('123')).to.be.true;
        });

        it('should return 404 when user does not exist', async () => {
            findByIdStub.returns({
                select: () => Promise.resolve(null)
            });

            const response = await request(app)
                .get('/api/users/nonexistent');

            expect(response.status).to.equal(404);
            expect(response.body).to.deep.equal({ error: 'User not found' });
            expect(findByIdStub.calledWith('nonexistent')).to.be.true;
        });

        it('should handle database errors gracefully', async () => {
            findByIdStub.returns({
                select: () => Promise.reject(new Error('Database error'))
            });

            const response = await request(app)
                .get('/api/users/123');

            expect(response.status).to.equal(500);
            expect(response.body).to.deep.equal({ error: 'Failed to fetch user information' });
            expect(findByIdStub.calledWith('123')).to.be.true;
        });

        it('should exclude sensitive information from response', async () => {
            const mockUser = {
                _id: '123',
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword',
                googleId: 'google123',
                toObject: () => ({
                    _id: '123',
                    username: 'testuser',
                    email: 'test@example.com'
                })
            };
            findByIdStub.returns({
                select: () => Promise.resolve(mockUser)
            });

            const response = await request(app)
                .get('/api/users/123');

            expect(response.status).to.equal(200);
            expect(response.body).to.not.have.property('password');
            expect(response.body).to.not.have.property('googleId');
            expect(findByIdStub.calledWith('123')).to.be.true;
        });
    });
}); 