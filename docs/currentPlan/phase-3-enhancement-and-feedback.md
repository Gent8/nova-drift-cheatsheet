# Phase 3: Enhancement & Feedback

**Objective:** To implement the "happy path" automation with the proven ROI detector, build a robust and secure feedback loop, and finalize the feature for production with comprehensive testing and error handling.

---

## 3.1. Integrate the Intelligent Auto-Crop

### 3.1.1. Update Import Coordinator for Auto-Detection
**Modify:** `docs/modules/import-coordinator.js`
```javascript
// Replace manual-first crop flow with auto-detection first
async handleScreenshot(fileData) {
  console.log('ImportCoordinator: Processing screenshot with auto-detection');
  
  try {
    await this.transitionTo('analyzing', { fileData });
    
    // Start performance monitoring
    window.budgetMonitor.startTimer('auto-crop-detection');
    
    // Attempt automatic ROI detection
    const roiResult = await this.attemptAutoDetection(fileData);
    
    // Check performance budget
    window.budgetMonitor.endTimer('auto-crop-detection');
    const budgetCheck = window.budgetMonitor.checkPhaseBudget('ROI_DETECTION', 'auto-crop-detection');
    
    if (!budgetCheck.withinBudget) {
      console.warn('Auto-detection exceeded budget, falling back to manual');
      return this.fallbackToManualCrop(fileData, 'performance-exceeded');
    }
    
    // Evaluate detection confidence
    if (roiResult && roiResult.confidence > 0.70) {
      console.log(`Auto-detection successful with confidence: ${roiResult.confidence}`);
      await this.processAutoDetectedROI(fileData, roiResult);
    } else {
      console.log(`Auto-detection confidence too low: ${roiResult?.confidence || 0}`);
      await this.fallbackToManualCrop(fileData, 'low-confidence', roiResult);
    }
    
  } catch (error) {
    console.error('Auto-detection failed:', error);
    await this.fallbackToManualCrop(fileData, 'detection-error', null, error);
  }
}

async attemptAutoDetection(fileData) {
  // Initialize ROI detector with selected algorithm from Phase 0
  const roiDetector = new ROIDetector({
    algorithm: this.getSelectedAlgorithm(), // From Phase 0 benchmarking
    performanceMode: 'balanced'
  });
  
  // Create detection context
  const detectionContext = {
    imageElement: fileData.imageElement,
    resolution: {
      width: fileData.imageElement.naturalWidth,
      height: fileData.imageElement.naturalHeight
    },
    metadata: fileData.metadata
  };
  
  // Run detection
  const result = await roiDetector.detectROI(
    fileData.imageElement, 
    this.getSelectedAlgorithm()
  );
  
  // Validate result
  if (!result || !result.bounds) {
    return null;
  }
  
  // Enhance result with additional metadata
  return {
    ...result,
    detectionContext,
    timestamp: Date.now()
  };
}

getSelectedAlgorithm() {
  // Get algorithm selection from Phase 0 benchmarking results
  const storedSelection = localStorage.getItem('nova-roi-algorithm');
  return storedSelection || 'consensus'; // Default to consensus approach
}

async processAutoDetectedROI(fileData, roiResult) {
  // Log successful auto-detection for analytics
  this.logAnalytics('auto-detection-success', {
    confidence: roiResult.confidence,
    algorithm: roiResult.method,
    processingTime: roiResult.processingTime
  });
  
  // Apply the detected ROI
  const croppedData = await this.applyCropBounds(fileData, roiResult.bounds);
  
  // Transition directly to grid mapping
  await this.transitionTo('processing-grid', {
    fileData: croppedData,
    autoDetected: true,
    roiMetadata: roiResult
  });
  
  // Continue with grid mapping
  await this.processGridMapping(croppedData);
}

async fallbackToManualCrop(fileData, reason, roiResult = null, error = null) {
  console.log(`Falling back to manual crop. Reason: ${reason}`);
  
  // Log fallback for analytics
  this.logAnalytics('auto-detection-fallback', {
    reason,
    confidence: roiResult?.confidence || 0,
    error: error?.message || null
  });
  
  // Transition to manual crop state
  await this.transitionTo('awaiting-crop', {
    fileData,
    fallbackReason: reason,
    suggestedBounds: roiResult?.bounds || null
  });
  
  // Show manual crop tool with helpful suggestion if available
  this.showManualCropTool(fileData, roiResult?.bounds);
}

showManualCropTool(fileData, suggestedBounds = null) {
  // Get or create crop tool instance
  const cropTool = window.manualCropTool || new ManualCropTool();
  
  // Configure with suggestion if available
  const config = {
    imageData: fileData,
    onComplete: this.handleManualCropComplete.bind(this),
    onCancel: this.handleManualCropCancel.bind(this)
  };
  
  if (suggestedBounds) {
    config.initialBounds = suggestedBounds;
    config.showSuggestion = true;
  }
  
  // Show the tool
  cropTool.show(config);
}

async applyCropBounds(fileData, bounds) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  
  ctx.drawImage(
    fileData.imageElement,
    bounds.x, bounds.y, bounds.width, bounds.height,
    0, 0, bounds.width, bounds.height
  );
  
  // Create new image element with cropped data
  const croppedImage = new Image();
  croppedImage.src = canvas.toDataURL('image/png');
  
  await new Promise(resolve => croppedImage.onload = resolve);
  
  return {
    ...fileData,
    imageElement: croppedImage,
    cropMetadata: {
      originalBounds: bounds,
      croppedAt: Date.now(),
      method: 'auto-detection'
    }
  };
}
```

