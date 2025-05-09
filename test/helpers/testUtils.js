import { User } from '../../src/models/User.js';
import { Item } from '../../src/models/Item.js';
import { Rental } from '../../src/models/Rental.js';
import jwt from 'jsonwebtoken';

export const createTestUser = async (userData = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  };
  const user = new User({ ...defaultUser, ...userData });
  return await user.save();
};

export const createTestItem = async (itemData = {}, userId) => {
  const defaultItem = {
    title: 'Test Item',
    description: 'Test Description',
    price: 10.99,
    category: 'Electronics',
    deposit: 50,
    userId: userId || 'testUserId123',
    userName: 'Test User',
    photos: ['photo1.jpg']
  };
  const item = new Item({ ...defaultItem, ...itemData });
  return await item.save();
};

export const createTestRental = async (rentalData = {}, itemId, renterId, ownerId) => {
  const defaultRental = {
    itemId,
    renterId,
    ownerId,
    paymentMethod: 'cash',
    meetingDetails: {
      date: '2024-03-20',
      time: '14:00',
      location: 'Test Location'
    },
    rentalPeriod: {
      startDate: new Date('2024-03-20'),
      endDate: new Date('2024-03-25')
    },
    totalPrice: 54.95
  };
  const rental = new Rental({ ...defaultRental, ...rentalData });
  return await rental.save();
};

export const generateTestToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const setupTestAuth = async () => {
  const user = await createTestUser();
  const token = generateTestToken(user);
  return { user, token };
}; 