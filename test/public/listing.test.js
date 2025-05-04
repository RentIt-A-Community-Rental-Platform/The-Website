// test/public/listing.test.js

import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';

describe('listing.js behavior', () => {
  let jsdom, window, document, sandbox;

  beforeEach(() => {
    // build a minimal DOM
    jsdom = new JSDOM(
      `<!DOCTYPE html>
      <html>
        <body>
          <form id="itemDetailsForm">
            <input id="title" />
            <input id="description" />
            <input id="price" />
            <input id="deposit" />
            <select id="category">
              <option value="Electronics">Electronics</option>
              <option value="Other">Other</option>
            </select>
          </form>
          <div id="progressBar"></div>
          <div class="step-indicator"></div><div class="step-indicator"></div><div class="step-indicator"></div>
          <div class="step-content"></div><div class="step-content"></div><div class="step-content"></div>
          <button id="prevBtn"></button>
          <button id="nextBtn"></button>
          <button id="submitBtn"></button>
          <div id="reviewCategory"></div>
          <div id="reviewTitle"></div>
          <div id="reviewDescription"></div>
          <div id="reviewPrice"></div>
          <div id="reviewDeposit"></div>
          <div id="reviewPhotos"></div>
          <div id="previewContainer"></div>
          <div id="itemDetailsPreview" class="hidden">
            <img id="itemDetailsImage" />
          </div>
          <input type="file" id="photoInput" />
          <div id="dropZone"></div>
          <div id="aiLoadingOverlay" class="hidden"></div>
          <div id="submitLoadingOverlay" class="hidden"></div>
        </body>
      </html>`,
      { url: 'http://localhost/' }
    );

    window = jsdom.window;
    document = window.document;

    global.window = window;
    global.document = document;
    global.File = window.File;
    global.FileReader = window.FileReader;
    global.localStorage = {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, val) { this._data[key] = val; },
      removeItem(key) { delete this._data[key]; },
      clear() { this._data = {}; }
    };

    sandbox = sinon.createSandbox();
    // default fetch stub for uploads
    global.fetch = sandbox.stub().resolves({
      ok: true,
      json: () => Promise.resolve({ secure_url: 'https://cdn.test/mock.png' })
    });
  });

  afterEach(() => {
    sandbox.restore();
    delete global.window;
    delete global.document;
    delete global.File;
    delete global.FileReader;
    delete global.fetch;
  });

  it('initializes with next button disabled', async () => {
    // run the module setup
    await import('../../public/listing.js');
    expect(document.getElementById('nextBtn').disabled).to.be.true;
  });

  it('enables next button when the form is valid', async () => {
    await import('../../public/listing.js');

    document.getElementById('title').value = 'T';
    document.getElementById('description').value = 'D';
    document.getElementById('price').value = '1';
    document.getElementById('deposit').value = '2';
    document.getElementById('category').value = 'Electronics';

    // trigger the form input listener
    document.getElementById('itemDetailsForm').dispatchEvent(new window.Event('input'));

    expect(document.getElementById('nextBtn').disabled).to.be.false;
  });

  it('correctly populates the review step when going to step 3', async () => {
    // grab goToStep export
    const { goToStep } = await import('../../public/listing.js');

    // simulate filled formData on the module’s internal state
    window.formData = {
      category: 'Electronics',
      title: 'MyTitle',
      description: 'MyDesc',
      price: '42',
      deposit: '7',
      photos: [new window.File([''], 'x.png')]
    };

    goToStep(3);

    expect(document.getElementById('reviewCategory').textContent).to.equal('Electronics');
    expect(document.getElementById('reviewTitle').textContent).to.equal('MyTitle');
    expect(document.getElementById('reviewDescription').textContent).to.equal('MyDesc');
    expect(document.getElementById('reviewPrice').textContent).to.include('42');
    expect(document.getElementById('reviewDeposit').textContent).to.include('7');
  });

  it('fills form fields from Gemini analysis', async () => {
    // re-stub fetch for the AI endpoint
    sandbox.restore();
    sandbox = sinon.createSandbox();
    global.fetch = sandbox.stub().resolves({
      ok: true,
      json: () => Promise.resolve({
        title: 'AI Tit',
        description: 'AI Desc',
        suggestedPrice: 10,
        category: 'Electronics'
      })
    });

    // stub FileReader to immediately fire onload
    sandbox.stub(window.FileReader.prototype, 'readAsDataURL').callsFake(function () {
      this.onload({ target: { result: 'data:image/png;base64,foo' } });
    });

    const { analyzeImageWithGemini } = await import('../../public/listing.js');
    await analyzeImageWithGemini(new window.File([''], 'img.jpg', { type: 'image/jpeg' }));

    expect(document.getElementById('title').value).to.equal('AI Tit');
    expect(document.getElementById('description').value).to.equal('AI Desc');
    expect(document.getElementById('price').value).to.equal('10');
    // deposit = suggestedPrice * 5
    expect(document.getElementById('deposit').value).to.equal('50');
  });

  it('uploadToCloudinary returns the secure_url', async () => {
    const { uploadToCloudinary } = await import('../../public/listing.js');
    const url = await uploadToCloudinary(new window.File([''], 'p.jpg', { type: 'image/jpeg' }));
    expect(url).to.equal('https://cdn.test/mock.png');
  });

  it('submits the final listing payload including photo URLs', async () => {
    sandbox.restore();
    sandbox = sinon.createSandbox();
    const fetchStub = sandbox.stub(global, 'fetch');
    // first call: upload
    fetchStub.onFirstCall().resolves({
      ok: true,
      json: () => Promise.resolve({ secure_url: 'https://cdn.test/x.png' })
    });
    // second call: POST /items
    fetchStub.onSecondCall().resolves({ ok: true, json: () => Promise.resolve({}) });

    // seed the module’s formData
    window.formData = {
      title: 'TX',
      description: 'DX',
      price: '5',
      deposit: '1',
      category: 'Other',
      photos: [new window.File([''], 'a.png')]
    };

    await import('../../public/listing.js');
    // click triggers the submission handler
    document.getElementById('submitBtn').click();
    // let any async .then()s run
    await new Promise(r => setTimeout(r, 0));

    // verify the second fetch is to /items
    const call = fetchStub.getCall(1);
    expect(call.args[0]).to.match(/\/items$/);

    const body = JSON.parse(call.args[1].body);
    expect(body.title).to.equal('TX');
    expect(body.photos[0]).to.equal('https://cdn.test/x.png');
  });
});
