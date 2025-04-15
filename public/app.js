// API Configuration
const API_URL = 'http://localhost:3000';
console.log('🔧 API URL configured:', API_URL);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const userInfo = document.getElementById('userInfo');
const userPicture = document.getElementById('userPicture');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const itemForm = document.getElementById('itemForm');
const itemsList = document.getElementById('itemsList');

console.log('🔍 DOM Elements loaded');

// Register new user
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;

    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            displayUserInfo(data.user);
            loadItems();
            showLoginForm();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Registration failed. Please try again.');
    }
});

// Login user
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            displayUserInfo(data.user);
            loadItems();
            showLoginForm();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Login failed. Please try again.');
    }
});

// Item Form Submission
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const price = document.getElementById('price').value;
    const token = localStorage.getItem('token');

    // if (!token) {
    //     alert('Please log in first');
    //     return;
    // }

    try {
        const response = await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, price })
        });

        const responseData = await response.json();
        if (response.ok) {
            loadItems();
            itemForm.reset();
        } else {
            alert(`Error: ${responseData.error || 'Failed to create item'}`);
        }
    } catch (error) {
        alert('Network error occurred. Please try again.');
    }
});

// Display User Info
function displayUserInfo(user) {
    console.log('👤 Displaying user info:', user);
    userInfo.classList.remove('hidden');
    userPicture.src = user.picture || 'https://via.placeholder.com/50';
    userName.textContent = user.name || 'Test User';
    userEmail.textContent = user.email || 'test@example.com';
    document.getElementById('authForms').classList.add('hidden');
}

// Load Items
async function loadItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        const items = await response.json();
        
        if (!Array.isArray(items)) {
            console.error('Invalid items data received');
            return;
        }

        itemsList.innerHTML = items.map(item => `
            <div class="item-card bg-white rounded-lg shadow p-4">
                <div class="ml-4">
                    <h3 class="font-semibold">${item.title}</h3>
                    <p class="text-gray-600">${item.description}</p>
                    <p class="text-blue-600 font-bold">$${item.price}</p>
                    <p class="text-sm text-gray-500">Posted by: ${item.userId?.name || 'Anonymous'}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// Check if user is already logged in
const token = localStorage.getItem('token');
if (token) {
    console.log('🔄 Verifying existing token...');
    fetch(`${API_URL}/auth/me`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(user => {
        console.log('✅ Token valid, user data:', user);
        displayUserInfo(user);
        loadItems();
    })
    .catch(() => {
        console.error('❌ Token verification failed, removing token');
        localStorage.removeItem('token');
    });
} 