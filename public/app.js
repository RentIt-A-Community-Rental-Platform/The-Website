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
const searchInput = document.querySelector('input[type="text"]');
const searchButton = document.querySelector('button');
const startDate = document.querySelector('input[type="date"]:first-of-type');
const endDate = document.querySelector('input[type="date"]:last-of-type');
const featuredItemsContainer = document.getElementById('featuredItems');

console.log('🔍 DOM Elements loaded');

// Set min dates for date inputs
const today = new Date().toISOString().split('T')[0];
startDate.min = today;
endDate.min = today;

// Handle date selection
startDate.addEventListener('change', (e) => {
    endDate.min = e.target.value;
    if (endDate.value && endDate.value < e.target.value) {
        endDate.value = e.target.value;
    }
});

// Handle search
searchButton.addEventListener('click', () => {
    const searchTerm = searchInput.value;
    const start = startDate.value;
    const end = endDate.value;
    
    if (searchTerm) {
        window.location.href = `/list.html?search=${encodeURIComponent(searchTerm)}&start=${start}&end=${end}`;
    }
});

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

// Load featured items
async function loadFeaturedItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        const items = await response.json();
        
        if (!Array.isArray(items)) {
            console.error('Invalid items data received');
            return;
        }

        // Display only the first 8 items
        const featuredItems = items.slice(0, 8);
        
        featuredItemsContainer.innerHTML = featuredItems.map(item => `
            <div class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <img src="${item.imageUrl || 'https://via.placeholder.com/300x200'}" alt="${item.title}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-2">${item.title}</h3>
                    <p class="text-gray-600 text-sm mb-2">${item.description}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-primary-600 font-bold">$${item.price}/day</span>
                        <button onclick="window.location.href='/item.html?id=${item._id}'" class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading featured items:', error);
        featuredItemsContainer.innerHTML = '<p class="text-center text-gray-500">Failed to load items</p>';
    }
}

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        fetch(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                // Update navigation
                const authButtons = document.querySelector('.flex.items-center.space-x-4');
                authButtons.innerHTML = `
                    <span class="text-gray-600">${data.user.name}</span>
                    <a href="/list.html" class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">Rent your stuff</a>
                    <button onclick="logout()" class="text-gray-600 hover:text-gray-900">Logout</button>
                `;
            }
        })
        .catch(() => {
            localStorage.removeItem('token');
        });
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    window.location.reload();
}

// Add test login button
const testLoginBtn = document.createElement('button');
testLoginBtn.textContent = 'Test Login (Development Only)';
testLoginBtn.className = 'w-full bg-gray-500 text-white p-2 rounded mt-4';
document.querySelector('form').appendChild(testLoginBtn);

testLoginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('/auth/test-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (response.ok) {
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/list.html';
        } else {
            throw new Error(data.error || 'Test login failed');
        }
    } catch (error) {
        console.error('Test login error:', error);
        alert('Test login failed. Please try again.');
    }
});

// Initialize
loadFeaturedItems();
checkAuth(); 