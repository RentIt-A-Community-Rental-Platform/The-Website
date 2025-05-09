import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReviewService } from '../../src/services/ReviewService.js';
import { Review } from '../../src/models/Review.js';
import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';
import { Rental } from '../../src/models/Rental.js';
import { setupTestDB, teardownTestDB, clearCollections } from '../helpers/testUtils.js';

describe('ReviewService', () => {
  let mongoServer;
  let reviewService;
  let testUser;
  let testItem;
  let testRental;

  before(async () => {
    await setupTestDB();
    reviewService = new ReviewService();
  });

  after(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearCollections();

    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });

    testItem = await Item.create({
      title: 'Test Item',
      description: 'Test Description',
      price: 100,
      category: 'Electronics',
      condition: 'New',
      owner: testUser._id
    });

    testRental = await Rental.create({
      itemId: testItem._id,
      renter: testUser._id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-05'),
      status: 'completed',
      totalPrice: 500
    });
  });

  describe('createReview', () => {
    it('should create a review successfully', async () => {
      const reviewData = {
        itemId: testItem._id,
        userId: testUser._id,
        rating: 5,
        comment: 'Great item, exactly as described!',
        title: 'Excellent Experience'
      };

      const review = await reviewService.createReview(reviewData);

      expect(review).to.have.property('_id');
      expect(review).to.have.property('itemId', testItem._id);
      expect(review).to.have.property('userId', testUser._id);
      expect(review).to.have.property('rating', 5);
      expect(review).to.have.property('comment', reviewData.comment);
      expect(review).to.have.property('title', reviewData.title);
    });

    it('should throw error for non-existent item', async () => {
      const reviewData = {
        itemId: new mongoose.Types.ObjectId(),
        userId: testUser._id,
        rating: 5,
        comment: 'Great item!'
      };

      try {
        await reviewService.createReview(reviewData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Item not found');
      }
    });

    it('should throw error for non-existent user', async () => {
      const reviewData = {
        itemId: testItem._id,
        userId: new mongoose.Types.ObjectId(),
        rating: 5,
        comment: 'Great item!'
      };

      try {
        await reviewService.createReview(reviewData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('User not found');
      }
    });

    it('should throw error for invalid rating', async () => {
      const reviewData = {
        itemId: testItem._id,
        userId: testUser._id,
        rating: 6,
        comment: 'Great item!'
      };

      try {
        await reviewService.createReview(reviewData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Rating must be between 1 and 5');
      }
    });
  });

  describe('getItemReviews', () => {
    it('should get all reviews for an item', async () => {
      await Review.create({
        itemId: testItem._id,
        userId: testUser._id,
        rating: 5,
        comment: 'Great item!',
        title: 'Excellent'
      });

      const reviews = await reviewService.getItemReviews(testItem._id);

      expect(reviews).to.be.an('array');
      expect(reviews).to.have.lengthOf(1);
      expect(reviews[0]).to.have.property('rating', 5);
      expect(reviews[0]).to.have.property('comment', 'Great item!');
    });

    it('should return empty array for item with no reviews', async () => {
      const reviews = await reviewService.getItemReviews(testItem._id);
      expect(reviews).to.be.an('array').that.is.empty;
    });
  });

  describe('getUserReviews', () => {
    it('should get all reviews by a user', async () => {
      await Review.create({
        itemId: testItem._id,
        userId: testUser._id,
        rating: 5,
        comment: 'Great item!',
        title: 'Excellent'
      });

      const reviews = await reviewService.getUserReviews(testUser._id);

      expect(reviews).to.be.an('array');
      expect(reviews).to.have.lengthOf(1);
      expect(reviews[0]).to.have.property('rating', 5);
      expect(reviews[0]).to.have.property('comment', 'Great item!');
    });

    it('should return empty array for user with no reviews', async () => {
      const reviews = await reviewService.getUserReviews(testUser._id);
      expect(reviews).to.be.an('array').that.is.empty;
    });
  });

  describe('updateReview', () => {
    it('should update a review successfully', async () => {
      const review = await Review.create({
        itemId: testItem._id,
        userId: testUser._id,
        rating: 5,
        comment: 'Great item!',
        title: 'Excellent'
      });

      const updatedReview = await reviewService.updateReview(review._id, {
        rating: 4,
        comment: 'Updated comment'
      });

      expect(updatedReview).to.have.property('rating', 4);
      expect(updatedReview).to.have.property('comment', 'Updated comment');
    });

    it('should throw error for non-existent review', async () => {
      try {
        await reviewService.updateReview(new mongoose.Types.ObjectId(), {
          rating: 4,
          comment: 'Updated comment'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Review not found');
      }
    });

    it('should throw error for invalid rating', async () => {
      const review = await Review.create({
        itemId: testItem._id,
        userId: testUser._id,
        rating: 5,
        comment: 'Great item!',
        title: 'Excellent'
      });

      try {
        await reviewService.updateReview(review._id, {
          rating: 6,
          comment: 'Updated comment'
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Rating must be between 1 and 5');
      }
    });
  });

  describe('deleteReview', () => {
    it('should delete a review successfully', async () => {
      const review = await Review.create({
        itemId: testItem._id,
        userId: testUser._id,
        rating: 5,
        comment: 'Great item!',
        title: 'Excellent'
      });

      await reviewService.deleteReview(review._id);

      const deletedReview = await Review.findById(review._id);
      expect(deletedReview).to.be.null;
    });

    it('should throw error for non-existent review', async () => {
      try {
        await reviewService.deleteReview(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Review not found');
      }
    });
  });
}); 