### 3.1.2. Enhanced Manual Crop Tool
**File:** `docs/modules/manual-crop-tool.js`
```javascript
class ManualCropTool {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.startPoint = null;
    this.currentBounds = null;
    this.suggestedBounds = null;
    this.callbacks = {};
    
    this.createUI();
  }
  
  createUI() {
    this.container = document.createElement('div');
    this.container.className = 'manual-crop-overlay';
    this.container.innerHTML = `
      <div class="crop-container">
        <div class="crop-header">
          <h3>Select Build Configuration Area</h3>
          <button class="crop-close" aria-label="Cancel">&times;</button>
        </div>
        <div class="crop-instructions">
          <p>Click and drag to select the build configuration area</p>
          <div class="crop-suggestion" style="display: none;">
            <span>💡</span>
            <span>Auto-detection found a possible area - click to use suggestion</span>
            <button class="use-suggestion-btn">Use Suggestion</button>
          </div>
        </div>
        <div class="crop-canvas-container">
          <canvas id="crop-canvas"></canvas>
          <div class="crop-overlay"></div>
        </div>
        <div class="crop-actions">
          <button class="btn btn-secondary" id="crop-reset">Reset</button>
          <button class="btn btn-primary" id="crop-confirm" disabled>Confirm Selection</button>
        </div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('#crop-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Canvas interaction
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Touch support
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Buttons
    this.container.querySelector('.crop-close').addEventListener('click', this.cancel.bind(this));
    this.container.querySelector('#crop-reset').addEventListener('click', this.reset.bind(this));
    this.container.querySelector('#crop-confirm').addEventListener('click', this.confirm.bind(this));
    this.container.querySelector('.use-suggestion-btn')?.addEventListener('click', this.useSuggestion.bind(this));
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }
  
  show(config) {
    this.callbacks = {
      onComplete: config.onComplete || (() => {}),
      onCancel: config.onCancel || (() => {})
    };
    
    this.imageData = config.imageData;
    this.suggestedBounds = config.initialBounds || null;
    
    // Show suggestion if available
    if (this.suggestedBounds && config.showSuggestion) {
      this.container.querySelector('.crop-suggestion').style.display = 'flex';
    }
    
    document.body.appendChild(this.container);
    this.setupCanvas();
    
    // Focus for keyboard navigation
    this.canvas.focus();
  }
  
  setupCanvas() {
    const img = this.imageData.imageElement;
    const container = this.container.querySelector('.crop-canvas-container');
    
    // Calculate scale to fit image in viewport
    const maxWidth = window.innerWidth * 0.8;
    const maxHeight = window.innerHeight * 0.7;
    
    const scale = Math.min(
      maxWidth / img.naturalWidth,
      maxHeight / img.naturalHeight,
      1 // Don't scale up
    );
    
    this.scale = scale;
    this.canvas.width = img.naturalWidth * scale;
    this.canvas.height = img.naturalHeight * scale;
    
    // Draw the image
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    
    // Draw suggested bounds if available
    if (this.suggestedBounds) {
      this.drawSuggestedBounds();
    }
  }
  
  drawSuggestedBounds() {
    if (!this.suggestedBounds) return;
    
    const bounds = this.scaleBounds(this.suggestedBounds);
    
    this.ctx.save();
    this.ctx.strokeStyle = '#28a745';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.globalAlpha = 0.8;
    
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    this.ctx.restore();
  }
  
  scaleBounds(bounds) {
    return {
      x: bounds.x * this.scale,
      y: bounds.y * this.scale,
      width: bounds.width * this.scale,
      height: bounds.height * this.scale
    };
  }
  
  unscaleBounds(bounds) {
    return {
      x: bounds.x / this.scale,
      y: bounds.y / this.scale,
      width: bounds.width / this.scale,
      height: bounds.height / this.scale
    };
  }
  
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.startPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    this.isDrawing = true;
  }
  
  handleMouseMove(e) {
    if (!this.isDrawing) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    this.drawSelection(this.startPoint, currentPoint);
  }
  
  handleMouseUp(e) {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    const rect = this.canvas.getBoundingClientRect();
    const endPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    // Calculate bounds
    this.currentBounds = {
      x: Math.min(this.startPoint.x, endPoint.x),
      y: Math.min(this.startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - this.startPoint.x),
      height: Math.abs(endPoint.y - this.startPoint.y)
    };
    
    // Enable confirm if selection is valid
    const minSize = 50 * this.scale;
    if (this.currentBounds.width > minSize && this.currentBounds.height > minSize) {
      this.container.querySelector('#crop-confirm').disabled = false;
    }
  }
  
  drawSelection(start, end) {
    // Redraw image
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.imageData.imageElement, 0, 0, this.canvas.width, this.canvas.height);
    
    // Draw suggested bounds if exists
    if (this.suggestedBounds) {
      this.drawSuggestedBounds();
    }
    
    // Draw current selection
    const bounds = {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    };
    
    this.ctx.save();
    this.ctx.strokeStyle = '#007bff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([]);
    
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Draw corner handles
    this.drawCornerHandles(bounds);
    
    // Darken outside area
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    this.ctx.restore();
  }
  
  drawCornerHandles(bounds) {
    const handleSize = 8;
    const handles = [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y },
      { x: bounds.x, y: bounds.y + bounds.height },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
    ];
    
    this.ctx.fillStyle = '#007bff';
    handles.forEach(handle => {
      this.ctx.fillRect(
        handle.x - handleSize/2,
        handle.y - handleSize/2,
        handleSize,
        handleSize
      );
    });
  }
  
  useSuggestion() {
    if (!this.suggestedBounds) return;
    
    this.currentBounds = this.scaleBounds(this.suggestedBounds);
    
    // Redraw with suggestion as selection
    this.drawSelection(
      { x: this.currentBounds.x, y: this.currentBounds.y },
      { 
        x: this.currentBounds.x + this.currentBounds.width, 
        y: this.currentBounds.y + this.currentBounds.height 
      }
    );
    
    this.container.querySelector('#crop-confirm').disabled = false;
  }
  
  reset() {
    this.currentBounds = null;
    this.startPoint = null;
    
    // Redraw clean canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.imageData.imageElement, 0, 0, this.canvas.width, this.canvas.height);
    
    if (this.suggestedBounds) {
      this.drawSuggestedBounds();
    }
    
    this.container.querySelector('#crop-confirm').disabled = true;
  }
  
  confirm() {
    if (!this.currentBounds) return;
    
    const finalBounds = this.unscaleBounds(this.currentBounds);
    
    this.hide();
    this.callbacks.onComplete({
      bounds: finalBounds,
      method: 'manual',
      timestamp: Date.now()
    });
  }
  
  cancel() {
    this.hide();
    this.callbacks.onCancel();
  }
  
  hide() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Clean up event listeners
    document.removeEventListener('keydown', this.handleKeydown);
  }
  
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.cancel();
    } else if (e.key === 'Enter' && !this.container.querySelector('#crop-confirm').disabled) {
      this.confirm();
    }
  }
  
  // Touch event handlers
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.handleMouseDown({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }
  
  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    this.handleMouseMove({
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }
  
  handleTouchEnd(e) {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      this.handleMouseUp({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }
  }
}

// Global instance
window.manualCropTool = new ManualCropTool();
```

---

## 3.2. Implement the Advanced Feedback Loop

### 3.2.1. Enhanced Feedback System with Security
**File:** `docs/modules/advanced-feedback-system.js`
```javascript
class AdvancedFeedbackSystem {
  constructor() {
    this.db = null;
    this.storageLimit = 10 * 1024 * 1024; // 10MB limit
    this.expirationDays = 30;
    this.pendingFeedback = new Map();
    
    this.init();
  }
  
  async init() {
    await this.initializeDatabase();
    await this.cleanupExpiredData();
    this.setupNotificationSystem();
    this.createFeedbackUI();
  }
  
  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NovaFeedbackDB', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for feedback data
        if (!db.objectStoreNames.contains('feedback')) {
          const feedbackStore = db.createObjectStore('feedback', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          feedbackStore.createIndex('timestamp', 'timestamp');
          feedbackStore.createIndex('submitted', 'submitted');
        }
        
        // Store for compressed image snippets
        if (!db.objectStoreNames.contains('imageSnippets')) {
          const imageStore = db.createObjectStore('imageSnippets', { 
            keyPath: 'hash' 
          });
          imageStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }
  
  async cleanupExpiredData() {
    const expirationTime = Date.now() - (this.expirationDays * 24 * 60 * 60 * 1000);
    
    // Clean up feedback entries
    const feedbackTx = this.db.transaction(['feedback'], 'readwrite');
    const feedbackStore = feedbackTx.objectStore('feedback');
    const feedbackIndex = feedbackStore.index('timestamp');
    
    const feedbackRange = IDBKeyRange.upperBound(expirationTime);
    const feedbackCursor = await feedbackIndex.openCursor(feedbackRange);
    
    await this.deleteWithCursor(feedbackCursor);
    
    // Clean up image snippets
    const imageTx = this.db.transaction(['imageSnippets'], 'readwrite');
    const imageStore = imageTx.objectStore('imageSnippets');
    const imageIndex = imageStore.index('timestamp');
    
    const imageRange = IDBKeyRange.upperBound(expirationTime);
    const imageCursor = await imageIndex.openCursor(imageRange);
    
    await this.deleteWithCursor(imageCursor);
    
    // Check storage usage
    await this.checkStorageQuota();
  }
  
  async deleteWithCursor(cursor) {
    return new Promise((resolve) => {
      if (!cursor) {
        resolve();
        return;
      }
      
      cursor.delete();
      cursor.continue().onsuccess = (event) => {
        this.deleteWithCursor(event.target.result).then(resolve);
      };
    });
  }
  
  async checkStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const percentUsed = (estimate.usage / estimate.quota) * 100;
        
        console.log(`Storage usage: ${(estimate.usage / 1024 / 1024).toFixed(2)}MB of ${(estimate.quota / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(1)}%)`);
        
        if (percentUsed > 80) {
          console.warn('Storage usage above 80%, consider cleanup');
          await this.performAggressiveCleanup();
        }
      } catch (error) {
        console.error('Failed to check storage quota:', error);
      }
    }
  }
  
  async performAggressiveCleanup() {
    // Delete oldest entries if approaching storage limit
    const tx = this.db.transaction(['feedback', 'imageSnippets'], 'readwrite');
    
    // Get all feedback entries sorted by timestamp
    const feedbackStore = tx.objectStore('feedback');
    const allFeedback = await feedbackStore.index('timestamp').getAll();
    
    // Delete oldest 25%
    const toDelete = Math.floor(allFeedback.length * 0.25);
    for (let i = 0; i < toDelete; i++) {
      await feedbackStore.delete(allFeedback[i].id);
    }
    
    console.log(`Aggressive cleanup: deleted ${toDelete} old feedback entries`);
  }
  
  async storeFeedback(correctionData) {
    try {
      // Validate and sanitize data
      const sanitizedData = this.sanitizeData(correctionData);
      
      // Compress image snippet if present
      if (sanitizedData.imageData) {
        const compressedImage = await this.compressImage(sanitizedData.imageData);
        const imageHash = await this.hashImage(compressedImage);
        
        // Store image separately
        await this.storeImageSnippet(imageHash, compressedImage);
        
        // Replace image data with hash reference
        sanitizedData.imageHash = imageHash;
        delete sanitizedData.imageData;
      }
      
      // Store feedback entry
      const tx = this.db.transaction(['feedback'], 'readwrite');
      const store = tx.objectStore('feedback');
      
      const feedbackEntry = {
        ...sanitizedData,
        timestamp: Date.now(),
        submitted: false
      };
      
      await store.add(feedbackEntry);
      
      // Update pending feedback count
      await this.updatePendingFeedbackCount();
      
      return true;
      
    } catch (error) {
      console.error('Failed to store feedback:', error);
      
      if (error.name === 'QuotaExceededError') {
        // Handle storage quota exceeded
        await this.handleQuotaExceeded();
      }
      
      return false;
    }
  }
  
  sanitizeData(data) {
    // Sanitize all user-derived data to prevent injection attacks
    const sanitized = {};
    
    // Whitelist allowed fields
    const allowedFields = [
      'originalMod', 'selectedMod', 'confidence', 
      'gridPosition', 'imageData', 'sessionId'
    ];
    
    for (const field of allowedFields) {
      if (field in data) {
        if (typeof data[field] === 'string') {
          // Sanitize string values
          sanitized[field] = this.sanitizeString(data[field]);
        } else if (typeof data[field] === 'number') {
          // Validate numeric values
          sanitized[field] = this.sanitizeNumber(data[field]);
        } else if (field === 'imageData') {
          // Special handling for image data
          sanitized[field] = data[field];
        } else {
          sanitized[field] = data[field];
        }
      }
    }
    
    return sanitized;
  }
  
  sanitizeString(str) {
    // Remove any potentially dangerous characters
    return str
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[&]/g, '&amp;') // Escape ampersands
      .substring(0, 100); // Limit length
  }
  
  sanitizeNumber(num) {
    const parsed = parseFloat(num);
    return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 1);
  }
  
  async compressImage(imageData) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize to max 128x128 for snippets
        const maxSize = 128;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Convert to low quality JPEG
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.5); // 50% quality
      };
      
      img.src = imageData;
    });
  }
  
  async hashImage(imageData) {
    // Use SHA-256 for robust hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(imageData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  async storeImageSnippet(hash, imageData) {
    const tx = this.db.transaction(['imageSnippets'], 'readwrite');
    const store = tx.objectStore('imageSnippets');
    
    await store.put({
      hash: hash,
      data: imageData,
      timestamp: Date.now()
    });
  }
  
  async generateGitHubIssueURL() {
    const baseUrl = 'https://github.com/Gent8/nova-drift-cheatsheet/issues/new';
    const maxUrlLength = 4000; // Safe URL length limit
    
    try {
      // Get unsubmitted feedback
      const feedback = await this.getUnsubmittedFeedback();
      
      if (feedback.length === 0) {
        throw new Error('No feedback to submit');
      }
      
      // Build issue title
      const title = `Recognition Feedback Report - ${feedback.length} corrections`;
      
      // Build issue body
      let body = '## Recognition Feedback Report\n\n';
      body += `This report contains ${feedback.length} user corrections to help improve recognition accuracy.\n\n`;
      body += '### Summary\n';
      body += `- Total Corrections: ${feedback.length}\n`;
      body += `- Date Range: ${this.getDateRange(feedback)}\n`;
      body += `- Average Confidence: ${this.getAverageConfidence(feedback).toFixed(2)}\n\n`;
      
      body += '### Correction Details\n\n';
      
      // Add correction details with length checking
      let detailsAdded = 0;
      for (const item of feedback) {
        const detail = this.formatFeedbackDetail(item);
        
        // Check if adding this detail would exceed URL limit
        const testUrl = `${baseUrl}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body + detail)}`;
        
        if (testUrl.length > maxUrlLength) {
          body += `\n*... and ${feedback.length - detailsAdded} more corrections (truncated due to URL length limit)*\n`;
          break;
        }
        
        body += detail;
        detailsAdded++;
      }
      
      body += '\n### Image Data\n';
      body += '*Image snippets are stored locally and not included in this report for privacy and size reasons.*\n\n';
      
      body += '---\n';
      body += '*This feedback was automatically generated by the Nova Drift Cheatsheet recognition system.*\n';
      body += `*Feedback system version: 1.0*`;
      
      // Encode and validate final URL
      const encodedTitle = encodeURIComponent(this.sanitizeString(title));
      const encodedBody = encodeURIComponent(body);
      const finalUrl = `${baseUrl}?title=${encodedTitle}&body=${encodedBody}&labels=feedback,recognition`;
      
      if (finalUrl.length > maxUrlLength) {
        throw new Error('Generated URL exceeds maximum length');
      }
      
      return finalUrl;
      
    } catch (error) {
      console.error('Failed to generate GitHub issue URL:', error);
      throw error;
    }
  }
  
  formatFeedbackDetail(feedback) {
    let detail = `#### Correction ${feedback.id}\n`;
    detail += `- **Original Detection:** ${feedback.originalMod || 'None'}\n`;
    detail += `- **User Correction:** ${feedback.selectedMod || 'No Mod'}\n`;
    detail += `- **Confidence:** ${(feedback.confidence * 100).toFixed(0)}%\n`;
    
    if (feedback.gridPosition) {
      detail += `- **Grid Position:** Row ${feedback.gridPosition.row}, Col ${feedback.gridPosition.col}\n`;
    }
    
    detail += '\n';
    return detail;
  }
  
  async getUnsubmittedFeedback() {
    const tx = this.db.transaction(['feedback'], 'readonly');
    const store = tx.objectStore('feedback');
    const index = store.index('submitted');
    
    return await index.getAll(false);
  }
  
  getDateRange(feedback) {
    if (feedback.length === 0) return 'N/A';
    
    const timestamps = feedback.map(f => f.timestamp).sort();
    const start = new Date(timestamps[0]).toLocaleDateString();
    const end = new Date(timestamps[timestamps.length - 1]).toLocaleDateString();
    
    return start === end ? start : `${start} - ${end}`;
  }
  
  getAverageConfidence(feedback) {
    if (feedback.length === 0) return 0;
    
    const sum = feedback.reduce((acc, f) => acc + (f.confidence || 0), 0);
    return sum / feedback.length;
  }
  
  async markFeedbackAsSubmitted() {
    const tx = this.db.transaction(['feedback'], 'readwrite');
    const store = tx.objectStore('feedback');
    const index = store.index('submitted');
    
    const unsubmitted = await index.getAll(false);
    
    for (const item of unsubmitted) {
      item.submitted = true;
      item.submittedAt = Date.now();
      await store.put(item);
    }
    
    await this.updatePendingFeedbackCount();
  }
  
  async updatePendingFeedbackCount() {
    const count = await this.getPendingFeedbackCount();
    
    // Update UI notification
    const notificationDot = document.querySelector('.feedback-notification-dot');
    if (notificationDot) {
      notificationDot.style.display = count > 0 ? 'block' : 'none';
      notificationDot.setAttribute('data-count', count);
    }
    
    // Update button text
    const feedbackButton = document.querySelector('.help-improve-btn');
    if (feedbackButton) {
      const text = count > 0 ? 
        `Help Improve Recognition (${count})` : 
        'Help Improve Recognition';
      feedbackButton.textContent = text;
    }
  }
  
  async getPendingFeedbackCount() {
    const tx = this.db.transaction(['feedback'], 'readonly');
    const store = tx.objectStore('feedback');
    const index = store.index('submitted');
    
    const count = await index.count(false);
    return count;
  }
  
  setupNotificationSystem() {
    // Create notification UI elements
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'feedback-notifications';
    document.body.appendChild(notificationContainer);
    
    // Listen for new feedback
    document.addEventListener('user-correction', async (event) => {
      await this.storeFeedback(event.detail);
      this.showNotification('Correction saved. Help improve recognition by submitting feedback!');
    });
  }
  
  showNotification(message, type = 'info', duration = 4000) {
    const notification = document.createElement('div');
    notification.className = `feedback-notification feedback-notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${this.getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
      </div>
      <button class="notification-close">&times;</button>
    `;
    
    const container = document.querySelector('.feedback-notifications');
    container.appendChild(notification);
    
    // Animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Auto-dismiss
    const dismiss = () => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    };
    
    notification.querySelector('.notification-close').addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  }
  
  getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type] || icons.info;
  }
  
  createFeedbackUI() {
    // Create "Help Improve Recognition" button
    const feedbackSection = document.createElement('div');
    feedbackSection.className = 'feedback-section';
    feedbackSection.innerHTML = `
      <button class="help-improve-btn">
        Help Improve Recognition
        <span class="feedback-notification-dot" style="display: none;"></span>
      </button>
    `;
    
    // Add to appropriate location in UI
    const footer = document.querySelector('footer') || document.body;
    footer.appendChild(feedbackSection);
    
    // Event handler
    feedbackSection.querySelector('.help-improve-btn').addEventListener('click', 
      this.showFeedbackDialog.bind(this)
    );
    
    // Initial count update
    this.updatePendingFeedbackCount();
  }
  
  async showFeedbackDialog() {
    const pendingCount = await this.getPendingFeedbackCount();
    
    if (pendingCount === 0) {
      this.showNotification('No feedback to submit yet. Make some corrections first!', 'info');
      return;
    }
    
    const dialog = document.createElement('div');
    dialog.className = 'feedback-submit-dialog';
    dialog.innerHTML = `
      <div class="dialog-backdrop"></div>
      <div class="dialog-container">
        <div class="dialog-header">
          <h3>Submit Recognition Feedback</h3>
          <button class="dialog-close">&times;</button>
        </div>
        
        <div class="dialog-body">
          <p>You have <strong>${pendingCount}</strong> corrections ready to submit.</p>
          
          <div class="privacy-notice">
            <h4>Privacy Notice:</h4>
            <ul>
              <li>Only correction data (mod names and confidence scores) will be shared</li>
              <li>No screenshot images will be uploaded</li>
              <li>All data is anonymized</li>
              <li>Submission helps improve recognition for everyone</li>
            </ul>
          </div>
          
          <div class="submission-options">
            <label>
              <input type="checkbox" id="include-details" checked>
              Include detailed correction information
            </label>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="cancel-submit">Cancel</button>
          <button class="btn btn-primary" id="confirm-submit">
            <span class="btn-icon">🚀</span>
            Submit to GitHub
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Event handlers
    const closeDialog = () => dialog.remove();
    
    dialog.querySelector('.dialog-backdrop').addEventListener('click', closeDialog);
    dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
    dialog.querySelector('#cancel-submit').addEventListener('click', closeDialog);
    
    dialog.querySelector('#confirm-submit').addEventListener('click', async () => {
      try {
        const submitBtn = dialog.querySelector('#confirm-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Generating...';
        
        const url = await this.generateGitHubIssueURL();
        
        // Open in new tab
        window.open(url, '_blank');
        
        // Mark feedback as submitted
        await this.markFeedbackAsSubmitted();
        
        this.showNotification('Feedback submitted successfully! Thank you!', 'success');
        closeDialog();
        
      } catch (error) {
        console.error('Failed to submit feedback:', error);
        this.showNotification('Failed to submit feedback. Please try again.', 'error');
        
        dialog.querySelector('#confirm-submit').disabled = false;
        dialog.querySelector('#confirm-submit').innerHTML = `
          <span class="btn-icon">🚀</span>
          Submit to GitHub
        `;
      }
    });
  }
  
  async handleQuotaExceeded() {
    console.warn('Storage quota exceeded, performing emergency cleanup');
    
    // Delete oldest 50% of data
    const tx = this.db.transaction(['feedback', 'imageSnippets'], 'readwrite');
    const feedbackStore = tx.objectStore('feedback');
    const imageStore = tx.objectStore('imageSnippets');
    
    // Get all entries
    const allFeedback = await feedbackStore.getAll();
    const allImages = await imageStore.getAll();
    
    // Sort by timestamp and delete oldest half
    allFeedback.sort((a, b) => a.timestamp - b.timestamp);
    const feedbackToDelete = Math.floor(allFeedback.length / 2);
    
    for (let i = 0; i < feedbackToDelete; i++) {
      await feedbackStore.delete(allFeedback[i].id);
    }
    
    allImages.sort((a, b) => a.timestamp - b.timestamp);
    const imagesToDelete = Math.floor(allImages.length / 2);
    
    for (let i = 0; i < imagesToDelete; i++) {
      await imageStore.delete(allImages[i].hash);
    }
    
    this.showNotification(
      'Storage limit reached. Oldest feedback data has been removed.',
      'warning'
    );
  }
}

// Initialize advanced feedback system
window.advancedFeedbackSystem = new AdvancedFeedbackSystem();
```

---

## 3.3. Implement Client-Side Personalization

### 3.3.1. Personalization Cache System
**File:** `docs/modules/personalization-cache.js`
```javascript
class PersonalizationCache {
  constructor() {
    this.db = null;
    this.cacheHitRate = { hits: 0, misses: 0 };
    this.performanceMetrics = new Map();
    
    this.init();
  }
  
  async init() {
    await this.initializeDatabase();
    this.setupMetricsCollection();
  }
  
  async initializeDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NovaPersonalizationDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store for user corrections cache
        if (!db.objectStoreNames.contains('correctionCache')) {
          const store = db.createObjectStore('correctionCache', { 
            keyPath: 'hash' 
          });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('useCount', 'useCount');
        }
        
        // Store for performance metrics
        if (!db.objectStoreNames.contains('performanceMetrics')) {
          db.createObjectStore('performanceMetrics', { 
            keyPath: 'sessionId' 
          });
        }
      };
    });
  }
  
  async checkCache(imageData, gridPosition) {
    const startTime = performance.now();
    
    try {
      // Generate hash for the image region
      const hash = await this.generateRegionHash(imageData, gridPosition);
      
      // Check cache
      const tx = this.db.transaction(['correctionCache'], 'readonly');
      const store = tx.objectStore('correctionCache');
      const cached = await store.get(hash);
      
      const lookupTime = performance.now() - startTime;
      
      if (cached) {
        // Cache hit
        this.cacheHitRate.hits++;
        console.log(`Cache hit for position ${gridPosition.row},${gridPosition.col}`);
        
        // Update use count
        await this.updateUseCount(hash);
        
        // Record metrics
        this.recordMetric('cache-hit', {
          lookupTime,
          hash,
          modName: cached.modName
        });
        
        return {
          found: true,
          modName: cached.modName,
          confidence: cached.confidence,
          source: 'user-cache',
          cacheTimestamp: cached.timestamp
        };
      } else {
        // Cache miss
        this.cacheHitRate.misses++;
        
        this.recordMetric('cache-miss', {
          lookupTime,
          hash
        });
        
        return { found: false, hash };
      }
      
    } catch (error) {
      console.error('Cache lookup failed:', error);
      return { found: false, error: error.message };
    }
  }
  
  async generateRegionHash(imageData, gridPosition) {
    // Create a normalized representation of the image region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Normalize to 64x64 for consistent hashing
    canvas.width = 64;
    canvas.height = 64;
    
    // Draw the image region
    ctx.drawImage(
      imageData,
      gridPosition.x, gridPosition.y, gridPosition.width, gridPosition.height,
      0, 0, 64, 64
    );
    
    // Get pixel data
    const imageDataObj = ctx.getImageData(0, 0, 64, 64);
    
    // Create a perceptual hash
    const hash = await this.perceptualHash(imageDataObj);
    
    return hash;
  }
  
  async perceptualHash(imageData) {
    // Implement a simple perceptual hash algorithm
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Convert to grayscale and downsample to 8x8
    const downsampleSize = 8;
    const grayscale = new Float32Array(downsampleSize * downsampleSize);
    
    for (let y = 0; y < downsampleSize; y++) {
      for (let x = 0; x < downsampleSize; x++) {
        let sum = 0;
        const sampleWidth = width / downsampleSize;
        const sampleHeight = height / downsampleSize;
        
        // Average pixels in each cell
        for (let sy = 0; sy < sampleHeight; sy++) {
          for (let sx = 0; sx < sampleWidth; sx++) {
            const px = Math.floor(x * sampleWidth + sx);
            const py = Math.floor(y * sampleHeight + sy);
            const idx = (py * width + px) * 4;
            
            // Convert to grayscale
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            sum += gray;
          }
        }
        
        grayscale[y * downsampleSize + x] = sum / (sampleWidth * sampleHeight);
      }
    }
    
    // Calculate average
    const avg = grayscale.reduce((a, b) => a + b) / grayscale.length;
    
    // Generate hash bits
    let hashBits = '';
    for (let i = 0; i < grayscale.length; i++) {
      hashBits += grayscale[i] > avg ? '1' : '0';
    }
    
    // Convert to hex string
    const hash = parseInt(hashBits, 2).toString(16).padStart(16, '0');
    
    return hash;
  }
  
  async storeCorrection(imageData, gridPosition, correctionData) {
    try {
      const hash = await this.generateRegionHash(imageData, gridPosition);
      
      const tx = this.db.transaction(['correctionCache'], 'readwrite');
      const store = tx.objectStore('correctionCache');
      
      const cacheEntry = {
        hash: hash,
        modName: correctionData.selectedMod,
        confidence: correctionData.confidence || 1.0,
        timestamp: Date.now(),
        useCount: 1,
        gridPosition: gridPosition,
        source: correctionData.source || 'user-correction'
      };
      
      await store.put(cacheEntry);
      
      console.log(`Stored correction in cache: ${correctionData.selectedMod} at ${gridPosition.row},${gridPosition.col}`);
      
      // Cleanup old entries if needed
      await this.performCacheMaintenance();
      
      return true;
      
    } catch (error) {
      console.error('Failed to store correction in cache:', error);
      return false;
    }
  }
  
  async updateUseCount(hash) {
    const tx = this.db.transaction(['correctionCache'], 'readwrite');
    const store = tx.objectStore('correctionCache');
    
    const entry = await store.get(hash);
    if (entry) {
      entry.useCount = (entry.useCount || 0) + 1;
      entry.lastUsed = Date.now();
      await store.put(entry);
    }
  }
  
  async performCacheMaintenance() {
    // Keep cache size reasonable (e.g., max 1000 entries)
    const maxEntries = 1000;
    
    const tx = this.db.transaction(['correctionCache'], 'readwrite');
    const store = tx.objectStore('correctionCache');
    const count = await store.count();
    
    if (count > maxEntries) {
      // Remove least recently used entries
      const allEntries = await store.getAll();
      
      // Sort by last used timestamp
      allEntries.sort((a, b) => (b.lastUsed || b.timestamp) - (a.lastUsed || a.timestamp));
      
      // Keep top entries
      const toKeep = allEntries.slice(0, maxEntries * 0.8); // Keep 80% to avoid frequent cleanup
      const toRemove = allEntries.slice(maxEntries * 0.8);
      
      // Clear and repopulate
      await store.clear();
      for (const entry of toKeep) {
        await store.put(entry);
      }
      
      console.log(`Cache maintenance: removed ${toRemove.length} old entries`);
    }
  }
  
  setupMetricsCollection() {
    // Collect metrics periodically
    setInterval(() => {
      this.saveMetrics();
    }, 60000); // Every minute
    
    // Save metrics on page unload
    window.addEventListener('beforeunload', () => {
      this.saveMetrics();
    });
  }
  
  recordMetric(type, data) {
    if (!this.performanceMetrics.has(type)) {
      this.performanceMetrics.set(type, []);
    }
    
    this.performanceMetrics.get(type).push({
      ...data,
      timestamp: Date.now()
    });
  }
  
  async saveMetrics() {
    if (this.performanceMetrics.size === 0) return;
    
    try {
      const tx = this.db.transaction(['performanceMetrics'], 'readwrite');
      const store = tx.objectStore('performanceMetrics');
      
      const sessionId = `session_${Date.now()}`;
      const metrics = {
        sessionId: sessionId,
        timestamp: Date.now(),
        cacheHitRate: {
          hits: this.cacheHitRate.hits,
          misses: this.cacheHitRate.misses,
          rate: this.cacheHitRate.hits / (this.cacheHitRate.hits + this.cacheHitRate.misses) || 0
        },
        detailedMetrics: Object.fromEntries(this.performanceMetrics)
      };
      
      await store.put(metrics);
      
      console.log(`Saved performance metrics: ${this.cacheHitRate.hits} hits, ${this.cacheHitRate.misses} misses`);
      
      // Reset for next period
      this.performanceMetrics.clear();
      
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }
  
  async getCacheStats() {
    const tx = this.db.transaction(['correctionCache', 'performanceMetrics'], 'readonly');
    const cacheStore = tx.objectStore('correctionCache');
    const metricsStore = tx.objectStore('performanceMetrics');
    
    const cacheCount = await cacheStore.count();
    const allMetrics = await metricsStore.getAll();
    
    // Calculate aggregate stats
    let totalHits = 0;
    let totalMisses = 0;
    
    for (const metric of allMetrics) {
      if (metric.cacheHitRate) {
        totalHits += metric.cacheHitRate.hits;
        totalMisses += metric.cacheHitRate.misses;
      }
    }
    
    return {
      cacheSize: cacheCount,
      totalHits: totalHits,
      totalMisses: totalMisses,
      hitRate: totalHits / (totalHits + totalMisses) || 0,
      sessions: allMetrics.length
    };
  }
}

// Initialize personalization cache
window.personalizationCache = new PersonalizationCache();
```

### 3.3.2. Integration with Import Coordinator
**Modify:** `docs/modules/import-coordinator.js`
```javascript
// Add to ImportCoordinator class:

async processRecognitionWithCache(gridMappingResult) {
  console.log('ImportCoordinator: Starting recognition with personalization cache');
  
  try {
    await this.transitionTo('processing-recognition', {
      gridMappingResult: gridMappingResult
    });
    
    // Check cache for each region before full recognition
    const cachedResults = new Map();
    const regionsToProcess = new Map();
    
    for (const [key, regionData] of gridMappingResult.coordinateMap) {
      const cacheResult = await window.personalizationCache.checkCache(
        this.currentFileData.imageElement,
        regionData.gridPosition
      );
      
      if (cacheResult.found) {
        // Use cached result
        cachedResults.set(key, {
          modName: cacheResult.modName,
          confidence: cacheResult.confidence,
          position: regionData.position,
          gridPosition: regionData.gridPosition,
          source: 'personalization-cache'
        });
      } else {
        // Need to process through recognition engine
        regionsToProcess.set(key, regionData);
      }
    }
    
    console.log(`Cache results: ${cachedResults.size} hits, ${regionsToProcess.size} to process`);
    
    // Process uncached regions
    let recognitionResults = null;
    if (regionsToProcess.size > 0) {
      recognitionResults = await this.processRecognitionBatch(regionsToProcess, gridMappingResult.gridMetadata);
    }
    
    // Merge results
    const finalResults = this.mergeRecognitionResults(cachedResults, recognitionResults);
    
    // Update cache with new recognitions
    if (recognitionResults) {
      await this.updateCacheWithResults(recognitionResults, gridMappingResult);
    }
    
    // Continue with review mode
    await this.transitionTo('reviewing', {
      recognitionResults: finalResults,
      gridMappingResult: gridMappingResult
    });
    
    this.displayRecognitionResults(finalResults);
    
    return finalResults;
    
  } catch (error) {
    console.error('Recognition with cache failed:', error);
    throw error;
  }
}

mergeRecognitionResults(cachedResults, recognitionResults) {
  const merged = {
    detectedMods: [],
    overallStats: {
      totalAnalyzed: 0,
      cachedResults: cachedResults.size,
      processedResults: 0,
      highConfidence: 0,
      averageConfidence: 0
    }
  };
  
  // Add cached results
  for (const [key, cached] of cachedResults) {
    merged.detectedMods.push({
      ...cached,
      needsReview: false, // Cached results don't need review
      fromCache: true
    });
  }
  
  // Add newly processed results
  if (recognitionResults && recognitionResults.detectedMods) {
    merged.detectedMods.push(...recognitionResults.detectedMods);
    merged.overallStats.processedResults = recognitionResults.detectedMods.length;
  }
  
  // Update stats
  merged.overallStats.totalAnalyzed = merged.detectedMods.length;
  merged.overallStats.highConfidence = merged.detectedMods.filter(m => m.confidence >= 0.85).length;
  
  const totalConfidence = merged.detectedMods.reduce((sum, m) => sum + m.confidence, 0);
  merged.overallStats.averageConfidence = totalConfidence / merged.detectedMods.length || 0;
  
  return merged;
}

async updateCacheWithResults(recognitionResults, gridMappingResult) {
  // Store high-confidence results in cache for future use
  for (const mod of recognitionResults.detectedMods) {
    if (mod.confidence >= 0.85) {
      await window.personalizationCache.storeCorrection(
        this.currentFileData.imageElement,
        mod.gridPosition,
        {
          selectedMod: mod.modName,
          confidence: mod.confidence,
          source: 'auto-recognition'
        }
      );
    }
  }
}

// Listen for user corrections to update cache
setupCacheListeners() {
  document.addEventListener('user-correction', async (event) => {
    const correctionData = event.detail;
    
    if (correctionData.gridPosition && this.currentFileData) {
      await window.personalizationCache.storeCorrection(
        this.currentFileData.imageElement,
        correctionData.gridPosition,
        correctionData
      );
    }
  });
}
```

---

## 3.4. Finalizing for Production

### 3.4.1. Unified Error Handling Module
**File:** `docs/modules/unified-error-handler.js`
```javascript
class UnifiedErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.errorHandlers = new Map();
    this.userMessages = new Map();
    
    this.init();
  }
  
  init() {
    this.setupGlobalErrorHandlers();
    this.defineErrorMessages();
    this.setupErrorRecoveryStrategies();
  }
  
  setupGlobalErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        type: 'global-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        type: 'unhandled-promise',
        promise: event.promise
      });
      
      event.preventDefault(); // Prevent default browser behavior
    });
  }
  
  defineErrorMessages() {
    // User-friendly error messages
    this.userMessages.set('QuotaExceededError', 
      'Storage space is full. Some older data may be cleared to make room.');
    
    this.userMessages.set('NetworkError', 
      'Network connection issue. Please check your internet connection.');
    
    this.userMessages.set('SecurityError', 
      'Security settings prevented this action. Please check your browser settings.');
    
    this.userMessages.set('NotAllowedError', 
      'Permission denied. Please allow access when prompted.');
    
    this.userMessages.set('InvalidStateError', 
      'Something went wrong. Please refresh the page and try again.');
    
    this.userMessages.set('DataError', 
      'Invalid data format. Please ensure your screenshot is from Nova Drift.');
    
    // Custom error types
    this.userMessages.set('RecognitionError', 
      'Unable to recognize the build. Please try manual selection.');
    
    this.userMessages.set('ProcessingError', 
      'Processing failed. Please try uploading a different screenshot.');
    
    this.userMessages.set('ValidationError', 
      'Invalid input detected. Please check your selection and try again.');
  }
  
  setupErrorRecoveryStrategies() {
    // Define recovery strategies for different error types
    this.errorHandlers.set('QuotaExceededError', async (error, context) => {
      // Attempt storage cleanup
      if (window.advancedFeedbackSystem) {
        await window.advancedFeedbackSystem.performAggressiveCleanup();
      }
      return { recovered: true, action: 'storage-cleaned' };
    });
    
    this.errorHandlers.set('NetworkError', async (error, context) => {
      // Retry with exponential backoff
      const maxRetries = 3;
      const retryCount = context.retryCount || 0;
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return { 
          recovered: false, 
          retry: true, 
          retryCount: retryCount + 1 
        };
      }
      
      return { recovered: false, action: 'max-retries-exceeded' };
    });
    
    this.errorHandlers.set('RecognitionError', async (error, context) => {
      // Fall back to manual mode
      if (context.fallbackToManual) {
        await context.fallbackToManual();
        return { recovered: true, action: 'manual-fallback' };
      }
      return { recovered: false };
    });
  }
  
  async handleError(error, context = {}) {
    // Log error
    this.logError(error, context);
    
    // Get user-friendly message
    const userMessage = this.getUserMessage(error);
    
    // Attempt recovery
    const recovery = await this.attemptRecovery(error, context);
    
    if (!recovery.recovered) {
      // Show error to user
      this.showErrorToUser(userMessage, error, context);
    }
    
    // Analytics
    this.reportError(error, context, recovery);
    
    return recovery;
  }
  
  logError(error, context) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      type: error.name,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errorLog.unshift(errorEntry);
    
    // Keep log size reasonable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
    
    // Console logging in development
    if (this.isDevelopment()) {
      console.error('Error logged:', errorEntry);
    }
  }
  
  getUserMessage(error) {
    // Check for specific error message
    if (this.userMessages.has(error.name)) {
      return this.userMessages.get(error.name);
    }
    
    // Check for error type patterns
    if (error.message.includes('network')) {
      return this.userMessages.get('NetworkError');
    }
    
    if (error.message.includes('permission')) {
      return this.userMessages.get('NotAllowedError');
    }
    
    // Generic message
    return 'An unexpected error occurred. Please try again or refresh the page.';
  }
  
  async attemptRecovery(error, context) {
    const handler = this.errorHandlers.get(error.name);
    
    if (handler) {
      try {
        return await handler(error, context);
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
        return { recovered: false, recoveryError };
      }
    }
    
    return { recovered: false };
  }
  
  showErrorToUser(message, error, context) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-message">
          <p>${this.sanitizeHTML(message)}</p>
          ${this.isDevelopment() ? `<details>
            <summary>Technical Details</summary>
            <pre>${this.sanitizeHTML(error.stack || error.message)}</pre>
          </details>` : ''}
        </div>
        <button class="error-close">&times;</button>
      </div>
      <div class="error-actions">
        ${context.retryable ? '<button class="btn btn-secondary error-retry">Retry</button>' : ''}
        <button class="btn btn-outline error-report">Report Issue</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Event handlers
    notification.querySelector('.error-close').addEventListener('click', () => {
      this.dismissError(notification);
    });
    
    if (context.retryable) {
      notification.querySelector('.error-retry').addEventListener('click', () => {
        this.dismissError(notification);
        if (context.onRetry) context.onRetry();
      });
    }
    
    notification.querySelector('.error-report').addEventListener('click', () => {
      this.reportIssue(error, context);
    });
    
    // Auto-dismiss after delay
    setTimeout(() => {
      this.dismissError(notification);
    }, 10000);
  }
  
  dismissError(notification) {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }
  
  sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  reportError(error, context, recovery) {
    // Analytics reporting
    if (window.abTestManager) {
      window.abTestManager.recordTestResult('error-tracking', 'error-occurred', {
        errorType: error.name,
        recovered: recovery.recovered,
        context: context.type || 'unknown'
      });
    }
    
    // Console logging for debugging
    console.group('Error Report');
    console.error('Error:', error);
    console.log('Context:', context);
    console.log('Recovery:', recovery);
    console.groupEnd();
  }
  
  reportIssue(error, context) {
    // Generate GitHub issue URL for error report
    const baseUrl = 'https://github.com/Gent8/nova-drift-cheatsheet/issues/new';
    
    const title = `Error Report: ${error.name}`;
    let body = '## Error Report\n\n';
    body += `**Error Type:** ${error.name}\n`;
    body += `**Message:** ${error.message}\n`;
    body += `**URL:** ${window.location.href}\n`;
    body += `**User Agent:** ${navigator.userAgent}\n`;
    body += `**Timestamp:** ${new Date().toISOString()}\n\n`;
    
    if (context.type) {
      body += `**Context:** ${context.type}\n\n`;
    }
    
    body += '### Steps to Reproduce\n';
    body += '1. [Please describe what you were doing when the error occurred]\n\n';
    
    body += '### Expected Behavior\n';
    body += '[What should have happened]\n\n';
    
    body += '### Actual Behavior\n';
    body += `The following error occurred: ${error.message}\n\n`;
    
    if (this.isDevelopment() && error.stack) {
      body += '### Stack Trace\n';
      body += '```\n' + error.stack + '\n```\n\n';
    }
    
    const url = `${baseUrl}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=bug,error-report`;
    
    window.open(url, '_blank');
  }
  
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.protocol === 'file:';
  }
  
  getErrorLog() {
    return [...this.errorLog];
  }
  
  clearErrorLog() {
    this.errorLog = [];
  }
}

// Initialize error handler
window.unifiedErrorHandler = new UnifiedErrorHandler();

// Export for use in other modules
window.handleError = (error, context) => {
  return window.unifiedErrorHandler.handleError(error, context);
};
```

### 3.4.2. Input Sanitization Module
**File:** `docs/modules/input-sanitizer.js`
```javascript
class InputSanitizer {
  constructor() {
    this.validators = new Map();
    this.sanitizers = new Map();
    
    this.setupValidators();
    this.setupSanitizers();
  }
  
  setupValidators() {
    // String validators
    this.validators.set('modName', (value) => {
      if (typeof value !== 'string') return false;
      if (value.length === 0 || value.length > 50) return false;
      return /^[a-zA-Z0-9\s\-_]+$/.test(value);
    });
    
    // Number validators
    this.validators.set('confidence', (value) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0 && num <= 1;
    });
    
    this.validators.set('coordinate', (value) => {
      const num = parseInt(value);
      return !isNaN(num) && num >= 0 && num <= 10000;
    });
    
    // Object validators
    this.validators.set('gridPosition', (value) => {
      return value && 
             typeof value === 'object' &&
             this.validators.get('coordinate')(value.row) &&
             this.validators.get('coordinate')(value.col);
    });
    
    this.validators.set('bounds', (value) => {
      return value && 
             typeof value === 'object' &&
             this.validators.get('coordinate')(value.x) &&
             this.validators.get('coordinate')(value.y) &&
             this.validators.get('coordinate')(value.width) &&
             this.validators.get('coordinate')(value.height);
    });
    
    // File validators
    this.validators.set('imageFile', (file) => {
      if (!(file instanceof File || file instanceof Blob)) return false;
      if (file.size > 50 * 1024 * 1024) return false; // 50MB limit
      if (!file.type.startsWith('image/')) return false;
      return true;
    });
  }
  
  setupSanitizers() {
    // String sanitizers
    this.sanitizers.set('modName', (value) => {
      return String(value)
        .trim()
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')
        .substring(0, 50);
    });
    
    this.sanitizers.set('text', (value) => {
      return String(value)
        .trim()
        .replace(/[<>]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .substring(0, 1000);
    });
    
    // Number sanitizers
    this.sanitizers.set('confidence', (value) => {
      const num = parseFloat(value);
      if (isNaN(num)) return 0;
      return Math.max(0, Math.min(1, num));
    });
    
    this.sanitizers.set('coordinate', (value) => {
      const num = parseInt(value);
      if (isNaN(num)) return 0;
      return Math.max(0, Math.min(10000, num));
    });
    
    // Object sanitizers
    this.sanitizers.set('gridPosition', (value) => {
      if (!value || typeof value !== 'object') return null;
      
      return {
        row: this.sanitizers.get('coordinate')(value.row),
        col: this.sanitizers.get('coordinate')(value.col)
      };
    });
    
    this.sanitizers.set('bounds', (value) => {
      if (!value || typeof value !== 'object') return null;
      
      return {
        x: this.sanitizers.get('coordinate')(value.x),
        y: this.sanitizers.get('coordinate')(value.y),
        width: this.sanitizers.get('coordinate')(value.width),
        height: this.sanitizers.get('coordinate')(value.height)
      };
    });
  }
  
  validate(type, value) {
    const validator = this.validators.get(type);
    if (!validator) {
      console.warn(`No validator found for type: ${type}`);
      return false;
    }
    
    try {
      return validator(value);
    } catch (error) {
      console.error(`Validation error for type ${type}:`, error);
      return false;
    }
  }
  
  sanitize(type, value) {
    const sanitizer = this.sanitizers.get(type);
    if (!sanitizer) {
      console.warn(`No sanitizer found for type: ${type}`);
      return value;
    }
    
    try {
      return sanitizer(value);
    } catch (error) {
      console.error(`Sanitization error for type ${type}:`, error);
      return null;
    }
  }
  
  validateAndSanitize(type, value) {
    const sanitized = this.sanitize(type, value);
    const isValid = this.validate(type, sanitized);
    
    return {
      isValid,
      value: isValid ? sanitized : null,
      originalValue: value
    };
  }
  
  sanitizeObject(obj, schema) {
    const sanitized = {};
    
    for (const [key, type] of Object.entries(schema)) {
      if (key in obj) {
        const result = this.validateAndSanitize(type, obj[key]);
        if (result.isValid) {
          sanitized[key] = result.value;
        }
      }
    }
    
    return sanitized;
  }
  
  // Specific sanitization methods
  sanitizeFileName(filename) {
    return filename
      .replace(/[^a-zA-Z0-9\-_.]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
  
  sanitizeURL(url) {
    try {
      const parsed = new URL(url);
      // Only allow http(s) protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      return parsed.href;
    } catch {
      return null;
    }
  }
  
  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  // File validation
  async validateImageFile(file) {
    if (!this.validate('imageFile', file)) {
      return { isValid: false, error: 'Invalid file type or size' };
    }
    
    // Additional image validation
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Check dimensions
          if (img.width < 100 || img.height < 100) {
            resolve({ isValid: false, error: 'Image too small' });
          } else if (img.width > 8000 || img.height > 8000) {
            resolve({ isValid: false, error: 'Image too large' });
          } else {
            resolve({ 
              isValid: true, 
              dimensions: { width: img.width, height: img.height }
            });
          }
        };
        
        img.onerror = () => {
          resolve({ isValid: false, error: 'Invalid image format' });
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        resolve({ isValid: false, error: 'Failed to read file' });
      };
      
      reader.readAsDataURL(file);
    });
  }
}

// Initialize sanitizer
window.inputSanitizer = new InputSanitizer();
```

### 3.4.3. Testing Strategy Implementation
**File:** `docs/tests/test-suite.js`
```javascript
class NovaCheatsheetTestSuite {
  constructor() {
    this.tests = new Map();
    this.results = [];
    this.currentTestRun = null;
    
    this.setupTests();
  }
  
  setupTests() {
    // Unit tests
    this.addTest('unit', 'coordinate-normalization', this.testCoordinateNormalization.bind(this));
    this.addTest('unit', 'data-contract-validation', this.testDataContractValidation.bind(this));
    this.addTest('unit', 'perceptual-hashing', this.testPerceptualHashing.bind(this));
    this.addTest('unit', 'input-sanitization', this.testInputSanitization.bind(this));
    
    // Integration tests
    this.addTest('integration', 'full-pipeline', this.testFullPipeline.bind(this));
    this.addTest('integration', 'error-recovery', this.testErrorRecovery.bind(this));
    this.addTest('integration', 'cache-performance', this.testCachePerformance.bind(this));
    
    // Browser compatibility tests
    this.addTest('compatibility', 'browser-features', this.testBrowserFeatures.bind(this));
    this.addTest('compatibility', 'graceful-degradation', this.testGracefulDegradation.bind(this));
  }
  
  addTest(category, name, testFn) {
    if (!this.tests.has(category)) {
      this.tests.set(category, new Map());
    }
    
    this.tests.get(category).set(name, {
      name,
      category,
      testFn,
      status: 'pending'
    });
  }
  
  async runAllTests() {
    console.log('Starting Nova Cheatsheet Test Suite');
    this.currentTestRun = {
      startTime: Date.now(),
      results: []
    };
    
    for (const [category, tests] of this.tests) {
      console.group(`Running ${category} tests`);
      
      for (const [name, test] of tests) {
        await this.runTest(test);
      }
      
      console.groupEnd();
    }
    
    this.generateReport();
  }
  
  async runTest(test) {
    const startTime = performance.now();
    let result = {
      name: test.name,
      category: test.category,
      status: 'failed',
      error: null,
      duration: 0,
      assertions: []
    };
    
    try {
      console.log(`Running test: ${test.name}`);
      
      // Create test context
      const context = {
        assert: this.createAssert(result),
        fixture: this.createFixture()
      };
      
      // Run test
      await test.testFn(context);
      
      // Check if all assertions passed
      if (result.assertions.every(a => a.passed)) {
        result.status = 'passed';
      }
      
    } catch (error) {
      result.status = 'error';
      result.error = {
        message: error.message,
        stack: error.stack
      };
      console.error(`Test failed: ${test.name}`, error);
    }
    
    result.duration = performance.now() - startTime;
    this.currentTestRun.results.push(result);
    
    // Update test status
    test.status = result.status;
    
    return result;
  }
  
  createAssert(result) {
    return {
      equal: (actual, expected, message) => {
        const passed = actual === expected;
        result.assertions.push({
          type: 'equal',
          actual,
          expected,
          passed,
          message: message || `Expected ${actual} to equal ${expected}`
        });
        
        if (!passed) {
          throw new Error(message || `Assertion failed: ${actual} !== ${expected}`);
        }
      },
      
      deepEqual: (actual, expected, message) => {
        const passed = JSON.stringify(actual) === JSON.stringify(expected);
        result.assertions.push({
          type: 'deepEqual',
          actual,
          expected,
          passed,
          message: message || `Expected deep equality`
        });
        
        if (!passed) {
          throw new Error(message || `Deep equality assertion failed`);
        }
      },
      
      true: (value, message) => {
        const passed = value === true;
        result.assertions.push({
          type: 'true',
          actual: value,
          expected: true,
          passed,
          message: message || `Expected ${value} to be true`
        });
        
        if (!passed) {
          throw new Error(message || `Expected true but got ${value}`);
        }
      },
      
      false: (value, message) => {
        const passed = value === false;
        result.assertions.push({
          type: 'false',
          actual: value,
          expected: false,
          passed,
          message: message || `Expected ${value} to be false`
        });
        
        if (!passed) {
          throw new Error(message || `Expected false but got ${value}`);
        }
      },
      
      throws: async (fn, expectedError, message) => {
        let threw = false;
        let actualError = null;
        
        try {
          await fn();
        } catch (error) {
          threw = true;
          actualError = error;
        }
        
        const passed = threw && (!expectedError || actualError.name === expectedError);
        
        result.assertions.push({
          type: 'throws',
          actual: actualError,
          expected: expectedError,
          passed,
          message: message || `Expected function to throw`
        });
        
        if (!passed) {
          throw new Error(message || `Expected function to throw ${expectedError || 'an error'}`);
        }
      }
    };
  }
  
  createFixture() {
    return {
      loadTestImage: async (name) => {
        // Load test image from validation dataset
        const img = new Image();
        img.src = `/docs/validation-dataset/screenshots/${name}`;
        await new Promise(resolve => img.onload = resolve);
        return img;
      },
      
      createMockData: (type) => {
        const mockData = {
          gridPosition: { row: 1, col: 2 },
          bounds: { x: 100, y: 200, width: 300, height: 400 },
          modData: {
            modName: 'TestMod',
            confidence: 0.85,
            position: { x: 150, y: 250 }
          }
        };
        
        return mockData[type] || mockData;
      }
    };
  }
  
  // Test implementations
  async testCoordinateNormalization({ assert, fixture }) {
    const normalizer = window.dataContractManager;
    
    // Test basic normalization
    const input = { x: 100.5, y: 200.7 };
    const normalized = normalizer.normalizeCoordinates(input);
    
    assert.equal(normalized.x, 101, 'X coordinate should be rounded');
    assert.equal(normalized.y, 201, 'Y coordinate should be rounded');
    
    // Test boundary conditions
    const boundary = { x: -10, y: 10000 };
    const boundaryNorm = normalizer.normalizeCoordinates(boundary);
    
    assert.equal(boundaryNorm.x, 0, 'Negative X should be clamped to 0');
    assert.equal(boundaryNorm.y, 10000, 'Large Y should be preserved');
  }
  
  async testDataContractValidation({ assert, fixture }) {
    const validator = window.dataContractManager;
    
    // Test valid contract
    const validData = {
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      confidence: 0.85
    };
    
    const validation = validator.validate('roi-bounds', validData);
    assert.true(validation.isValid, 'Valid data should pass validation');
    
    // Test invalid contract
    const invalidData = {
      bounds: { x: -10, y: 'invalid' },
      confidence: 2.0
    };
    
    const invalidValidation = validator.validate('roi-bounds', invalidData);
    assert.false(invalidValidation.isValid, 'Invalid data should fail validation');
  }
  
  async testPerceptualHashing({ assert, fixture }) {
    // Create test canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;
    
    // Draw test pattern
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#fff';
    ctx.fillRect(32, 32, 32, 32);
    
    const imageData = ctx.getImageData(0, 0, 64, 64);
    
    // Test hashing
    const cache = window.personalizationCache;
    const hash1 = await cache.perceptualHash(imageData);
    
    assert.equal(typeof hash1, 'string', 'Hash should be a string');
    assert.equal(hash1.length, 16, 'Hash should be 16 characters');
    
    // Test consistency
    const hash2 = await cache.perceptualHash(imageData);
    assert.equal(hash1, hash2, 'Same image should produce same hash');
  }
  
  async testInputSanitization({ assert, fixture }) {
    const sanitizer = window.inputSanitizer;
    
    // Test string sanitization
    const dirtyString = '<script>alert("xss")</script>TestMod';
    const clean = sanitizer.sanitize('modName', dirtyString);
    
    assert.equal(clean, 'TestMod', 'Dangerous characters should be removed');
    
    // Test number sanitization
    const dirtyNumber = '1.5abc';
    const cleanNum = sanitizer.sanitize('confidence', dirtyNumber);
    
    assert.equal(cleanNum, 1.0, 'Invalid number should be clamped');
    
    // Test object sanitization
    const dirtyObj = {
      row: -5,
      col: 'invalid',
      extra: 'field'
    };
    
    const cleanObj = sanitizer.sanitize('gridPosition', dirtyObj);
    assert.deepEqual(cleanObj, { row: 0, col: 0 }, 'Object should be sanitized');
  }
  
  async testFullPipeline({ assert, fixture }) {
    // Test the complete screenshot processing pipeline
    const coordinator = window.importCoordinator;
    
    // Load test image
    const testImage = await fixture.loadTestImage('test-screenshot-1080p.png');
    
    const fileData = {
      imageElement: testImage,
      metadata: {
        name: 'test-screenshot.png',
        size: 1000000,
        type: 'image/png'
      }
    };
    
    // Process through pipeline
    let pipelineCompleted = false;
    
    const completeHandler = () => {
      pipelineCompleted = true;
    };
    
    document.addEventListener('import-complete', completeHandler, { once: true });
    
    await coordinator.handleScreenshot(fileData);
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    assert.true(pipelineCompleted, 'Pipeline should complete successfully');
  }
  
  async testErrorRecovery({ assert, fixture }) {
    const errorHandler = window.unifiedErrorHandler;
    
    // Test quota exceeded recovery
    const quotaError = new DOMException('Storage quota exceeded', 'QuotaExceededError');
    const recovery = await errorHandler.handleError(quotaError, { 
      type: 'storage-test' 
    });
    
    assert.true(recovery.recovered, 'Should recover from quota exceeded');
    
    // Test network error with retry
    const networkError = new Error('Network request failed');
    networkError.name = 'NetworkError';
    
    const networkRecovery = await errorHandler.handleError(networkError, {
      type: 'network-test',
      retryCount: 0
    });
    
    assert.true(networkRecovery.retry, 'Should attempt retry for network error');
  }
  
  async testCachePerformance({ assert, fixture }) {
    const cache = window.personalizationCache;
    
    // Test cache hit performance
    const testData = fixture.createMockData('modData');
    const gridPos = fixture.createMockData('gridPosition');
    
    // Store in cache
    await cache.storeCorrection(
      await fixture.loadTestImage('test-hex.png'),
      gridPos,
      testData
    );
    
    // Measure lookup time
    const startTime = performance.now();
    const result = await cache.checkCache(
      await fixture.loadTestImage('test-hex.png'),
      gridPos
    );
    const lookupTime = performance.now() - startTime;
    
    assert.true(result.found, 'Should find cached entry');
    assert.true(lookupTime < 50, 'Cache lookup should be fast (< 50ms)');
  }
  
  async testBrowserFeatures({ assert, fixture }) {
    // Test required browser features
    assert.true('indexedDB' in window, 'IndexedDB should be available');
    assert.true('Worker' in window, 'Web Workers should be available');
    assert.true('crypto' in window, 'Crypto API should be available');
    assert.true('FileReader' in window, 'FileReader should be available');
    
    // Test optional features
    const hasStorageEstimate = 'storage' in navigator && 'estimate' in navigator.storage;
    console.log(`Storage estimate API: ${hasStorageEstimate ? 'available' : 'not available'}`);
  }
  
  async testGracefulDegradation({ assert, fixture }) {
    // Test behavior when features are disabled
    
    // Simulate disabled JavaScript partially
    const originalWorker = window.Worker;
    window.Worker = undefined;
    
    try {
      // Core functionality should still work
      const canUseFallback = window.importCoordinator.canUseFallbackMode();
      assert.true(canUseFallback, 'Should have fallback when Workers unavailable');
      
    } finally {
      // Restore
      window.Worker = originalWorker;
    }
  }
  
  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.currentTestRun.startTime;
    
    const results = this.currentTestRun.results;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    console.group('Test Suite Report');
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Errors: ${errors} 🚨`);
    console.log(`Duration: ${duration}ms`);
    
    // Detailed results
    if (failed > 0 || errors > 0) {
      console.group('Failed Tests');
      results.filter(r => r.status !== 'passed').forEach(result => {
        console.error(`${result.category}/${result.name}: ${result.status}`);
        if (result.error) {
          console.error(result.error);
        }
        result.assertions.filter(a => !a.passed).forEach(assertion => {
          console.error(`  - ${assertion.message}`);
        });
      });
      console.groupEnd();
    }
    
    console.groupEnd();
    
    // Generate HTML report
    this.generateHTMLReport(results, duration);
    
    return {
      passed: passed === results.length,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        errors,
        duration
      }
    };
  }
  
  generateHTMLReport(results, duration) {
    const report = document.createElement('div');
    report.className = 'test-report';
    report.innerHTML = `
      <h2>Nova Cheatsheet Test Report</h2>
      <div class="test-summary">
        <div class="stat">
          <span class="stat-value">${results.length}</span>
          <span class="stat-label">Total Tests</span>
        </div>
        <div class="stat passed">
          <span class="stat-value">${results.filter(r => r.status === 'passed').length}</span>
          <span class="stat-label">Passed</span>
        </div>
        <div class="stat failed">
          <span class="stat-value">${results.filter(r => r.status === 'failed').length}</span>
          <span class="stat-label">Failed</span>
        </div>
        <div class="stat">
          <span class="stat-value">${(duration / 1000).toFixed(2)}s</span>
          <span class="stat-label">Duration</span>
        </div>
      </div>
      
      <div class="test-details">
        ${results.map(result => `
          <div class="test-result ${result.status}">
            <h3>${result.category}/${result.name}</h3>
            <span class="status">${result.status}</span>
            <span class="duration">${result.duration.toFixed(0)}ms</span>
            ${result.error ? `<pre class="error">${result.error.message}</pre>` : ''}
          </div>
        `).join('')}
      </div>
    `;
    
    // Add to page or save to file
    if (document.body) {
      document.body.appendChild(report);
    }
  }
}

