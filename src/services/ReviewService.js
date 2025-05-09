import { BaseService } from './BaseService.js';
import { Review } from '../models/Review.js';
import { Rental } from '../models/Rental.js';

export class ReviewService extends BaseService {
  constructor() {
    super();
  }

  async createReview(reviewData) {
    try {
      const rental = await Rental.findById(reviewData.rentalId);
      if (!rental) {
        throw new Error('Rental not found');
      }

      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const review = await Review.create(reviewData);
      return review;
    } catch (error) {
      throw error;
    }
  }

  async getReviewsByUser(userId) {
    try {
      const reviews = await Review.find({ reviewerId: userId });
      return reviews;
    } catch (error) {
      throw error;
    }
  }

  async getReviewsForItem(itemId) {
    try {
      const reviews = await Review.find({ itemId });
      return reviews;
    } catch (error) {
      throw error;
    }
  }

  async updateReview(reviewId, updateData) {
    try {
      if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
        throw new Error('Rating must be between 1 and 5');
      }

      const review = await Review.findByIdAndUpdate(reviewId, updateData, { new: true });
      if (!review) {
        throw new Error('Review not found');
      }
      return review;
    } catch (error) {
      throw error;
    }
  }

  async deleteReview(reviewId) {
    try {
      const review = await Review.findByIdAndDelete(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }
      return review;
    } catch (error) {
      throw error;
    }
  }

  async getAverageRating(userId) {
    try {
      const reviews = await Review.find({ revieweeId: userId });
      if (!reviews.length) {
        return 0;
      }
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      return Math.round(totalRating / reviews.length);
    } catch (error) {
      throw error;
    }
  }
} 