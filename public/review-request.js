const API_URL = 'http://localhost:3000';

let requests = [];
let myRequests = []; // Requests where user is the sender
let selectedRequestId = null;

// Fetch all pending requests for the owner (where user is receiver)
async function fetchRequests() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_URL}/rentals`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
}

// Fetch all requests where user is the sender
async function fetchMyRequests() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const res = await fetch(`${API_URL}/rentals/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
}

// Render the sidebar list of requests
function renderRequestsList(requests) {
    const list = document.getElementById('requestsList');
    list.innerHTML = '<h3 class="font-bold p-4 bg-gray-100">Requests to Review (You\'re the Owner)</h3>';
    
    if (requests.length === 0) {
        list.innerHTML += '<div class="p-4 text-gray-500">No requests to review.</div>';
        return;
    }
    
    requests.forEach(req => {
        const div = document.createElement('div');
        div.className = 'p-4 border-b cursor-pointer hover:bg-gray-100';
        div.innerHTML = `
            <div class="font-semibold">${req.itemId.title}</div>
            <div class="text-sm text-gray-500">From: ${req.renterId.name}</div>
            <div class="text-xs mt-1 ${getStatusBadgeClass(req.status)}">${req.status.toUpperCase()}</div>
        `;
        div.onclick = () => {
            selectedRequestId = req._id;
            showRequestDetails(req, 'receiver');
        };
        list.appendChild(div);
    });
}

// Render the list of requests where user is the sender
function renderSenderRequestsList(requests) {
    const list = document.getElementById('myRequestsList');
    if (!list) return; // Safety check
    
    list.innerHTML = '<h3 class="font-bold p-4 bg-gray-100">My Requests (You\'re the Renter)</h3>';
    
    if (requests.length === 0) {
        list.innerHTML += '<div class="p-4 text-gray-500">You haven\'t made any requests yet.</div>';
        return;
    }
    
    requests.forEach(req => {
        const div = document.createElement('div');
        div.className = 'p-4 border-b cursor-pointer hover:bg-gray-100';
        div.innerHTML = `
            <div class="font-semibold">${req.itemId.title}</div>
            <div class="text-sm text-gray-500">To: ${req.ownerId.name}</div>
            <div class="text-xs mt-1 ${getStatusBadgeClass(req.status)}">${req.status.toUpperCase()}</div>
        `;
        div.onclick = () => {
            selectedRequestId = req._id;
            showRequestDetails(req, 'sender');
        };
        list.appendChild(div);
    });
}

// Helper function to get status badge class
function getStatusBadgeClass(status) {
    switch(status) {
        case 'pending': return 'inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800';
        case 'accepted': return 'inline-block px-2 py-1 rounded bg-green-100 text-green-800';
        case 'rejected': return 'inline-block px-2 py-1 rounded bg-red-100 text-red-800';
        case 'modified': return 'inline-block px-2 py-1 rounded bg-blue-100 text-blue-800';
        case 'ongoing': return 'inline-block px-2 py-1 rounded bg-purple-100 text-blue-800';
        default: return 'inline-block px-2 py-1 rounded bg-gray-100 text-gray-800';
    }
}

