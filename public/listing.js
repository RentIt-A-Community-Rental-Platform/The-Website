// Constants
const API_URL = 'http://localhost:3000';

// Bypass authentication - set dummy user data
const DUMMY_USER = {
    id: '123',
    email: 'test@test.com',
    name: 'Test User'
};
const DUMMY_TOKEN = 'dummy-token-123';

// Store dummy auth data
sessionStorage.setItem('token', DUMMY_TOKEN);
sessionStorage.setItem('user', JSON.stringify(DUMMY_USER));

// State management
let currentStep = 1;
let selectedCategory = '';
let uploadedPhotos = [];
let formData = {
    category: '',
    photos: [],
    title: '',
    description: '',
    price: '',
    deposit: ''
};

// DOM Elements
const progressBar = document.getElementById('progressBar');
const stepIndicators = document.querySelectorAll('.step-indicator');
const stepContents = document.querySelectorAll('.step-content');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const categoryBtns = document.querySelectorAll('.category-btn');
const dropZone = document.getElementById('dropZone');
const photoInput = document.getElementById('photoInput');
const previewContainer = document.getElementById('previewContainer');

// Event Listeners
categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active state from all buttons
        categoryBtns.forEach(b => b.classList.remove('bg-primary-50', 'border-primary-500'));
        // Add active state to clicked button
        btn.classList.add('bg-primary-50', 'border-primary-500');
        selectedCategory = btn.dataset.category;
        formData.category = btn.querySelector('span').textContent;
        nextBtn.disabled = false;
    });
});

// Photo upload handling
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('border-primary-500', 'bg-primary-50');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('border-primary-500', 'bg-primary-50');
    });
});

dropZone.addEventListener('drop', handleDrop);
photoInput.addEventListener('change', handleFiles);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

async function analyzeImageWithGemini(imageFile) {
    try {
        // Convert image file to base64
        const base64Image = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(imageFile);
        });

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GEMINI_API_KEY}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "Analyze this image and provide a JSON response with the following fields: title (a concise item title), description (detailed item description), suggestedPrice (suggested daily rental price in USD). Focus on the main item in the image and its rental potential."
                    }, {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze image');
        }

        const data = await response.json();
        const analysisText = data.candidates[0].content.parts[0].text;
        
        // Parse the JSON response from the text
        const analysisResult = JSON.parse(analysisText);
        
        // Auto-fill the form
        document.getElementById('title').value = analysisResult.title;
        document.getElementById('description').value = analysisResult.description;
        document.getElementById('price').value = analysisResult.suggestedPrice;
        document.getElementById('deposit').value = Math.round(analysisResult.suggestedPrice * 5); // Set deposit as 5x daily rate
        
        // Update formData
        formData.title = analysisResult.title;
        formData.description = analysisResult.description;
        formData.price = analysisResult.suggestedPrice;
        formData.deposit = Math.round(analysisResult.suggestedPrice * 5);
        
        // Enable next button since we've filled the form
        nextBtn.disabled = false;
        
    } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Failed to analyze image. Please fill in the details manually.');
    }
}

// Update handleFiles function to include image analysis
function handleFiles(e) {
    const files = [...e.target.files];
    uploadedPhotos = files;
    formData.photos = files;
    
    // Clear preview container
    previewContainer.innerHTML = '';
    
    // Preview images and analyze the first image
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.createElement('div');
            preview.className = 'relative';
            preview.innerHTML = `
                <img src="${e.target.result}" class="w-full h-32 object-cover rounded-lg">
                <button class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(preview);
            
            // Analyze first image only
            if (index === 0) {
                analyzeImageWithGemini(file);
            }
        };
        reader.readAsDataURL(file);
    });

    nextBtn.disabled = files.length === 0;
}

// Form handling
document.getElementById('itemDetailsForm').addEventListener('input', (e) => {
    formData[e.target.id] = e.target.value;
    const isFormValid = validateForm();
    nextBtn.disabled = !isFormValid;
});

function validateForm() {
    const { title, description, price, deposit } = formData;
    return title && description && price && deposit;
}

// Navigation
prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentStep < 4) {
        goToStep(currentStep + 1);
    }
});

submitBtn.addEventListener('click', async () => {
    try {
        console.log('Starting listing submission...');
        
        // Create a regular object for the item data
        const itemData = {
            title: formData.title,
            description: formData.description,
            price: parseFloat(formData.price),
            category: formData.category,
            deposit: parseFloat(formData.deposit)
        };

        console.log('Sending data:', itemData);

        const response = await fetch(`${API_URL}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DUMMY_TOKEN}` // Always use dummy token
            },
            body: JSON.stringify(itemData)
        });

        console.log('Response status:', response.status);
        
        if (response.ok) {
            console.log('Listing created successfully');
            
            // Handle photo uploads separately if needed
            if (formData.photos.length > 0) {
                const photoData = new FormData();
                formData.photos.forEach((photo, index) => {
                    photoData.append('photos', photo);
                });
                
                // Upload photos
                const photoResponse = await fetch(`${API_URL}/items/${response.id}/photos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${DUMMY_TOKEN}` // Always use dummy token
                    },
                    body: photoData
                });
                
                if (!photoResponse.ok) {
                    console.warn('Failed to upload photos:', await photoResponse.text());
                }
            }
            
            alert('Listing created successfully!');
            window.location.href = '/';
        } else {
            const errorData = await response.text();
            console.error('Server responded with error:', errorData);
            throw new Error(errorData || 'Failed to create listing');
        }
    } catch (error) {
        console.error('Error creating listing:', error);
        alert(`Failed to create listing: ${error.message}`);
    }
});

function goToStep(step) {
    // Update current step
    currentStep = step;
    
    // Update progress bar
    progressBar.style.width = `${(step - 1) * 33.33}%`;
    
    // Update step indicators
    stepIndicators.forEach((indicator, index) => {
        if (index + 1 === step) {
            indicator.classList.add('text-primary-600');
            indicator.classList.remove('text-gray-400');
        } else if (index + 1 < step) {
            indicator.classList.add('text-primary-600');
            indicator.classList.remove('text-gray-400');
        } else {
            indicator.classList.remove('text-primary-600');
            indicator.classList.add('text-gray-400');
        }
    });
    
    // Show/hide step content
    stepContents.forEach((content, index) => {
        if (index + 1 === step) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
    
    // Update navigation buttons
    prevBtn.classList.toggle('hidden', step === 1);
    nextBtn.classList.toggle('hidden', step === 4);
    submitBtn.classList.toggle('hidden', step !== 4);
    
    // Update review content if on last step
    if (step === 4) {
        updateReview();
    }
}

function updateReview() {
    document.getElementById('reviewCategory').textContent = formData.category;
    document.getElementById('reviewTitle').textContent = formData.title;
    document.getElementById('reviewDescription').textContent = formData.description;
    document.getElementById('reviewPrice').textContent = `$${formData.price}/day`;
    document.getElementById('reviewDeposit').textContent = `$${formData.deposit}`;
    
    // Display photo previews
    const reviewPhotos = document.getElementById('reviewPhotos');
    reviewPhotos.innerHTML = '';
    formData.photos.forEach(photo => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'w-full h-48 object-cover rounded-lg mb-4';
            reviewPhotos.appendChild(img);
        };
        reader.readAsDataURL(photo);
    });
}

// Initialize
nextBtn.disabled = true; 