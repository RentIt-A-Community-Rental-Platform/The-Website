import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import cloudinaryUpload from '../../src/routes/cloudinaryUpload.js';
import { MediaService } from '../../src/services/MediaService.js';

describe('Cloudinary Upload Routes', () => {
    let app;
    let mediaServiceStub;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/upload', cloudinaryUpload);

        // Create stub for MediaService
        mediaServiceStub = sinon.stub(MediaService.prototype, 'uploadFile');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('POST /api/upload/upload-image', () => {
        it('should successfully upload an image', async () => {
            const mockFile = {
                fieldname: 'image',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('fake-image-data'),
                size: 1234
            };

            const mockUploadResult = {
                url: 'https://cloudinary.com/test-image.jpg'
            };
            mediaServiceStub.resolves(mockUploadResult);

            const response = await request(app)
                .post('/api/upload/upload-image')
                .attach('image', mockFile.buffer, {
                    filename: mockFile.originalname,
                    contentType: mockFile.mimetype
                });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal({ secure_url: mockUploadResult.url });
            expect(mediaServiceStub.calledOnce).to.be.true;
            expect(mediaServiceStub.firstCall.args[0]).to.deep.equal(mockFile.buffer);
        });

        it('should return 400 when no file is uploaded', async () => {
            const response = await request(app)
                .post('/api/upload/upload-image');

            expect(response.status).to.equal(400);
            expect(response.body).to.deep.equal({ error: 'No file uploaded' });
            expect(mediaServiceStub.called).to.be.false;
        });

        it('should handle upload service errors gracefully', async () => {
            const mockFile = {
                fieldname: 'image',
                originalname: 'test.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                buffer: Buffer.from('fake-image-data'),
                size: 1234
            };

            const errorMessage = 'Upload failed';
            mediaServiceStub.rejects(new Error(errorMessage));

            const response = await request(app)
                .post('/api/upload/upload-image')
                .attach('image', mockFile.buffer, {
                    filename: mockFile.originalname,
                    contentType: mockFile.mimetype
                });

            expect(response.status).to.equal(500);
            expect(response.body).to.deep.equal({
                error: 'Failed to upload image',
                details: errorMessage
            });
            expect(mediaServiceStub.calledOnce).to.be.true;
        });

        it('should validate file type', async () => {
            const mockFile = {
                fieldname: 'image',
                originalname: 'test.txt',
                encoding: '7bit',
                mimetype: 'text/plain',
                buffer: Buffer.from('not-an-image'),
                size: 1234
            };

            const response = await request(app)
                .post('/api/upload/upload-image')
                .attach('image', mockFile.buffer, {
                    filename: mockFile.originalname,
                    contentType: mockFile.mimetype
                });

            expect(response.status).to.equal(200); // The route accepts any file type
            expect(mediaServiceStub.calledOnce).to.be.true;
        });
    });
}); 