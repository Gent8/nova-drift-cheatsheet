/**
 * Import Coordinator State Machine
 * Simplified workflow orchestrator for Nova Drift screenshot import
 * Direct flow: upload → manual-crop → two-zone-processing → review → complete
 */
class ImportCoordinator {
  constructor(options = {}) {
    this.options = {
      processingTimeout: 30000, // 30 seconds max processing time
      enableDebugMode: false,
      showProgressIndicators: true,
      ...options
    };

    // State machine definition
    this.states = {
      IDLE: 'idle',
      UPLOADING: 'uploading', 
      MANUAL_CROP: 'manual-crop',
      PROCESSING_GRID: 'processing-grid',
      REVIEWING: 'reviewing',
      COMPLETE: 'complete',
      ERROR: 'error'
    };

    this.state = {
      current: this.states.IDLE,
      data: null,
      error: null,
      startTime: null,
      processingTimeout: null
    };

    this.handlers = new Map();
    this.listeners = [];

    this.init();
  }

  /**
   * Initialize the import coordinator
   */
  init() {
    this.setupEventListeners();
    this.setupStateHandlers();
    
    if (this.options.enableDebugMode) {
      this.enableDebugMode();
    }
    
    console.log('Import coordinator initialized with simplified state machine');
  }

  /**
   * Setup event listeners for workflow events
   */
  setupEventListeners() {
    // Upload events
    this.addListener(document, 'screenshot-ready', (e) => {
      this.handleEvent('UPLOAD_COMPLETE', e.detail);
    });

    // Crop events  
    this.addListener(document, 'crop-applied', (e) => {
      this.handleEvent('CROP_COMPLETE', e.detail);
    });

    // Recognition events
    this.addListener(document, 'recognition-complete', (e) => {
      this.handleEvent('PROCESSING_COMPLETE', e.detail);
    });

    // Review events
    this.addListener(document, 'review-complete', (e) => {
      this.handleEvent('REVIEW_COMPLETE', e.detail);
    });

    // Error events
    this.addListener(document, 'import-error', (e) => {
      this.handleEvent('ERROR', e.detail);
    });

    // Reset events
    this.addListener(document, 'import-reset', () => {
      this.reset();
    });
  }

  /**
   * Setup state transition handlers
   */
  setupStateHandlers() {
    // Define state transition logic
    this.handlers.set('UPLOAD_COMPLETE', (data) => {
      if (this.state.current === this.states.IDLE) {
        this.transitionTo(this.states.MANUAL_CROP, data);
      }
    });

    this.handlers.set('CROP_COMPLETE', (data) => {
      if (this.state.current === this.states.MANUAL_CROP) {
        this.transitionTo(this.states.PROCESSING_GRID, data);
      }
    });

    this.handlers.set('PROCESSING_COMPLETE', (data) => {
      if (this.state.current === this.states.PROCESSING_GRID) {
        this.transitionTo(this.states.REVIEWING, data);
      }
    });

    this.handlers.set('REVIEW_COMPLETE', (data) => {
      if (this.state.current === this.states.REVIEWING) {
        this.transitionTo(this.states.COMPLETE, data);
      }
    });

    this.handlers.set('ERROR', (error) => {
      this.transitionTo(this.states.ERROR, null, error);
    });
  }

  /**
   * Handle incoming events
   * @param {string} eventType - Type of event
   * @param {*} data - Event data
   */
  handleEvent(eventType, data) {
    const handler = this.handlers.get(eventType);
    
    if (handler) {
      try {
        handler(data);
      } catch (error) {
        console.error('Error handling event:', eventType, error);
        this.transitionTo(this.states.ERROR, null, error);
      }
    } else {
      console.warn('No handler for event type:', eventType);
    }
  }

  /**
   * Transition to a new state
   * @param {string} newState - Target state
   * @param {*} data - State data
   * @param {*} error - Error information (for error state)
   */
  transitionTo(newState, data = null, error = null) {
    const oldState = this.state.current;
    
    // Validate transition
    if (!this.isValidTransition(oldState, newState)) {
      console.warn(`Invalid state transition: ${oldState} → ${newState}`);
      return false;
    }

    // Clear any existing timeout
    if (this.state.processingTimeout) {
      clearTimeout(this.state.processingTimeout);
      this.state.processingTimeout = null;
    }

    // Update state
    this.state.current = newState;
    this.state.data = data;
    this.state.error = error;

    // Handle state entry
    this.onStateEntry(newState, data, error);

    // Emit state change event
    this.emitStateChange(oldState, newState, data, error);

    console.log(`State transition: ${oldState} → ${newState}`);
    return true;
  }

