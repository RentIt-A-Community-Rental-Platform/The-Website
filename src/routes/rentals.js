import express from 'express';
import { isAuthenticated } from '../routes/auth.js';
import { RentalService } from '../services/RentalService.js';

const router = express.Router();
const rentalService = new RentalService();

// Create a new rental request
router.post('/', isAuthenticated, async (req, res) => {
    try {
        console.log('passing body',req.body);

        const rental = await rentalService.createRentalRequest(req.body, req.user._id);
        res.status(201).json({
            message: 'Rental request created successfully',
            rental
        });
    } catch (error) {
        console.error('Error creating rental request:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get pending rental requests
router.get('/pending', isAuthenticated, async (req, res) => {
    try {
        const requests = await rentalService.getPendingRequests(req.user._id);
        res.json(requests);
    } catch (error) {
        console.error('Error fetching pending rental requests:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all rental requests for the current user (as owner)
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const allRequests = await rentalService.getAllRequests(req.user._id);
        res.json(allRequests);
    } catch (error) {
        console.error('Error fetching rental requests:', error);
        res.status(500).json({ error: 'Failed to fetch rental requests' });
    }
});

// Get all rental requests where the user is the sender (renter)
router.get('/my-requests', isAuthenticated, async (req, res) => {
    try {
        const myRequests = await rentalService.getUserRequests(req.user._id);
        res.json(myRequests);
    } catch (error) {
        console.error('Error fetching my rental requests:', error);
        res.status(500).json({ error: 'Failed to fetch my rental requests' });
    }
});

// Accept a rental request
router.post('/:id/accept', isAuthenticated, async (req, res) => {
    try {
        const rental = await rentalService.updateRentalStatus(req.params.id, 'accepted', req.user._id);
        res.json({ message: 'Rental request accepted', rental });
    } catch (error) {
        console.error('Error accepting rental request:', error);
        res.status(500).json({ error: 'Failed to accept rental request' });
    }
});

// Reject a rental request
router.post('/:id/reject', isAuthenticated, async (req, res) => {
    try {
        const rental = await rentalService.updateRentalStatus(req.params.id, 'rejected', req.user._id);
        res.json({ message: 'Rental request rejected', rental });
    } catch (error) {
        console.error('Error rejecting rental request:', error);
        res.status(500).json({ error: 'Failed to reject rental request' });
    }
});

// Update a rental request
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const rental = await rentalService.updateRental(req.params.id, req.body, req.user._id);
        res.json({
            message: 'Rental request updated successfully',
            rental
        });
    } catch (error) {
        console.error('Error updating rental request:', error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm pickup of an item
router.post('/:id/confirm-pickup', isAuthenticated, async (req, res) => {
    try {
        const rental = await rentalService.confirmPickup(req.params.id, req.user._id);
        res.json({ message: 'Pickup confirmed successfully', rental });
    } catch (error) {
        console.error('Error confirming pickup:', error);
        res.status(500).json({ error: error.message });
    }
});

// Confirm return of an item
router.post('/:id/confirm-return', isAuthenticated, async (req, res) => {
    try {
        const rental = await rentalService.confirmReturn(req.params.id, req.user._id);
        res.json({ message: 'Return confirmed successfully', rental });
    } catch (error) {
        console.error('Error confirming return:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
export const rentalRoutes = router;