import { expect } from 'chai';
import sinon from 'sinon';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/AuthService.js';
import { User } from '../../src/models/User.js';

describe('AuthService', () => {
    let authService;
    let findOneStub;
    let findByIdStub;
    let createStub;
    let saveStub;
    let bcryptStub;
    let jwtStub;

    beforeEach(() => {
        authService = new AuthService();
        
        // Create stubs
        findOneStub = sinon.stub(User, 'findOne');
        findByIdStub = sinon.stub(User, 'findById');
        createStub = sinon.stub(User, 'create');
        saveStub = sinon.stub(User.prototype, 'save');
        
        // Stub bcrypt methods
        bcryptStub = {
            genSalt: sinon.stub(bcrypt, 'genSalt'),
            hash: sinon.stub(bcrypt, 'hash'),
            compare: sinon.stub(bcrypt, 'compare')
        };
        
        // Stub jwt
        jwtStub = sinon.stub(jwt, 'sign');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('register', () => {
        it('should successfully register a new user', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };

            findOneStub.resolves(null);
            bcryptStub.genSalt.resolves('salt123');
            bcryptStub.hash.resolves('hashedPassword123');
            
            const mockUser = {
                _id: '123',
                email: userData.email,
                name: userData.name
            };
            createStub.resolves(mockUser);
            
            const mockToken = 'jwt-token-123';
            jwtStub.returns(mockToken);

            const result = await authService.register(userData);

            expect(result).to.deep.equal({
                user: { _id: '123', email: userData.email, name: userData.name },
                token: mockToken
            });
            expect(findOneStub.calledWith({ email: userData.email })).to.be.true;
            expect(bcryptStub.genSalt.calledWith(10)).to.be.true;
            expect(bcryptStub.hash.calledWith(userData.password, 'salt123')).to.be.true;
            expect(createStub.calledWith({
                email: userData.email,
                password: 'hashedPassword123',
                name: userData.name
            })).to.be.true;
        });

        it('should throw error if user already exists', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                name: 'Test User'
            };

            findOneStub.resolves({ email: userData.email });

            try {
                await authService.register(userData);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Registration failed: User already exists');
            }
        });
    });

    describe('login', () => {
        it('should successfully login a user', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockUser = {
                _id: '123',
                email: credentials.email,
                name: 'Test User',
                password: 'hashedPassword123'
            };
            findOneStub.resolves(mockUser);
            bcryptStub.compare.resolves(true);
            
            const mockToken = 'jwt-token-123';
            jwtStub.returns(mockToken);

            const result = await authService.login(credentials);

            expect(result).to.deep.equal({
                user: { _id: '123', email: credentials.email, name: 'Test User' },
                token: mockToken
            });
            expect(findOneStub.calledWith({ email: credentials.email })).to.be.true;
            expect(bcryptStub.compare.calledWith(credentials.password, mockUser.password)).to.be.true;
        });

        it('should throw error for invalid credentials', async () => {
            const credentials = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            findOneStub.resolves(null);

            try {
                await authService.login(credentials);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Login failed: Invalid credentials');
            }
        });
    });

    describe('updateUsername', () => {
        it('should successfully update username', async () => {
            const userId = '123';
            const newName = 'New Name';
            const currentPassword = 'password123';

            const mockUser = {
                _id: userId,
                name: 'Old Name',
                password: 'hashedPassword123',
                save: saveStub
            };
            findByIdStub.resolves(mockUser);
            findOneStub.resolves(null);
            bcryptStub.compare.resolves(true);

            const result = await authService.updateUsername(userId, newName, currentPassword);

            expect(result).to.deep.equal({ message: 'Name updated successfully' });
            expect(mockUser.name).to.equal(newName);
            expect(saveStub.calledOnce).to.be.true;
        });

        it('should throw error if name is already taken', async () => {
            const userId = '123';
            const newName = 'Taken Name';
            const currentPassword = 'password123';

            const mockUser = {
                _id: userId,
                name: 'Old Name',
                password: 'hashedPassword123'
            };
            findByIdStub.resolves(mockUser);
            findOneStub.resolves({ _id: '456', name: newName });
            bcryptStub.compare.resolves(true);

            try {
                await authService.updateUsername(userId, newName, currentPassword);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Failed to update name: Name is already taken');
            }
        });
    });

    describe('updatePassword', () => {
        it('should successfully update password', async () => {
            const userId = '123';
            const currentPassword = 'oldPassword';
            const newPassword = 'newPassword';

            const mockUser = {
                _id: userId,
                password: 'hashedOldPassword',
                save: saveStub
            };
            findByIdStub.resolves(mockUser);
            bcryptStub.compare.resolves(true);
            bcryptStub.genSalt.resolves('salt123');
            bcryptStub.hash.resolves('hashedNewPassword');

            const result = await authService.updatePassword(userId, currentPassword, newPassword);

            expect(result).to.deep.equal({ message: 'Password updated successfully' });
            expect(mockUser.password).to.equal('hashedNewPassword');
            expect(saveStub.calledOnce).to.be.true;
        });

        it('should throw error if current password is incorrect', async () => {
            const userId = '123';
            const currentPassword = 'wrongPassword';
            const newPassword = 'newPassword';

            const mockUser = {
                _id: userId,
                password: 'hashedOldPassword'
            };
            findByIdStub.resolves(mockUser);
            bcryptStub.compare.resolves(false);

            try {
                await authService.updatePassword(userId, currentPassword, newPassword);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Failed to update password: Current password is incorrect');
            }
        });
    });

    describe('generateToken', () => {
        it('should generate a valid JWT token', () => {
            const mockUser = {
                _id: '123',
                email: 'test@example.com'
            };
            const mockToken = 'jwt-token-123';
            jwtStub.returns(mockToken);

            const token = authService.generateToken(mockUser);

            expect(token).to.equal(mockToken);
            expect(jwtStub.calledWith(
                { _id: mockUser._id, email: mockUser.email },
                process.env.JWT_SECRET || 'your-jwt-secret-key',
                { expiresIn: '7d' }
            )).to.be.true;
        });
    });
}); 