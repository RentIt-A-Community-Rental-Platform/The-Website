// Test Helper functions for better test structure

import { User } from '../src/models/User.js';
import { Item } from '../src/models/Item.js';
import { Rental } from '../src/models/Rental.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

/**
 * Creates a test user for authentication testing
 * @param {Object} userData - Custom user data (optional)
 * @returns {Promise<Object>} - User object and auth token
 */
export async function createTestUser(userData = {}) {
  const defaultData = {
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User'
  };
  
  const mergedData = { ...defaultData, ...userData };
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(mergedData.password, 10);
  
  // Create and save the user
  const user = new User({
    email: mergedData.email,
    password: hashedPassword,
    name: mergedData.name,
    googleId: mergedData.googleId
  });
  
  await user.save();
  
  // Create JWT token
  const token = jwt.sign(
    { _id: user._id },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1d' }
  );
  
  return {
    user,
    token,
    rawPassword: mergedData.password // For login testing
  };
}

/**
 * Creates a test item for item testing
 * @param {Object} itemData - Custom item data (optional)
 * @returns {Promise<Object>} - Item object
 */
export async function createTestItem(itemData = {}) {
  // Create an owner if not provided
  if (!itemData.userId) {
    const { user } = await createTestUser();
    itemData.userId = user._id;
    itemData.userName = user.name;
  }
  
  const defaultData = {
    title: `Test Item ${Date.now()}`,
    description: 'This is a test item for testing',
    price: 25.99,
    category: 'Electronics',
    deposit: 10.00,
    photos: ['test-photo1.jpg', 'test-photo2.jpg']
  };
  
  const mergedData = { ...defaultData, ...itemData };
  
  const item = new Item(mergedData);
  await item.save();
  
  return item;
}

/**
 * Creates a test rental for rental testing
 * @param {Object} rentalData - Custom rental data (optional)
 * @returns {Promise<Object>} - Rental object with related user and item
 */
export async function createTestRental(rentalData = {}) {
  // Create owner if not provided
  let owner, renter, item;
  
  if (!rentalData.ownerId) {
    const ownerResult = await createTestUser({ name: 'Owner User' });
    owner = ownerResult.user;
    rentalData.ownerId = owner._id;
  } else {
    owner = await User.findById(rentalData.ownerId);
  }
  
  if (!rentalData.renterId) {
    const renterResult = await createTestUser({ name: 'Renter User' });
    renter = renterResult.user;
    rentalData.renterId = renter._id;
  } else {
    renter = await User.findById(rentalData.renterId);
  }
  
  if (!rentalData.itemId) {
    item = await createTestItem({ userId: owner._id, userName: owner.name });
    rentalData.itemId = item._id;
  } else {
    item = await Item.findById(rentalData.itemId);
  }
  
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7); // 1 week rental
  
  const defaultData = {
    paymentMethod: 'cash',
    meetingDetails: {
      date: '2025-07-15',
      time: '14:00',
      location: 'University Library',
      notes: 'Meet at the entrance'
    },
    rentalPeriod: {
      startDate: startDate,
      endDate: endDate
    },
    status: 'pending',
    totalPrice: calculateTotalPrice(item.price, startDate, endDate, item.deposit),
    chatHistory: []
  };
  
  const mergedData = { ...defaultData, ...rentalData };
  
  const rental = new Rental(mergedData);
  await rental.save();
  
  return { rental, owner, renter, item };
}

/**
 * Helper function to calculate total price
 * @param {Number} dailyRate - Daily rental rate
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Number} deposit - Security deposit
 * @returns {Number} - Total price
 */
function calculateTotalPrice(dailyRate, startDate, endDate, deposit) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return (days * dailyRate) + deposit;
}

/**
 * Cleans up test data from the database
 * @returns {Promise<void>}
 */
export async function cleanupTestData() {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await Item.deleteMany({});
    await Rental.deleteMany({});
  }
}