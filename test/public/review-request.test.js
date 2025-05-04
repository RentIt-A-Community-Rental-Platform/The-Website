// test/public/review-request.test.js
import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import path from 'path';

describe('review-request.js behavior', () => {
  let dom, window, document, sandbox;
  const scriptURL = `file://${path.join(process.cwd(), 'public', 'review-request.js')}`;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    dom = new JSDOM(
      `<!DOCTYPE html>
       <html>
         <body>
           <div id="requestsList"></div>
           <div id="requestDetails"></div>
           <div id="modifyFormContainer"></div>
         </body>
       </html>`,
      {
        url: 'http://localhost/',
        runScripts: 'dangerously',
        resources: 'usable'
      }
    );

    window = dom.window;
    document = window.document;

    // stub storage
    window.localStorage = { getItem: () => 'fake-token' };
    window.sessionStorage = { getItem: () => null };

    // stub only the pending‐requests endpoint
    sandbox.stub(window, 'fetch')
      .withArgs(sinon.match(/\/rentals\/pending/))
      .resolves({
        ok: true,
        json: () => Promise.resolve([
          {
            _id: 'req123',
            itemId: { title: 'Laptop', photos: [] },
            renterId: { name: 'User1', avatar: '' },
            rentalPeriod: { startDate: '2025-05-01', endDate: '2025-05-03' },
            meetingDetails: {
              location: 'Library',
              date: '2025-05-01',
              time: '14:00',
              notes: 'Bring ID'
            },
            totalPrice: 50,
            chatHistory: []
          }
        ])
      });

    // inject and run the real script
    const script = document.createElement('script');
    script.src = scriptURL;
    document.body.appendChild(script);
  });

  afterEach(() => {
    sandbox.restore();
    dom.window.close();
  });

  it('fetches and renders rental requests on page load', async () => {
    // wait for window.onload to fire and finish
    await new Promise(r => setTimeout(r, 0));

    const list = document.getElementById('requestsList');
    expect(list.children).to.have.lengthOf(1);
    expect(list.textContent).to.include('Laptop');
    expect(list.textContent).to.include('User1');
  });

  it('shows request details when an entry is clicked', async () => {
    await new Promise(r => setTimeout(r, 0));

    // click the first card
    const card = document.getElementById('requestsList').firstElementChild;
    card.click();

    const details = document.getElementById('requestDetails').innerHTML;
    expect(details).to.include('Rental Interval');
    expect(details).to.include('Meeting Place');
    expect(details).to.include('Library');
  });
});
