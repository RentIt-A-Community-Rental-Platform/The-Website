import ItemService from './services/ItemService.js';
        import AuthService from '/services/AuthService.js';
        const authService = new AuthService();

        async function checkAuth() {
            const data = await authService.checkAuthStatus();
            authService.updateUIForAuthStatus(data);
        }
        // Make ItemService available globally
        // window.ItemService = ItemService;
        const API_URL = 'http://localhost:3000';
        let item = null;

        // Get item ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        // Set min dates for date inputs
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('rentStartDate').min = today;
        document.getElementById('rentEndDate').min = today;

        // Handle date selection
        document.getElementById('rentStartDate').addEventListener('change', (e) => {
            document.getElementById('rentEndDate').min = e.target.value;
            if (document.getElementById('rentEndDate').value && document.getElementById('rentEndDate').value < e.target.value) {
                document.getElementById('rentEndDate').value = e.target.value;
            }
            updatePriceCalculation();
        });

        document.getElementById('rentEndDate').addEventListener('change', () => {
            updatePriceCalculation();
        });

        // Update price calculation
        function updatePriceCalculation() {
            const startDate = document.getElementById('rentStartDate').value;
            const endDate = document.getElementById('rentEndDate').value;

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                
                document.getElementById('numberOfDays').textContent = days;
                document.getElementById('totalPrice').textContent = (days * item.price + item.deposit).toFixed(2);
            }
        }

        // Load and display item details
        async function loadItem() {
            try {
                item = await ItemService.getItemById(itemId);

                // Update item details
                document.getElementById('itemTitle').textContent = item.title;
                document.getElementById('itemCategory').textContent = item.category;
                document.getElementById('itemPrice').textContent = item.price;
                document.getElementById('itemDeposit').textContent = item.deposit;
                document.getElementById('itemDescription').textContent = item.description;
                document.getElementById('dailyRate').textContent = item.price;
                document.getElementById('securityDeposit').textContent = item.deposit;

                // Update images
                if (item.photos && item.photos.length > 0) {
                    document.getElementById('mainImage').innerHTML = `
                        <img src="${item.photos[0]}" alt="${item.title}" class="w-full h-full object-cover">
                    `;

                    document.getElementById('thumbnails').innerHTML = item.photos.map((photo, index) => `
                        <button onclick="updateMainImage(${index})" class="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                            <img src="${photo}" alt="${item.title}" class="w-full h-full object-cover">
                        </button>
                    `).join('');
                } else {
                    document.getElementById('mainImage').innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                            <i class="fas fa-image text-gray-400 text-6xl"></i>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error loading item:', error);
            }
        }

        // Update main image when clicking thumbnails
        function updateMainImage(index) {
            document.getElementById('mainImage').innerHTML = `
                <img src="${item.photos[index]}" alt="${item.title}" class="w-full h-full object-cover">
            `;
        }

        // Setup user dropdown functionality
        function setupUserDropdown() {
            const userMenuButton = document.getElementById('userMenuButton');
            const userDropdown = document.getElementById('userDropdown');
            
            userMenuButton?.addEventListener('click', function() {
                userDropdown.classList.toggle('hidden');
            });
            
            // Close dropdown when clicking elsewhere
            document.addEventListener('click', function(event) {
                if (userMenuButton && !userMenuButton.contains(event.target) && 
                    userDropdown && !userDropdown.contains(event.target)) {
                    userDropdown.classList.add('hidden');
                }
            });
            
            // Setup logout button
            const logoutBtn = document.getElementById('logoutBtn');
            logoutBtn?.addEventListener('click', function() {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                window.location.reload();
            });
        }


        document.addEventListener('DOMContentLoaded', () => {

            checkAuth();
            loadItem();
            setupUserDropdown();
            // Remove the old rentButton event handler and instead call setupRentNowButton
            document.getElementById('rentNowBtn').addEventListener('click', async () => {
                const startDate = document.getElementById('rentStartDate').value;
                const endDate = document.getElementById('rentEndDate').value;
                
                // Check if dates are selected
                if (!startDate || !endDate) {
                    alert('Please select both start and end dates');
                    return;
                }
                
                // Check if dates are in correct order
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (end < start) {
                    alert('End date cannot be before start date');
                    return;
                }
                
                // Pass rental period to the modal flow
                window.getRentalPeriod = function() {
                    return {
                        startDate: startDate,
                        endDate: endDate
                    };
                };

                showPaymentOptions();
            });
        });



        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', async function() {
            try {
                // Call the server logout endpoint
                await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                    }
                });
            } catch (error) {
                console.error('Logout request failed:', error);
            } finally {
                // Clean up local storage and session storage
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                
                // Redirect to home page
                window.location.href = '/index.html';
            }
        });
        
// Payment and meeting setup functionality
function setupRentNowButton() {
    const rentNowBtn = document.getElementById('rentNowBtn');
    if (rentNowBtn) {
        // Clear any existing listeners
        rentNowBtn.removeEventListener('click', showPaymentOptions);
    }
}

