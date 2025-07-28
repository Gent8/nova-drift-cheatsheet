/**
 * Screenshot Upload Handler Module
 * Main orchestrator for Nova Drift screenshot upload with modular architecture
 */
class ScreenshotUploadHandler {
  constructor(options = {}) {
    this.options = {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      maxDimensions: { width: 4096, height: 4096 },
      minDimensions: { width: 300, height: 200 },
      autoHideDropZone: true,
      enableKeyboardNavigation: true,
      ...options
    };
    
    this.state = {
      isUploading: false,
      currentFile: null,
      dropZoneVisible: false
    };

    this.elements = this.initializeElements();
    this.validator = new UploadValidator(this.options);
    this.progressIndicator = new ProgressIndicator(this.elements.container);
    
    this.canvasCleanupRegistry = new Set(); // Track canvases for memory management
    
    this.init();
  }

  /**
   * Initialize DOM elements with validation
   * @returns {Object} Element references
   */
  initializeElements() {
    const elements = {
      container: document.getElementById('screenshot-upload-container') || 
                 document.querySelector('[data-upload-container]'),
      button: document.getElementById('screenshot-upload-btn'),
      input: document.getElementById('screenshot-input'),
      dropZone: document.getElementById('screenshot-drop-zone'),
      errorDisplay: document.getElementById('upload-error') || 
                   document.querySelector('.upload-error')
    };

    // Validate required elements
    const missingElements = Object.entries(elements)
      .filter(([key, element]) => !element && key !== 'errorDisplay')
      .map(([key]) => key);
    
    if (missingElements.length > 0) {
      throw new Error(`ScreenshotUploadHandler: Missing required DOM elements: ${missingElements.join(', ')}`);
    }

    return elements;
  }

  /**
   * Initialize the upload handler
   */
  init() {
    this.setupEventListeners();
    
    if (this.options.enableKeyboardNavigation) {
      this.bindKeyboardHandlers();
    }
    
    this.setupAccessibility();
    
    console.log('Screenshot upload handler initialized with modular architecture');
  }

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Button click handler
    this.elements.button.addEventListener('click', this.handleUploadButtonClick.bind(this));
    
    // File input change
    this.elements.input.addEventListener('change', this.handleFileInputChange.bind(this));
    
    // Drag and drop
    this.setupDragAndDrop();
    