// Initialize test suite
window.testSuite = new NovaCheatsheetTestSuite();

// Run tests command
window.runTests = async (category) => {
  if (category) {
    // Run specific category
    const tests = window.testSuite.tests.get(category);
    if (tests) {
      for (const [name, test] of tests) {
        await window.testSuite.runTest(test);
      }
    }
  } else {
    // Run all tests
    await window.testSuite.runAllTests();
  }
};
```

### 3.4.4. Deployment Strategy
**File:** `docs/deployment/deployment-config.js`
```javascript
class DeploymentManager {
  constructor() {
    this.version = '1.0.0';
    this.updateChannel = 'stable';
    this.updateCheckInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    this.init();
  }
  
  async init() {
    await this.checkForUpdates();
    this.scheduleUpdateChecks();
    this.setupServiceWorker();
  }
  
  async checkForUpdates() {
    try {
      const response = await fetch('/api/check-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentVersion: this.version,
          channel: this.updateChannel
        })
      });
      
      const data = await response.json();
      
      if (data.updateAvailable) {
        this.notifyUpdateAvailable(data);
      }
      
    } catch (error) {
      console.log('Update check failed:', error);
    }
  }
  
  notifyUpdateAvailable(updateInfo) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <h4>Update Available!</h4>
        <p>Version ${updateInfo.version} is now available.</p>
        <p class="update-description">${updateInfo.description}</p>
      </div>
      <div class="update-actions">
        <button class="btn btn-primary" onclick="window.deploymentManager.applyUpdate()">
          Update Now
        </button>
        <button class="btn btn-outline" onclick="this.parentElement.parentElement.remove()">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
  }
  
  async applyUpdate() {
    // Trigger service worker update
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      
      // Reload page to apply update
      window.location.reload();
    }
  }
  
  scheduleUpdateChecks() {
    setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckInterval);
  }
  
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered');
          
          registration.addEventListener('updatefound', () => {
            console.log('Service Worker update found');
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }
  
  // Feature flags for gradual rollout
  isFeatureEnabled(featureName) {
    const features = {
      'auto-crop': true,
      'personalization-cache': true,
      'advanced-feedback': true,
      'ab-testing': true
    };
    
    return features[featureName] || false;
  }
  
  // Configuration management
  async updateConfiguration(config) {
    // Update recognition templates
    if (config.recognitionTemplates) {
      await this.updateRecognitionTemplates(config.recognitionTemplates);
    }
    
    // Update algorithm weights
    if (config.algorithmWeights) {
      await this.updateAlgorithmWeights(config.algorithmWeights);
    }
    
    // Update feature flags
    if (config.featureFlags) {
      this.updateFeatureFlags(config.featureFlags);
    }
  }
  
  async updateRecognitionTemplates(templates) {
    // Update templates without disrupting active sessions
    const tx = window.recognitionEngine.db.transaction(['templates'], 'readwrite');
    const store = tx.objectStore('templates');
    
    for (const template of templates) {
      await store.put(template);
    }
    
    console.log('Recognition templates updated');
  }
  
  async updateAlgorithmWeights(weights) {
    // Update algorithm weights for consensus engine
    localStorage.setItem('nova-algorithm-weights', JSON.stringify(weights));
    
    // Notify recognition engine of update
    if (window.recognitionEngine) {
      window.recognitionEngine.updateWeights(weights);
    }
  }
  
  updateFeatureFlags(flags) {
    localStorage.setItem('nova-feature-flags', JSON.stringify(flags));
    
    // Apply feature flags immediately
    for (const [feature, enabled] of Object.entries(flags)) {
      this.applyFeatureFlag(feature, enabled);
    }
  }
  
  applyFeatureFlag(feature, enabled) {
    // Apply feature flag changes
    switch (feature) {
      case 'auto-crop':
        window.importCoordinator.autoDetectionEnabled = enabled;
        break;
      case 'personalization-cache':
        window.personalizationCache.enabled = enabled;
        break;
      case 'advanced-feedback':
        window.advancedFeedbackSystem.enabled = enabled;
        break;
    }
  }
}

