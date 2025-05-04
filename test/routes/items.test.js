// // test/routes/items.test.js
// import 'dotenv/config';
// import mongoose from 'mongoose';
// import { expect } from 'chai';
// import request from 'supertest';
// import jwt from 'jsonwebtoken';
// import app from '../../src/index.js';
// import { User } from '../../src/models/User.js';
// import { Item } from '../../src/models/Item.js';

// describe('Item Routes', () => {
//   let token;
//   let userId;

//   before(async function() {
//     this.timeout(5000);
//     // Clear users and items collections
//     await User.deleteMany({});
//     await Item.deleteMany({});
    
//     // Create a test user
//     const user = await User.create({
//       email: 'item-test@example.com',
//       password: 'password-hash', // We don't need a real hash for this test
//       name: 'Item Tester'
//     });
    
//     userId = user._id;
    
//     // Generate a JWT token for this user
//     token = jwt.sign(
//       { _id: user._id, email: user.email },
//       process.env.JWT_SECRET || 'your-jwt-secret-key',
//       { expiresIn: '1h' }
//     );
//   });
  
//   afterEach(async () => {
//     // Clean up items after each test
//     await Item.deleteMany({});
//   });
  
//   after(async function() {
//     this.timeout(5000);
//     // Clean up users after all tests
//     await User.deleteMany({});
//   });

//   describe('GET /items', () => {
//     it('should return an empty array when no items exist', async () => {
//       const res = await request(app).get('/items');
      
//       expect(res.status).to.equal(200);
//       expect(res.body).to.be.an('array');
//       expect(res.body).to.have.lengthOf(0);
//     });
    
//     it('should return all items when items exist', async () => {
//       // Create test items
//       await Item.create([
//         {
//           title: 'Test Item 1',
//           description: 'Description for test item 1',
//           price: 10.99,
//           category: 'Electronics',
//           condition: 'Good',
//           owner: userId
//         },
//         {
//           title: 'Test Item 2',
//           description: 'Description for test item 2',
//           price: 20.99,
//           category: 'Books',
//           condition: 'Like New',
//           owner: userId
//         }
//       ]);
      
//       const res = await request(app).get('/items');
      
//       expect(res.status).to.equal(200);
//       expect(res.body).to.be.an('array');
//       expect(res.body).to.have.lengthOf(2);
      
//       // Verify item properties
//       const itemTitles = res.body.map(item => item.title);
//       expect(itemTitles).to.include('Test Item 1');
//       expect(itemTitles).to.include('Test Item 2');
//     });
//   });

//   describe('POST /items', () => {
//     it('should reject item creation without authentication', async () => {
//       const itemData = {
//         title: 'Unauthorized Item',
//         description: 'This should not be created',
//         price: 15.99,
//         category: 'Electronics',
//         condition: 'Good'
//       };
      
//       const res = await request(app)
//         .post('/items')
//         .send(itemData);
      
//       expect(res.status).to.equal(401);
//     });
    
//     it('should create an item with valid data and authentication', async () => {
//       const itemData = {
//         title: 'New Test Item',
//         description: 'A brand new test item',
//         price: 25.99,
//         category: 'Electronics',
//         condition: 'Excellent'
//       };
      
//       const res = await request(app)
//         .post('/items')
//         .set('Authorization', `Bearer ${token}`)
//         .send(itemData);
      
//       expect(res.status).to.equal(201);
//       expect(res.body).to.have.property('_id');
//       expect(res.body.title).to.equal(itemData.title);
//       expect(res.body.price).to.equal(itemData.price);
//       expect(res.body.owner.toString()).to.equal(userId.toString());
//     });
//   });
// });