    // Progress events
    this.elements.container.addEventListener('upload-progress', this.handleProgressEvent.bind(this));
  }

  /**
   * Set up drag and drop functionality
   */
  setupDragAndDrop() {
    const { dropZone } = this.elements;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.preventDefaults.bind(this), false);
      document.body.addEventListener(eventName, this.preventDefaults.bind(this), false);
    });
    
    // Visual feedback events
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.handleDragEnter.bind(this), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.handleDragLeave.bind(this), false);
    });
    
    // File processing
    dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
    dropZone.addEventListener('click', this.handleDropZoneClick.bind(this), false);
  }

  /**
   * Set up keyboard navigation
   */
  bindKeyboardHandlers() {
    this.elements.dropZone.addEventListener('keydown', this.handleDropZoneKeydown.bind(this));
    
    // Global escape key to close drop zone
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.dropZoneVisible) {
        this.hideDropZone();
      }
    });
  }

  /**
   * Set up accessibility attributes
   */
  setupAccessibility() {
    const { dropZone, button, input } = this.elements;
    
    // Ensure proper ARIA attributes
    if (!dropZone.hasAttribute('role')) {
      dropZone.setAttribute('role', 'button');
    }
    
    if (!dropZone.hasAttribute('tabindex')) {
      dropZone.setAttribute('tabindex', '0');
    }
    
    if (!dropZone.hasAttribute('aria-label')) {
      dropZone.setAttribute('aria-label', 'Drop screenshot here or click to browse');
    }
    
    // Link input to help text
    const helpText = document.getElementById('upload-help');
    if (helpText && !input.hasAttribute('aria-describedby')) {
      input.setAttribute('aria-describedby', 'upload-help');
    }
  }

  /**
   * Handle upload button click
   */
  handleUploadButtonClick() {
    if (this.state.isUploading) return;
    
    if (!this.state.dropZoneVisible) {
      this.showDropZone();
    } else {
      this.elements.input.click();
    }
  }

  /**
   * Handle file input change
   */
  handleFileInputChange(event) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files);
    }
  }

  /**
   * Handle drop zone click
   */
  handleDropZoneClick() {
    if (this.state.isUploading) return;
    this.elements.input.click();
  }

  /**
   * Handle drop zone keyboard navigation
   */
  handleDropZoneKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleDropZoneClick();
    } else if (event.key === 'Escape') {
      this.hideDropZone();
    }
  }

  /**
   * Handle drag enter event
   */
  handleDragEnter(event) {
    event.preventDefault();
    this.elements.dropZone.classList.add('drag-over');
  }

  /**
   * Handle drag leave event
   */
  handleDragLeave(event) {
    event.preventDefault();
    // Only remove drag-over if we're actually leaving the drop zone
    if (!this.elements.dropZone.contains(event.relatedTarget)) {
      this.elements.dropZone.classList.remove('drag-over');
    }
  }

  /**
   * Handle file drop
   */
  handleDrop(event) {
    event.preventDefault();
    this.elements.dropZone.classList.remove('drag-over');
    
    if (this.state.isUploading) return;
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files);
    }
  }

  /**
   * Handle file selection from any source
   * @param {FileList} files - Selected files
   */
  async handleFileSelection(files) {
    if (files.length === 0) return;
    
    const file = files[0]; // Only handle first file
    this.state.isUploading = true;
    this.state.currentFile = file;
    
    try {
      this.progressIndicator.updateProgress('uploading', 10, 'Validating file...');
      
      const validationResult = await this.validator.validateFile(file);
      
      if (!validationResult.valid) {
        this.handleValidationError(validationResult.error);
        return;
      }
      
      this.progressIndicator.updateProgress('processing', 50, 'Preparing image...');
      
      // Process the validated file
      await this.processValidatedFile(file, validationResult.dimensions);
      
    } catch (error) {
      this.handleProcessingError(error);
    } finally {
      this.state.isUploading = false;
    }
  }

  /**
   * Process a validated file
   * @param {File} file - The validated file
   * @param {Object} dimensions - Image dimensions
   */
  async processValidatedFile(file, dimensions) {
    this.progressIndicator.updateProgress('processing', 70, 'Creating image data...');
    
    // Create canvas and process image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Register canvas for cleanup
    this.canvasCleanupRegistry.add(canvas);
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const dataUrl = canvas.toDataURL(file.type);
          
          this.progressIndicator.updateProgress('processing', 90, 'Finalizing...');
          
          // Simulate processing time for smooth UX
          setTimeout(() => {
            this.progressIndicator.updateProgress('complete', 100, 'Upload complete!');
            
            this.onFileReady({
              file,
              dimensions: { width: img.width, height: img.height },
              metadata: {
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
                dataUrl
              }
            });
            
            // Clean up the canvas immediately after use to free up memory
            this.cleanupCanvas(canvas);

            // Auto-hide after success
            if (this.options.autoHideDropZone) {
              setTimeout(() => {
                this.hideDropZone();
              }, 1500);
            }
            
            resolve();
          }, 300);
          
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for processing'));
      };

      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Handle validation errors with structured error display
   * @param {Object} error - Structured error object
   */
  handleValidationError(error) {
    this.progressIndicator.showError(error.message);
    this.showStructuredError(error);
    console.warn('Upload validation failed:', error);
  }

  /**
   * Handle processing errors
   * @param {Error} error - Processing error
   */
  handleProcessingError(error) {
    const structuredError = {
      code: 'PROCESSING_ERROR',
      message: 'Failed to process the uploaded file.',
      action: 'Please try again with a different image.',
      details: error.message
    };
    
    this.progressIndicator.showError(structuredError.message);
    this.showStructuredError(structuredError);
    console.error('Upload processing failed:', error);
  }

  /**
   * Show structured error with user action guidance
   * @param {Object} error - Structured error object
   */
  showStructuredError(error) {
    if (this.elements.errorDisplay) {
      const errorText = this.elements.errorDisplay.querySelector('.error-text');
      if (errorText) {
        errorText.textContent = `${error.message} ${error.action}`;
      }
      this.elements.errorDisplay.style.display = 'flex';
    }
  }

  /**
   * Handle successful file processing
   * @param {Object} fileData - Processed file data
   */
  onFileReady(fileData) {
    // Show manual crop interface (Phase 1 primary workflow)
    if (window.manualCropInterface) {
      window.manualCropInterface.show(fileData);
    } else {
      console.warn('Manual crop interface not available, falling back to event emission');
      // Fallback: Emit custom event for legacy integration
      const event = new CustomEvent('screenshot-ready', {
        detail: fileData
      });
      document.dispatchEvent(event);
    }
    
    console.log('Screenshot processed successfully:', {
      name: fileData.file.name,
      size: fileData.file.size,
      dimensions: `${fileData.dimensions.width}x${fileData.dimensions.height}`
    });
  }

  /**
   * Show the drop zone
   */
  showDropZone() {
    this.elements.dropZone.style.display = 'flex';
    this.state.dropZoneVisible = true;
    this.elements.button.textContent = '📁 Browse Files';
    this.hideError();
    this.progressIndicator.reset();
  }

  /**
   * Hide the drop zone and reset state
   */
  hideDropZone() {
    this.elements.dropZone.style.display = 'none';
    this.state.dropZoneVisible = false;
    this.elements.button.textContent = '📷 Upload Screenshot';
    this.elements.input.value = ''; // Reset file input
    this.hideError();
    this.progressIndicator.reset();
    this.cleanupCanvases(); // Clean up any remaining canvases
  }

  /**
   * Hide error display
   */
  hideError() {
    if (this.elements.errorDisplay) {
      this.elements.errorDisplay.style.display = 'none';
    }
  }

  /**
   * Handle progress events for external monitoring
   * @param {CustomEvent} event - Progress event
   */
  handleProgressEvent(event) {
    // Placeholder for external progress monitoring
    console.debug('Upload progress:', event.detail);
  }

  /**
   * Prevent default drag behavior
   * @param {Event} event - Drag event
   */
  preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Clean up a specific canvas
   * @param {HTMLCanvasElement} canvas - Canvas to clean up
   */
  cleanupCanvas(canvas) {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 1;
      canvas.height = 1;
      this.canvasCleanupRegistry.delete(canvas);
    }
  }

  /**
   * Clean up all registered canvases for memory management
   */
  cleanupCanvases() {
    this.canvasCleanupRegistry.forEach(canvas => {
      this.cleanupCanvas(canvas);
    });
    this.canvasCleanupRegistry.clear();
  }

  /**
   * Get current state for debugging and testing
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset the upload handler to initial state
   */
  reset() {
    this.state = {
      isUploading: false,
      currentFile: null,
      dropZoneVisible: false
    };
    
    this.hideDropZone();
    this.cleanupCanvases();
  }

  /**
   * Destroy the upload handler and clean up resources
   */
  destroy() {
    this.cleanupCanvases();
    this.progressIndicator.destroy();
    
    // Remove event listeners would go here if we tracked them
    // For now, elements will be garbage collected when DOM is cleaned
  }
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenshotUploadHandler;
} else {
  window.ScreenshotUploadHandler = ScreenshotUploadHandler;
}
