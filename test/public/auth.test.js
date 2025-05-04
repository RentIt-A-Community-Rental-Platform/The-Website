// test/public/auth.test.js
import { expect } from 'chai';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sinon from 'sinon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('auth.js frontend behavior', () => {
  let dom, window, document;

  beforeEach(async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <form id="loginForm" class="">
            <input id="loginEmail" />
            <input id="loginPassword" />
          </form>
          <form id="loginFormElement"></form>

          <form id="registerForm" class="hidden">
            <input id="registerName" />
            <input id="registerEmail" />
            <input id="registerPassword" />
          </form>
          <form id="registerFormElement"></form>

          <button id="showRegister">Show Register</button>
          <button id="showLogin">Show Login</button>
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

    global.localStorage = { setItem: () => {} };
    global.sessionStorage = { setItem: () => {} };

    global.fetch = async () => ({
      ok: true,
      json: async () => ({ token: 'test-token', user: { id: 1 } }),
    });

    // Safe override for window.location.href
    delete window.location;
    window.location = {
      set href(value) {
        window.__redirectedTo = value;
      }
    };

    const authPathURL = pathToFileURL(path.resolve(__dirname, '../../public/auth.js'));
    await import(authPathURL.href);
  });

  afterEach(() => {
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.sessionStorage;
    delete global.fetch;
    delete window.location;
  });

  it('should toggle to register form', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    document.getElementById('showRegister').click();

    expect(loginForm.classList.contains('hidden')).to.be.true;
    expect(registerForm.classList.contains('hidden')).to.be.false;
  });

  it('should toggle to login form', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    document.getElementById('showLogin').click();

    expect(registerForm.classList.contains('hidden')).to.be.true;
    expect(loginForm.classList.contains('hidden')).to.be.false;
  });

  it('should submit login form and redirect on success', async () => {
    document.getElementById('loginEmail').value = 'test@example.com';
    document.getElementById('loginPassword').value = 'password123';

    const localStorageSpy = sinon.spy(global.localStorage, 'setItem');
    const sessionStorageSpy = sinon.spy(global.sessionStorage, 'setItem');

    const form = document.getElementById('loginFormElement');
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((res) => setTimeout(res, 10));

    expect(localStorageSpy.calledWith('token', 'test-token')).to.be.true;
    expect(sessionStorageSpy.called).to.be.true;
    expect(window.__redirectedTo).to.equal('list.html');

    localStorageSpy.restore();
    sessionStorageSpy.restore();
  });

  it('should submit register form and redirect on success', async () => {
    document.getElementById('registerName').value = 'Test User';
    document.getElementById('registerEmail').value = 'test@example.com';
    document.getElementById('registerPassword').value = 'password123';

    const localStorageSpy = sinon.spy(global.localStorage, 'setItem');
    const sessionStorageSpy = sinon.spy(global.sessionStorage, 'setItem');

    const form = document.getElementById('registerFormElement');
    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((res) => setTimeout(res, 10));

    expect(localStorageSpy.calledWith('token', 'test-token')).to.be.true;
    expect(sessionStorageSpy.called).to.be.true;
    expect(window.__redirectedTo).to.equal('list.html');

    localStorageSpy.restore();
    sessionStorageSpy.restore();
  });
});
