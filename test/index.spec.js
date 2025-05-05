// // test/index.spec.js
// import { expect } from 'chai';
// import * as expressModule from 'express';
// import mongoose from 'mongoose';
// import * as passportModule from '../src/config/passport.js';
// import sinon from 'sinon';
// import request from 'supertest';

// describe('src/index.js', () => {
//   let sandbox;
//   let capturedApp;
//   let realExpress;
//   let fakeInit;
//   let fakeSession;

//   before(async () => {
//     sandbox = sinon.createSandbox();

//     // 1) Stub out express() so we can grab the real `app` it constructs:
//     realExpress = expressModule.default;
//     sandbox.stub(expressModule, 'default').callsFake(() => {
//       capturedApp = realExpress();
//       return capturedApp;
//     });

//     // 2) Stub mongoose.connect so it never actually hits your DB:
//     sandbox.stub(mongoose, 'connect').resolves();

//     // 3) Stub passport middleware so you can assert it was used:
//     fakeInit    = () => {};
//     fakeSession = () => {};
//     sandbox.stub(passportModule, 'initialize').returns(fakeInit);
//     sandbox.stub(passportModule, 'session').returns(fakeSession);

//     // 4) Silence console noise:
//     sandbox.stub(console, 'log');
//     sandbox.stub(console, 'error');

//     // 5) Ensure your TEST env is correct so index.js picks up the TEST URI branch
//     process.env.NODE_ENV           = 'test';
//     process.env.MONGODB_TEST_URI   = 'mongodb://localhost/fake-test';
//     process.env.SESSION_SECRET     = 'test-secret';

//     // 6) Now import your entry-point — all of the above stubs will be in effect:
//     await import('../src/index.js');
//   });

//   after(() => {
//     sandbox.restore();
//   });

//   it('creates exactly one express app', () => {
//     expect(capturedApp).to.exist;
//     expect(typeof capturedApp.use).to.equal('function');
//   });

//   it('mounts CORS and body-parsers', () => {
//     const names = capturedApp._router.stack.map(l => l.name);
//     expect(names).to.include('corsMiddleware');
//     expect(names).to.include('jsonParser');
//     expect(names).to.include('urlencodedParser');
//   });

//   it('serves static files from "public" and "uploads"', () => {
//     const statics = capturedApp._router.stack.filter(l => l.name === 'serveStatic');
//     const patterns = statics.map(l => l.regexp.toString());
//     expect(patterns.some(r => /public/.test(r))).to.be.true;
//     expect(patterns.some(r => /\\/uploads/.test(r))).to.be.true;
//   });

//   it('configures session + passport', () => {
//     // express-session middleware is a named function "session"
//     // and passport.initialize()/session() returned our fakes:
//     const handlers = capturedApp._router.stack.map(l => l.handle);
//     expect(handlers).to.include(fakeInit);
//     expect(handlers).to.include(fakeSession);
//     expect(handlers.some(h => h.name === 'session')).to.be.true;
//   });

//   it('mounts the routers for /auth, /items, /rentals, /api (cloudinary) and /api/gemini', () => {
//     const routers = capturedApp._router.stack
//       .filter(l => l.name === 'router')
//       .map(l => l.regexp.toString());

//     expect(routers.some(r => r.includes('\\/auth'))).to.be.true;
//     expect(routers.some(r => r.includes('\\/items'))).to.be.true;
//     expect(routers.some(r => r.includes('\\/rentals'))).to.be.true;
//     expect(routers.some(r => r.includes('^\\/api\\/?$'))).to.be.true;        // cloudinaryUpload mounted at /api
//     expect(routers.some(r => r.includes('\\/api\\/gemini'))).to.be.true;
//   });

//   it('GET  /api → 200 + correct JSON payload', async () => {
//     const res = await request(capturedApp).get('/api');
//     expect(res.status).to.equal(200);
//     expect(res.body).to.have.keys('status','message','timestamp','endpoints');
//     expect(res.body.status).to.equal('success');
//   });

//   it('GET  /dashboard (not authenticated) → redirect to /auth.html', async () => {
//     const res = await request(capturedApp).get('/dashboard');
//     expect(res.status).to.equal(302);
//     expect(res.headers.location).to.equal('/auth.html');
//   });

//   it('404 handler: unknown routes → 404 JSON', async () => {
//     const res = await request(capturedApp).get('/no-such-route');
//     expect(res.status).to.equal(404);
//     expect(res.body).to.deep.equal({
//       error:   'Not Found',
//       message: 'The requested resource does not exist'
//     });
//   });

//   it('500 handler: throwing routes are caught and formatted', async () => {
//     // dynamically add a route that always errors
//     capturedApp.get('/boom', (req, res, next) => next(new Error('boom')));
//     const res = await request(capturedApp).get('/boom');
//     expect(res.status).to.equal(500);
//     expect(res.body).to.include({
//       error:   'Something went wrong!',
//       message: 'boom'
//     });
//     expect(res.body).to.have.property('timestamp');
//   });
// });