// Initialize deployment manager
window.deploymentManager = new DeploymentManager();
```

---

## 3.5. Production CSS Updates

### 3.5.1. Production-Ready Styles
**Add to:** `docs/style.css`
```css
/* Production Error Handling Styles */
.error-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  max-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  transform: translateX(420px);
  transition: transform 0.3s ease-out;
}

.error-notification.show {
  transform: translateX(0);
}

.error-content {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-message {
  flex: 1;
}

.error-message p {
  margin: 0 0 8px 0;
  color: #333;
}

.error-message details {
  margin-top: 12px;
  font-size: 12px;
  color: #666;
}

.error-message pre {
  margin: 8px 0;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 11px;
  overflow-x: auto;
}

.error-close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
}

.error-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 0 0 8px 8px;
}

/* Manual Crop Tool Styles */
.manual-crop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-container {
  background: white;
  border-radius: 12px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.crop-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.crop-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.crop-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
}

.crop-instructions {
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.crop-instructions p {
  margin: 0 0 12px 0;
  color: #666;
}

.crop-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e7f3ff;
  border-radius: 6px;
  color: #0066cc;
  font-size: 14px;
}

.use-suggestion-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.crop-canvas-container {
  position: relative;
  padding: 20px;
  background: #f5f5f5;
  overflow: auto;
  flex: 1;
}