// Render the chat-style details for a request
function showRequestDetails(req, role) {
    selectedRequestId = req._id;
    const details = document.getElementById('requestDetails');
    const bubbles = [];
    const isLastMessageFromUser = isUserLastSender(req, role);

    // Item info card at the top
    const itemInfo = `
        <div class="bg-${getStatusBgClass(req.status)} rounded-lg p-6 mb-4 flex items-center space-x-6 shadow-lg transition-all duration-300">
            <img src="${req.itemId.photos && req.itemId.photos.length > 0 ? req.itemId.photos[0] : 'https://via.placeholder.com/100x100'}" 
                 alt="${req.itemId.title}" 
                 class="w-24 h-24 object-cover rounded-lg shadow-md">
            <div class="flex-1">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h2 class="font-bold text-xl text-gray-800">${req.itemId.title}</h2>
                        <p class="text-sm text-gray-600">
                            ${role === 'receiver' 
                                ? `Requested by <span class="font-medium">${req.renterId.name}</span>` 
                                : `Owner: <span class="font-medium">${req.ownerId.name}</span>`}
                        </p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(req.status)}">${req.status.toUpperCase()}</span>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <div class="text-sm">
                            <span class="text-gray-500">Rental Period</span>
                            <p class="font-medium">${formatDate(req.rentalPeriod.startDate)} - ${formatDate(req.rentalPeriod.endDate)}</p>
                        </div>
                        <div class="text-sm">
                            <span class="text-gray-500">Price</span>
                            <p class="font-medium text-primary-600">$${req.totalPrice}</p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="text-sm">
                            <span class="text-gray-500">Meeting Details</span>
                            <p class="font-medium">${formatDate(req.meetingDetails.date)} at ${formatTime(req.meetingDetails.time)}</p>
                            <p class="font-medium flex items-center">
                                <i class="fas fa-location-dot text-primary-500 mr-1"></i>
                                ${req.meetingDetails.location}
                            </p>
                        </div>
                    </div>
                </div>
                ${req.meetingDetails.notes ? `
                    <div class="mt-3 text-sm">
                        <span class="text-gray-500">Notes</span>
                        <p class="font-medium">${req.meetingDetails.notes}</p>
                    </div>
                ` : ''}
                
                ${req.status === 'accepted' && role === 'sender' ? `
                    <div class="mt-4 p-4 bg-green-100 rounded-lg">
                        <h3 class="font-medium text-green-800 mb-2">Your Pickup Code</h3>
                        <div class="flex items-center justify-center">
                            <div class="text-2xl font-mono font-bold tracking-wider bg-white px-6 py-3 rounded-lg shadow-inner border-2 border-green-200">
                                ${generatePickupCode(req._id)}
                            </div>
                        </div>
                        <p class="text-sm text-green-700 text-center mt-2">
                            Show this code to the owner when picking up the item
                        </p>
                    </div>
                ` : ''}
                
                ${req.status === 'accepted' && role === 'receiver' ? `
                    <div class="mt-4 p-4 bg-green-100 rounded-lg">
                        <h3 class="font-medium text-green-800 mb-2">Confirm Item Pickup</h3>
                        <div class="flex items-center space-x-2">
                            <input type="text" 
                                id="pickupCode" 
                                class="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                                placeholder="Enter 6-digit pickup code"
                                maxlength="6"
                                pattern="[0-9]*">
                            <button onclick="confirmPickup('${req._id}')" 
                                class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                Confirm Pickup
                            </button>
                        </div>
                    </div>
                ` : ''}
                ${req.status === 'ongoing' && role === 'receiver' ? `
                    <div class="mt-4 p-4 bg-purple-100 rounded-lg">
                        <h3 class="font-medium text-purple-800 mb-2">Your Return Code</h3>
                        <div class="flex items-center justify-center">
                            <div class="text-2xl font-mono font-bold tracking-wider bg-white px-6 py-3 rounded-lg shadow-inner border-2 border-purple-200">
                                ${generateReturnCode(req._id)}
                            </div>
                        </div>
                        <p class="text-sm text-purple-700 text-center mt-2">
                            Show this code to the owner when returning the item
                        </p>
                    </div>
                ` : ''}
                
                ${req.status === 'ongoing' && role === 'sender' ? `
                    <div class="mt-4 p-4 bg-purple-100 rounded-lg">
                        <h3 class="font-medium text-purple-800 mb-2">Confirm Item Return</h3>
                        <div class="flex items-center space-x-2">
                            <input type="text" 
                                id="returnCode" 
                                class="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                                placeholder="Enter 6-digit return code"
                                maxlength="6"
                                pattern="[0-9]*">
                            <button onclick="confirmReturn('${req._id}')" 
                                class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                                Confirm Return
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                ${req.status === 'completed' && 
                  ((role === 'sender' && !req.renterReviewed) || 
                   (role === 'receiver' && !req.ownerReviewed)) ? `
                    <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h3 class="font-medium text-blue-800 mb-2">Leave a Review</h3>
                        <div class="space-y-4">
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-gray-600">Rating:</span>
                                <div class="flex items-center">
                                    ${[1, 2, 3, 4, 5].map(star => `
                                        <button 
                                            type="button"
                                            class="star-rating p-1"
                                            data-rating="${star}"
                                            onclick="setRating(${star})"
                                        >
                                            <i class="fas fa-star text-gray-300 hover:text-yellow-400"></i>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <div>
                                <textarea 
                                    id="reviewText" 
                                    class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" 
                                    rows="3" 
                                    placeholder="Write your review here..."
                                    maxlength="1000"
                                ></textarea>
                            </div>
                            <button 
                                onclick="submitReview('${req._id}', '${role === 'receiver'?'renter':'owner'}')" 
                                class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Submit Review
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Add these helper functions at the appropriate place in your code
    function getStatusBgClass(status) {
        switch(status.toLowerCase()) {
            case 'pending': return 'bg-yellow-50';
            case 'accepted': return 'bg-green-50';
            case 'rejected': return 'bg-red-50';
            case 'modified': return 'bg-blue-50';
            case 'ongoing': return 'bg-purple-50';
            default: return 'bg-gray-50';
        }
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    }

    function formatTime(timeStr) {
        return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    // Render all chat history messages
    (req.chatHistory || []).forEach(msg => {
        const isOwner = msg.sender === 'owner';
        const isCurrentUserSender = (role === 'receiver' && isOwner) || (role === 'sender' && !isOwner);
        const align = isCurrentUserSender ? 'justify-end' : '';
        const bubbleColor = isCurrentUserSender ? 'bg-slate-100 text-slate-900' : 'bg-gray-100';
        const avatar = isOwner 
            ? (role === 'receiver' ? '/images/avatar.webp' : (req.ownerId.avatar || '/images/avatar.webp'))
            : (role === 'sender' ? '/images/avatar.webp' : (req.renterId.avatar || '/images/avatar.webp'));
        const name = isCurrentUserSender ? 'You' : (isOwner ? req.ownerId.name : req.renterId.name);

        bubbles.push(`
            <div class="flex items-start mb-6 ${align}">
                ${!isCurrentUserSender ? `<img src="${avatar}" class="w-12 h-12 rounded-full mr-4" alt="${name}">` : ''}
                <div class="flex-1">
                    <div class="flex items-center ${isCurrentUserSender ? 'justify-end' : ''} mb-1">
                        <span class="text-sm text-gray-600">${name} • ${new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="${bubbleColor} rounded-lg px-5 py-4 ${isCurrentUserSender ? 'ml-auto border border-slate-200' : ''} max-w-[80%] shadow-sm">
                        <div class="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
                            <div class="font-semibold text-base ${isCurrentUserSender ? 'text-slate-800' : 'text-gray-800'}">
                                ${msg.type === 'modify' ? 'Modification Request' : 'Request'}
                            </div>
                            <div class="text-xs text-gray-500">${formatDate(msg.timestamp)}</div>
                        </div>
                        
                        <div class="space-y-4">
                            <div class="flex flex-col">
                                <div class="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Rental Period</div>
                                <div class="text-sm">
                                    ${formatDate(msg.rentalPeriod.startDate)} - ${formatDate(msg.rentalPeriod.endDate)}
                                </div>
                            </div>
                            
                            <div class="flex flex-col">
                                <div class="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Meeting Details</div>
                                <div class="text-sm mb-1">
                                    ${formatDate(msg.meetingDetails.date)} at ${formatTime(msg.meetingDetails.time)}
                                </div>
                                <div class="text-sm flex items-center">
                                    <i class="fas fa-location-dot text-primary-500 mr-2"></i>
                                    ${msg.meetingDetails.location}
                                </div>
                            </div>
                            
                            ${msg.meetingDetails.notes ? `
                                <div class="flex flex-col">
                                    <div class="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">Notes</div>
                                    <div class="text-sm">${msg.meetingDetails.notes}</div>
                                </div>
                            ` : ''}
                            
                            
                        </div>
                    </div>
                </div>
                ${isCurrentUserSender ? `<img src="${avatar}" class="w-12 h-12 rounded-full ml-4" alt="${name}">` : ''}
            </div>
        `);
    });

    // Action buttons at the bottom (always right-aligned)
    // Show different buttons based on role and status
    let actionButtons = '';
    
    if(req.status !== 'accepted' && req.status !== 'rejected' && req.status !== 'ongoing' && req.status !== 'completed'){
        if (isLastMessageFromUser && role == 'receiver') {
            // If the last message is from the current user, they can only modify
            actionButtons = `
                <div class="flex justify-end space-x-4 mt-4">
                    <button class="bg-red-500 text-white px-4 py-2 rounded" onclick="rejectRequest('${req._id}')">Reject</button>
                    <button class="bg-blue-500 text-white px-4 py-2 rounded" onclick="showModifyForm('${encodeURIComponent(JSON.stringify(req)).replace(/'/g, "\\'")}')">Modify</button>
                </div>
            `;
            
        } else if (isLastMessageFromUser && role == 'sender') {
            // If the last message is from the current user, they can only modify
            actionButtons = `
                <div class="flex justify-end space-x-4 mt-4">
                    <button class="bg-red-500 text-white px-4 py-2 rounded" onclick="rejectRequest('${req._id}')">Cancel Request</button>
                    <button class="bg-blue-500 text-white px-4 py-2 rounded" onclick="showModifyForm('${encodeURIComponent(JSON.stringify(req)).replace(/'/g, "\\'")}')">Modify</button>
                </div>
            `;
            
        } 
        else{
            // If not accepted or rejected, and not the last sender, can accept, reject, or modify
            actionButtons = `
                <div class="flex justify-end space-x-4 mt-4">
                    <button class="bg-green-500 text-white px-4 py-2 rounded" onclick="acceptRequest('${req._id}')">Accept</button>
                    <button class="bg-red-500 text-white px-4 py-2 rounded" onclick="rejectRequest('${req._id}')">Reject</button>
                    <button class="bg-blue-500 text-white px-4 py-2 rounded" onclick="showModifyForm('${encodeURIComponent(JSON.stringify(req)).replace(/'/g, "\\'")}')">Modify</button>
                </div>
            `;
        }
       
    }


    bubbles.push(`
        ${actionButtons}
        <div id="modifyFormContainer"></div>
    `);

    details.innerHTML = `
        <div class="bg-white rounded-lg shadow p-6 flex flex-col space-y-2">
            ${itemInfo}
            ${bubbles.join('')}
        </div>
    `;
}

// Helper function to determine if the user is the last sender in the chat history
function isUserLastSender(req, role) {
    if (!req.chatHistory || req.chatHistory.length === 0) return false;
    
    const lastMsg = req.chatHistory[req.chatHistory.length - 1];
    return (role === 'receiver' && lastMsg.sender === 'owner') || 
           (role === 'sender' && lastMsg.sender === 'renter');
}

// Helper function to get status text color class
function getStatusTextClass(status) {
    switch(status) {
        case 'pending': return 'text-yellow-600';
        case 'accepted': return 'text-green-600';
        case 'rejected': return 'text-red-600';
        case 'modified': return 'text-blue-600';
        case 'ongoing': return 'text-purple-600';
        default: return 'text-gray-600';
    }
}

// Show the modify form for a request
function showModifyForm(reqStr) {
    const req = JSON.parse(decodeURIComponent(reqStr));
    const container = document.getElementById('modifyFormContainer');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = `
        <form id="modifyForm" class="mt-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Modify Request</h3>
            
            <div class="space-y-4">
                <div class="flex flex-col">
                    <label class="text-sm font-medium text-gray-700 mb-1">Rental Period</label>
                    <div class="flex items-center space-x-2">
                        <input type="date" 
                            id="startDate"
                            name="startDate" 
                            value="${new Date(req.rentalPeriod.startDate).toISOString().split('T')[0]}"
                            min="${today}" 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                        <span class="text-gray-500">to</span>
                        <input type="date" 
                            id="endDate"
                            name="endDate" 
                            value="${new Date(req.rentalPeriod.endDate).toISOString().split('T')[0]}"
                            min="${new Date(req.rentalPeriod.startDate).toISOString().split('T')[0]}" 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                </div>

                <div class="flex flex-col">
                    <label class="text-sm font-medium text-gray-700 mb-1">Price Calculation</label>
                    <div class="bg-gray-50 p-4 rounded-md">
                        <div class="flex justify-between mb-2">
                            <span>Number of Days:</span>
                            <span id="numberOfDays">0</span>
                        </div>
                        <div class="flex justify-between font-semibold">
                            <span>Total Price (including deposit):</span>
                            <span>$<span id="totalPrice">0.00</span></span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col">
                    <label class="text-sm font-medium text-gray-700 mb-1">Meeting Location</label>
                    <input type="text" 
                        name="meetingLocation" 
                        value="${req.meetingDetails.location}"
                        placeholder="${req.meetingDetails.location}" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                </div>

                <div class="flex flex-col">
                    <label class="text-sm font-medium text-gray-700 mb-1">Meeting Time</label>
                    <div class="flex items-center space-x-2">
                        <input type="date" 
                            id="meetingDate"
                            name="meetingDate" 
                            value="${new Date(req.rentalPeriod.startDate).toISOString().split('T')[0]}"
                            readonly
                            class="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed">
                        <input type="time" 
                            name="meetingTime" 
                            value="${req.meetingDetails.time}"
                            placeholder="${req.meetingDetails.time}" 
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                    </div>
                </div>

                <div class="flex flex-col">
                    <label class="text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                    <textarea 
                        name="notes" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[80px]"
                        placeholder="Add any additional notes here...">${req.meetingDetails.notes || ''}</textarea>
                </div>
            </div>

            <div class="mt-6 flex justify-end space-x-2">
                <button type="button" 
                    class="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    onclick="document.getElementById('modifyFormContainer').innerHTML = ''">
                    Cancel
                </button>
                <button type="submit" 
                    id="submitBtn"
                    class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                    Submit Changes
                </button>
            </div>
        </form>
    `;

    // Add event listener to update endDate min when startDate changes
    document.querySelector('input[name="startDate"]').addEventListener('change', function(e) {
        document.querySelector('input[name="endDate"]').min = e.target.value;
        updatePriceCalculation(req.itemId);
    });

    document.querySelector('input[name="endDate"]').addEventListener('change', function() {
        updatePriceCalculation(req.itemId);
    });

    // Initial price calculation
    updatePriceCalculation(req.itemId);

    // Add price calculation function
    function updatePriceCalculation(item) {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            
            document.getElementById('numberOfDays').textContent = days;
            document.getElementById('totalPrice').textContent = (days * item.price + item.deposit).toFixed(2);
        }
    }

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
        console.log('UPDATE:',updated);
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
        
        // Update the request in the local arrays
        updateRequestInList(data.rental);
        
        // Refresh the UI
        refreshUI();
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
        
        // Update the request in the local arrays
        updateRequestInList(data.rental);
        
        // Refresh the UI
        refreshUI();
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
        console.log(data);
        // Update the request in the local arrays
        updateRequestInList(data.rental);
        
        // Refresh the UI
        refreshUI();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Update a request in the local arrays
function updateRequestInList(updatedRequest) {
    // Update in the receiver requests list
    const receiverIndex = requests.findIndex(r => r._id === updatedRequest._id);
    if (receiverIndex !== -1) {
        requests[receiverIndex] = updatedRequest;
    }
    
    // Update in the sender requests list
    const senderIndex = myRequests.findIndex(r => r._id === updatedRequest._id);
    if (senderIndex !== -1) {
        myRequests[senderIndex] = updatedRequest;
    }
}

// Refresh the UI after changes
function refreshUI() {
    // Find the updated request
    const updatedRequest = [...requests, ...myRequests].find(r => r._id === selectedRequestId);
    
    if (updatedRequest) {
        // Determine the user's role in this request
        const role = requests.some(r => r._id === selectedRequestId) ? 'receiver' : 'sender';
        
        // Show the updated request details
        showRequestDetails(updatedRequest, role);
    }
    
    // Refresh the lists
    renderRequestsList(requests);
    renderSenderRequestsList(myRequests);
}

// // Poll for notifications
// function pollNotifications() {
//     const token = localStorage.getItem('token') || sessionStorage.getItem('token');
//     // if (!token) return;

//     // Fetch requests where user is owner (receiver)
//     fetch(`${API_URL}/rentals/pending`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//     })
//     .then(res => res.json())
//     .then(ownerRequests => {
//         // // requests = ownerRequests;
//         // if (JSON.stringify(requests) !== JSON.stringify(ownerRequests)){
//         //     console.log('new msg owner');
//         //     requests = ownerRequests;
//         // }
//         renderRequestsList(ownerRequests);

//         if (JSON.stringify(requests) !== JSON.stringify(ownerRequests)){
//             requests.forEach((item,index)=>{
//                 if(JSON.stringify(requests[index])!==JSON.stringify(ownerRequests[index])){
//                     showRequestDetails(ownerRequests[index], 'receiver');
//                 }
//             })
            
//             requests = ownerRequests;
//         }
//     });

//     // Fetch requests where user is renter (sender)
//     fetch(`${API_URL}/rentals/my-requests`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//     })
//     .then(res => res.json())
//     .then(senderRequests => {
        
//         renderSenderRequestsList(senderRequests);

//         if (JSON.stringify(myRequests) !== JSON.stringify(senderRequests)){
//             myRequests.forEach((item,index)=>{
//                 if(JSON.stringify(myRequests[index])!==JSON.stringify(senderRequests[index])){
//                     showRequestDetails(senderRequests[index], 'sender');
//                 }
//             })
            
//             myRequests = senderRequests;
//         }

//     });

// }

// Initialize the page
// window.onload = async function() {
//     // Fetch both types of requests
//     requests = await fetchRequests();
//     myRequests = await fetchMyRequests();
//     console.log(requests, myRequests);
//     // Render both lists
//     renderRequestsList(requests);
//     renderSenderRequestsList(myRequests);
    
//     // Show details for the first request if available
//     // if (requests.length > 0) {
//     //     selectedRequestId = requests[0]._id;
//     //     showRequestDetails(requests[0], 'receiver');
//     // } else if (myRequests.length > 0) {
//     //     selectedRequestId = myRequests[0]._id;
//     //     showRequestDetails(myRequests[0], 'sender');
//     // }
    
//     // Set up polling for updates
//     setInterval(pollNotifications, 5000);
// };

// Add this function after the existing functions
async function confirmPickup(rentalId) {
    const code = document.getElementById('pickupCode').value.trim();
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
        // For demo purposes, accept any valid 6-digit code
        const res = await fetch(`${API_URL}/rentals/${rentalId}/confirm-pickup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pickupCode: code })
        });
        
        if (!res.ok) throw new Error('Failed to confirm pickup');
        const data = await res.json();
        
        // Update the request in the local arrays
        updateRequestInList(data.rental);
        
        // Refresh the UI
        refreshUI();
        
        alert('Pickup confirmed successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Add this helper function to generate a consistent pickup code based on rental ID
function generatePickupCode(rentalId) {
    // Generate a 6-digit random number
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Add this helper function to generate a return code
function generateReturnCode(id) {
    // For demo purposes, generate a 6-digit code based on the rental ID
    // In production, this should be a secure random code stored in the database
    return String(Math.abs(id.split('').reduce((a, b) => a + b.charCodeAt(0), 0))).padStart(6, '0').slice(-6);
}

// Add this function to handle return confirmation
async function confirmReturn(id) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const returnCode = document.getElementById('returnCode').value;

    try {
        const res = await fetch(`${API_URL}/rentals/${id}/confirm-return`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ returnCode })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to confirm return');
        }

        const data = await res.json();
        updateRequestInList(data.rental);
        showRequestDetails(data.rental, 'receiver');
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
        console.log(data);
        // Update the request in the local arrays
        updateRequestInList(data.rental);
        
        // Refresh the UI
        refreshUI();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Update a request in the local arrays
function updateRequestInList(updatedRequest) {
    // Update in the receiver requests list
    const receiverIndex = requests.findIndex(r => r._id === updatedRequest._id);
    if (receiverIndex !== -1) {
        requests[receiverIndex] = updatedRequest;
    }
    
    // Update in the sender requests list
    const senderIndex = myRequests.findIndex(r => r._id === updatedRequest._id);
    if (senderIndex !== -1) {
        myRequests[senderIndex] = updatedRequest;
    }
}

// Refresh the UI after changes
function refreshUI() {
    // Find the updated request
    const updatedRequest = [...requests, ...myRequests].find(r => r._id === selectedRequestId);
    
    if (updatedRequest) {
        // Determine the user's role in this request
        const role = requests.some(r => r._id === selectedRequestId) ? 'receiver' : 'sender';
        
        // Show the updated request details
        showRequestDetails(updatedRequest, role);
    }
    
    // Refresh the lists
    renderRequestsList(requests);
    renderSenderRequestsList(myRequests);
}

// Poll for notifications
function pollNotifications() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    // if (!token) return;

    // Fetch requests where user is owner (receiver)
    fetch(`${API_URL}/rentals`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(ownerRequests => {
        // // requests = ownerRequests;
        // if (JSON.stringify(requests) !== JSON.stringify(ownerRequests)){
        //     console.log('new msg owner');
        //     requests = ownerRequests;
        // }
        renderRequestsList(ownerRequests);

        if (JSON.stringify(requests) !== JSON.stringify(ownerRequests)){
            requests.forEach((item,index)=>{
                if(JSON.stringify(requests[index])!==JSON.stringify(ownerRequests[index])){
                    showRequestDetails(ownerRequests[index], 'receiver');
                }
            })
            
            requests = ownerRequests;
        }
    });

    // Fetch requests where user is renter (sender)
    fetch(`${API_URL}/rentals/my-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(senderRequests => {
        
        renderSenderRequestsList(senderRequests);

        if (JSON.stringify(myRequests) !== JSON.stringify(senderRequests)){
            myRequests.forEach((item,index)=>{
                if(JSON.stringify(myRequests[index])!==JSON.stringify(senderRequests[index])){
                    showRequestDetails(senderRequests[index], 'sender');
                }
            })
            
            myRequests = senderRequests;
        }

    });

}

// Initialize the page
window.onload = async function() {
    // Fetch both types of requests
    requests = await fetchRequests();
    myRequests = await fetchMyRequests();
    console.log(requests, myRequests);
    // Render both lists
    renderRequestsList(requests);
    renderSenderRequestsList(myRequests);
    
    // Show details for the first request if available
    // if (requests.length > 0) {
    //     selectedRequestId = requests[0]._id;
    //     showRequestDetails(requests[0], 'receiver');
    // } else if (myRequests.length > 0) {
    //     selectedRequestId = myRequests[0]._id;
    //     showRequestDetails(myRequests[0], 'sender');
    // }
    
    // Set up polling for updates
    setInterval(pollNotifications, 5000);
};

// Add this function after the existing functions
async function confirmPickup(rentalId) {
    const code = document.getElementById('pickupCode').value.trim();
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
        alert('Please enter a valid 6-digit code');
        return;
    }
    
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    try {
        // For demo purposes, accept any valid 6-digit code
        const res = await fetch(`${API_URL}/rentals/${rentalId}/confirm-pickup`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pickupCode: code })
        });
        
        if (!res.ok) throw new Error('Failed to confirm pickup');
        const data = await res.json();
        
        // Update the request in the local arrays
        updateRequestInList(data.rental);
        
        // Refresh the UI
        refreshUI();
        
        alert('Pickup confirmed successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Add this helper function to generate a consistent pickup code based on rental ID
function generatePickupCode(rentalId) {
    // Generate a 6-digit random number
    return Math.floor(100000 + Math.random() * 900000).toString();
}

let selectedRating = 0;

function setRating(rating) {
    selectedRating = rating;
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach((star, index) => {
        star.classList.toggle('text-yellow-400', index < rating);
        star.classList.toggle('text-gray-300', index >= rating);
    });
}

async function submitReview(rentalId, role) {
    if (!selectedRating) {
        alert('Please select a rating');
        return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();
    if (!reviewText) {
        alert('Please write a review');
        return;
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/review/${rentalId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rating: selectedRating,
                reviewText,
                role
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit review');
        }

        alert('Review submitted successfully!');
        // Refresh the page or update UI as needed
        location.reload();

    } catch (error) {
        console.error('Error submitting review:', error);
        alert(error.message);
    }
}
