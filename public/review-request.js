const API_URL = 'http://localhost:3000';

let requests = [];
let selectedRequestId = null;

// Fetch all pending requests for the owner
async function fetchRequests() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_URL}/rentals/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
}

// Render the sidebar list of requests
function renderRequestsList(requests) {
    const list = document.getElementById('requestsList');
    list.innerHTML = '';
    requests.forEach(req => {
        const div = document.createElement('div');
        div.className = 'p-4 border-b cursor-pointer hover:bg-gray-100';
        div.innerHTML = `
            <div class="font-semibold">${req.itemId.title}</div>
            <div class="text-sm text-gray-500">${req.renterId.name}</div>
        `;
        div.onclick = () => {
            selectedRequestId = req._id;
            showRequestDetails(req);
        };
        list.appendChild(div);
    });
}

// Render the chat-style details for a request
function showRequestDetails(req) {
    selectedRequestId = req._id;
    const details = document.getElementById('requestDetails');
    const bubbles = [];

    // Item info card at the top
    const itemInfo = `
        <div class="bg-gray-50 rounded-lg p-4 mb-4 flex items-center space-x-4 shadow">
            <img src="${req.itemId.photos && req.itemId.photos.length > 0 ? req.itemId.photos[0] : 'https://via.placeholder.com/100x100'}" alt="${req.itemId.title}" class="w-20 h-20 object-cover rounded">
            <div>
                <div class="font-bold text-lg text-primary-700">${req.itemId.title}</div>
                <div class="text-sm text-gray-600">Requested by: <span class="font-semibold">${req.renterId.name}</span></div>
                <div class="text-sm text-gray-600">Rental Interval: <span class="font-semibold">${req.rentalPeriod.startDate} to ${req.rentalPeriod.endDate}</span></div>
                <div class="text-sm text-gray-600">Price: <span class="font-semibold">$${req.totalPrice}</span></div>
                <div class="text-sm text-gray-600">Meeting Place: <span class="font-semibold">${req.meetingDetails.location}</span></div>
                <div class="text-sm text-gray-600">Meeting Time: <span class="font-semibold">${req.meetingDetails.date} ${req.meetingDetails.time}</span></div>
                <div class="text-sm text-gray-600">Notes: <span class="font-semibold">${req.meetingDetails.notes || 'None'}</span></div>
            </div>
        </div>
    `;

    // Render all chat history messages
    (req.chatHistory || []).forEach(msg => {
        const isOwner = msg.sender === 'owner';
        const align = isOwner ? 'justify-end' : '';
        const bubbleColor = isOwner ? 'bg-blue-100 text-blue-900' : 'bg-gray-100';
        const avatar = isOwner ? '/images/logo.svg' : (req.renterId.avatar || '/images/default-avatar.png');
        const name = isOwner ? 'You' : req.renterId.name;

        bubbles.push(`
            <div class="flex items-start mb-4 ${align}">
                ${!isOwner ? `<img src="${avatar}" class="w-10 h-10 rounded-full mr-3" alt="${name}">` : ''}
                <div>
                    <div class="${bubbleColor} rounded-lg px-4 py-2 max-w-xs ${isOwner ? 'text-right' : ''}">
                        <div class="font-semibold">${msg.type === 'modify' ? 'Modification' : msg.type.charAt(0).toUpperCase() + msg.type.slice(1)}</div>
                        <div class="text-xs text-gray-500 mb-1">${name} • ${new Date(msg.timestamp).toLocaleString()}</div>
                        <div class="text-sm"><span class="font-semibold">Rental Interval:</span> ${msg.rentalPeriod.startDate} to ${msg.rentalPeriod.endDate}</div>
                        <div class="text-sm"><span class="font-semibold">Meeting Place:</span> ${msg.meetingDetails.location}</div>
                        <div class="text-sm"><span class="font-semibold">Meeting Time:</span> ${msg.meetingDetails.date} ${msg.meetingDetails.time}</div>
                        <div class="text-sm"><span class="font-semibold">Notes:</span> ${msg.meetingDetails.notes || 'None'}</div>
                        ${msg.message ? `<div class="text-sm mt-2">${msg.message}</div>` : ''}
                    </div>
                </div>
                ${isOwner ? `<img src="${avatar}" class="w-10 h-10 rounded-full ml-3" alt="${name}">` : ''}
            </div>
        `);
    });

    // Action buttons at the bottom (always right-aligned)
    bubbles.push(`
        <div class="flex justify-end space-x-4 mt-4">
            <button class="bg-green-500 text-white px-4 py-2 rounded" onclick="acceptRequest('${req._id}')">Accept</button>
            <button class="bg-red-500 text-white px-4 py-2 rounded" onclick="rejectRequest('${req._id}')">Reject</button>
            <button class="bg-blue-500 text-white px-4 py-2 rounded" onclick="showModifyForm('${encodeURIComponent(JSON.stringify(req))}')">Modify</button>
        </div>
        <div id="modifyFormContainer"></div>
    `);

    details.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 flex flex-col space-y-2">
            ${itemInfo}
            ${bubbles.join('')}
        </div>
    `;
}

// Show the modify form for a request
function showModifyForm(reqStr) {
    const req = JSON.parse(decodeURIComponent(reqStr));
    const container = document.getElementById('modifyFormContainer');
    container.innerHTML = `
        <form id="modifyForm" class="mt-4 space-y-2 bg-gray-50 p-4 rounded-lg">
            <label class="block">Rental Interval:
                <input type="date" name="startDate" value="${req.rentalPeriod.startDate}" class="border rounded px-2 py-1 mr-2">
                to
                <input type="date" name="endDate" value="${req.rentalPeriod.endDate}" class="border rounded px-2 py-1">
            </label>
            <label class="block">Meeting Place:
                <input type="text" name="meetingLocation" value="${req.meetingDetails.location}" class="border rounded px-2 py-1 w-full">
            </label>
            <label class="block">Meeting Date:
                <input type="date" name="meetingDate" value="${req.meetingDetails.date}" class="border rounded px-2 py-1 mr-2">
                <input type="time" name="meetingTime" value="${req.meetingDetails.time}" class="border rounded px-2 py-1">
            </label>
            <label class="block">Notes:
                <textarea name="notes" class="border rounded px-2 py-1 w-full">${req.meetingDetails.notes || ''}</textarea>
            </label>
            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded">Submit Modification</button>
        </form>
    `;
    document.getElementById('modifyForm').onsubmit = function(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updated = {
            rentalPeriod: {
                startDate: formData.get('startDate'),
                endDate: formData.get('endDate')
            },
            meetingDetails: {
                location: formData.get('meetingLocation'),
                date: formData.get('meetingDate'),
                time: formData.get('meetingTime'),
                notes: formData.get('notes')
            }
        };
        modifyRequest(req._id, updated);
    };
}

// Accept a rental request via API
async function acceptRequest(id) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/rentals/${id}/accept`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to accept request');
        const data = await res.json();
        // Update the request in the local array
        updateRequestInList(data.rental);

        console.log(data.rental);
        showRequestDetails(data.rental);
        renderRequestsList(requests);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Reject a rental request via API
async function rejectRequest(id) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/rentals/${id}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to reject request');
        const data = await res.json();
        // Update the request in the local array
        updateRequestInList(data.rental);
        showRequestDetails(data.rental);
        renderRequestsList(requests);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Modify a rental request via API
async function modifyRequest(id, updated) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
        const res = await fetch(`${API_URL}/rentals/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,   
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updated)
        });
        if (!res.ok) throw new Error('Failed to modify request');
        const data = await res.json();
        // Update the request in the local array
        updateRequestInList(data.rental);
        showRequestDetails(data.rental);
        renderRequestsList(requests);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Helper to update a request in the local array
function updateRequestInList(updatedRequest) {
    const idx = requests.findIndex(r => r._id === updatedRequest._id);
    if (idx !== -1) {
        requests[idx] = updatedRequest;
    }
}

// On page load, fetch and render requests
window.onload = async function() {
    requests = await fetchRequests();
    renderRequestsList(requests);
    if (requests.length > 0) {
        selectedRequestId = requests[0]._id;
        showRequestDetails(requests[0]);
    }
};