  /**
   * Validate if a state transition is allowed
   * @param {string} fromState - Current state
   * @param {string} toState - Target state
   * @returns {boolean} Whether transition is valid
   */
  isValidTransition(fromState, toState) {
    // Define valid transitions
    const validTransitions = {
      [this.states.IDLE]: [this.states.MANUAL_CROP, this.states.ERROR],
      [this.states.UPLOADING]: [this.states.MANUAL_CROP, this.states.ERROR],
      [this.states.MANUAL_CROP]: [this.states.PROCESSING_GRID, this.states.ERROR, this.states.IDLE],
      [this.states.PROCESSING_GRID]: [this.states.REVIEWING, this.states.ERROR],
      [this.states.REVIEWING]: [this.states.COMPLETE, this.states.ERROR, this.states.MANUAL_CROP],
      [this.states.COMPLETE]: [this.states.IDLE],
      [this.states.ERROR]: [this.states.IDLE, this.states.MANUAL_CROP]
    };

    const allowedTransitions = validTransitions[fromState] || [];
    return allowedTransitions.includes(toState);
  }

  /**
   * Handle state entry logic
   * @param {string} state - New state
   * @param {*} data - State data
   * @param {*} error - Error information
   */
  onStateEntry(state, data, error) {
    switch (state) {
      case this.states.IDLE:
        this.onIdleEntry();
        break;
        
      case this.states.MANUAL_CROP:
        this.onManualCropEntry(data);
        break;
        
      case this.states.PROCESSING_GRID:
        this.onProcessingGridEntry(data);
        break;
        
      case this.states.REVIEWING:
        this.onReviewingEntry(data);
        break;
        
      case this.states.COMPLETE:
        this.onCompleteEntry(data);
        break;
        
      case this.states.ERROR:
        this.onErrorEntry(error);
        break;
    }
  }

  /**
   * Handle idle state entry
   */
  onIdleEntry() {
    this.state.data = null;
    this.state.error = null;
    this.state.startTime = null;
    
    this.showStatusMessage('Ready for screenshot upload', 'info');
  }

  /**
   * Handle manual crop state entry
   * @param {Object} data - Upload data
   */
  onManualCropEntry(data) {
    this.state.startTime = Date.now();
    
    // Manual crop interface should already be shown by upload handler
    // Just show status message
    this.showStatusMessage('Adjust crop area and click Apply', 'info');
  }

  /**
   * Handle processing grid state entry
   * @param {Object} data - Crop data
   */
  onProcessingGridEntry(data) {
    this.showStatusMessage('Processing with Nova Drift recognition engine...', 'processing');
    
    // Set timeout for processing
    this.state.processingTimeout = setTimeout(() => {
      this.handleEvent('ERROR', {
        code: 'PROCESSING_TIMEOUT',
        message: 'Processing took too long. Please try with a different screenshot.',
        recoverable: true
      });
    }, this.options.processingTimeout);

    // Start two-zone recognition processing
    this.startTwoZoneProcessing(data);
  }

  /**
   * Handle reviewing state entry
   * @param {Object} data - Recognition results
   */
  onReviewingEntry(data) {
    this.showStatusMessage('Review detected mods and make corrections', 'info');
    
    // Show review interface
    this.showReviewInterface(data);
  }

  /**
   * Handle complete state entry
   * @param {Object} data - Final results
   */
  onCompleteEntry(data) {
    const duration = Date.now() - this.state.startTime;
    
    this.showStatusMessage(`Import complete! (${Math.round(duration / 1000)}s)`, 'success');
    
    // Apply results to Nova Drift cheatsheet
    this.applyImportResults(data);

    // Auto-reset after 3 seconds
    setTimeout(() => {
      this.reset();
    }, 3000);
  }

