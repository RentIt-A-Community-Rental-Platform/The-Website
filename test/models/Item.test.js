import { expect } from 'chai';
import { Item } from '../../src/models/Item.js';

describe('Item Model Test', () => {
  it('should create & save item successfully', async () => {
    const validItem = new Item({
      title: 'Test Item',
      description: 'Test Description',
      price: 10.99,
      category: 'Electronics',
      deposit: 50,
      userId: 'testUserId123',
      userName: 'Test User',
      photos: ['photo1.jpg', 'photo2.jpg']
    });

    const savedItem = await validItem.save();
    
    expect(savedItem._id).to.exist;
    expect(savedItem.title).to.equal('Test Item');
    expect(savedItem.description).to.equal('Test Description');
    expect(savedItem.price).to.equal(10.99);
    expect(savedItem.category).to.equal('Electronics');
    expect(savedItem.deposit).to.equal(50);
    expect(savedItem.userId).to.equal('testUserId123');
    expect(savedItem.userName).to.equal('Test User');
    expect(savedItem.photos).to.have.lengthOf(2);
    expect(savedItem.createdAt).to.exist;
  });

  it('should fail to save item without required fields', async () => {
    const itemWithoutRequiredField = new Item({
      title: 'Test Item',
      description: 'Test Description',
      price: 10.99
    });

    let err;
    try {
      await itemWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).to.exist;
    expect(err.errors.userId).to.exist;
  });

  it('should set default userName if not provided', async () => {
    const itemWithoutUserName = new Item({
      title: 'Test Item',
      description: 'Test Description',
      price: 10.99,
      userId: 'testUserId123'
    });

    const savedItem = await itemWithoutUserName.save();
    expect(savedItem.userName).to.equal('Unknown User');
  });

  it('should handle empty photos array', async () => {
    const itemWithoutPhotos = new Item({
      title: 'Test Item',
      description: 'Test Description',
      price: 10.99,
      userId: 'testUserId123'
    });

    const savedItem = await itemWithoutPhotos.save();
    expect(savedItem.photos).to.be.an('array').that.is.empty;
  });
}); 