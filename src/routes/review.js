import express from 'express';
import { isAuthenticated } from './auth.js';
import { Review } from '../models/Review.js';
import { Rental } from '../models/Rental.js';

const router = express.Router();

// Get all reviews for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const reviews = await Review.find({ userId })
            .populate({
                path: 'rentalId',
                populate: {
                  path: 'itemId'
                }})
            .populate('reviewerId', 'name')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Error fetching user reviews:', error);
        res.status(500).json({ error: error.message });
    }
});


// Create a review for a rental
router.post('/:rentalId', isAuthenticated, async (req, res) => {
    try {
        const { rating, reviewText, role } = req.body;
        const rentalId = req.params.rentalId;
        const reviewerId = req.user._id;

        // Validate rental exists
        const rental = await Rental.findById(rentalId);
        if (!rental) {
            return res.status(404).json({ error: 'Rental not found' });
        }

        // Determine userId based on role
        let userId;
        if (role === 'renter') {
            // If reviewer is owner, they're reviewing the renter
            if (rental.ownerId.toString() !== reviewerId.toString()) {
                return res.status(403).json({ error: 'Only the owner can review the renter' });
            }
            userId = rental.renterId;
        } else if (role === 'owner') {
            // If reviewer is renter, they're reviewing the owner
            if (rental.renterId.toString() !== reviewerId.toString()) {
                return res.status(403).json({ error: 'Only the renter can review the owner' });
            }
            userId = rental.ownerId;
        } else {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            rentalId,
            reviewerId,
            role
        });

        if (existingReview) {
            return res.status(400).json({ error: 'You have already submitted a review for this rental' });
        }

        // Create the review
        const review = new Review({
            rentalId,
            userId,
            reviewerId,
            role,
            rating,
            reviewText
        });

        await review.save();

        // Update the rental's review status
        if (role === 'owner') {
            await Rental.findByIdAndUpdate(rentalId, { renterReviewed: true });
        } else if (role === 'renter') {
            await Rental.findByIdAndUpdate(rentalId, { ownerReviewed: true });
        }

        res.status(201).json({
            message: 'Review submitted successfully',
            review
        });

    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ error: error.message });
    }
});

// export default router;
export const reviewRoutes = router;