#crop-canvas {
  cursor: crosshair;
  display: block;
  margin: 0 auto;
  max-width: 100%;
  max-height: 100%;
}

.crop-actions {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Feedback Notification Styles */
.feedback-notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10001;
  pointer-events: none;
}

.feedback-notification {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin-bottom: 12px;
  transform: translateX(420px);
  transition: transform 0.3s ease-out;
  pointer-events: all;
}

.feedback-notification.show {
  transform: translateX(0);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  color: #333;
}

.notification-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
}

.feedback-notification-info {
  border-left: 4px solid #0066cc;
}

.feedback-notification-success {
  border-left: 4px solid #28a745;
}

.feedback-notification-warning {
  border-left: 4px solid #ffc107;
}

.feedback-notification-error {
  border-left: 4px solid #dc3545;
}

/* Advanced Feedback Dialog */
.feedback-submit-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
}

.dialog-container {
  position: relative;
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: dialogSlideIn 0.3s ease-out;
}

@keyframes dialogSlideIn {
  from {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
}

.dialog-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.privacy-notice {
  margin: 20px 0;
  padding: 16px;
  background: #e7f3ff;
  border-radius: 8px;
}

.privacy-notice h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #0066cc;
}

.privacy-notice ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #333;
}

.privacy-notice li {
  margin-bottom: 8px;
}

