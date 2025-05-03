import express from 'express';
import { Rental } from '../models/Rental.js';
import { Item } from '../models/Item.js';
import { User } from '../models/User.js';
import { isAuthenticated } from '../routes/auth.js';

const router = express.Router();

// Create a new rental request
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const {
            itemId,
            paymentMethod,
            meetingDate,
            meetingTime,
            meetingLocation,
            notes,
            startDate,
            endDate
        } = req.body;


        
        // Get the item to check if it exists and get the owner
        const item = await Item.findById(itemId);

        console.log(item,"HEHEHE");
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Create the rental request
        const rental = new Rental({
            itemId,
            renterId: req.user._id,
            ownerId: item.userId,
            paymentMethod,
            meetingDetails: {
                date: meetingDate,
                time: meetingTime,
                location: meetingLocation,
                notes
            },
            rentalPeriod: {
                startDate,
                endDate
            },
            status: 'pending',
            totalPrice: calculateTotalPrice(item.price, startDate, endDate, item.deposit)
        });
        
        await rental.save();
        
        // TODO: Send notification to the owner
        // This would typically be implemented with WebSockets, push notifications,
        // or email notifications depending on your application's requirements
        
        res.status(201).json({ 
            message: 'Rental request created successfully',
            rental
        });
        
    } catch (error) {
        console.error('Error creating rental request:', error);
        res.status(500).json({ error: 'Failed to create rental request' });
    }
});

// Helper function to calculate total price
function calculateTotalPrice(dailyRate, startDate, endDate, deposit) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return (days * dailyRate) + deposit;
}

// Get all pending rental requests for the current user (as owner)
router.get('/pending', isAuthenticated, async (req, res) => {
    try {
        const pendingRequests = await Rental.find({ ownerId: req.user._id, status: 'pending' })
            .populate('itemId')
            .populate('renterId');

        res.json(pendingRequests);
    } catch (error) {
        console.error('Error fetching pending rental requests:', error);
        res.status(500).json({ error: 'Failed to fetch pending rental requests' });
    }
});

// Accept a rental request
router.post('/:id/accept', isAuthenticated, async (req, res) => {
    try {
        const rental = await Rental.findOneAndUpdate(
            { _id: req.params.id, ownerId: req.user._id, status: 'pending' },
            { status: 'accepted' },
            { new: true }
        );
        if (!rental) {
            return res.status(404).json({ error: 'Rental request not found or already processed' });
        }
        res.json({ message: 'Rental request accepted', rental });
    } catch (error) {
        console.error('Error accepting rental request:', error);
        res.status(500).json({ error: 'Failed to accept rental request' });
    }
});

// Reject a rental request
router.post('/:id/reject', isAuthenticated, async (req, res) => {
    try {
        const rental = await Rental.findOneAndUpdate(
            { _id: req.params.id, ownerId: req.user._id, status: 'pending' },
            { status: 'rejected' },
            { new: true }
        );
        if (!rental) {
            return res.status(404).json({ error: 'Rental request not found or already processed' });
        }
        res.json({ message: 'Rental request rejected', rental });
    } catch (error) {
        console.error('Error rejecting rental request:', error);
        res.status(500).json({ error: 'Failed to reject rental request' });
    }
});

export const rentalRoutes = router;