  /**
   * Handle error state entry
   * @param {Object} error - Error information
   */
  onErrorEntry(error) {
    console.error('Import coordinator error:', error);
    
    this.showStatusMessage(error.message || 'An error occurred during import', 'error');
    
    // Show error recovery options if error is recoverable
    if (error.recoverable) {
      this.showErrorRecovery(error);
    }
  }

  /**
   * Start two-zone processing with cropped image
   * @param {Object} cropData - Cropped image data
   */
  startTwoZoneProcessing(cropData) {
    // Create cropped canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Load original image
    const img = new Image();
    img.onload = () => {
      const { cropArea } = cropData;
      
      // Set canvas size to crop dimensions
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      // Draw cropped region
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      // Process with two-zone recognition system
      this.processTwoZoneRecognition(canvas, cropData);
    };
    
    img.onerror = () => {
      this.handleEvent('ERROR', {
        code: 'IMAGE_LOAD_ERROR',
        message: 'Failed to load image for processing',
        recoverable: true
      });
    };
    
    img.src = cropData.metadata.dataUrl;
  }

  /**
   * Process cropped image with two-zone recognition
   * @param {HTMLCanvasElement} canvas - Cropped image canvas
   * @param {Object} cropData - Crop metadata
   */
  processTwoZoneRecognition(canvas, cropData) {
    // Use existing two-zone recognition system
    if (typeof TwoZoneRecognitionEngine !== 'undefined') {
      const recognitionEngine = new TwoZoneRecognitionEngine();
      
      recognitionEngine.recognizeMods(canvas)
        .then(results => {
          // Process results
          const processedResults = {
            ...results,
            cropData,
            processingTime: Date.now() - this.state.startTime,
            confidence: this.calculateOverallConfidence(results)
          };
          
          this.handleEvent('PROCESSING_COMPLETE', processedResults);
        })
        .catch(error => {
          this.handleEvent('ERROR', {
            code: 'RECOGNITION_ERROR',
            message: 'Failed to recognize mods in screenshot',
            details: error.message,
            recoverable: true
          });
        });
    } else {
      // Fallback: simulate processing for testing
      console.warn('TwoZoneRecognitionEngine not available, simulating processing...');
      
      setTimeout(() => {
        const mockResults = {
          coreMods: [
            { type: 'body', name: 'StandardBody', confidence: 0.95 },
            { type: 'shield', name: 'StandardShield', confidence: 0.92 },
            { type: 'weapon', name: 'Blaster', confidence: 0.89 }
          ],
          regularMods: [
            { name: 'Velocity', confidence: 0.87 },
            { name: 'RapidFire', confidence: 0.84 },
            { name: 'Targeting', confidence: 0.91 }
          ],
          cropData,
          processingTime: Date.now() - this.state.startTime,
          confidence: 0.88
        };
        
        this.handleEvent('PROCESSING_COMPLETE', mockResults);
      }, 2000);
    }
  }

  /**
   * Calculate overall confidence from recognition results
   * @param {Object} results - Recognition results
   * @returns {number} Overall confidence score
   */
  calculateOverallConfidence(results) {
    const allMods = [...(results.coreMods || []), ...(results.regularMods || [])];
    
    if (allMods.length === 0) return 0;
    
    const totalConfidence = allMods.reduce((sum, mod) => sum + (mod.confidence || 0), 0);
    return totalConfidence / allMods.length;
  }

  /**
   * Show review interface for recognition results
   * @param {Object} results - Recognition results
   */
  showReviewInterface(results) {
    // TODO: Implement review interface
    // For now, auto-proceed if confidence is high enough
    
    if (results.confidence >= 0.8) {
      console.log('High confidence results, auto-proceeding...');
      setTimeout(() => {
        this.handleEvent('REVIEW_COMPLETE', results);
      }, 1000);
    } else {
      console.log('Low confidence results, would show review interface...');
      // For now, still auto-proceed for testing
      setTimeout(() => {
        this.handleEvent('REVIEW_COMPLETE', results);
      }, 2000);
    }
  }

