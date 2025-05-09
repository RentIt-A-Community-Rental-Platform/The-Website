import { expect } from 'chai';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ItemService } from '../../src/services/ItemService.js';
import { Item } from '../../src/models/Item.js';
import { User } from '../../src/models/User.js';
import { Rental } from '../../src/models/Rental.js';

describe('ItemService', () => {
  let mongoServer;
  let itemService;
  let testUser;
  let testItem;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    itemService = new ItemService();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
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
      owner: testUser._id,
      images: ['image1.jpg', 'image2.jpg'],
      location: {
        type: 'Point',
        coordinates: [0, 0]
      }
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Item.deleteMany({});
    await Rental.deleteMany({});
  });

  describe('createItem', () => {
    it('should create an item successfully', async () => {
      const itemData = {
        title: 'New Item',
        description: 'New Description',
        price: 200,
        category: 'Electronics',
        condition: 'Used',
        owner: testUser._id,
        images: ['image3.jpg'],
        location: {
          type: 'Point',
          coordinates: [1, 1]
        }
      };

      const item = await itemService.createItem(itemData);
      expect(item).to.have.property('_id');
      expect(item.title).to.equal(itemData.title);
      expect(item.price).to.equal(itemData.price);
      expect(item.owner.toString()).to.equal(testUser._id.toString());
    });

    it('should throw error for invalid item data', async () => {
      const invalidItemData = {
        title: 'Invalid Item',
        // Missing required fields
      };

      try {
        await itemService.createItem(invalidItemData);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe('getItemById', () => {
    it('should get item by id successfully', async () => {
      const item = await itemService.getItemById(testItem._id);
      expect(item).to.have.property('_id');
      expect(item.title).to.equal(testItem.title);
      expect(item.price).to.equal(testItem.price);
    });

    it('should throw error for non-existent item', async () => {
      try {
        await itemService.getItemById(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Item not found');
      }
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        price: 150
      };

      const updatedItem = await itemService.updateItem(testItem._id, updateData);
      expect(updatedItem.title).to.equal(updateData.title);
      expect(updatedItem.price).to.equal(updateData.price);
    });

    it('should throw error for non-existent item', async () => {
      try {
        await itemService.updateItem(new mongoose.Types.ObjectId(), { title: 'New Title' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Item not found');
      }
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      await itemService.deleteItem(testItem._id);
      const item = await Item.findById(testItem._id);
      expect(item).to.be.null;
    });

    it('should throw error for non-existent item', async () => {
      try {
        await itemService.deleteItem(new mongoose.Types.ObjectId());
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).to.equal('Item not found');
      }
    });
  });

  describe('searchItems', () => {
    beforeEach(async () => {
      await Item.create([
        {
          title: 'Camera',
          description: 'Digital Camera',
          price: 300,
          category: 'Electronics',
          condition: 'New',
          owner: testUser._id,
          location: {
            type: 'Point',
            coordinates: [0, 0]
          }
        },
        {
          title: 'Laptop',
          description: 'Gaming Laptop',
          price: 1000,
          category: 'Electronics',
          condition: 'Used',
          owner: testUser._id,
          location: {
            type: 'Point',
            coordinates: [0, 0]
          }
        }
      ]);
    });

    it('should search items by query', async () => {
      const items = await itemService.searchItems({ query: 'Camera' });
      expect(items).to.have.lengthOf(1);
      expect(items[0].title).to.equal('Camera');
    });

    it('should filter items by category', async () => {
      const items = await itemService.searchItems({ category: 'Electronics' });
      expect(items).to.have.lengthOf(3); // Including testItem
    });

    it('should filter items by price range', async () => {
      const items = await itemService.searchItems({ minPrice: 500, maxPrice: 1500 });
      expect(items).to.have.lengthOf(1);
      expect(items[0].title).to.equal('Laptop');
    });

    it('should filter items by condition', async () => {
      const items = await itemService.searchItems({ condition: 'Used' });
      expect(items).to.have.lengthOf(1);
      expect(items[0].title).to.equal('Laptop');
    });

    it('should search items by location', async () => {
      const items = await itemService.searchItems({
        location: {
          coordinates: [0, 0],
          maxDistance: 1000
        }
      });
      expect(items).to.have.lengthOf(3);
    });
  });

  describe('getItemsByUser', () => {
    beforeEach(async () => {
      await Item.create([
        {
          title: 'Item 1',
          description: 'Description 1',
          price: 100,
          category: 'Electronics',
          condition: 'New',
          owner: testUser._id
        },
        {
          title: 'Item 2',
          description: 'Description 2',
          price: 200,
          category: 'Electronics',
          condition: 'New',
          owner: testUser._id
        }
      ]);
    });

    it('should get all items for a user', async () => {
      const items = await itemService.getItemsByUser(testUser._id);
      expect(items).to.have.lengthOf(3); // Including testItem
      items.forEach(item => {
        expect(item.owner.toString()).to.equal(testUser._id.toString());
      });
    });

    it('should return empty array for user with no items', async () => {
      const newUser = await User.create({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      });
      const items = await itemService.getItemsByUser(newUser._id);
      expect(items).to.be.an('array').that.is.empty;
    });
  });

  describe('getAvailableItems', () => {
    beforeEach(async () => {
      await Rental.create({
        itemId: testItem._id,
        renter: testUser._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-05'),
        status: 'confirmed'
      });
    });

    it('should get available items for a date range', async () => {
      const items = await itemService.getAvailableItems(
        new Date('2024-03-10'),
        new Date('2024-03-15')
      );
      expect(items).to.have.lengthOf(1);
      expect(items[0]._id.toString()).to.equal(testItem._id.toString());
    });

    it('should exclude rented items for overlapping dates', async () => {
      const items = await itemService.getAvailableItems(
        new Date('2024-03-01'),
        new Date('2024-03-05')
      );
      expect(items).to.be.an('array').that.is.empty;
    });
  });
}); 