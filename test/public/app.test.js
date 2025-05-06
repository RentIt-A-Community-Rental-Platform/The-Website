import { expect } from 'chai';
import sinon from 'sinon';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe.skip('Public App.js Tests', function() {
  this.timeout(10000); // Increase timeout
  let window, document, fetch, localStorage, sessionStorage, alert;
  
  beforeEach(() => {
    // Set up a DOM environment
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="userInfo" class="hidden">
          <img id="userPicture" src="" alt="User Picture">
          <span id="userName"></span>
          <span id="userEmail"></span>
        </div>
        <div id="authForms">
          <form id="loginForm">
            <input id="loginEmail" type="email">
            <input id="loginPassword" type="password">
            <button type="submit">Login</button>
          </form>
          <form id="registerForm">
            <input id="registerEmail" type="email">
            <input id="registerPassword" type="password">
            <input id="registerName" type="text">
            <button type="submit">Register</button>
          </form>
        </div>
        <form id="itemForm">
          <input id="title" type="text">
          <textarea id="description"></textarea>
          <input id="price" type="number">
          <button type="submit">Add Item</button>
        </form>
        <div id="itemsList"></div>
        <div id="featuredItems"></div>
        <div class="search-container">
          <input type="text" placeholder="Search for items...">
          <button>Search</button>
          <input type="date">
          <input type="date">
        </div>
        <div class="flex items-center space-x-4"></div>
      </body>
      </html>
    `, { url: 'http://localhost/' });
    
    // Set up the global objects
    window = dom.window;
    document = window.document;
    
    // Set up mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: sinon.stub(),
        setItem: sinon.stub(),
        removeItem: sinon.stub()
      },
      writable: true
    });
    
    // Set up mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: sinon.stub(),
        setItem: sinon.stub(),
        removeItem: sinon.stub()
      },
      writable: true
    });
    
    // Set mocks
    localStorage = window.localStorage;
    sessionStorage = window.sessionStorage;
    
    // Mock fetch and alert
    window.fetch = sinon.stub();
    window.alert = sinon.stub();
    
    // Set references
    fetch = window.fetch;
    alert = window.alert;
    window.encodeURIComponent = encodeURIComponent;
    
    // Define global console for the window
    window.console = {
      log: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      info: sinon.stub()
    };
    
    // Load the app.js file
    const appJsPath = path.join(__dirname, '../../public/app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');
    
    // Execute the code in the context of the window
    const scriptElement = document.createElement('script');
    scriptElement.textContent = appJs;
    document.body.appendChild(scriptElement);
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('User Authentication', () => {
    it('should handle successful user registration', async () => {
      // Setup
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';
      
      document.getElementById('registerEmail').value = email;
      document.getElementById('registerPassword').value = password;
      document.getElementById('registerName').value = name;
      
      const responseData = {
        token: 'fake-token',
        user: { email, name, _id: '123' }
      };
      
      const response = {
        ok: true,
        json: sinon.stub().resolves(responseData)
      };
      
      fetch.resolves(response);
      
      // Trigger the form submission
      document.getElementById('registerForm').dispatchEvent(new window.Event('submit'));
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assertions
      expect(fetch.calledOnce).to.be.true;
      expect(fetch.firstCall.args[0]).to.include('/auth/register');
      expect(JSON.parse(fetch.firstCall.args[1].body)).to.deep.equal({ email, password, name });
      expect(localStorage.setItem.calledWith('token', responseData.token)).to.be.true;
      
      // Check if userInfo is displayed
      expect(document.getElementById('userInfo').classList.contains('hidden')).to.be.false;
      expect(document.getElementById('userName').textContent).to.equal(name);
      expect(document.getElementById('userEmail').textContent).to.equal(email);
    });
    
    it('should handle successful user login', async () => {
      // Setup
      const email = 'test@example.com';
      const password = 'password123';
      
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = password;
      
      const responseData = {
        token: 'fake-token',
        user: { email, name: 'Test User', _id: '123' }
      };
      
      const response = {
        ok: true,
        json: sinon.stub().resolves(responseData)
      };
      
      fetch.resolves(response);
      
      // Trigger the form submission
      document.getElementById('loginForm').dispatchEvent(new window.Event('submit'));
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assertions
      expect(fetch.calledOnce).to.be.true;
      expect(fetch.firstCall.args[0]).to.include('/auth/login');
      expect(JSON.parse(fetch.firstCall.args[1].body)).to.deep.equal({ email, password });
      expect(localStorage.setItem.calledWith('token', responseData.token)).to.be.true;
    });
    
    it('should handle login failure', async () => {
      // Setup
      document.getElementById('loginEmail').value = 'bad@example.com';
      document.getElementById('loginPassword').value = 'wrongpassword';
      
      const responseData = { error: 'Invalid credentials' };
      
      const response = {
        ok: false,
        json: sinon.stub().resolves(responseData)
      };
      
      fetch.resolves(response);
      
      // Trigger the form submission
      document.getElementById('loginForm').dispatchEvent(new window.Event('submit'));
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assertions
      expect(fetch.calledOnce).to.be.true;
      expect(alert.calledWith(responseData.error)).to.be.true;
      expect(localStorage.setItem.called).to.be.false;
    });
  });
  
  describe('Item Management', () => {
    it('should handle successful item creation', async () => {
      // Setup
      localStorage.getItem.returns('fake-token');
      
      document.getElementById('title').value = 'Test Item';
      document.getElementById('description').value = 'This is a test item';
      document.getElementById('price').value = '25';
      
      const responseData = { _id: '123', title: 'Test Item', description: 'This is a test item', price: '25' };
      
      const response = {
        ok: true,
        json: sinon.stub().resolves(responseData)
      };
      
      // First stub is for item creation
      fetch.onFirstCall().resolves(response);
      
      // Second stub is for loadItems
      fetch.onSecondCall().resolves({
        ok: true,
        json: sinon.stub().resolves([responseData])
      });
      
      // Trigger the form submission
      document.getElementById('itemForm').dispatchEvent(new window.Event('submit'));
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Assertions
      expect(fetch.calledOnce).to.be.true;
      expect(fetch.firstCall.args[0]).to.include('/items');
      expect(fetch.firstCall.args[1].headers.Authorization).to.equal('Bearer fake-token');
      
      const requestBody = JSON.parse(fetch.firstCall.args[1].body);
      expect(requestBody).to.deep.equal({
        title: 'Test Item',
        description: 'This is a test item',
        price: '25'
      });
    });
  });
  
  describe('User Interface', () => {
    it('should display user info correctly', () => {
      // Call the displayUserInfo function directly
      const user = {
        name: 'Display Test User',
        email: 'display@example.com',
        picture: 'https://example.com/profile.jpg'
      };
      
      // Get the function from the window context
      window.displayUserInfo(user);
      
      // Check DOM updates
      expect(document.getElementById('userInfo').classList.contains('hidden')).to.be.false;
      expect(document.getElementById('userName').textContent).to.equal(user.name);
      expect(document.getElementById('userEmail').textContent).to.equal(user.email);
      expect(document.getElementById('userPicture').src).to.equal(user.picture);
      expect(document.getElementById('authForms').classList.contains('hidden')).to.be.true;
    });
    
    it('should handle search correctly', () => {
      // Setup
      const searchInput = document.querySelector('input[type="text"]');
      const searchButton = document.querySelector('button');
      const startDateInput = document.querySelector('input[type="date"]:first-of-type');
      const endDateInput = document.querySelector('input[type="date"]:last-of-type');
      
      searchInput.value = 'camera';
      startDateInput.value = '2025-06-01';
      endDateInput.value = '2025-06-15';
      
      // Mock window.location
      window.location = { href: '' };
      
      // Trigger search
      searchButton.click();
      
      // Assertions
      expect(window.location.href).to.equal('/list.html?search=camera&start=2025-06-01&end=2025-06-15');
    });
  });
});