function showPaymentOptions() {
    // Create modal for payment options
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'paymentModal';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 class="text-2xl font-bold mb-4">Payment Options</h2>
            <div class="space-y-4 mb-6">
                <!-- Cash option - clickable -->
                <div class="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition" id="cashOption">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-money-bill-wave text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold">Cash</h3>
                            <p class="text-sm text-gray-600">Pay with cash at the meeting</p>
                        </div>
                        <div class="ml-auto">
                            <input type="radio" name="paymentMethod" value="cash" checked>
                        </div>
                    </div>
                </div>
                
                <!-- Credit Card option - disabled -->
                <div class="border rounded-lg p-4 bg-gray-100 opacity-70">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-credit-card text-gray-500"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold">Credit Card</h3>
                            <p class="text-sm text-gray-600">Stay tuned for the next update</p>
                        </div>
                        <div class="ml-auto">
                            <input type="radio" name="paymentMethod" value="card" disabled>
                        </div>
                    </div>
                </div>
                
                <!-- PayPal option - disabled -->
                <div class="border rounded-lg p-4 bg-gray-100 opacity-70">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <i class="fab fa-paypal text-gray-500"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold">PayPal</h3>
                            <p class="text-sm text-gray-600">Stay tuned for the next update</p>
                        </div>
                        <div class="ml-auto">
                            <input type="radio" name="paymentMethod" value="paypal" disabled>
                        </div>
                    </div>
                </div>
            </div>
            
            <button id="continueToMeetingBtn" class="w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition">
                Continue
            </button>
            
            <button id="cancelPaymentBtn" class="w-full mt-2 text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition">
                Cancel
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('continueToMeetingBtn').addEventListener('click', showMeetingSetup);
    document.getElementById('cancelPaymentBtn').addEventListener('click', () => {
        document.getElementById('paymentModal').remove();
    });
    
    // Make only cash option clickable
    document.getElementById('cashOption').addEventListener('click', () => {
        const radioBtn = document.querySelector('input[value="cash"]');
        radioBtn.checked = true;
    });
}

function showMeetingSetup() {
    // Remove payment modal
    document.getElementById('paymentModal').remove();
    
    // Create meeting setup modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'meetingModal';
    
    // Get rental period
    const rentalPeriod = window.getRentalPeriod();
    const startDate = rentalPeriod.startDate;
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 class="text-2xl font-bold mb-4">Meeting Details</h2>
            <form id="meetingForm" class="space-y-4">
                <div class="select-none">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" id="meetingDate" class="w-full p-2 border rounded-lg bg-gray-100" value="${startDate}" readonly>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input type="time" id="meetingTime" class="w-full p-2 border rounded-lg" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" id="meetingLocation" class="w-full p-2 border rounded-lg" placeholder="e.g., NYU Bobst Library Entrance" required>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Additional Notes (Optional)</label>
                    <textarea id="meetingNotes" class="w-full p-2 border rounded-lg" rows="2" placeholder="Any additional information for the lender"></textarea>
                </div>
                
                <button type="submit" class="w-full bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 transition">
                    Submit Request
                </button>
                
                <button type="button" id="cancelMeetingBtn" class="w-full text-gray-600 py-2 px-4 rounded-lg hover:bg-gray-100 transition">
                    Cancel
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('meetingForm').addEventListener('submit', submitRentalRequest);
    document.getElementById('cancelMeetingBtn').addEventListener('click', () => {
        document.getElementById('meetingModal').remove();
    });
}

async function submitRentalRequest(e) {
    e.preventDefault();

    const meetingDate = document.getElementById('meetingDate').value;
    const meetingTime = document.getElementById('meetingTime').value;
    const meetingLocation = document.getElementById('meetingLocation').value;
    const meetingNotes = document.getElementById('meetingNotes').value;

    // Get the item ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');

    // Get rental period from the main page
    let startDate = '';
    let endDate = '';
    if (window.getRentalPeriod) {
        const period = window.getRentalPeriod();
        startDate = period.startDate;
        endDate = period.endDate;
    }

    // Get user token

    let userId;

    const token =sessionStorage.getItem('user');
    if (!token) {
        // Save current page for redirect after login
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        window.location.href = '/auth.html';
        return;
    }
        
    await fetch(`${API_URL}/auth/me`)
        .then(response => response.json())
        .then(data => {
            userId = data.user._id;
            console.log(userId);
        })  

    if (!userId) {
        alert('You must be logged in to rent an item');
        window.location.href = '/auth.html';
        return;
    }

    try {
        // Create rental request
        const response = await fetch(`${API_URL}/rentals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                itemId,
                paymentMethod: 'cash',
                meetingDate,
                meetingTime,
                meetingLocation,
                notes: meetingNotes,
                startDate,
                endDate,
                // Add chatHistory with the initial message from the renter
                chatHistory: [
                    {
                        sender: 'renter',
                        type: 'request',
                        timestamp: new Date().toISOString(),
                        rentalPeriod: {
                            startDate,
                            endDate
                        },
                        meetingDetails: {
                            location: meetingLocation,
                            date: meetingDate,
                            time: meetingTime,
                            notes: meetingNotes
                        },
                        message: 'Rental request sent'
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit rental request');
        }

        // Show success message
        document.getElementById('meetingModal').remove();
        showSuccessMessage();

    } catch (error) {
        alert(error.message || 'Something went wrong. Please try again.');
    }
}

function showSuccessMessage() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'successModal';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-check text-green-600 text-2xl"></i>
            </div>
            <h2 class="text-2xl font-bold mb-2">Request Sent!</h2>
            <p class="text-gray-600 mb-6">Your rental request has been sent to the lender. You'll be notified once they accept.</p>
            <button id="closeSuccessBtn" class="bg-primary-500 text-white py-2 px-6 rounded-lg hover:bg-primary-600 transition">
                Done
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('closeSuccessBtn').addEventListener('click', () => {
        document.getElementById('successModal').remove();
        window.location.href = '/';
    });
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupRentNowButton();
});
