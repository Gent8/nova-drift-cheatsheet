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
    try {
      // Use enhanced recognition engine V2 for real processing
      if (typeof RecognitionEngineV2 !== 'undefined') {
        const recognitionEngine = new RecognitionEngineV2({
          enableTwoZoneRecognition: true,
          performanceMonitoring: true
        });
        
        recognitionEngine.processImage(canvas)
          .then(results => {
            // Process results with real confidence scores
            const processedResults = {
              ...results,
              cropData,
              processingTime: Date.now() - this.state.startTime,
              confidence: this.calculateOverallConfidence(results),
              metadata: {
                imageSize: { width: canvas.width, height: canvas.height },
                processingEngine: 'RecognitionEngineV2',
                timestamp: new Date().toISOString()
              }
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
      } else if (typeof TwoZoneRecognitionEngine !== 'undefined') {
        // Fallback to two-zone recognition engine
        const recognitionEngine = new TwoZoneRecognitionEngine();
        
        recognitionEngine.recognizeMods(canvas)
          .then(results => {
            const processedResults = {
              ...results,
              cropData,
              processingTime: Date.now() - this.state.startTime,
              confidence: this.calculateOverallConfidence(results),
              metadata: {
                imageSize: { width: canvas.width, height: canvas.height },
                processingEngine: 'TwoZoneRecognitionEngine',
                timestamp: new Date().toISOString()
              }
            };
            
            this.handleEvent('PROCESSING_COMPLETE', processedResults);
          })
          .catch(error => {
            this.handleEvent('ERROR', {
              code: 'RECOGNITION_ERROR',
              message: 'Failed to recognize mods with two-zone engine',
              details: error.message,
              recoverable: true
            });
          });
      } else {
        throw new Error('No recognition engine available - neither RecognitionEngineV2 nor TwoZoneRecognitionEngine found');
      }
    } catch (error) {
      this.handleEvent('ERROR', {
        code: 'RECOGNITION_ENGINE_UNAVAILABLE',
        message: 'Recognition engine not available or failed to initialize',
        details: error.message,
        recoverable: false
      });
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
    const needsReview = this.determineReviewNeeds(results);
    
    if (!needsReview.required) {
      // High confidence results - auto-proceed with brief delay
      console.log('High confidence results, auto-proceeding...');
      setTimeout(() => {
        this.handleEvent('REVIEW_COMPLETE', results);
      }, 500);
      return;
    }

    // Create review interface for low-confidence detections
    this.createReviewInterface(results, needsReview);
  }

  /**
   * Determine which mods need review based on confidence scores
   * @param {Object} results - Recognition results
   * @returns {Object} Review requirements
   */
  determineReviewNeeds(results) {
    const lowConfidenceThreshold = 0.7;
    const veryLowConfidenceThreshold = 0.5;
    
    const needsReview = {
      required: false,
      coreMods: [],
      regularMods: [],
      totalMods: 0,
      averageConfidence: results.confidence || 0
    };

    // Check core mods
    if (results.coreMods) {
      results.coreMods.forEach(mod => {
        if (mod.confidence < lowConfidenceThreshold) {
          needsReview.coreMods.push({
            ...mod,
            severity: mod.confidence < veryLowConfidenceThreshold ? 'high' : 'medium'
          });
        }
      });
    }

    // Check regular mods
    if (results.regularMods) {
      results.regularMods.forEach(mod => {
        if (mod.confidence < lowConfidenceThreshold) {
          needsReview.regularMods.push({
            ...mod,
            severity: mod.confidence < veryLowConfidenceThreshold ? 'high' : 'medium'
          });
        }
      });
    }

    needsReview.totalMods = needsReview.coreMods.length + needsReview.regularMods.length;
    needsReview.required = needsReview.totalMods > 0 || results.confidence < 0.6;

    return needsReview;
  }

  /**
   * Create interactive review interface
   * @param {Object} results - Recognition results
   * @param {Object} reviewNeeds - What needs review
   */
  createReviewInterface(results, reviewNeeds) {
    // Remove any existing review interface
    const existingReview = document.getElementById('mod-review-interface');
    if (existingReview) {
      existingReview.remove();
    }

    // Create review interface container
    const reviewInterface = document.createElement('div');
    reviewInterface.id = 'mod-review-interface';
    reviewInterface.innerHTML = this.generateReviewHTML(results, reviewNeeds);
    
    // Apply styles
    this.applyReviewStyles(reviewInterface);
    
    // Add to page
    document.body.appendChild(reviewInterface);
    
    // Setup event handlers
    this.setupReviewEventHandlers(reviewInterface, results);
    
    // Show with animation
    setTimeout(() => {
      reviewInterface.classList.add('visible');
    }, 10);
  }

  /**
   * Generate HTML for review interface
   * @param {Object} results - Recognition results
   * @param {Object} reviewNeeds - What needs review
   * @returns {string} HTML content
   */
  generateReviewHTML(results, reviewNeeds) {
    const totalDetected = (results.coreMods?.length || 0) + (results.regularMods?.length || 0);
    
    return `
      <div class="review-header">
        <h3>🔍 Review Detected Mods</h3>
        <p>Found ${totalDetected} mods • ${reviewNeeds.totalMods} need review • ${Math.round(results.confidence * 100)}% confidence</p>
      </div>
      
      <div class="review-content">
        ${this.generateModReviewSection('Core Mods', results.coreMods, reviewNeeds.coreMods)}
        ${this.generateModReviewSection('Regular Mods', results.regularMods, reviewNeeds.regularMods)}
      </div>
      
      <div class="review-actions">
        <button class="review-btn review-btn-accept" data-action="accept">
          ✅ Accept All (${totalDetected} mods)
        </button>
        <button class="review-btn review-btn-recrop" data-action="recrop">
          🔄 Recrop Image
        </button>
      </div>
    `;
  }

  /**
   * Generate review section for a group of mods
   * @param {string} sectionTitle - Section title
   * @param {Array} allMods - All mods in this section
   * @param {Array} reviewMods - Mods that need review
   * @returns {string} HTML content
   */
  generateModReviewSection(sectionTitle, allMods = [], reviewMods = []) {
    if (allMods.length === 0) return '';
    
    const modItems = allMods.map(mod => {
      const needsReview = reviewMods.find(r => r.name === mod.name);
      const confidencePercent = Math.round((mod.confidence || 0) * 100);
      
      return `
        <div class="mod-item ${needsReview ? 'needs-review' : 'confident'}" data-mod="${mod.name}">
          <div class="mod-info">
            <span class="mod-name">${mod.name}</span>
            <span class="mod-confidence ${confidencePercent < 50 ? 'low' : confidencePercent < 70 ? 'medium' : 'high'}">
              ${confidencePercent}%
            </span>
          </div>
          ${needsReview ? `
            <div class="mod-actions">
              <button class="mod-btn mod-btn-keep" data-action="keep" data-mod="${mod.name}">Keep</button>
              <button class="mod-btn mod-btn-remove" data-action="remove" data-mod="${mod.name}">Remove</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    
    return `
      <div class="review-section">
        <h4>${sectionTitle} (${allMods.length})</h4>
        <div class="mod-list">
          ${modItems}
        </div>
      </div>
    `;
  }

  /**
   * Apply styles to review interface
   * @param {HTMLElement} reviewInterface - Review interface element
   */
  applyReviewStyles(reviewInterface) {
    reviewInterface.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Add CSS for review interface components
    if (!document.getElementById('review-interface-styles')) {
      const style = document.createElement('style');
      style.id = 'review-interface-styles';
      style.textContent = `
        .review-interface.visible { opacity: 1 !important; }
        
        #mod-review-interface > div {
          background: #2a2d3a;
          border-radius: 12px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          color: #fff;
        }
        
        .review-header {
          padding: 24px 24px 16px;
          border-bottom: 1px solid #3a3d4a;
        }
        
        .review-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #fff;
        }
        
        .review-header p {
          margin: 0;
          color: #aaa;
          font-size: 14px;
        }
        
        .review-content {
          padding: 20px 24px;
        }
        
        .review-section {
          margin-bottom: 24px;
        }
        
        .review-section h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #ddd;
        }
        
        .mod-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 6px;
          background: #1e2028;
        }
        
        .mod-item.needs-review {
          border-left: 3px solid #ff9800;
          background: #2a1f1a;
        }
        
        .mod-item.confident {
          border-left: 3px solid #4caf50;
        }
        
        .mod-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .mod-name {
          font-weight: 500;
          color: #fff;
        }
        
        .mod-confidence {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 500;
        }
        
        .mod-confidence.high {
          background: #4caf50;
          color: #fff;
        }
        
        .mod-confidence.medium {
          background: #ff9800;
          color: #fff;
        }
        
        .mod-confidence.low {
          background: #f44336;
          color: #fff;
        }
        
        .mod-actions {
          display: flex;
          gap: 8px;
        }
        
        .mod-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .mod-btn-keep {
          background: #4caf50;
          color: white;
        }
        
        .mod-btn-keep:hover {
          background: #45a049;
        }
        
        .mod-btn-remove {
          background: #f44336;
          color: white;
        }
        
        .mod-btn-remove:hover {
          background: #da190b;
        }
        
        .review-actions {
          padding: 16px 24px;
          border-top: 1px solid #3a3d4a;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        
        .review-btn {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .review-btn-accept {
          background: #4caf50;
          color: white;
        }
        
        .review-btn-accept:hover {
          background: #45a049;
        }
        
        .review-btn-recrop {
          background: #666;
          color: white;
        }
        
        .review-btn-recrop:hover {
          background: #777;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Setup event handlers for review interface
   * @param {HTMLElement} reviewInterface - Review interface element
   * @param {Object} results - Recognition results
   */
  setupReviewEventHandlers(reviewInterface, results) {
    // Handle individual mod actions
    reviewInterface.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const modName = e.target.dataset.mod;
      
      if (action === 'keep' || action === 'remove') {
        this.handleModReviewAction(action, modName, results);
        e.target.closest('.mod-item').classList.toggle('mod-removed', action === 'remove');
      } else if (action === 'accept') {
        this.handleReviewComplete(results);
      } else if (action === 'recrop') {
        this.handleRecropRequest();
      }
    });
    
    // Handle escape key to close
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.handleReviewComplete(results);
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Handle individual mod review actions
   * @param {string} action - Action (keep/remove)
   * @param {string} modName - Mod name
   * @param {Object} results - Recognition results
   */
  handleModReviewAction(action, modName, results) {
    // Mark mod as reviewed
    const markAsReviewed = (mods) => {
      const mod = mods.find(m => m.name === modName);
      if (mod) {
        mod.reviewed = true;
        mod.userAction = action;
        if (action === 'remove') {
          mod.confidence = 0; // Mark for removal
        }
      }
    };
    
    if (results.coreMods) markAsReviewed(results.coreMods);
    if (results.regularMods) markAsReviewed(results.regularMods);
    
    console.log(`User ${action} mod: ${modName}`);
  }

  /**
   * Handle review completion
   * @param {Object} results - Final results
   */
  handleReviewComplete(results) {
    // Remove review interface
    const reviewInterface = document.getElementById('mod-review-interface');
    if (reviewInterface) {
      reviewInterface.classList.remove('visible');
      setTimeout(() => reviewInterface.remove(), 300);
    }
    
    // Filter out removed mods
    const filteredResults = {
      ...results,
      coreMods: (results.coreMods || []).filter(mod => mod.userAction !== 'remove'),
      regularMods: (results.regularMods || []).filter(mod => mod.userAction !== 'remove')
    };
    
    // Recalculate confidence
    filteredResults.confidence = this.calculateOverallConfidence(filteredResults);
    
    this.handleEvent('REVIEW_COMPLETE', filteredResults);
  }

  /**
   * Handle request to recrop image
   */
  handleRecropRequest() {
    // Remove review interface
    const reviewInterface = document.getElementById('mod-review-interface');
    if (reviewInterface) {
      reviewInterface.classList.remove('visible');
      setTimeout(() => reviewInterface.remove(), 300);
    }
    
    // Return to manual crop state
    this.transitionTo(this.states.MANUAL_CROP, this.state.data);
  }

  /**
   * Apply import results to Nova Drift cheatsheet
   * @param {Object} results - Final import results
   */
  applyImportResults(results) {
    console.log('Applying import results:', results);
    
    // Get all accepted mods
    const modNames = [
      ...(results.coreMods || []).map(mod => mod.name),
      ...(results.regularMods || []).map(mod => mod.name)
    ];
    
    console.log('Final accepted mods:', modNames);
    console.log('Processing metadata:', results.metadata);
    
    // Emit detailed event for Nova Drift cheatsheet integration
    const event = new CustomEvent('mods-imported', {
      detail: {
        mods: modNames,
        results,
        confidence: results.confidence,
        metadata: {
          ...results.metadata,
          totalMods: modNames.length,
          processingTime: results.processingTime,
          reviewCompleted: true
        }
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
    if (!error.recoverable) {
      // Non-recoverable error - just show reset option
      setTimeout(() => {
        this.reset();
      }, 5000);
      return;
    }

    // Create error recovery interface
    const recoveryInterface = document.createElement('div');
    recoveryInterface.id = 'error-recovery-interface';
    recoveryInterface.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2d3a;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        z-index: 10001;
        color: #fff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 400px;
      ">
        <h3 style="margin: 0 0 16px 0; color: #f44336;">🚨 Processing Error</h3>
        <p style="margin: 0 0 16px 0; color: #ccc;">${error.message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="document.getElementById('error-recovery-interface').remove(); window.importCoordinator.reset();" 
                  style="padding: 8px 16px; border: none; border-radius: 6px; background: #666; color: white; cursor: pointer;">
            Start Over
          </button>
          ${error.code === 'PROCESSING_TIMEOUT' || error.code === 'RECOGNITION_ERROR' ? `
            <button onclick="document.getElementById('error-recovery-interface').remove(); window.importCoordinator.transitionTo('manual-crop', window.importCoordinator.state.data);" 
                    style="padding: 8px 16px; border: none; border-radius: 6px; background: #4caf50; color: white; cursor: pointer;">
              Try Different Crop
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(recoveryInterface);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (document.getElementById('error-recovery-interface')) {
        document.getElementById('error-recovery-interface').remove();
        this.reset();
      }
    }, 30000);
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