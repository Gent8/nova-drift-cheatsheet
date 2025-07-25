/**
 * Nova Drift Screenshot Upload Feature - Phase 1
 * Handles file upload, validation, and user interface for screenshot-based preset recognition
 */

(function(global) {
  'use strict';

  // File constraints
  const FILE_CONSTRAINTS = {
    maxSize: 10 * 1024 * 1024,     // 10MB maximum
    minSize: 1024,                  // 1KB minimum
    allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
    maxDimensions: { width: 4096, height: 4096 },
    minDimensions: { width: 300, height: 200 }
  };

  // UI element references
  let elements = {};

  // State management
  let uploadState = {
    isUploading: false,
    currentFile: null,
    dropZoneVisible: false
  };

  /**
   * Initialize the upload feature
   */
  function init() {
    // Get DOM elements
    elements = {
      uploadBtn: document.getElementById('screenshot-upload-btn'),
      fileInput: document.getElementById('screenshot-input'),
      dropZone: document.getElementById('screenshot-drop-zone'),
      progressContainer: document.getElementById('upload-progress'),
      progressFill: document.getElementById('progress-fill'),
      progressText: document.getElementById('progress-text'),
      errorContainer: document.getElementById('upload-error'),
      errorText: document.getElementById('error-text'),
      errorClose: document.getElementById('error-close')
    };

    // Check if all elements exist
    const missingElements = Object.entries(elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);
    
    if (missingElements.length > 0) {
      console.error('Upload feature: Missing DOM elements:', missingElements);
      return;
    }

    // Set up event listeners
    setupEventListeners();
    
    console.log('Screenshot upload feature initialized');
  }

  /**
   * Set up all event listeners
   */
  function setupEventListeners() {
    // Upload button click
    elements.uploadBtn.addEventListener('click', handleUploadButtonClick);
    
    // File input change
    elements.fileInput.addEventListener('change', handleFileInputChange);
    
    // Drop zone events
    elements.dropZone.addEventListener('click', handleDropZoneClick);
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('drop', handleDrop);
    elements.dropZone.addEventListener('dragenter', handleDragEnter);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    
    // Keyboard navigation for drop zone
    elements.dropZone.addEventListener('keydown', handleDropZoneKeydown);
    
    // Error close button
    elements.errorClose.addEventListener('click', hideError);
    
    // Global drag events to prevent default browser behavior
    document.addEventListener('dragover', preventDefaultDrag);
    document.addEventListener('drop', preventDefaultDrag);
  }

  /**
   * Handle upload button click
   */
  function handleUploadButtonClick() {
    if (uploadState.isUploading) return;
    
    if (!uploadState.dropZoneVisible) {
      showDropZone();
    } else {
      // Trigger file picker
      elements.fileInput.click();
    }
  }

  /**
   * Handle file input change
   */
  function handleFileInputChange(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  /**
   * Handle drop zone click
   */
  function handleDropZoneClick() {
    if (uploadState.isUploading) return;
    elements.fileInput.click();
  }

  /**
   * Handle drag over event
   */
  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  /**
   * Handle drag enter event
   */
  function handleDragEnter(event) {
    event.preventDefault();
    elements.dropZone.classList.add('drag-over');
  }

  /**
   * Handle drag leave event
   */
  function handleDragLeave(event) {
    event.preventDefault();
    // Only remove drag-over if we're actually leaving the drop zone
    if (!elements.dropZone.contains(event.relatedTarget)) {
      elements.dropZone.classList.remove('drag-over');
    }
  }

  /**
   * Handle drop event
   */
  function handleDrop(event) {
    event.preventDefault();
    elements.dropZone.classList.remove('drag-over');
    
    if (uploadState.isUploading) return;
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  /**
   * Handle keyboard navigation for drop zone
   */
  function handleDropZoneKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDropZoneClick();
    } else if (event.key === 'Escape') {
      hideDropZone();
    }
  }

  /**
   * Prevent default drag behavior on document
   */
  function preventDefaultDrag(event) {
    // Allow drops only on our drop zone
    if (!elements.dropZone.contains(event.target)) {
      event.preventDefault();
    }
  }

  /**
   * Show the drop zone
   */
  function showDropZone() {
    elements.dropZone.style.display = 'flex';
    uploadState.dropZoneVisible = true;
    elements.uploadBtn.textContent = '📁 Browse Files';
    hideError();
  }

  /**
   * Hide the drop zone
   */
  function hideDropZone() {
    elements.dropZone.style.display = 'none';
    uploadState.dropZoneVisible = false;
    elements.uploadBtn.textContent = '📷 Upload Screenshot';
    hideProgress();
    hideError();
  }

  /**
   * Show progress indicator
   */
  function showProgress(text = 'Processing...') {
    elements.progressContainer.style.display = 'flex';
    elements.progressText.textContent = text;
    elements.progressFill.style.width = '0%';
    hideError();
  }

  /**
   * Update progress
   */
  function updateProgress(percentage, text) {
    elements.progressFill.style.width = percentage + '%';
    if (text) {
      elements.progressText.textContent = text;
    }
  }

  /**
   * Hide progress indicator
   */
  function hideProgress() {
    elements.progressContainer.style.display = 'none';
  }

  /**
   * Show error message
   */
  function showError(message) {
    elements.errorText.textContent = message;
    elements.errorContainer.style.display = 'flex';
    hideProgress();
  }

  /**
   * Hide error message
   */
  function hideError() {
    elements.errorContainer.style.display = 'none';
  }

  /**
   * Validate file against constraints
   */
  function validateFile(file) {
    // Check file type
    if (!FILE_CONSTRAINTS.allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a PNG or JPG image.';
    }

    // Check file size
    if (file.size > FILE_CONSTRAINTS.maxSize) {
      return `File too large. Maximum size is ${(FILE_CONSTRAINTS.maxSize / 1024 / 1024).toFixed(1)}MB.`;
    }

    if (file.size < FILE_CONSTRAINTS.minSize) {
      return 'File too small. Please upload a valid image file.';
    }

    return null; // Valid
  }

  /**
   * Validate image dimensions
   */
  function validateImageDimensions(img) {
    const { width, height } = img;
    
    if (width > FILE_CONSTRAINTS.maxDimensions.width || height > FILE_CONSTRAINTS.maxDimensions.height) {
      return `Image too large. Maximum dimensions are ${FILE_CONSTRAINTS.maxDimensions.width}x${FILE_CONSTRAINTS.maxDimensions.height}px.`;
    }

    if (width < FILE_CONSTRAINTS.minDimensions.width || height < FILE_CONSTRAINTS.minDimensions.height) {
      return `Image too small. Minimum dimensions are ${FILE_CONSTRAINTS.minDimensions.width}x${FILE_CONSTRAINTS.minDimensions.height}px.`;
    }

    return null; // Valid
  }

  /**
   * Process uploaded file
   */
  function processFile(file) {
    if (uploadState.isUploading) return;

    // Basic validation
    const validationError = validateFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    uploadState.isUploading = true;
    uploadState.currentFile = file;
    
    showProgress('Loading image...');
    updateProgress(10, 'Loading image...');

    // Create image object to validate dimensions and prepare for processing
    const img = new Image();
    
    img.onload = function() {
      updateProgress(40, 'Validating image...');
      
      // Validate dimensions
      const dimensionError = validateImageDimensions(img);
      if (dimensionError) {
        uploadState.isUploading = false;
        showError(dimensionError);
        return;
      }

      updateProgress(70, 'Preparing image...');
      
      // Create data URL for immediate use
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL(file.type);
      
      updateProgress(90, 'Finalizing...');
      
      // Simulate processing time for smooth UX
      setTimeout(() => {
        updateProgress(100, 'Complete!');
        
        // Dispatch custom event for next phases
        const uploadCompleteEvent = new CustomEvent('screenshot-ready', {
          detail: {
            file: file,
            dimensions: { width: img.width, height: img.height },
            metadata: {
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              dataUrl: dataUrl
            }
          }
        });
        
        document.dispatchEvent(uploadCompleteEvent);
        
        // Reset state after short delay
        setTimeout(() => {
          uploadState.isUploading = false;
          hideDropZone();
          console.log('Screenshot uploaded successfully:', {
            name: file.name,
            size: file.size,
            dimensions: `${img.width}x${img.height}`
          });
        }, 1000);
        
      }, 300);
    };

    img.onerror = function() {
      uploadState.isUploading = false;
      showError('Failed to load image. Please check the file and try again.');
    };

    // Load the image
    const reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
    };
    reader.onerror = function() {
      uploadState.isUploading = false;
      showError('Failed to read file. Please try again.');
    };
    
    reader.readAsDataURL(file);
  }

  /**
   * Get current upload state (for testing/debugging)
   */
  function getState() {
    return { ...uploadState };
  }

  /**
   * Reset upload feature to initial state
   */
  function reset() {
    uploadState = {
      isUploading: false,
      currentFile: null,
      dropZoneVisible: false
    };
    
    hideDropZone();
    elements.fileInput.value = '';
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose public API for testing and future phases
  global.NovaScreenshotUpload = {
    init: init,
    reset: reset,
    getState: getState,
    showDropZone: showDropZone,
    hideDropZone: hideDropZone
  };

})(window);