.submission-options {
  margin: 20px 0;
}

.submission-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  margin-bottom: 12px;
}

.submission-options input[type="checkbox"] {
  cursor: pointer;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-icon {
  margin-right: 6px;
}

/* Test Report Styles */
.test-report {
  max-width: 800px;
  margin: 40px auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.test-report h2 {
  margin: 0 0 24px 0;
  color: #333;
}

.test-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 32px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.test-summary .stat {
  text-align: center;
  flex: 1;
}

.test-summary .stat-value {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.test-summary .stat-label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.test-summary .stat.passed .stat-value {
  color: #28a745;
}

.test-summary .stat.failed .stat-value {
  color: #dc3545;
}

.test-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-result {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-result h3 {
  margin: 0;
  font-size: 16px;
  flex: 1;
}

.test-result.passed {
  background: #f0f9ff;
  border-color: #28a745;
}

.test-result.failed {
  background: #fff5f5;
  border-color: #dc3545;
}

.test-result .status {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
}

.test-result.passed .status {
  color: #28a745;
}

.test-result.failed .status {
  color: #dc3545;
}

.test-result .duration {
  font-size: 12px;
  color: #666;
}

.test-result .error {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #dc3545;
  overflow-x: auto;
}

/* Update Notification Styles */
.update-notification {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 20px;
  max-width: 400px;
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.update-content h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.update-content p {
  margin: 0 0 4px 0;
  color: #666;
  font-size: 14px;
}

.update-description {
  font-style: italic;
}

.update-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

/* Responsive adjustments for production */
@media (max-width: 768px) {
  .error-notification,
  .feedback-notification {
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .crop-container {
    border-radius: 0;
    max-width: 100vw;
    max-height: 100vh;
  }
  
  .dialog-container {
    max-width: 95vw;
    max-height: 90vh;
  }
  
  .test-summary {
    flex-wrap: wrap;
  }
  
  .update-notification {
    left: 10px;
    right: 10px;
    bottom: 10px;
  }
}

/* Loading states */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #333;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Print styles */
@media print {
  .error-notification,
  .feedback-notification,
  .update-notification,
  .manual-crop-overlay,
  .feedback-dialog,
  .dialog-backdrop {
    display: none !important;
  }
  
  .test-report {
    box-shadow: none;
    page-break-inside: avoid;
  }
}
```

---

**Exit Criteria for Phase 3:** The feature is complete and production-ready. The automated "happy path" is the default, a secure and robust community feedback loop is in place, and the entire system is supported by a comprehensive testing and error-handling strategy.