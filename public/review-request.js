// ... existing code ...
const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('token') || sessionStorage.getItem('token');

// Fetch and render requests list
async function loadRequests() {
    const res = await fetch(`${API_URL}/rentals/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const requests = await res.json();
    // Render requests in #requestsList
    // Add click listeners to load details
}

// Fetch and render details for a selected request
async function loadRequestDetails(requestId) {
    const res = await fetch(`${API_URL}/rentals/${requestId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const request = await res.json();
    // Render details in #requestDetails
    // Show Accept, Reject, Modify buttons
    // Handle Modify form and submission
}

// On page load, load requests and details for selected id (from URL)
document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    // If ?id= is present, load details for that request
});