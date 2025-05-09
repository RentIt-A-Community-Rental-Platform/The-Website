import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ReviewService } from '../../src/services/ReviewService.js';
import { Review } from '../../src/models/Review.js';
import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';
import { Rental } from '../../src/models/Rental.js';

describe('ReviewService', () => {
  let mongoServer;
  let reviewService;
  let testUser;
  let testItem;
  let testRental;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    reviewService = new ReviewService();
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      mongoose.connection.collections.users?.deleteMany({}),
      mongoose.connection.collections.items?.deleteMany({}),
      mongoose.connection.collections.rentals?.deleteMany({}),
      mongoose.connection.collections.reviews?.deleteMany({})
    ]);

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
        rating: 5,
        comment: 'Great experience!',
        rentalId: testRental._id,
        reviewerId: testUser._id,
        revieweeId: testItem.owner
      };

      const review = await reviewService.createReview(reviewData);
      expect(review).to.have.property('_id');
      expect(review.rating).to.equal(reviewData.rating);
      expect(review.comment).to.equal(reviewData.comment);
      expect(review.rentalId.toString()).to.equal(testRental._id.toString());
    });

    it('should throw error for invalid rating', async () => {
      const reviewData = {
        rating: 6, // Invalid rating
        comment: 'Great experience!',
        rentalId: testRental._id,
        reviewerId: testUser._id,
        revieweeId: testItem.owner
      };

      try {
        await reviewService.createReview(reviewData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Rating must be between 1 and 5');
      }
    });

    it('should throw error for non-existent rental', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Great experience!',
        rentalId: new mongoose.Types.ObjectId(),
        reviewerId: testUser._id,
        revieweeId: testItem.owner
      };

      try {
        await reviewService.createReview(reviewData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Rental not found');
      }
    });
  });

  describe('getReviewsByUser', () => {
    beforeEach(async () => {
      await Review.create([
        {
          rating: 5,
          comment: 'Great experience!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        },
        {
          rating: 4,
          comment: 'Good experience!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        }
      ]);
    });

    it('should get all reviews for a user', async () => {
      const reviews = await reviewService.getReviewsByUser(testUser._id);
      expect(reviews).to.have.lengthOf(2);
      reviews.forEach(review => {
        expect(review.reviewerId.toString()).to.equal(testUser._id.toString());
      });
    });

    it('should return empty array for user with no reviews', async () => {
      const newUser = await User.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      });
      const reviews = await reviewService.getReviewsByUser(newUser._id);
      expect(reviews).to.be.an('array').that.is.empty;
    });
  });

  describe('getReviewsForItem', () => {
    beforeEach(async () => {
      await Review.create([
        {
          rating: 5,
          comment: 'Great item!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        },
        {
          rating: 4,
          comment: 'Good item!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        }
      ]);
    });

    it('should get all reviews for an item', async () => {
      const reviews = await reviewService.getReviewsForItem(testItem._id);
      expect(reviews).to.have.lengthOf(2);
      reviews.forEach(review => {
        expect(review.rentalId.toString()).to.equal(testRental._id.toString());
      });
    });

    it('should return empty array for item with no reviews', async () => {
      const newItem = await Item.create({
        title: 'New Item',
        description: 'New Description',
        price: 200,
        category: 'Electronics',
        condition: 'New',
        owner: testUser._id
      });
      const reviews = await reviewService.getReviewsForItem(newItem._id);
      expect(reviews).to.be.an('array').that.is.empty;
    });
  });

  describe('updateReview', () => {
    let review;

    beforeEach(async () => {
      review = await Review.create({
        rating: 5,
        comment: 'Great experience!',
        rentalId: testRental._id,
        reviewerId: testUser._id,
        revieweeId: testItem.owner
      });
    });

    it('should update review successfully', async () => {
      const updateData = {
        rating: 4,
        comment: 'Updated comment'
      };

      const updatedReview = await reviewService.updateReview(review._id, updateData);
      expect(updatedReview.rating).to.equal(updateData.rating);
      expect(updatedReview.comment).to.equal(updateData.comment);
    });

    it('should throw error for non-existent review', async () => {
      try {
        await reviewService.updateReview(new mongoose.Types.ObjectId(), { rating: 4 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Review not found');
      }
    });

    it('should throw error for invalid rating update', async () => {
      try {
        await reviewService.updateReview(review._id, { rating: 6 });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.include('Rating must be between 1 and 5');
      }
    });
  });

  describe('deleteReview', () => {
    let review;

    beforeEach(async () => {
      review = await Review.create({
        rating: 5,
        comment: 'Great experience!',
        rentalId: testRental._id,
        reviewerId: testUser._id,
        revieweeId: testItem.owner
      });
    });

    it('should delete review successfully', async () => {
      await reviewService.deleteReview(review._id);
      const deletedReview = await Review.findById(review._id);
      expect(deletedReview).to.be.null;
    });

    it('should throw error for non-existent review', async () => {
      try {
        await reviewService.deleteReview(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Review not found');
      }
    });
  });

  describe('getAverageRating', () => {
    beforeEach(async () => {
      await Review.create([
        {
          rating: 5,
          comment: 'Great experience!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        },
        {
          rating: 4,
          comment: 'Good experience!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        },
        {
          rating: 3,
          comment: 'Average experience!',
          rentalId: testRental._id,
          reviewerId: testUser._id,
          revieweeId: testItem.owner
        }
      ]);
    });

    it('should calculate average rating correctly', async () => {
      const averageRating = await reviewService.getAverageRating(testItem.owner);
      expect(averageRating).to.equal(4); // (5 + 4 + 3) / 3 = 4
    });

    it('should return 0 for user with no reviews', async () => {
      const newUser = await User.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      });
      const averageRating = await reviewService.getAverageRating(newUser._id);
      expect(averageRating).to.equal(0);
    });
  });
}); 