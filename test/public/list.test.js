import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';

describe('list.js frontend behavior', () => {
  let jsdom, window, sandbox, navigationCalls;

  beforeEach(() => {
    // Reset navigation tracking
    navigationCalls = [];
    
    jsdom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="itemForm"></form>
          <div id="itemsList"></div>
          <button id="logoutBtn"></button>
        </body>
      </html>
    `, { 
      url: 'http://localhost/',
      runScripts: 'dangerously',
      resources: 'usable'
    });
  
    window = jsdom.window;
    global.window = window;
    global.document = window.document;
    
    // Create a custom localStorage mock
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
  
    sandbox = sinon.createSandbox();
    
    // Store the original location object
    const originalLocation = window.location;
    
    // Delete the location property so we can redefine it
    delete window.location;
    
    // Create a new location object with our custom implementation
    window.location = {
      ...originalLocation,
      href: originalLocation.href,
      replace: function(url) {
        navigationCalls.push(url);
      }
    };
    
    // Mock fetch to prevent actual network requests
    global.fetch = sandbox.stub().resolves({
      json: () => Promise.resolve([]),
      ok: true
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
    // Import the actual list.js module
    await import('../../public/list.js');
    
    // Check if navigation to auth.html occurred
    expect(navigationCalls.includes('auth.html')).to.be.true;
  });
  
  it('does not redirect if token exists', async () => {
    // Set a token in localStorage
    global.localStorage.setItem('token', 'mockToken');
    
    // Import the actual list.js module
    await import('../../public/list.js');
    
    // Verify no redirect happened
    expect(navigationCalls.includes('auth.html')).to.be.false;
  });

  it('loads and renders items', async () => {
    // Set a token in localStorage
    global.localStorage.setItem('token', 'mockToken');
    
    // Configure fetch to return mock data
    global.fetch = sandbox.stub().resolves({
      json: () => Promise.resolve([
        { title: 'Test', description: 'Desc', price: 100, userId: { name: 'User' } }
      ]),
      ok: true
    });

    // Import the actual list.js module
    const listModule = await import('../../public/list.js');
    
    // Call the loadItems function if it's exported
    if (typeof listModule.loadItems === 'function') {
      await listModule.loadItems();
    } else {
      // If not exported, it should have been called automatically on import
      // Give time for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Check if items were rendered
    const html = document.getElementById('itemsList').innerHTML;
    expect(html).to.include('Test');
    expect(html).to.include('Desc');
    expect(html).to.include('100');
    expect(html).to.include('User');
    
    // Verify fetch was called
    expect(global.fetch.called).to.be.true;
  });
});
