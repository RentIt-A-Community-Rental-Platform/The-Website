import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import path from 'path';
import fs from 'fs';

describe('list.js frontend behavior', () => {
  let jsdom, window, document, sandbox, navigations;

  beforeEach(async () => {
    // Reset navigation tracking
    navigations = [];
    
    // Create a basic DOM structure
    jsdom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Item Listing</title>
        </head>
        <body>
          <form id="itemForm"></form>
          <div id="itemsList"></div>
          <button id="logoutBtn"></button>
        </body>
      </html>
    `, { 
      url: 'http://localhost/list.html',
      runScripts: 'dangerously',
      resources: 'usable',
      pretendToBeVisual: true
    });
    
    // Set up globals
    global.window = jsdom.window;
    global.document = jsdom.window.document;
    
    // Create localStorage mock
    global.localStorage = {
      _data: {},
      getItem: function(key) {
        return this._data[key] || null;
      },
      setItem: function(key, value) {
        this._data[key] = value;
      },
      removeItem: function(key) {
        delete this._data[key];
      },
      clear: function() {
        this._data = {};
      }
    };
    
    // Create a sandbox for sinon stubs
    sandbox = sinon.createSandbox();
    
    // Mock fetch before we load the script
    global.fetch = sandbox.stub();
    global.fetch.resolves({
      ok: true,
      json: () => Promise.resolve([])
    });
    
    // Create a proper location mock that actually works with JSDOM
    // Store navigation changes instead of actually navigating
    const originalHref = jsdom.window.location.href;
    Object.defineProperty(jsdom.window, 'location', {
      value: {
        href: originalHref,
        toString: () => originalHref,
        replace: function(url) {
          navigations.push(url);
        },
        assign: function(url) {
          navigations.push(url);
        }
      },
      writable: true
    });
  });
  
  afterEach(() => {
    sandbox.restore();
    delete global.window;
    delete global.document;
    delete global.localStorage;
    delete global.fetch;
  });

  it('redirects to auth.html if no token is found', async () => {
    // Ensure localStorage has no token
    global.localStorage.removeItem('token');
    
    // Now load the module
    const listJsContent = fs.readFileSync(path.resolve(process.cwd(), 'public/list.js'), 'utf8');
    const scriptElement = jsdom.window.document.createElement('script');
    scriptElement.textContent = listJsContent;
    jsdom.window.document.head.appendChild(scriptElement);
    
    // Wait for any promises to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Check if navigation was triggered
    expect(navigations.includes('auth.html')).to.be.true;
  });
  
  it('does not redirect if token exists', async () => {
    // Set a mock token
    global.localStorage.setItem('token', 'fake-token-12345');
    
    // Set up fetch to return empty array
    global.fetch.resolves({
      ok: true,
      json: () => Promise.resolve([])
    });
    
    // Load the script
    const listJsContent = fs.readFileSync(path.resolve(process.cwd(), 'public/list.js'), 'utf8');
    const scriptElement = jsdom.window.document.createElement('script');
    scriptElement.textContent = listJsContent;
    jsdom.window.document.head.appendChild(scriptElement);
    
    // Wait for any promises to resolve
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Check that no redirect happened
    expect(navigations.includes('auth.html')).to.be.false;
  });

  it('loads and renders items', async () => {
    // Set a mock token
    global.localStorage.setItem('token', 'fake-token-12345');
    
    // Mock fetch to return sample items
    global.fetch.resolves({
      ok: true,
      json: () => Promise.resolve([
        { 
          _id: '123', 
          title: 'Test Item', 
          description: 'This is a test item', 
          price: 99.99,
          userId: { name: 'Test User' }
        }
      ])
    });
    
    // Load the script
    const listJsContent = fs.readFileSync(path.resolve(process.cwd(), 'public/list.js'), 'utf8');
    const scriptElement = jsdom.window.document.createElement('script');
    scriptElement.textContent = listJsContent;
    jsdom.window.document.head.appendChild(scriptElement);
    
    // Wait for promises and DOM updates
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Check the content of the items list
    const itemsListHtml = document.getElementById('itemsList').innerHTML;
    expect(itemsListHtml).to.include('Test Item');
    expect(itemsListHtml).to.include('This is a test item');
    expect(itemsListHtml).to.include('99.99');
    expect(itemsListHtml).to.include('Test User');
    
    // Verify fetch was called with the correct URL
    expect(global.fetch.calledOnce).to.be.true;
    expect(global.fetch.firstCall.args[0]).to.include('/items');
  });
});