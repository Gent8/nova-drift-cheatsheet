/**
 * Progress Indicator Module
 * Manages visual progress feedback for Nova Drift screenshot upload and processing
 */
class ProgressIndicator {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      showPercentage: options.showPercentage !== false,
      animationDuration: options.animationDuration || 200,
      autoHide: options.autoHide !== false,
      ...options
    };

    this.state = {
      currentState: 'idle',
      percentage: 0,
      message: ''
    };

    this.elements = this.createElements();
    this.init();
  }

  /**
   * Create progress indicator DOM elements
   * @returns {Object} References to created elements
   */
  createElements() {
    // Create progress container if it doesn't exist
    let progressContainer = this.container.querySelector('.upload-progress');
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.className = 'upload-progress';
      progressContainer.style.display = 'none';
      this.container.appendChild(progressContainer);
    }

    // Create progress bar
    let progressBar = progressContainer.querySelector('.progress-bar');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressContainer.appendChild(progressBar);
    }

    let progressFill = progressBar.querySelector('.progress-fill');
    if (!progressFill) {
      progressFill = document.createElement('div');
      progressFill.className = 'progress-fill';
      progressBar.appendChild(progressFill);
    }

    // Create status text
    let statusText = progressContainer.querySelector('.progress-text');
    if (!statusText) {
      statusText = document.createElement('span');
      statusText.className = 'progress-text';
      progressContainer.appendChild(statusText);
    }

    // Create percentage display
    let percentageDisplay = progressContainer.querySelector('.progress-percentage');
    if (!percentageDisplay && this.options.showPercentage) {
      percentageDisplay = document.createElement('span');
      percentageDisplay.className = 'progress-percentage';
      progressContainer.appendChild(percentageDisplay);
    }

    return {
      container: progressContainer,
      bar: progressBar,
      fill: progressFill,
      text: statusText,
      percentage: percentageDisplay
    };
  }

  /**
   * Initialize the progress indicator
   */
  init() {
    this.updateProgress('idle', 0, '');
  }

  /**
   * Update progress state and visual representation
   * @param {string} state - Progress state (idle, uploading, processing, analyzing, complete, error)
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} message - Status message to display
   */
  updateProgress(state, percentage = 0, message = '') {
    this.state = { currentState: state, percentage, message };

    // Update visual elements
    this.elements.container.setAttribute('data-state', state);
    
    // Animate progress bar
    this.elements.fill.style.transition = `width ${this.options.animationDuration}ms ease-out`;
    this.elements.fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
    
    // Update text content
    this.elements.text.textContent = message;
    
    // Update percentage display
    if (this.elements.percentage && this.options.showPercentage) {
      this.elements.percentage.textContent = `${Math.round(percentage)}%`;
    }

    // Show or hide based on state
    if (state === 'idle') {
      this.hide();
    } else {
      this.show();
    }

    // Auto-hide on completion if enabled
    if (state === 'complete' && this.options.autoHide) {
      setTimeout(() => {
        this.hide();
      }, 2000);
    }

    // Emit progress event for external listeners
    this.dispatchProgressEvent(state, percentage, message);
  }

  /**
   * Show the progress indicator
   */
  show() {
    this.elements.container.style.display = 'block';
    this.elements.container.setAttribute('aria-hidden', 'false');
  }

  /**
   * Hide the progress indicator
   */
  hide() {
    this.elements.container.style.display = 'none';
    this.elements.container.setAttribute('aria-hidden', 'true');
  }

  /**
   * Reset progress to initial state
   */
  reset() {
    this.updateProgress('idle', 0, '');
  }

  /**
   * Set progress to error state
   * @param {string} errorMessage - Error message to display
   */
  showError(errorMessage) {
    this.updateProgress('error', 0, errorMessage);
    this.elements.container.classList.add('error-state');
  }

  /**
   * Set progress to success state
   * @param {string} successMessage - Success message to display
   */
  showSuccess(successMessage = 'Complete!') {
    this.updateProgress('complete', 100, successMessage);
    this.elements.container.classList.add('success-state');
  }

  /**
   * Clear any state-specific classes
   */
  clearStateClasses() {
    this.elements.container.classList.remove('error-state', 'success-state');
  }

  /**
   * Dispatch custom progress event for external monitoring
   * @param {string} state - Current state
   * @param {number} percentage - Current percentage
   * @param {string} message - Current message
   */
  dispatchProgressEvent(state, percentage, message) {
    const event = new CustomEvent('upload-progress', {
      detail: {
        state,
        percentage,
        message,
        timestamp: Date.now()
      }
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Get current progress state
   * @returns {Object} Current state information
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Destroy the progress indicator and clean up
   */
  destroy() {
    if (this.elements.container && this.elements.container.parentNode) {
      this.elements.container.parentNode.removeChild(this.elements.container);
    }
    this.elements = null;
  }
}

/**
 * Progress state constants
 */
ProgressIndicator.States = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
  ERROR: 'error'
};

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressIndicator;
} else {
  window.ProgressIndicator = ProgressIndicator;
}
