// Screenshot Import Assistant - Main Integration
// Entry point for the screenshot import functionality

import { ScreenshotImportAssistant } from './screenshot-import-assistant.js';

export class ScreenshotImportUI {
  constructor() {
    this.assistant = null;
    this.uploadButton = null;
    this.modal = null;
    this.initialized = false;
    this.assistantReady = false;
    this.initializationError = null;
  }

  // Initialize the screenshot import UI (non-blocking)
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing Screenshot Import UI...');
      
      // Create UI immediately
      this.createUploadButton();
      this.createUploadModal();
      this.initialized = true;
      
      // Initialize assistant in the background
      this.initializeAssistantBackground();
      
      console.log('Screenshot Import UI created successfully');
      
      // Add to global scope for debugging
      if (window.location.search.includes('debug=true')) {
        window.screenshotImport = this;
      }
      
    } catch (error) {
      console.error('Failed to initialize Screenshot Import UI:', error);
      this.showError('Failed to initialize screenshot import feature');
    }
  }

  // Initialize assistant in background (EMERGENCY MINIMAL VERSION)
  async initializeAssistantBackground() {
    console.log('EMERGENCY: Starting minimal initialization - skipping all complex operations');
    
    // Skip ALL complex initialization for now
    setTimeout(() => {
      console.log('EMERGENCY: Enabling basic upload mode immediately');
      this.updateButtonState('fallback');
      this.assistantReady = false; // Explicitly false - we'll use basic mode only
    }, 100); // Very short delay to allow button to be created first
    
    // TODO: Re-enable complex initialization later in phases
    /*
    try {
      console.log('DEBUG: Loading screenshot recognition engine...');
      
      // Show loading state
      console.log('DEBUG: Updating button to loading state');
      this.updateButtonState('loading');
      
      // Initialize the assistant with timeout
      console.log('DEBUG: Creating ScreenshotImportAssistant...');
      this.assistant = new ScreenshotImportAssistant({
        confidenceThreshold: 0.75,
        enableDebugMode: window.location.search.includes('debug=true')
      });
      
      console.log('DEBUG: Assistant created, starting initialization...');
      
      // Add a race condition with timeout
      const initPromise = this.assistant.initialize();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.log('DEBUG: Assistant initialization timeout after 10 seconds');
          reject(new Error('Assistant initialization timeout after 10 seconds'));
        }, 10000);
      });
      
      console.log('DEBUG: Racing initialization vs timeout...');
      await Promise.race([initPromise, timeoutPromise]);
      
      console.log('DEBUG: Assistant initialization completed successfully');
      this.assistantReady = true;
      this.updateButtonState('ready');
      console.log('DEBUG: Screenshot recognition engine loaded successfully');
      
    } catch (error) {
      console.error('DEBUG: Failed to initialize screenshot assistant:', error);
      this.initializationError = error;
      
      console.log('DEBUG: Checking if should show fallback mode...');
      // Don't show error immediately, show fallback mode instead
      if (!this.uploadButton || !this.uploadButton.innerHTML.includes('Basic Upload')) {
        console.log('DEBUG: Updating to fallback mode');
        this.updateButtonState('fallback');
      }
    }
    */
  }

  // Update button state based on loading status
  updateButtonState(state) {
    console.log(`DEBUG: updateButtonState called with state: ${state}`);
    console.log('DEBUG: uploadButton exists?', !!this.uploadButton);
    
    if (!this.uploadButton) {
      console.error('DEBUG: Cannot update button state - uploadButton is null!');
      return;
    }
    
    console.log('DEBUG: Current button text before update:', this.uploadButton.innerHTML);
    
    switch (state) {
      case 'loading':
        this.uploadButton.innerHTML = '⏳ Loading Recognition Engine...';
        this.uploadButton.disabled = true;
        this.uploadButton.title = 'Please wait while the screenshot recognition engine loads';
        break;
      case 'ready':
        this.uploadButton.innerHTML = '📷 Import from Screenshot';
        this.uploadButton.disabled = false;
        this.uploadButton.title = 'Upload a screenshot to automatically import your build';
        break;
      case 'fallback':
        this.uploadButton.innerHTML = '📷 Basic Upload Mode';
        this.uploadButton.disabled = false;
        this.uploadButton.title = 'Upload screenshots (basic mode - advanced recognition loading in background)';
        this.uploadButton.classList.add('fallback-mode');
        break;
      case 'error':
        this.uploadButton.innerHTML = '⚠️ Recognition Unavailable';
        this.uploadButton.disabled = true;
        this.uploadButton.title = 'Screenshot recognition failed to load. Try refreshing the page.';
        break;
    }
    
    console.log('DEBUG: Button text after update:', this.uploadButton.innerHTML);
    console.log('DEBUG: Button disabled after update:', this.uploadButton.disabled);
  }

  // Create the upload button and integrate it into the page
  createUploadButton() {
    console.log('DEBUG: Starting createUploadButton()');
    
    // Find the best integration point
    const integrationPoints = [
      '.controls',
      '.cheatsheet-controls', 
      '#intro',
      'body'
    ];
    
    console.log('DEBUG: Looking for integration points...');
    let container = null;
    for (const selector of integrationPoints) {
      const element = document.querySelector(selector);
      console.log(`DEBUG: Checking selector "${selector}":`, element ? 'FOUND' : 'NOT FOUND');
      if (element) {
        container = element;
        console.log(`DEBUG: Selected container: ${selector}`);
        break;
      }
    }
    
    if (!container) {
      console.error('DEBUG: Could not find suitable container for upload button');
      console.log('DEBUG: Available elements in DOM:', document.querySelectorAll('*').length);
      return;
    }
    
    console.log('DEBUG: Creating upload button...');
    
    // Create upload button (initially in loading state)
    this.uploadButton = document.createElement('button');
    this.uploadButton.className = 'screenshot-upload-btn';
    this.uploadButton.innerHTML = '⏳ Loading Recognition Engine...';
    this.uploadButton.title = 'Please wait while the screenshot recognition engine loads';
    this.uploadButton.disabled = true;
    
    console.log('DEBUG: Button created:', this.uploadButton);
    
    // Add event listener
    this.uploadButton.addEventListener('click', () => {
      console.log('DEBUG: Button clicked!');
      this.handleButtonClick();
    });
    
    console.log('DEBUG: Event listener added');
    
    // Insert button appropriately
    let insertMethod = '';
    if (container.classList.contains('controls') || container.classList.contains('cheatsheet-controls')) {
      console.log('DEBUG: Inserting into existing controls container');
      container.appendChild(this.uploadButton);
      insertMethod = 'direct-append';
    } else {
      console.log('DEBUG: Creating wrapper and inserting');
      // Create a controls wrapper if needed
      const controlsWrapper = document.createElement('div');
      controlsWrapper.style.cssText = 'margin: 10px 0; text-align: center;';
      controlsWrapper.appendChild(this.uploadButton);
      container.appendChild(controlsWrapper);
      insertMethod = 'wrapper-append';
    }
    
    console.log(`DEBUG: Button inserted using method: ${insertMethod}`);
    console.log('DEBUG: Button in DOM?', document.contains(this.uploadButton));
    console.log('DEBUG: Button visible?', this.uploadButton.offsetParent !== null);
    console.log('DEBUG: Button parent:', this.uploadButton.parentElement);
  }

  // Handle button click (check readiness first)
  handleButtonClick() {
    // In fallback mode, allow upload but with limited functionality
    if (!this.assistantReady && this.uploadButton.innerHTML.includes('Basic Upload')) {
      this.showUploadModal('fallback');
      return;
    }
    
    if (!this.assistantReady) {
      if (this.initializationError) {
        this.showError(`Screenshot recognition is not available: ${this.initializationError.message}`);
      } else {
        this.showError('Screenshot recognition is still loading, please wait...');
      }
      return;
    }
    
    this.showUploadModal();
  }

  // Create upload modal
  createUploadModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'upload-modal';
    
    this.modal.innerHTML = `
      <div class="upload-modal-content">
        <h2>Import Build from Screenshot</h2>
        
        <div class="drop-zone" tabindex="0" role="button" aria-label="Upload screenshot">
          <div class="drop-zone-icon">📸</div>
          <div class="drop-zone-text">Drop screenshot here or click to browse</div>
          <div class="drop-zone-hint">Supports PNG and JPEG • Max 10MB</div>
        </div>
        
        <input type="file" accept="image/png,image/jpeg,image/jpg" style="display: none;" aria-label="Select screenshot file">
        
        <div class="progress-container">
          <div class="progress-stage">
            <span class="stage-text">Initializing...</span>
            <span class="progress-percentage">0%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
        </div>
        
        <canvas class="preview-canvas" style="display: none;"></canvas>
        
        <div class="modal-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Set up modal elements and events
    this.setupModal();
  }

  // Set up modal functionality
  setupModal() {
    const dropZone = this.modal.querySelector('.drop-zone');
    const fileInput = this.modal.querySelector('input[type="file"]');
    const progressContainer = this.modal.querySelector('.progress-container');
    const progressStage = this.modal.querySelector('.stage-text');
    const progressPercentage = this.modal.querySelector('.progress-percentage');
    const progressFill = this.modal.querySelector('.progress-fill');
    const previewCanvas = this.modal.querySelector('.preview-canvas');
    const cancelBtn = this.modal.querySelector('#cancel-btn');
    
    // Drop zone events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });
    
    // File input events
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
      this.hideUploadModal();
    });
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideUploadModal();
      }
    });
    
    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.hideUploadModal();
      }
    });
    
    // Store references
    this.modalElements = {
      dropZone,
      fileInput,
      progressContainer,
      progressStage,
      progressPercentage,
      progressFill,
      previewCanvas
    };
  }

  // Handle file upload (EMERGENCY MINIMAL VERSION)
  async handleFile(file) {
    console.log('EMERGENCY: Starting minimal file handling');
    const { dropZone, progressContainer, progressStage, progressPercentage, progressFill, previewCanvas } = this.modalElements;
    
    try {
      console.log('EMERGENCY: File received:', file.name, file.type, file.size);
      
      // Validate file
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        this.showError('Please upload a PNG or JPEG image');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        this.showError('File size must be less than 10MB');
        return;
      }
      
      console.log('EMERGENCY: File validation passed');
      
      // Show progress
      dropZone.style.display = 'none';
      progressContainer.classList.add('active');
      
      // MINIMAL MODE: Just show the image, no processing
      console.log('EMERGENCY: Loading image for preview only...');
      progressStage.textContent = 'Loading image for preview...';
      progressPercentage.textContent = '25%';
      progressFill.style.width = '25%';
      
      // Use simple image preview
      await this.showImagePreviewMinimal(file, previewCanvas);
      
      console.log('EMERGENCY: Image preview loaded successfully');
      progressStage.textContent = 'Image loaded! (Recognition features disabled in emergency mode)';
      progressPercentage.textContent = '100%';
      progressFill.style.width = '100%';
      progressStage.style.color = '#28a745';
      
      // Keep modal open longer so user can see the image
      setTimeout(() => {
        console.log('EMERGENCY: Hiding modal after image display');
        this.hideUploadModal();
      }, 5000);
      
    } catch (error) {
      console.error('EMERGENCY: File processing error:', error);
      this.showError(`Error: ${error.message}`);
      this.hideUploadModal();
    }
  }

  // Show image preview (EMERGENCY MINIMAL VERSION)
  async showImagePreviewMinimal(file, canvas) {
    console.log('EMERGENCY: Starting minimal image preview');
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          console.log('EMERGENCY: Image loaded, dimensions:', img.width, 'x', img.height);
          
          // Calculate display size (max 400px width to prevent memory issues)
          const maxWidth = 400;
          const scale = Math.min(maxWidth / img.width, 1);
          const displayWidth = Math.floor(img.width * scale);
          const displayHeight = Math.floor(img.height * scale);
          
          console.log('EMERGENCY: Display size:', displayWidth, 'x', displayHeight);
          
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          canvas.style.display = 'block';
          canvas.style.maxWidth = '100%';
          canvas.style.height = 'auto';
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          
          console.log('EMERGENCY: Image drawn to canvas successfully');
          resolve();
        } catch (error) {
          console.error('EMERGENCY: Error during image processing:', error);
          reject(error);
        }
      };
      img.onerror = (error) => {
        console.error('EMERGENCY: Image loading failed:', error);
        reject(error);
      };
      
      console.log('EMERGENCY: Creating object URL for image...');
      img.src = URL.createObjectURL(file);
    });
  }

  // Show image preview in fallback mode
  async showImagePreview(file, canvas) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate display size (max 500px width)
          const maxWidth = 500;
          const scale = Math.min(maxWidth / img.width, 1);
          const displayWidth = img.width * scale;
          const displayHeight = img.height * scale;
          
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          canvas.style.display = 'block';
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
          
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Apply matches to the cheatsheet
  applyMatches(result) {
    // Clear existing selections
    const checkboxes = document.querySelectorAll('input[type="checkbox"][data-hex-name], input[type="checkbox"][name]');
    checkboxes.forEach(cb => cb.checked = false);
    
    let appliedCount = 0;
    
    // Apply high confidence matches
    result.highConfidenceMatches.forEach(match => {
      const checkbox = this.findCheckboxForUpgrade(match.className);
      if (checkbox) {
        checkbox.checked = true;
        appliedCount++;
        
        // Add metadata for potential review mode
        const container = checkbox.closest('.hex, .hexagon, .upgrade-item');
        if (container) {
          container.dataset.importedMatch = 'true';
          container.dataset.confidence = match.confidence.toFixed(2);
        }
      }
    });
    
    // Update the cheatsheet display
    this.updateCheatsheetDisplay();
    
    console.log(`Applied ${appliedCount} matches to cheatsheet`);
  }

  // Find checkbox for upgrade (handles different naming conventions)
  findCheckboxForUpgrade(className) {
    // Try different selector patterns
    const selectors = [
      `input[data-hex-name="${className}"]`,
      `input[name="${className}"]`,
      `input[value="${className}"]`,
      `input.${className}`,
      `.hex.${className} input`,
      `.hexagon.${className} input`
    ];
    
    for (const selector of selectors) {
      const checkbox = document.querySelector(selector);
      if (checkbox) return checkbox;
    }
    
    return null;
  }

  // Update cheatsheet display
  updateCheatsheetDisplay() {
    // Try to call existing update functions
    if (typeof window.updateDisplay === 'function') {
      window.updateDisplay();
    }
    if (typeof window.updateURL === 'function') {
      window.updateURL();
    }
    
    // Trigger custom event for other integrations
    window.dispatchEvent(new CustomEvent('cheatsheetUpdated', {
      detail: { source: 'screenshotImport' }
    }));
  }

  // Format progress message
  formatProgressMessage(progress) {
    const messages = {
      loading: 'Loading image...',
      cropping: 'Detecting upgrade area...',
      preprocessing: 'Enhancing image quality...',
      extracting: 'Finding upgrade hexagons...',
      preparing: 'Preparing for recognition...',
      processing: 'Processing image...',
      recognizing: 'Recognizing upgrades...',
      analyzing: 'Analyzing results...',
      complete: 'Complete!'
    };
    
    return messages[progress.stage] || progress.message || 'Processing...';
  }

  // Show upload modal
  showUploadModal(mode = 'normal') {
    if (!this.modal) return;
    
    // Update modal content based on mode
    if (mode === 'fallback') {
      const modalTitle = this.modal.querySelector('h2');
      const dropZoneText = this.modal.querySelector('.drop-zone-text');
      const dropZoneHint = this.modal.querySelector('.drop-zone-hint');
      
      if (modalTitle) modalTitle.textContent = 'Basic Screenshot Upload';
      if (dropZoneText) dropZoneText.textContent = 'Drop screenshot here or click to browse';
      if (dropZoneHint) dropZoneHint.textContent = 'Basic mode - image will be displayed for manual review';
    }
    
    this.modal.classList.add('active');
    
    // Focus the drop zone for accessibility
    setTimeout(() => {
      this.modalElements.dropZone.focus();
    }, 100);
  }

  // Hide upload modal
  hideUploadModal() {
    if (!this.modal) return;
    
    this.modal.classList.remove('active');
    
    // Reset modal state
    setTimeout(() => {
      this.modalElements.dropZone.style.display = 'flex';
      this.modalElements.progressContainer.classList.remove('active');
      this.modalElements.progressFill.style.width = '0%';
      this.modalElements.fileInput.value = '';
      this.modalElements.previewCanvas.style.display = 'none';
    }, 300);
  }

  // Show success message
  showSuccess(result) {
    const message = `Successfully imported ${result.highConfidenceMatches.length} upgrades in ${result.processingTime.toFixed(0)}ms`;
    
    this.modalElements.progressStage.textContent = message;
    this.modalElements.progressStage.style.color = '#28a745';
  }

  // Show error message
  showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'status-message status-error';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // Get status information
  getStatus() {
    return {
      initialized: this.initialized,
      processing: this.assistant ? this.assistant.processing : false,
      capabilities: this.assistant ? this.assistant.getCapabilities() : null
    };
  }
}

// Auto-initialize when DOM is ready
let screenshotImportUI = null;

function initializeScreenshotImport() {
  if (screenshotImportUI) return;
  
  screenshotImportUI = new ScreenshotImportUI();
  screenshotImportUI.initialize().catch(error => {
    console.error('Failed to initialize screenshot import:', error);
  });
}

// Initialize based on DOM state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScreenshotImport);
} else {
  // DOM already loaded
  setTimeout(initializeScreenshotImport, 100);
}

// Add debug mode for development
if (window.location.search.includes('debug=true')) {
  console.log('Screenshot Import: Debug mode enabled');
  
  // Add global test functions
  window.testScreenshotImport = async () => {
    if (!screenshotImportUI) {
      console.log('Screenshot Import UI not initialized yet');
      return;
    }
    
    console.log('Status:', screenshotImportUI.getStatus());
    
    if (screenshotImportUI.assistant) {
      console.log('Assistant capabilities:', screenshotImportUI.assistant.getCapabilities());
    }
  };
  
  window.forceInitializeScreenshotImport = () => {
    initializeScreenshotImport();
  };
}

// Export for external access
export { screenshotImportUI };
export default ScreenshotImportUI;