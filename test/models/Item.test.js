import { expect } from 'chai';
import { Item } from '../../src/models/Item.js';

describe('Item Model Tests', function() {
  this.timeout(10000); // Increase timeout
  it('should create a new item with valid data', async () => {
    const itemData = {
      title: 'Test Item',
      description: 'This is a test item',
      price: 29.99,
      category: 'Electronics',
      deposit: 10.00,
      userId: '123456789',
      userName: 'Test User',
      photos: ['photo1.jpg', 'photo2.jpg']
    };

    const item = new Item(itemData);
    const savedItem = await item.save();

    expect(savedItem).to.have.property('_id');
    expect(savedItem.title).to.equal(itemData.title);
    expect(savedItem.description).to.equal(itemData.description);
    expect(savedItem.price).to.equal(itemData.price);
    expect(savedItem.category).to.equal(itemData.category);
    expect(savedItem.deposit).to.equal(itemData.deposit);
    expect(savedItem.userId).to.equal(itemData.userId);
    expect(savedItem.userName).to.equal(itemData.userName);
    expect(savedItem.photos).to.deep.equal(itemData.photos);
    expect(savedItem.createdAt).to.be.a('date');
  });

  it('should set default values when not provided', async () => {
    // Providing only required fields
    const item = new Item({
      userId: '123456789'
    });
    
    const savedItem = await item.save();

    expect(savedItem).to.have.property('_id');
    expect(savedItem.userId).to.equal('123456789');
    expect(savedItem.userName).to.equal('Unknown User'); // Default userName
    expect(savedItem.createdAt).to.be.a('date');
  });

  it('should not save without required userId', async () => {
    const item = new Item({
      title: 'Invalid Item',
      description: 'This item has no userId'
    });

    try {
      await item.save();
      throw new Error('Should not reach here');
    } catch (error) {
      expect(error).to.exist;
      expect(error.name).to.equal('ValidationError');
    }
  });

  it('should handle price and deposit as numbers', async () => {
    const item = new Item({
      title: 'Number Test',
      userId: '123456789',
      price: '42.50', // String that should be converted to number
      deposit: '15.75' // String that should be converted to number
    });

    const savedItem = await item.save();
    
    // Mongoose should handle type conversion
    expect(savedItem.price).to.be.a('number');
    expect(savedItem.deposit).to.be.a('number');
  });
});