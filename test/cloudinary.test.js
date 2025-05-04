import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import sinon from 'sinon';
import { PassThrough } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import uploadRoutes from '../src/routes/cloudinaryUpload.js';

const app = express();
app.use(express.json());
app.use('/api', uploadRoutes);

describe('Cloudinary Upload', () => {
  it('400 if no file uploaded', () =>
    request(app)
      .post('/api/upload-image')
      .expect(400, { error: 'No file uploaded' })
  );

  it('500 on real upload error (missing creds)', async () => {
    const res = await request(app)
      .post('/api/upload-image')
      .attach('image', Buffer.from('x'), 'x.png');
    expect(res.status).to.equal(500);
    expect(res.body).to.have.property('error', 'Failed to upload image');
  });

  it('200 when stubbed upload succeeds', async () => {
    const fake = { secure_url: 'https://cdn.test/1.png' };
    const stub = sinon
      .stub(cloudinary.uploader, 'upload_stream')
      .callsFake((opts, cb) => {
        const stream = new PassThrough();
        process.nextTick(() => cb(null, fake));
        return stream;
      });

    const res = await request(app)
      .post('/api/upload-image')
      .attach('image', Buffer.from('x'), 'x.png');
    expect(res.status).to.equal(200);
    expect(res.body).to.eql({ secure_url: fake.secure_url });

    stub.restore();
  });
});
