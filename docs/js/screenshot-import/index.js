// Screenshot Import Assistant - Main Integration
// Entry point for the screenshot import functionality

import { ScreenshotImportAssistant } from './screenshot-import-assistant.js';

export class ScreenshotImportUI {
  constructor() {
    this.assistant = null;
    this.uploadButton = null;
    this.modal = null;
    this.initialized = false;
  }

  // Initialize the screenshot import UI
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing Screenshot Import UI...');
      
      // Initialize the assistant
      this.assistant = new ScreenshotImportAssistant({
        confidenceThreshold: 0.75,
        enableDebugMode: window.location.search.includes('debug=true')
      });
      
      await this.assistant.initialize();
      
      // Create and integrate UI elements
      this.createUploadButton();
      this.createUploadModal();
      
      this.initialized = true;
      console.log('Screenshot Import UI initialized successfully');
      
      // Add to global scope for debugging
      if (window.location.search.includes('debug=true')) {
        window.screenshotImport = this;
      }
      
    } catch (error) {
      console.error('Failed to initialize Screenshot Import UI:', error);
      this.showError('Failed to initialize screenshot import feature');
    }
  }

  // Create the upload button and integrate it into the page
  createUploadButton() {
    // Find the best integration point
    const integrationPoints = [
      '.controls',
      '.cheatsheet-controls', 
      '#intro',
      'body'
    ];
    
    let container = null;
    for (const selector of integrationPoints) {
      container = document.querySelector(selector);
      if (container) break;
    }
    
    if (!container) {
      console.warn('Could not find suitable container for upload button');
      return;
    }
    
    // Create upload button
    this.uploadButton = document.createElement('button');
    this.uploadButton.className = 'screenshot-upload-btn';
    this.uploadButton.innerHTML = 'Import from Screenshot';
    this.uploadButton.title = 'Upload a screenshot to automatically import your build';
    
    // Add event listener
    this.uploadButton.addEventListener('click', () => {
      this.showUploadModal();
    });
    
    // Insert button appropriately
    if (container.classList.contains('controls') || container.classList.contains('cheatsheet-controls')) {
      container.appendChild(this.uploadButton);
    } else {
      // Create a controls wrapper if needed
      const controlsWrapper = document.createElement('div');
      controlsWrapper.style.cssText = 'margin: 10px 0; text-align: center;';
      controlsWrapper.appendChild(this.uploadButton);
      container.appendChild(controlsWrapper);
    }
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

  // Handle file upload
  async handleFile(file) {
    const { dropZone, progressContainer, progressStage, progressPercentage, progressFill } = this.modalElements;
    
    try {
      // Validate file
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        this.showError('Please upload a PNG or JPEG image');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        this.showError('File size must be less than 10MB');
        return;
      }
      
      // Show progress
      dropZone.style.display = 'none';
      progressContainer.classList.add('active');
      
      // Process screenshot
      const result = await this.assistant.processScreenshot(file, {
        onProgress: (progress) => {
          const percentage = Math.round(progress.progress);
          progressStage.textContent = this.formatProgressMessage(progress);
          progressPercentage.textContent = `${percentage}%`;
          progressFill.style.width = `${percentage}%`;
        },
        onError: (error) => {
          this.showError(`Processing failed: ${error.message}`);
          this.hideUploadModal();
        }
      });
      
      if (result.success) {
        // Apply matches to cheatsheet
        this.applyMatches(result);
        
        // Show success message
        this.showSuccess(result);
        
        // Hide modal after delay
        setTimeout(() => {
          this.hideUploadModal();
        }, 2000);
        
      } else {
        this.showError(`Processing failed: ${result.error}`);
        this.hideUploadModal();
      }
      
    } catch (error) {
      console.error('File processing error:', error);
      this.showError(`Error: ${error.message}`);
      this.hideUploadModal();
    }
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
  showUploadModal() {
    if (!this.modal) return;
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

// Export for external access
export { screenshotImportUI };
export default ScreenshotImportUI;