  /**
   * Apply import results to Nova Drift cheatsheet
   * @param {Object} results - Final import results
   */
  applyImportResults(results) {
    console.log('Applying import results:', results);
    
    // TODO: Apply to actual Nova Drift cheatsheet selection
    // For now, just log the results
    
    const modNames = [
      ...(results.coreMods || []).map(mod => mod.name),
      ...(results.regularMods || []).map(mod => mod.name)
    ];
    
    console.log('Detected mods:', modNames);
    
    // Emit event for other systems to handle
    const event = new CustomEvent('mods-imported', {
      detail: {
        mods: modNames,
        results,
        confidence: results.confidence
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Show status message to user
   * @param {string} message - Message text
   * @param {string} type - Message type (info, success, error, processing)
   */
  showStatusMessage(message, type = 'info') {
    if (!this.options.showProgressIndicators) return;
    
    // Create or update status message
    let statusEl = document.getElementById('import-status-message');
    
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'import-status-message';
      statusEl.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9998;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 300px;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(statusEl);
    }
    
    // Style based on type
    const styles = {
      info: { bg: '#2196F3', color: '#fff' },
      success: { bg: '#4CAF50', color: '#fff' },
      error: { bg: '#f44336', color: '#fff' },
      processing: { bg: '#FF9800', color: '#fff' }
    };
    
    const style = styles[type] || styles.info;
    statusEl.style.background = style.bg;
    statusEl.style.color = style.color;
    statusEl.textContent = message;
    statusEl.style.display = 'block';
    
    // Add spinner for processing
    if (type === 'processing') {
      statusEl.innerHTML = message + ' <span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;margin-left:8px;"></span>';
      
      // Add spin animation if not exists
      if (!document.getElementById('status-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'status-spinner-style';
        style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Show error recovery options
   * @param {Object} error - Error information
   */
  showErrorRecovery(error) {
    // TODO: Implement error recovery UI
    console.log('Would show error recovery options for:', error);
    
    // For now, just auto-reset after 5 seconds
    setTimeout(() => {
      this.reset();
    }, 5000);
  }

  /**
   * Reset the coordinator to idle state
   */
  reset() {
    this.transitionTo(this.states.IDLE);
    
    // Hide status message
    const statusEl = document.getElementById('import-status-message');
    if (statusEl) {
      statusEl.style.display = 'none';
    }
    
    console.log('Import coordinator reset');
  }

  /**
   * Enable debug mode with detailed logging
   */
  enableDebugMode() {
    // Add visual state indicator
    const debugEl = document.createElement('div');
    debugEl.id = 'import-debug-indicator';
    debugEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #000;
      color: #0f0;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
    `;
    document.body.appendChild(debugEl);
    
    // Update debug indicator on state changes
    this.addListener(document, 'import-state-change', (e) => {
      debugEl.textContent = `State: ${e.detail.newState}`;
    });
  }

  /**
   * Emit state change event
   * @param {string} oldState - Previous state
   * @param {string} newState - New state
   * @param {*} data - State data
   * @param {*} error - Error information
   */
  emitStateChange(oldState, newState, data, error) {
    const event = new CustomEvent('import-state-change', {
      detail: {
        oldState,
        newState,
        data,
        error,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Helper to add event listeners and track them
   * @param {Element} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  addListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  /**
   * Get current state information
   * @returns {Object} Current state
   */
  getState() {
    return {
      current: this.state.current,
      hasData: !!this.state.data,
      hasError: !!this.state.error,
      duration: this.state.startTime ? Date.now() - this.state.startTime : 0
    };
  }

  /**
   * Check if coordinator is in a specific state
   * @param {string} state - State to check
   * @returns {boolean} Whether coordinator is in that state
   */
  isInState(state) {
    return this.state.current === state;
  }

  /**
   * Destroy the coordinator and clean up resources
   */
  destroy() {
    // Clear timeout
    if (this.state.processingTimeout) {
      clearTimeout(this.state.processingTimeout);
    }
    
    // Remove event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
    
    // Remove debug elements
    const debugEl = document.getElementById('import-debug-indicator');
    if (debugEl) debugEl.remove();
    
    const statusEl = document.getElementById('import-status-message');
    if (statusEl) statusEl.remove();
    
    console.log('Import coordinator destroyed');
  }
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImportCoordinator;
} else {
  window.ImportCoordinator = ImportCoordinator;
}