import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import { rentalRoutes } from '../../src/routes/rentals.js';
import { RentalService } from '../../src/services/RentalService.js';
import { isAuthenticated } from '../../src/routes/auth.js';

describe('Rental Routes', () => {
    let app;
    let rentalServiceStub;
    let isAuthenticatedStub;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/rentals', rentalRoutes);

        // Create stubs
        rentalServiceStub = {
            createRentalRequest: sinon.stub(RentalService.prototype, 'createRentalRequest'),
            getPendingRequests: sinon.stub(RentalService.prototype, 'getPendingRequests'),
            getAllRequests: sinon.stub(RentalService.prototype, 'getAllRequests'),
            getUserRequests: sinon.stub(RentalService.prototype, 'getUserRequests'),
            updateRentalStatus: sinon.stub(RentalService.prototype, 'updateRentalStatus'),
            updateRental: sinon.stub(RentalService.prototype, 'updateRental'),
            confirmPickup: sinon.stub(RentalService.prototype, 'confirmPickup'),
            confirmReturn: sinon.stub(RentalService.prototype, 'confirmReturn'),
            getRequestsByStatuses: sinon.stub(RentalService.prototype, 'getRequestsByStatuses')
        };

        // Replace the isAuthenticated middleware with our stub
        isAuthenticatedStub = sinon.stub();
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

    describe('POST /api/rentals', () => {
        it('should create a new rental request', async () => {
            const rentalData = {
                itemId: '123',
                startDate: '2024-03-01',
                endDate: '2024-03-05'
            };
            const mockRental = { ...rentalData, _id: 'rental123' };
            rentalServiceStub.createRentalRequest.resolves(mockRental);

            const response = await request(app)
                .post('/api/rentals')
                .send(rentalData)
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(201);
            expect(response.body).to.deep.equal({
                message: 'Rental request created successfully',
                rental: mockRental
            });
            expect(rentalServiceStub.createRentalRequest.calledWith(rentalData, 'user123')).to.be.true;
        });

        it('should handle errors when creating rental request', async () => {
            const errorMessage = 'Invalid rental data';
            rentalServiceStub.createRentalRequest.rejects(new Error(errorMessage));

            const response = await request(app)
                .post('/api/rentals')
                .send({})
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(500);
            expect(response.body).to.deep.equal({ error: errorMessage });
        });
    });

    describe('GET /api/rentals/pending', () => {
        it('should get pending rental requests', async () => {
            const mockRequests = [{ _id: '1' }, { _id: '2' }];
            rentalServiceStub.getPendingRequests.resolves(mockRequests);

            const response = await request(app)
                .get('/api/rentals/pending')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal(mockRequests);
            expect(rentalServiceStub.getPendingRequests.calledWith('user123')).to.be.true;
        });
    });

    describe('GET /api/rentals', () => {
        it('should get all rental requests for the user', async () => {
            const mockRequests = [{ _id: '1' }, { _id: '2' }];
            rentalServiceStub.getAllRequests.resolves(mockRequests);

            const response = await request(app)
                .get('/api/rentals')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal(mockRequests);
            expect(rentalServiceStub.getAllRequests.calledWith('user123')).to.be.true;
        });
    });

    describe('GET /api/rentals/my-requests', () => {
        it('should get user\'s rental requests', async () => {
            const mockRequests = [{ _id: '1' }, { _id: '2' }];
            rentalServiceStub.getUserRequests.resolves(mockRequests);

            const response = await request(app)
                .get('/api/rentals/my-requests')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal(mockRequests);
            expect(rentalServiceStub.getUserRequests.calledWith('user123')).to.be.true;
        });
    });

    describe('POST /api/rentals/:id/accept', () => {
        it('should accept a rental request', async () => {
            const mockRental = { _id: 'rental123', status: 'accepted' };
            rentalServiceStub.updateRentalStatus.resolves(mockRental);

            const response = await request(app)
                .post('/api/rentals/rental123/accept')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                message: 'Rental request accepted',
                rental: mockRental
            });
            expect(rentalServiceStub.updateRentalStatus.calledWith('rental123', 'accepted', 'user123')).to.be.true;
        });
    });

    describe('POST /api/rentals/:id/reject', () => {
        it('should reject a rental request', async () => {
            const mockRental = { _id: 'rental123', status: 'rejected' };
            rentalServiceStub.updateRentalStatus.resolves(mockRental);

            const response = await request(app)
                .post('/api/rentals/rental123/reject')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                message: 'Rental request rejected',
                rental: mockRental
            });
            expect(rentalServiceStub.updateRentalStatus.calledWith('rental123', 'rejected', 'user123')).to.be.true;
        });
    });

    describe('PUT /api/rentals/:id', () => {
        it('should update a rental request', async () => {
            const updateData = {
                startDate: '2024-03-10',
                endDate: '2024-03-15'
            };
            const mockRental = { _id: 'rental123', ...updateData };
            rentalServiceStub.updateRental.resolves(mockRental);

            const response = await request(app)
                .put('/api/rentals/rental123')
                .send(updateData)
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                message: 'Rental request updated successfully',
                rental: mockRental
            });
            expect(rentalServiceStub.updateRental.calledWith('rental123', updateData, 'user123')).to.be.true;
        });
    });

    describe('POST /api/rentals/:id/confirm-pickup', () => {
        it('should confirm pickup of an item', async () => {
            const mockRental = { _id: 'rental123', status: 'ongoing' };
            rentalServiceStub.confirmPickup.resolves(mockRental);

            const response = await request(app)
                .post('/api/rentals/rental123/confirm-pickup')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                message: 'Pickup confirmed successfully',
                rental: mockRental
            });
            expect(rentalServiceStub.confirmPickup.calledWith('rental123', 'user123')).to.be.true;
        });
    });

    describe('POST /api/rentals/:id/confirm-return', () => {
        it('should confirm return of an item', async () => {
            const mockRental = { _id: 'rental123', status: 'completed' };
            rentalServiceStub.confirmReturn.resolves(mockRental);

            const response = await request(app)
                .post('/api/rentals/rental123/confirm-return')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                message: 'Return confirmed successfully',
                rental: mockRental
            });
            expect(rentalServiceStub.confirmReturn.calledWith('rental123', 'user123')).to.be.true;
        });
    });

    describe('GET /api/rentals/user-stats/:userId', () => {
        it('should get rental statistics for a user', async () => {
            const rentedItems = [{ _id: '1' }, { _id: '2' }];
            const listedItems = [{ _id: '3' }, { _id: '4' }];
            rentalServiceStub.getUserRequests.resolves(rentedItems);
            rentalServiceStub.getRequestsByStatuses.resolves(listedItems);

            const response = await request(app)
                .get('/api/rentals/user-stats/user123')
                .set('user', { _id: 'user123' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({
                rentedCount: 2,
                listedCount: 2
            });
            expect(rentalServiceStub.getUserRequests.calledWith('user123', ['accepted', 'ongoing', 'completed'])).to.be.true;
            expect(rentalServiceStub.getRequestsByStatuses.calledWith('user123', ['accepted', 'ongoing', 'completed'])).to.be.true;
        });
    });
}); 