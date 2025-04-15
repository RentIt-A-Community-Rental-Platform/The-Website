const API_URL = 'http://localhost:3000';

// Check authentication
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'auth.html';
}

// DOM Elements
const itemForm = document.getElementById('itemForm');
const itemsList = document.getElementById('itemsList');
const logoutBtn = document.getElementById('logoutBtn');

// Handle logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'auth.html';
});

// Handle item submission
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const price = document.getElementById('price').value;

    try {
        const response = await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description, price })
        });

        const data = await response.json();
        if (response.ok) {
            loadItems();
            itemForm.reset();
        } else {
            alert(data.error || 'Failed to create item');
        }
    } catch (error) {
        alert('Network error occurred. Please try again.');
    }
});

// Load items
async function loadItems() {
    try {
        const response = await fetch(`${API_URL}/items`);
        const items = await response.json();
        
        if (!Array.isArray(items)) {
            console.error('Invalid items data received');
            return;
        }

        itemsList.innerHTML = items.map(item => `
            <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="font-semibold text-lg">${item.title}</h3>
                <p class="text-gray-600 my-2">${item.description}</p>
                <p class="text-blue-600 font-bold">$${item.price}</p>
                <p class="text-sm text-gray-500 mt-2">Posted by: ${item.userId?.name || 'Anonymous'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading items:', error);
    }
}

// Initial load
loadItems(); 