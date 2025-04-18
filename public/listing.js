// Constants
const API_URL = 'http://localhost:3000';

// Bypass authentication - set dummy user data
// const DUMMY_USER = {
//     id: '123',
//     email: 'test@test.com',
//     name: 'Test User'
// };
// const DUMMY_TOKEN = 'dummy-token-123';

// // Store dummy auth data
// sessionStorage.setItem('token', DUMMY_TOKEN);
// sessionStorage.setItem('user', JSON.stringify(DUMMY_USER));

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
    const overlay = document.getElementById('aiLoadingOverlay');
    try {
      overlay.classList.remove('hidden'); // 👈 show overlay
  
      const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(imageFile);
      });
  
      const response = await fetch(`${API_URL}/api/gemini/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Image })
      });
  
      if (!response.ok) throw new Error('Failed to analyze image');
  
      const analysisResult = await response.json();
  
      // Fill out the form
      document.getElementById('title').value = analysisResult.title;
      document.getElementById('description').value = analysisResult.description;
      document.getElementById('price').value = analysisResult.suggestedPrice;
      document.getElementById('deposit').value = Math.round(analysisResult.suggestedPrice * 5);
  
      formData.title = analysisResult.title;
      formData.description = analysisResult.description;
      formData.price = analysisResult.suggestedPrice;
      formData.deposit = Math.round(analysisResult.suggestedPrice * 5);
  
      // Set category in dropdown
      const categoryDropdown = document.getElementById('category');
      const options = Array.from(categoryDropdown.options);
      let matchFound = false;
  
      options.forEach(option => {
        if (option.value.toLowerCase() === analysisResult.category.toLowerCase()) {
          option.selected = true;
          formData.category = option.value;
          matchFound = true;
        }
      });
  
      if (!matchFound) {
        categoryDropdown.value = 'Other';
        formData.category = 'Other';
      }
  
      // Hide overlay and move to next step
      overlay.classList.add('hidden');
      goToStep(2); // 👈 jump to Item Details step (adjust if different)
  
    } catch (error) {
      overlay.classList.add('hidden');
      console.error('Error analyzing image:', error);
      alert('Failed to analyze image. Please fill in the details manually.');
    }
  }
  

async function compressImage(file) {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };
    return await window.imageCompression(file, options);
  }

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('image', file);

    let response = {}
    try {
        response = await fetch(`${API_URL}/api/upload-image`, {
        method: 'POST',
        body: formData
        });
    
        if (!response.ok) {
            const { error } = await response.json();
            throw new Error(error || 'Upload failed');
        }
    } catch (err) {
      alert(err.message); // or show it in your UI
    }
    const data = await response.json();
    return data.secure_url;
  }

  function handleFiles(e) {
    const input = e.target;
    const files = [...e.target.files];

    const maxFileSizeMB = 10;

    // Check for large files
    for (const file of files) {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxFileSizeMB) {
        alert(`"${file.name}" is too large (${sizeMB.toFixed(2)} MB). Please upload images under ${maxFileSizeMB}MB.`);
        input.value = '';
        return; // Stop handling if any file is too big
        }
    }
    
    uploadedPhotos = files;
    formData.photos = files;
  
    previewContainer.innerHTML = '';
  
    const itemDetailsImage = document.getElementById('itemDetailsImage');
    const itemDetailsPreview = document.getElementById('itemDetailsPreview');
  
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const imageUrl = e.target.result;
  
        // Show preview in dropzone area
        const preview = document.createElement('div');
        preview.className = 'relative';
        preview.innerHTML = `
          <img src="${imageUrl}" class="w-full h-32 object-cover rounded-lg">
          <button class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
            <i class="fas fa-times"></i>
          </button>
        `;
        previewContainer.appendChild(preview);
  
        // Set the image in Item Details view
        if (index === 0) {
          itemDetailsImage.src = imageUrl;
          itemDetailsPreview.classList.remove('hidden');
          analyzeImageWithGemini(file); // run AI analysis
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
    const { title, description, price, deposit, category } = formData;
    return title && description && price && deposit && category;
  }
  

// Navigation
prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentStep < 3) {
        goToStep(currentStep + 1);
    }
});

submitBtn.addEventListener('click', async () => {
  try {
    document.getElementById('submitLoadingOverlay').classList.remove('hidden');
    console.log('Uploading photos to Cloudinary...');
    
    const photoUploadPromises = formData.photos.map(file => compressImage(file).then(uploadToCloudinary));
    const photoUrls = await Promise.all(photoUploadPromises);
      
    const itemData = {
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      deposit: parseFloat(formData.deposit),
      photos: photoUrls
    };

    // // Get actual token from session storage
    // const token = localStorage.getItem('token');
    
    // if (!token) {
    //   throw new Error('Not authenticated');
    // }

    const response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(itemData)
    });

    if (response.ok) {
      console.log('Listing created successfully');
      document.getElementById('submitLoadingOverlay').classList.add('hidden');
      window.location.href = '/';
    } else {
      const errorText = await response.text();
      throw new Error(errorText);
    }
  } catch (err) {
    console.error('Upload or submission failed:', err);
    alert(`Error: ${err.message}`);
    
    // Redirect to login if authentication error
    if (err.message === 'Not authenticated') {
      window.location.href = '/auth.html?redirect=listing.html';
    }
  }
});


function goToStep(step) {
    // Update current step
    currentStep = step;
    
    // Update progress bar
    progressBar.style.width = `${(step) * 33.33}%`;
    
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
    nextBtn.classList.toggle('hidden', step === 3);
    submitBtn.classList.toggle('hidden', step !== 3);
    
    
    // Update review content if on last step
    if (step === 3) {
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