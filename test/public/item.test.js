// test/public/item.test.js
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sinon from 'sinon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('item.js frontend behavior', () => {
  let dom, window, document;

  beforeEach(async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <button id="rentNowBtn">Rent Now</button>
        </body>
      </html>
    `;

    dom = new JSDOM(html, {
      url: 'http://localhost/item.html?id=123',
      runScripts: 'dangerously',
      resources: 'usable',
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;
    global.localStorage = { getItem: () => 'token' };
    global.sessionStorage = { getItem: () => null };

    global.fetch = async (url, opts) => {
      if (url.endsWith('/auth/me')) {
        return {
          ok: true,
          json: async () => ({ user: { _id: 'user123' } })
        };
      }
      if (url.endsWith('/rentals')) {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: false, json: async () => ({ error: 'fail' }) };
    };

    // Simulate a rental period function
    window.getRentalPeriod = () => ({ startDate: '2025-06-01', endDate: '2025-06-07' });

    const itemPathURL = pathToFileURL(path.resolve(__dirname, '../../public/item.js'));
    await import(itemPathURL.href);

    // Trigger DOMContentLoaded manually
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
  });

  afterEach(() => {
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.sessionStorage;
    delete global.fetch;
  });

  it('should create and display the payment modal on button click', () => {
    const btn = document.getElementById('rentNowBtn');
    btn.click();
    const modal = document.getElementById('paymentModal');
    expect(modal).to.exist;
    expect(modal.innerHTML).to.include('Payment Options');
  });

  it('should transition to meeting modal when continuing from payment modal', () => {
    document.getElementById('rentNowBtn').click();
    document.getElementById('continueToMeetingBtn').click();
    const modal = document.getElementById('meetingModal');
    expect(modal).to.exist;
    expect(modal.innerHTML).to.include('Meeting Details');
  });

  it('should show success modal on successful rental submission', async () => {
    document.getElementById('rentNowBtn').click();
    document.getElementById('continueToMeetingBtn').click();

    // Fill in meeting form fields
    document.getElementById('meetingDate').value = '2025-06-02';
    document.getElementById('meetingTime').value = '14:00';
    document.getElementById('meetingLocation').value = 'Library';
    document.getElementById('meetingNotes').value = 'See you there';

    const form = document.getElementById('meetingForm');
    form.dispatchEvent(new window.Event('submit'));

    // Wait for async actions
    await new Promise((r) => setTimeout(r, 20));

    const successModal = document.getElementById('successModal');
    expect(successModal).to.exist;
    expect(successModal.innerHTML).to.include('Request Sent!');
  });
});
