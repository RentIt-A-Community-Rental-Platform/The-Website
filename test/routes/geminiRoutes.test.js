import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import express from 'express';
import geminiRoutes from '../../src/routes/geminiRoutes.js';
import { GeminiService } from '../../src/services/GeminiService.js';

describe('Gemini Routes', () => {
    let app;
    let geminiServiceStub;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/gemini', geminiRoutes);
        
        // Create a stub for GeminiService
        geminiServiceStub = sinon.stub(GeminiService.prototype, 'analyzeImageFromBase64');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('POST /api/gemini/analyze', () => {
        it('should successfully analyze a valid base64 image', async () => {
            const mockResult = { description: 'A test image' };
            geminiServiceStub.resolves(mockResult);

            const response = await request(app)
                .post('/api/gemini/analyze')
                .send({ base64Image: 'valid-base64-string' });

            expect(response.status).to.equal(200);
            expect(response.body).to.deep.equal(mockResult);
            expect(geminiServiceStub.calledOnce).to.be.true;
        });

        it('should return 400 when no image is provided', async () => {
            const response = await request(app)
                .post('/api/gemini/analyze')
                .send({});

            expect(response.status).to.equal(400);
            expect(response.body).to.deep.equal({ error: 'Missing base64 image' });
            expect(geminiServiceStub.called).to.be.false;
        });

        it('should handle service errors gracefully', async () => {
            const errorMessage = 'Service error';
            geminiServiceStub.rejects(new Error(errorMessage));

            const response = await request(app)
                .post('/api/gemini/analyze')
                .send({ base64Image: 'valid-base64-string' });

            expect(response.status).to.equal(500);
            expect(response.body).to.deep.equal({ error: errorMessage });
            expect(geminiServiceStub.calledOnce).to.be.true;
        });
    });
}); 