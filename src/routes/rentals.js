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
            endDate,
            chatHistory // <-- Add this line to destructure chatHistory from req.body
        } = req.body;


        
        // Get the item to check if it exists and get the owner
        const item = await Item.findById(itemId);

        console.log(item,"HEHEHE");
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        // Create the rental request
        // When creating the rental, make sure to include chatHistory
        const rental = new Rental({
            itemId,
            paymentMethod,
            meetingDate,
            meetingTime,
            meetingLocation,
            notes,
            startDate,
            endDate,
            chatHistory, // <-- Save chatHistory to the database
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
        const allRequests = await Rental.find({ 
            ownerId: req.user._id, 
            status: { $in: ['pending', 'modified', 'accepted', 'rejected', 'completed','ongoing'] }
        })
        .populate('itemId')
        .populate('renterId');
    
        res.json(allRequests);
    } catch (error) {
        console.error('Error fetching pending rental requests:', error);
        res.status(500).json({ error: 'Failed to fetch pending rental requests' });
    }
});

// Get all rental requests where the user is the sender (renter)
router.get('/my-requests', isAuthenticated, async (req, res) => {
    try {
        const myRequests = await Rental.find({ 
            renterId: req.user._id 
        })
        .populate('itemId')
        .populate('ownerId');
    
        res.json(myRequests);
    } catch (error) {
        console.error('Error fetching my rental requests:', error);
        res.status(500).json({ error: 'Failed to fetch my rental requests' });
    }
});

// Accept a rental request
router.post('/:id/accept', isAuthenticated, async (req, res) => {
    try {
        const rental = await Rental.findOneAndUpdate(
            { _id: req.params.id},
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
            { _id: req.params.id},
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

// Update (modify) a rental request
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        // Allow modification if user is either owner or renter, and status is not accepted/rejected
        const rental = await Rental.findOne({ 
            _id: req.params.id, 
            $or: [
                { ownerId: req.user._id },
                { renterId: req.user._id }
            ],
            status: { $nin: ['accepted', 'rejected'] }
        }).populate('itemId').populate('renterId').populate('ownerId');
        
        if (!rental) {
            return res.status(404).json({ error: 'Rental request not found or not authorized' });
        }

        // Determine who is modifying
        let senderType = '';
        if (String(rental.ownerId._id) === String(req.user._id)) {
            senderType = 'owner';
        } else if (String(rental.renterId._id) === String(req.user._id)) {
            senderType = 'renter';
        } else {
            return res.status(403).json({ error: 'Not authorized to modify this request' });
        }

        // Prepare the new chat message
        const chatMsg = {
            sender: senderType,
            type: 'modify',
            timestamp: new Date(),
            rentalPeriod: req.body.rentalPeriod || rental.rentalPeriod,
            meetingDetails: req.body.meetingDetails || rental.meetingDetails,
            message: req.body.meetingDetails?.notes || ''
        };

        // Append to chatHistory
        rental.chatHistory = rental.chatHistory || [];
        rental.chatHistory.push(chatMsg);

        // Optionally update the main fields for convenience
        if (req.body.rentalPeriod) {
            rental.rentalPeriod = req.body.rentalPeriod;
        }
        if (req.body.meetingDetails) {
            rental.meetingDetails = req.body.meetingDetails;
        }
        rental.status = 'modified';
        
        // Track who last modified the request
        rental.lastModifiedBy = req.user._id;

        await rental.save();
        res.json({ message: 'Rental request modified successfully', rental });
    } catch (error) {
        console.error('Error modifying rental request:', error);
        res.status(500).json({ error: 'Failed to modify rental request' });
    }
});

// Confirm pickup and start rental
router.post('/:rentalId/confirm-pickup', isAuthenticated, async (req, res) => {
    try {
        const { pickupCode } = req.body;
        const rentalId = req.params.rentalId;

        // Validate pickup code format
        if (!pickupCode || pickupCode.length !== 6 || !/^\d+$/.test(pickupCode)) {
            return res.status(400).json({ error: 'Invalid pickup code format. Must be 6 digits.' });
        }

        // Find the rental and verify it's in 'accepted' status
        const rental = await Rental.findById(rentalId)
            .populate('itemId')
            .populate('renterId');

        if (!rental) {
            return res.status(404).json({ error: 'Rental not found' });
        }

        if (rental.status !== 'accepted') {
            return res.status(400).json({ 
                error: 'Cannot confirm pickup. Rental must be in accepted status.' 
            });
        }

        // Verify the authenticated user is the owner
        if (rental.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Unauthorized. Only the owner can confirm pickup.' });
        }

        // For demo purposes, accept any valid 6-digit code
        // In production, you would verify against a stored/generated code

        // Update rental status to ongoing
        rental.status = 'ongoing';
        await rental.save();

        res.json({ 
            message: 'Pickup confirmed successfully. Rental is now ongoing.',
            rental 
        });

    } catch (error) {
        console.error('Error confirming pickup:', error);
        res.status(500).json({ error: 'Failed to confirm pickup' });
    }
});

export default router;
export const rentalRoutes = router;