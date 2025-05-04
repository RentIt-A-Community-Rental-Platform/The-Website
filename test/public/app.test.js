// test/public/app.test.js
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sinon from 'sinon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('app.js frontend behavior', () => {
  let dom, window, document;

  beforeEach(async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <input type="text" />
          <input type="date" id="startDate" />
          <input type="date" id="endDate" />
          <button>Search</button>

          <form id="loginForm">
            <input id="loginEmail" />
            <input id="loginPassword" />
          </form>
          <form id="registerForm">
            <input id="registerName" />
            <input id="registerEmail" />
            <input id="registerPassword" />
          </form>
          <form id="itemForm">
            <input id="title" />
            <input id="description" />
            <input id="price" />
          </form>

          <div id="itemsList"></div>
          <div id="featuredItems"></div>
          <div id="userInfo" class="hidden"></div>
          <img id="userPicture" />
          <span id="userName"></span>
          <span id="userEmail"></span>
          <div id="authForms"></div>
          <div class="flex items-center space-x-4"></div>
        </body>
      </html>
    `;

    dom = new JSDOM(html, {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;

    global.localStorage = {
      setItem: sinon.spy(),
      getItem: () => 'token',
      removeItem: sinon.spy(),
    };
    global.sessionStorage = {
      setItem: sinon.spy(),
    };

    global.fetch = async (url, opts) => {
      if (url.includes('/items')) {
        return {
          ok: true,
          json: async () => [{
            title: 'Test Item',
            description: 'Desc',
            price: 100,
            userId: { name: 'ItemUser' },
          }],
        };
      }
      if (url.includes('/auth/me')) {
        return {
          json: async () => ({ user: { name: 'AuthUser' } }),
        };
      }
      return {
        ok: true,
        json: async () => ({ token: 'test-token', user: { name: 'TestUser', email: 'test@example.com' } }),
      };
    };

    const appPathURL = pathToFileURL(path.resolve(__dirname, '../../public/app.js'));
    await import(appPathURL.href);
  });

  afterEach(() => {
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.sessionStorage;
    delete global.fetch;
  });

  it('should load featured items and render them', async () => {
    const container = document.getElementById('featuredItems');
    await new Promise((res) => setTimeout(res, 10));
    expect(container.innerHTML).to.include('Test Item');
    expect(container.innerHTML).to.include('Desc');
    expect(container.innerHTML).to.include('$100');
  });

  it('should check auth and update DOM', async () => {
    const authDiv = document.querySelector('.flex.items-center.space-x-4');
    await new Promise((res) => setTimeout(res, 10));
    expect(authDiv.innerHTML).to.include('AuthUser');
    expect(authDiv.innerHTML).to.include('Logout');
  });
});
