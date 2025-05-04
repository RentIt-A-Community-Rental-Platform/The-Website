// test/public-app.test.js
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { expect } from 'chai';

describe('public/app.js DOM integration', function() {
  let window, document, appJS;

  before(async function() {
    // 1) Load index.html from your public folder
    const html = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
    const dom = new JSDOM(html, {
      url: 'http://localhost/',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
    document = window.document;

    // 2) Provide minimal global fetch for JS to use
    window.fetch = async (url, opts) => {
      // Very simple stub: return 200 JSON for /auth/register and /auth/login
      if (url.endsWith('/auth/register') || url.endsWith('/auth/login')) {
        return {
          ok: true,
          json: async () => ({ token: 'fake-jwt', user: { name: 'X', email: 'x@x' } })
        };
      }
      // Default stub
      return { ok: false, json: async ()=>({ error: 'fail' }) };
    };

    // 3) Expose localStorage/sessionStorage
    window.localStorage = new class {
      constructor(){ this.store = {} }
      getItem(k){ return this.store[k]||null }
      setItem(k,v){ this.store[k]=v }
      removeItem(k){ delete this.store[k] }
    }();
    window.sessionStorage = new class {
      constructor(){ this.store = {} }
      getItem(k){ return this.store[k]||null }
      setItem(k,v){ this.store[k]=v }
      removeItem(k){ delete this.store[k] }
    }();

    // 4) Load /public/app.js into this DOM
    const code = fs.readFileSync(path.resolve(__dirname, '../public/app.js'), 'utf8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = code;
    document.head.appendChild(scriptEl);

    // give jsdom a moment to wire up listeners
    await new Promise(r=>setTimeout(r, 10));
  });

  it('sets today as min on both date inputs, and enforces start→end', () => {
    const [startDate, endDate] = [
      document.querySelector('input[type="date"]:first-of-type'),
      document.querySelector('input[type="date"]:last-of-type')
    ];
    const today = new Date().toISOString().split('T')[0];
    expect(startDate.min).to.equal(today);
    expect(endDate.min).to.equal(today);

    // simulate picking a later start date
    startDate.value = '2100-01-01';
    startDate.dispatchEvent(new window.Event('change'));
    expect(endDate.min).to.equal('2100-01-01');
  });

  it('redirects to list.html with search params on search button click', () => {
    // spy on window.location.href
    let href;
    Object.defineProperty(window.location, 'href', {
      set(v) { href = v; }
    });

    const input = document.querySelector('input[type="text"]');
    const btn   = document.querySelector('button');
    input.value = 'foo';
    document.querySelector('input[type="date"]:first-of-type').value = '2025-01-01';
    document.querySelector('input[type="date"]:last-of-type').value  = '2025-02-02';
    btn.dispatchEvent(new window.Event('click'));

    expect(href).to.include('/list.html?search=foo');
    expect(href).to.include('start=2025-01-01');
    expect(href).to.include('end=2025-02-02');
  });

  it('registerForm submits and shows user info', async () => {
    // expose a dummy displayUserInfo so we can assert it ran
    let displayed = false;
    window.displayUserInfo = ()=> displayed = true;

    const form = document.getElementById('registerForm');
    document.getElementById('registerEmail').value    = 'a@b.com';
    document.getElementById('registerPassword').value = 'pass';
    document.getElementById('registerName').value     = 'Bob';
    form.dispatchEvent(new window.Event('submit'));

    // wait for fetch promise resolution
    await new Promise(r=>setTimeout(r, 20));
    expect(displayed).to.be.true;
    expect(window.localStorage.getItem('token')).to.equal('fake-jwt');
  });

  it('loginForm submits and shows user info', async () => {
    let displayed = false;
    window.displayUserInfo = ()=> displayed = true;

    const form = document.getElementById('loginForm');
    document.getElementById('loginEmail').value    = 'c@d.com';
    document.getElementById('loginPassword').value = 'pw';
    form.dispatchEvent(new window.Event('submit'));

    await new Promise(r=>setTimeout(r, 20));
    expect(displayed).to.be.true;
    expect(window.localStorage.getItem('token')).to.equal('fake-jwt');
  });
});
