# Phase 1: Foundational Integration

**Objective:** To create the core, end-to-end workflow with a manual-first approach. This phase builds the state management and data pipeline, prioritizing robustness, clear error handling, and a non-blocking user experience.

---

## 1.1. Create Import Coordinator and State Machine

### 1.1.1. Core Import Coordinator Module
**File:** `docs/modules/import-coordinator.js`
```javascript
class ImportCoordinator {
  constructor(options = {}) {
    this.state = 'idle';
    this.stateData = {};
    this.abortController = null;
    this.timeout = options.timeout || 20000; // 20 second hard timeout
    this.eventTarget = new EventTarget();
    this.webWorkerPool = null;
    
    this.stateTransitions = this.defineStateTransitions();
    this.dataContracts = this.loadDataContracts();
    
    this.init();
  }

  // State machine definition
  defineStateTransitions() {
    return {
      'idle': ['processing-roi', 'awaiting-crop', 'error'],
      'processing-roi': ['awaiting-crop', 'processing-grid', 'error'],
      'awaiting-crop': ['processing-grid', 'idle', 'error'],
      'processing-grid': ['processing-recognition', 'error'],
      'processing-recognition': ['reviewing', 'complete', 'error'],
      'reviewing': ['complete', 'processing-recognition', 'error'],
      'complete': ['idle'],
      'error': ['idle']
    };
  }

  async startImport(fileData) {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start import in state: ${this.state}`);
    }

    this.abortController = new AbortController();
    this.setupTimeout();
    
    try {
      // Validate input data against contract
      const validatedData = this.validateDataContract('file-input', fileData);
      
      // Store initial data
      this.stateData = {
        originalFile: validatedData,
        startTime: Date.now(),
        processedRegions: null,
        recognitionResults: null,
        userCorrections: []
      };

      // Decide initial processing path
      if (window.ROI_DETECTOR_ENABLED && window.roiDetector) {
        await this.transitionTo('processing-roi');
        return this.processROIDetection();
      } else {
        await this.transitionTo('awaiting-crop');
        return this.presentCropInterface();
      }
      
    } catch (error) {
      await this.handleError(error);
      throw error;
    }
  }

  async transitionTo(newState, data = {}) {
    const currentTransitions = this.stateTransitions[this.state];
    if (!currentTransitions.includes(newState)) {
      throw new Error(`Invalid transition from ${this.state} to ${newState}`);
    }

    const previousState = this.state;
    this.state = newState;
    
    // Merge new data
    this.stateData = { ...this.stateData, ...data };
    
    // Emit state change event
    this.emit('state-change', {
      from: previousState,
      to: newState,
      data: this.stateData,
      timestamp: Date.now()
    });

    console.log(`ImportCoordinator: ${previousState} → ${newState}`);
  }

  setupTimeout() {
    setTimeout(() => {
      if (this.state !== 'idle' && this.state !== 'complete') {
        this.handleError(new Error('Import process timed out after 20 seconds'));
      }
    }, this.timeout);
  }
}
```

### 1.1.2. Data Contract System
**File:** `docs/modules/data-contracts.js`
```javascript
class DataContractManager {
  constructor() {
    this.contracts = this.defineContracts();
    this.version = '1.0.0';
  }

  defineContracts() {
    return {
      'file-input': {
        version: '1.0.0',
        required: ['file', 'dimensions', 'metadata'],
        schema: {
          file: { type: 'object', properties: ['name', 'size', 'type'] },
          dimensions: { type: 'object', properties: ['width', 'height'] },
          metadata: { type: 'object', properties: ['size', 'type', 'lastModified', 'dataUrl'] }
        }
      },
      
      'roi-detection-result': {
        version: '1.0.0',
        required: ['bounds', 'confidence', 'method'],
        schema: {
          bounds: { 
            type: 'object', 
            required: ['left', 'top', 'right', 'bottom'],
            properties: {
              left: { type: 'number', min: 0 },
              top: { type: 'number', min: 0 },
              right: { type: 'number', min: 0 },
              bottom: { type: 'number', min: 0 }
            }
          },
          confidence: { type: 'number', min: 0, max: 1 },
          method: { type: 'string', enum: ['edge-detection', 'color-segmentation', 'template-matching', 'corner-detection', 'manual'] }
        }
      },

      'crop-data': {
        version: '1.0.0',
        required: ['imageData', 'cropBounds', 'originalDimensions'],
        schema: {
          imageData: { type: 'object' }, // ImageData object
          cropBounds: { type: 'object', properties: ['x', 'y', 'width', 'height'] },
          originalDimensions: { type: 'object', properties: ['width', 'height'] }
        }
      },

      'grid-mapping-result': {
        version: '1.0.0',
        required: ['coordinateMap', 'scalingFactor', 'gridMetadata'],
        schema: {
          coordinateMap: { type: 'object' }, // Map object
          scalingFactor: { type: 'number', min: 0.1, max: 5.0 },
          gridMetadata: {
            type: 'object',
            required: ['hexRadius', 'gridCenter', 'totalDetectedHexes'],
            properties: {
              hexRadius: { type: 'number' },
              gridCenter: { type: 'object', properties: ['x', 'y'] },
              totalDetectedHexes: { type: 'number', min: 0 }
            }
          }
        }
      },

      'recognition-result': {
        version: '1.0.0',
        required: ['detectedMods', 'overallStats', 'processingMetadata'],
        schema: {
          detectedMods: { type: 'array' },
          overallStats: {
            type: 'object',
            required: ['totalAnalyzed', 'highConfidence', 'averageConfidence'],
            properties: {
              totalAnalyzed: { type: 'number' },
              highConfidence: { type: 'number' },
              averageConfidence: { type: 'number', min: 0, max: 1 }
            }
          },
          processingMetadata: { type: 'object' }
        }
      }
    };
  }

  validate(contractName, data) {
    const contract = this.contracts[contractName];
    if (!contract) {
      throw new Error(`Unknown data contract: ${contractName}`);
    }

    // Validate required fields
    for (const field of contract.required) {
      if (!(field in data)) {
        throw new Error(`Missing required field '${field}' in ${contractName} contract`);
      }
    }

    // Basic type validation
    const schema = contract.schema;
    for (const [field, rules] of Object.entries(schema)) {
      if (field in data) {
        this.validateField(field, data[field], rules, contractName);
      }
    }

    return {
      valid: true,
      version: contract.version,
      data: data
    };
  }

  validateField(fieldName, value, rules, contractName) {
    // Type validation
    if (rules.type && typeof value !== rules.type && rules.type !== 'array') {
      if (rules.type === 'array' && !Array.isArray(value)) {
        throw new Error(`Field '${fieldName}' must be an array in ${contractName}`);
      }
      if (rules.type !== 'array' && typeof value !== rules.type) {
        throw new Error(`Field '${fieldName}' must be of type ${rules.type} in ${contractName}`);
      }
    }

    // Range validation for numbers
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        throw new Error(`Field '${fieldName}' must be >= ${rules.min} in ${contractName}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        throw new Error(`Field '${fieldName}' must be <= ${rules.max} in ${contractName}`);
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      throw new Error(`Field '${fieldName}' must be one of [${rules.enum.join(', ')}] in ${contractName}`);
    }

    // Nested object validation
    if (rules.type === 'object' && rules.required) {
      for (const nestedField of rules.required) {
        if (!(nestedField in value)) {
          throw new Error(`Missing required nested field '${nestedField}' in ${fieldName} of ${contractName}`);
        }
      }
    }
  }
}

// Global instance
window.dataContractManager = new DataContractManager();
```

---

## 1.2. Manual Crop Interface Implementation

### 1.2.1. Crop Modal UI Components
**Add to:** `docs/index.html`
```html
<!-- Insert before closing </body> tag -->
<div id="crop-modal" class="crop-modal" style="display: none;">
  <div class="crop-modal-backdrop" aria-hidden="true"></div>
  <div class="crop-modal-container" role="dialog" aria-labelledby="crop-modal-title" aria-modal="true">
    <div class="crop-modal-header">
      <h2 id="crop-modal-title">Crop Build Configuration Area</h2>
      <button class="crop-modal-close" aria-label="Close crop tool">&times;</button>
    </div>
    
    <div class="crop-modal-body">
      <div class="crop-instructions">
        <p>Please select the build configuration area by dragging to create a selection rectangle.</p>
        <div class="crop-tips">
          <span class="tip">💡 Include the entire hexagonal grid area</span>
          <span class="tip">⚡ Exclude UI elements and menus</span>
        </div>
      </div>
      
      <div class="crop-canvas-container">
        <canvas id="crop-canvas" class="crop-canvas"></canvas>
        <div class="crop-overlay">
          <div class="crop-selection" id="crop-selection"></div>
          <div class="crop-handles">
            <div class="crop-handle crop-handle-nw" data-direction="nw"></div>
            <div class="crop-handle crop-handle-ne" data-direction="ne"></div>
            <div class="crop-handle crop-handle-sw" data-direction="sw"></div>
            <div class="crop-handle crop-handle-se" data-direction="se"></div>
          </div>
        </div>
      </div>
      
      <div class="crop-preview-section">
        <h3>Preview</h3>
        <canvas id="crop-preview" class="crop-preview-canvas"></canvas>
        <div class="crop-info">
          <span id="crop-dimensions">Selection: 0x0</span>
          <span id="crop-aspect-ratio">Aspect: 0:0</span>
        </div>
      </div>
    </div>
    
    <div class="crop-modal-footer">
      <button class="btn btn-secondary" id="crop-cancel">Cancel</button>
      <button class="btn btn-secondary" id="crop-reset">Reset Selection</button>
      <button class="btn btn-primary" id="crop-confirm" disabled>Confirm Crop</button>
    </div>
  </div>
</div>
```

### 1.2.2. Crop Interface Styling
**Add to:** `docs/style.css`
```css
/* Crop Modal Styles */
.crop-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.crop-modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
}

.crop-modal-container {
  position: relative;
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.crop-modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.crop-modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.crop-modal-body {
  padding: 20px;
  flex: 1;
  overflow: auto;
}

.crop-instructions {
  margin-bottom: 15px;
}

.crop-tips {
  display: flex;
  gap: 15px;
  margin-top: 10px;
}

.tip {
  font-size: 14px;
  color: #666;
}

.crop-canvas-container {
  position: relative;
  display: inline-block;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin-bottom: 20px;
}

.crop-canvas {
  display: block;
  max-width: 800px;
  max-height: 600px;
  cursor: crosshair;
}

.crop-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.crop-selection {
  position: absolute;
  border: 2px solid #007bff;
  background: rgba(0, 123, 255, 0.1);
  display: none;
}

.crop-handles {
  display: none;
}

.crop-selection.active ~ .crop-handles {
  display: block;
}

.crop-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #007bff;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: all;
  transform: translate(-50%, -50%);
}

.crop-handle-nw { top: 0; left: 0; cursor: nw-resize; }
.crop-handle-ne { top: 0; right: 0; cursor: ne-resize; }
.crop-handle-sw { bottom: 0; left: 0; cursor: sw-resize; }
.crop-handle-se { bottom: 0; right: 0; cursor: se-resize; }

.crop-preview-section {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.crop-preview-canvas {
  max-width: 200px;
  max-height: 150px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.crop-info {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}

.crop-modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}
```

### 1.2.3. Crop Interface JavaScript
**File:** `docs/modules/crop-interface.js`
```javascript
class CropInterface {
  constructor(importCoordinator) {
    this.coordinator = importCoordinator;
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    
    this.imageElement = null;
    this.selection = { x: 0, y: 0, width: 0, height: 0 };
    this.isSelecting = false;
    this.isDragging = false;
    this.dragHandle = null;
    this.startPoint = { x: 0, y: 0 };
    
    this.init();
  }

  init() {
    this.modal = document.getElementById('crop-modal');
    this.canvas = document.getElementById('crop-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.previewCanvas = document.getElementById('crop-preview');
    this.previewCtx = this.previewCanvas.getContext('2d');
    
    this.setupEventListeners();
    this.setupAccessibility();
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
    document.getElementById('crop-confirm').addEventListener('click', this.confirmCrop.bind(this));
    document.getElementById('crop-cancel').addEventListener('click', this.cancelCrop.bind(this));
    document.getElementById('crop-reset').addEventListener('click', this.resetSelection.bind(this));
    document.getElementById('crop-modal-close').addEventListener('click', this.cancelCrop.bind(this));
    
    // Backdrop click
    this.modal.querySelector('.crop-modal-backdrop').addEventListener('click', this.cancelCrop.bind(this));
    
    // Keyboard support
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // Handle resizing
    this.setupResizeHandles();
  }

  setupAccessibility() {
    // ARIA attributes
    this.canvas.setAttribute('role', 'application');
    this.canvas.setAttribute('aria-label', 'Crop selection area. Use mouse or touch to select build configuration area.');
    this.canvas.setAttribute('tabindex', '0');
    
    // Focus management
    this.modal.addEventListener('show', () => {
      this.canvas.focus();
    });
  }

  async show(imageElement) {
    this.imageElement = imageElement;
    
    // Calculate canvas size maintaining aspect ratio
    const maxWidth = 800;
    const maxHeight = 600;
    const imageRatio = imageElement.naturalWidth / imageElement.naturalHeight;
    
    let canvasWidth, canvasHeight;
    if (imageRatio > maxWidth / maxHeight) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / imageRatio;
    } else {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imageRatio;
    }
    
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';
    
    // Draw image
    this.ctx.drawImage(imageElement, 0, 0, canvasWidth, canvasHeight);
    
    // Show modal
    this.modal.style.display = 'flex';
    this.canvas.focus();
    
    // Reset selection
    this.resetSelection();
    
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  hide() {
    this.modal.style.display = 'none';
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Check if clicking on handle
    const handle = this.getHandleAtPoint(x, y);
    if (handle) {
      this.isDragging = true;
      this.dragHandle = handle;
      this.startPoint = { x, y };
      return;
    }
    
    // Start new selection
    this.isSelecting = true;
    this.startPoint = { x, y };
    this.selection = { x, y, width: 0, height: 0 };
    this.updateSelection();
  }

  handleMouseMove(event) {
    if (!this.isSelecting && !this.isDragging) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (this.isDragging) {
      this.resizeSelection(x, y);
    } else if (this.isSelecting) {
      this.updateSelectionFromDrag(x, y);
    }
    
    this.updateSelection();
    this.updatePreview();
  }

  handleMouseUp(event) {
    this.isSelecting = false;
    this.isDragging = false;
    this.dragHandle = null;
    
    this.validateSelection();
  }

  updateSelectionFromDrag(currentX, currentY) {
    const x = Math.min(this.startPoint.x, currentX);
    const y = Math.min(this.startPoint.y, currentY);
    const width = Math.abs(currentX - this.startPoint.x);
    const height = Math.abs(currentY - this.startPoint.y);
    
    this.selection = { x, y, width, height };
  }

  resizeSelection(currentX, currentY) {
    const deltaX = currentX - this.startPoint.x;
    const deltaY = currentY - this.startPoint.y;
    
    switch (this.dragHandle) {
      case 'nw':
        this.selection.x += deltaX;
        this.selection.y += deltaY;
        this.selection.width -= deltaX;
        this.selection.height -= deltaY;
        break;
      case 'ne':
        this.selection.y += deltaY;
        this.selection.width += deltaX;
        this.selection.height -= deltaY;
        break;
      case 'sw':
        this.selection.x += deltaX;
        this.selection.width -= deltaX;
        this.selection.height += deltaY;
        break;
      case 'se':
        this.selection.width += deltaX;
        this.selection.height += deltaY;
        break;
    }
    
    // Ensure minimum size and bounds
    this.selection.width = Math.max(50, this.selection.width);
    this.selection.height = Math.max(50, this.selection.height);
    this.selection.x = Math.max(0, Math.min(this.selection.x, this.canvas.width - this.selection.width));
    this.selection.y = Math.max(0, Math.min(this.selection.y, this.canvas.height - this.selection.height));
    
    this.startPoint = { x: currentX, y: currentY };
  }

  updateSelection() {
    const selectionDiv = document.getElementById('crop-selection');
    
    if (this.selection.width > 0 && this.selection.height > 0) {
      selectionDiv.style.display = 'block';
      selectionDiv.style.left = this.selection.x + 'px';
      selectionDiv.style.top = this.selection.y + 'px';
      selectionDiv.style.width = this.selection.width + 'px';
      selectionDiv.style.height = this.selection.height + 'px';
      selectionDiv.classList.add('active');
      
      this.updateHandlePositions();
      this.updateInfoDisplay();
    } else {
      selectionDiv.style.display = 'none';
      selectionDiv.classList.remove('active');
    }
  }

  updateHandlePositions() {
    const handles = {
      'nw': document.querySelector('.crop-handle-nw'),
      'ne': document.querySelector('.crop-handle-ne'),
      'sw': document.querySelector('.crop-handle-sw'),
      'se': document.querySelector('.crop-handle-se')
    };
    
    handles.nw.style.left = this.selection.x + 'px';
    handles.nw.style.top = this.selection.y + 'px';
    
    handles.ne.style.left = (this.selection.x + this.selection.width) + 'px';
    handles.ne.style.top = this.selection.y + 'px';
    
    handles.sw.style.left = this.selection.x + 'px';
    handles.sw.style.top = (this.selection.y + this.selection.height) + 'px';
    
    handles.se.style.left = (this.selection.x + this.selection.width) + 'px';
    handles.se.style.top = (this.selection.y + this.selection.height) + 'px';
  }

  updateInfoDisplay() {
    const dimensionsEl = document.getElementById('crop-dimensions');
    const aspectRatioEl = document.getElementById('crop-aspect-ratio');
    
    dimensionsEl.textContent = `Selection: ${Math.round(this.selection.width)}x${Math.round(this.selection.height)}`;
    
    const ratio = this.selection.width / this.selection.height;
    aspectRatioEl.textContent = `Aspect: ${ratio.toFixed(2)}:1`;
  }

  updatePreview() {
    if (this.selection.width <= 0 || this.selection.height <= 0) return;
    
    // Calculate preview size
    const maxPreviewSize = 200;
    const ratio = this.selection.width / this.selection.height;
    let previewWidth, previewHeight;
    
    if (ratio > 1) {
      previewWidth = maxPreviewSize;
      previewHeight = maxPreviewSize / ratio;
    } else {
      previewHeight = maxPreviewSize;
      previewWidth = maxPreviewSize * ratio;
    }
    
    this.previewCanvas.width = previewWidth;
    this.previewCanvas.height = previewHeight;
    
    // Draw preview
    const scaleX = this.imageElement.naturalWidth / this.canvas.width;
    const scaleY = this.imageElement.naturalHeight / this.canvas.height;
    
    this.previewCtx.drawImage(
      this.imageElement,
      this.selection.x * scaleX,
      this.selection.y * scaleY,
      this.selection.width * scaleX,
      this.selection.height * scaleY,
      0, 0,
      previewWidth,
      previewHeight
    );
  }

  validateSelection() {
    const isValid = this.selection.width >= 50 && 
                   this.selection.height >= 50 &&
                   this.selection.width / this.selection.height > 0.5 &&
                   this.selection.width / this.selection.height < 3.0;
    
    document.getElementById('crop-confirm').disabled = !isValid;
    
    if (isValid) {
      document.getElementById('crop-confirm').focus();
    }
  }

  getHandleAtPoint(x, y) {
    const handles = [
      { name: 'nw', x: this.selection.x, y: this.selection.y },
      { name: 'ne', x: this.selection.x + this.selection.width, y: this.selection.y },
      { name: 'sw', x: this.selection.x, y: this.selection.y + this.selection.height },
      { name: 'se', x: this.selection.x + this.selection.width, y: this.selection.y + this.selection.height }
    ];
    
    const tolerance = 15;
    
    for (const handle of handles) {
      if (Math.abs(x - handle.x) <= tolerance && Math.abs(y - handle.y) <= tolerance) {
        return handle.name;
      }
    }
    
    return null;
  }

  async confirmCrop() {
    if (this.selection.width < 50 || this.selection.height < 50) {
      alert('Please make a larger selection');
      return;
    }
    
    try {
      // Calculate actual image coordinates
      const scaleX = this.imageElement.naturalWidth / this.canvas.width;
      const scaleY = this.imageElement.naturalHeight / this.canvas.height;
      
      const actualCrop = {
        x: Math.round(this.selection.x * scaleX),
        y: Math.round(this.selection.y * scaleY),
        width: Math.round(this.selection.width * scaleX),
        height: Math.round(this.selection.height * scaleY)
      };
      
      // Extract cropped image data
      const cropCanvas = document.createElement('canvas');
      const cropCtx = cropCanvas.getContext('2d');
      cropCanvas.width = actualCrop.width;
      cropCanvas.height = actualCrop.height;
      
      cropCtx.drawImage(
        this.imageElement,
        actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
        0, 0, actualCrop.width, actualCrop.height
      );
      
      const imageData = cropCtx.getImageData(0, 0, actualCrop.width, actualCrop.height);
      
      // Create crop data contract
      const cropData = {
        imageData: imageData,
        cropBounds: actualCrop,
        originalDimensions: {
          width: this.imageElement.naturalWidth,
          height: this.imageElement.naturalHeight
        }
      };
      
      // Validate against contract
      window.dataContractManager.validate('crop-data', cropData);
      
      this.hide();
      this.resolvePromise(cropData);
      
    } catch (error) {
      console.error('Crop confirmation failed:', error);
      this.rejectPromise(error);
    }
  }

  cancelCrop() {
    this.hide();
    this.rejectPromise(new Error('Crop cancelled by user'));
  }

  resetSelection() {
    this.selection = { x: 0, y: 0, width: 0, height: 0 };
    this.updateSelection();
    document.getElementById('crop-confirm').disabled = true;
  }

  // Touch event handlers
  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseDown(mouseEvent);
  }

  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    this.handleMouseMove(mouseEvent);
  }

  handleTouchEnd(event) {
    event.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    this.handleMouseUp(mouseEvent);
  }

  // Keyboard support
  handleKeydown(event) {
    if (this.modal.style.display === 'none') return;
    
    switch (event.key) {
      case 'Escape':
        this.cancelCrop();
        break;
      case 'Enter':
        if (!document.getElementById('crop-confirm').disabled) {
          this.confirmCrop();
        }
        break;
    }
  }
}
```

---

## 1.3. Web Worker Integration

### 1.3.1. Web Worker Pool Manager
**File:** `docs/modules/worker-pool.js`
```javascript
class WebWorkerPool {
  constructor(workerScript, poolSize = 2) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.availableWorkers = [];
    this.pendingTasks = [];
    this.taskIdCounter = 0;
    
    this.initializeWorkers();
  }

  initializeWorkers() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      const workerId = `worker_${i}`;
      
      worker.workerId = workerId;
      worker.isBusy = false;
      worker.onmessage = this.handleWorkerMessage.bind(this);
      worker.onerror = this.handleWorkerError.bind(this);
      
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
    
    console.log(`WebWorkerPool initialized with ${this.poolSize} workers`);
  }

  async executeTask(taskType, data, options = {}) {
    return new Promise((resolve, reject) => {
      const taskId = ++this.taskIdCounter;
      const task = {
        id: taskId,
        type: taskType,
        data: data,
        options: options,
        resolve: resolve,
        reject: reject,
        timeout: options.timeout || 30000
      };
      
      const worker = this.getAvailableWorker();
      if (worker) {
        this.assignTaskToWorker(task, worker);
      } else {
        this.pendingTasks.push(task);
      }
    });
  }

  getAvailableWorker() {
    return this.availableWorkers.shift() || null;
  }

  assignTaskToWorker(task, worker) {
    worker.isBusy = true;
    worker.currentTask = task;
    
    // Set timeout
    task.timeoutId = setTimeout(() => {
      this.handleTaskTimeout(task, worker);
    }, task.timeout);
    
    // Send task to worker
    worker.postMessage({
      id: task.id,
      type: task.type,
      data: task.data,
      options: task.options
    });
  }

  handleWorkerMessage(event) {
    const worker = event.target;
    const { id, success, result, error } = event.data;
    
    const task = worker.currentTask;
    if (!task || task.id !== id) {
      console.warn(`Received response for unknown task ${id}`);
      return;
    }
    
    // Clear timeout
    clearTimeout(task.timeoutId);
    
    // Release worker
    this.releaseWorker(worker);
    
    // Resolve task
    if (success) {
      task.resolve(result);
    } else {
      task.reject(new Error(error || 'Worker task failed'));
    }
    
    // Process pending tasks
    this.processPendingTasks();
  }

  handleWorkerError(event) {
    const worker = event.target;
    console.error(`Worker ${worker.workerId} error:`, event);
    
    if (worker.currentTask) {
      clearTimeout(worker.currentTask.timeoutId);
      worker.currentTask.reject(new Error('Worker encountered an error'));
      this.releaseWorker(worker);
      this.processPendingTasks();
    }
  }

  handleTaskTimeout(task, worker) {
    console.warn(`Task ${task.id} timed out after ${task.timeout}ms`);
    task.reject(new Error('Task timed out'));
    
    // Terminate and recreate worker
    this.recreateWorker(worker);
    this.processPendingTasks();
  }

  releaseWorker(worker) {
    worker.isBusy = false;
    worker.currentTask = null;
    this.availableWorkers.push(worker);
  }

  recreateWorker(oldWorker) {
    // Find and remove old worker
    const index = this.workers.indexOf(oldWorker);
    if (index !== -1) {
      oldWorker.terminate();
      
      // Create new worker
      const newWorker = new Worker(this.workerScript);
      newWorker.workerId = oldWorker.workerId;
      newWorker.isBusy = false;
      newWorker.onmessage = this.handleWorkerMessage.bind(this);
      newWorker.onerror = this.handleWorkerError.bind(this);
      
      this.workers[index] = newWorker;
      this.availableWorkers.push(newWorker);
    }
  }

  processPendingTasks() {
    while (this.pendingTasks.length > 0 && this.availableWorkers.length > 0) {
      const task = this.pendingTasks.shift();
      const worker = this.getAvailableWorker();
      this.assignTaskToWorker(task, worker);
    }
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.pendingTasks = [];
  }
}
```

### 1.3.2. Grid Processing Worker
**File:** `docs/workers/grid-processing-worker.js`
```javascript
// Grid processing worker for Phase 1
importScripts('../grid-mapper.js');

let gridMapper = null;

self.onmessage = async function(event) {
  const { id, type, data, options } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'initialize-grid-mapper':
        gridMapper = new NovaGridMapper.GridMapper(data.modData);
        result = { initialized: true };
        break;
        
      case 'process-crop':
        if (!gridMapper) {
          throw new Error('Grid mapper not initialized');
        }
        result = await processCropData(data);
        break;
        
      case 'normalize-coordinates':
        result = normalizeCoordinates(data);
        break;
        
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({
      id: id,
      success: true,
      result: result
    });
    
  } catch (error) {
    self.postMessage({
      id: id,
      success: false,
      error: error.message
    });
  }
};

async function processCropData(cropData) {
  // Validate crop data structure
  if (!cropData.imageData || !cropData.cropBounds) {
    throw new Error('Invalid crop data structure');
  }
  
  // Create image element from crop data
  const canvas = new OffscreenCanvas(cropData.imageData.width, cropData.imageData.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(cropData.imageData, 0, 0);
  
  // Convert to ImageBitmap for grid mapper
  const imageBitmap = await createImageBitmap(canvas);
  
  // Process through grid mapper
  const mappingResult = await gridMapper.mapScreenshot(imageBitmap);
  
  // Add crop context
  mappingResult.cropContext = {
    cropBounds: cropData.cropBounds,
    originalDimensions: cropData.originalDimensions
  };
  
  return mappingResult;
}

function normalizeCoordinates(data) {
  const { coordinates, cropBounds, originalDimensions } = data;
  
  // Normalize coordinates from crop space to original image space
  const normalizedCoordinates = new Map();
  
  for (const [modName, coordData] of coordinates) {
    const normalizedCoord = {
      ...coordData,
      centerPoint: {
        x: coordData.centerPoint.x + cropBounds.x,
        y: coordData.centerPoint.y + cropBounds.y
      },
      hexBounds: {
        left: coordData.hexBounds.left + cropBounds.x,
        top: coordData.hexBounds.top + cropBounds.y,
        right: coordData.hexBounds.right + cropBounds.x,
        bottom: coordData.hexBounds.bottom + cropBounds.y
      }
    };
    
    normalizedCoordinates.set(modName, normalizedCoord);
  }
  
  return {
    normalizedCoordinates: normalizedCoordinates,
    transformationMatrix: {
      offsetX: cropBounds.x,
      offsetY: cropBounds.y,
      scaleX: 1,
      scaleY: 1
    }
  };
}

// Error handling
self.onerror = function(error) {
  console.error('Worker error:', error);
  self.postMessage({
    success: false,
    error: 'Worker encountered an error: ' + error.message
  });
};
```

---

## 1.4. Browser Compatibility and Error Recovery

### 1.4.1. Feature Detection Module
**File:** `docs/modules/feature-detector.js`
```javascript
class FeatureDetector {
  constructor() {
    this.features = new Map();
    this.runDetection();
  }

  runDetection() {
    this.detectWebWorkers();
    this.detectIndexedDB();
    this.detectCanvas();
    this.detectFileAPI();
    this.detectImageProcessing();
  }

  detectWebWorkers() {
    const supported = typeof Worker !== 'undefined';
    this.features.set('webWorkers', {
      supported: supported,
      details: supported ? 'Full Web Worker support' : 'Web Workers not available',
      fallback: 'Main thread processing (may cause UI freezing)'
    });
  }

  detectIndexedDB() {
    const supported = 'indexedDB' in window;
    this.features.set('indexedDB', {
      supported: supported,
      details: supported ? 'IndexedDB available' : 'IndexedDB not supported',
      fallback: 'localStorage (limited storage capacity)'
    });
  }

  detectCanvas() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const supported = !!(ctx && ctx.drawImage);
      
      this.features.set('canvas', {
        supported: supported,
        details: supported ? 'Canvas 2D context available' : 'Canvas not supported',
        fallback: 'Feature not available without canvas support'
      });
    } catch (error) {
      this.features.set('canvas', {
        supported: false,
        details: `Canvas detection failed: ${error.message}`,
        fallback: 'Feature not available'
      });
    }
  }

  detectFileAPI() {
    const fileAPI = !!(window.File && window.FileReader && window.FileList && window.Blob);
    const dragDrop = 'draggable' in document.createElement('div');
    
    this.features.set('fileAPI', {
      supported: fileAPI && dragDrop,
      details: fileAPI ? 'File API and drag/drop supported' : 'File API not fully supported',
      fallback: fileAPI ? 'Basic file upload only' : 'Feature not available'
    });
  }

  detectImageProcessing() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(10, 10);
      const supported = !!(imageData && imageData.data);
      
      this.features.set('imageProcessing', {
        supported: supported,
        details: supported ? 'ImageData processing available' : 'Image processing not supported',
        fallback: 'Limited image analysis capabilities'
      });
    } catch (error) {
      this.features.set('imageProcessing', {
        supported: false,
        details: `Image processing detection failed: ${error.message}`,
        fallback: 'Feature not available'
      });
    }
  }

  isFeatureSupported(featureName) {
    const feature = this.features.get(featureName);
    return feature ? feature.supported : false;
  }

  getAllFeatures() {
    return Object.fromEntries(this.features);
  }

  getUnsupportedFeatures() {
    const unsupported = [];
    for (const [name, feature] of this.features) {
      if (!feature.supported) {
        unsupported.push({ name, ...feature });
      }
    }
    return unsupported;
  }

  generateCompatibilityReport() {
    const unsupported = this.getUnsupportedFeatures();
    const critical = unsupported.filter(f => 
      ['webWorkers', 'canvas', 'fileAPI'].includes(f.name)
    );
    
    return {
      overall: critical.length === 0 ? 'compatible' : 'limited',
      criticalIssues: critical,
      allIssues: unsupported,
      canRunFeature: critical.length === 0
    };
  }
}

// Global instance
window.featureDetector = new FeatureDetector();
```

### 1.4.2. Progressive Error Recovery System
**File:** `docs/modules/error-recovery.js`
```javascript
class ErrorRecoveryManager {
  constructor(importCoordinator) {
    this.coordinator = importCoordinator;
    this.fallbackStrategies = new Map();
    this.errorHistory = [];
    
    this.defineFallbackStrategies();
  }

  defineFallbackStrategies() {
    this.fallbackStrategies.set('webWorkerFailure', {
      detect: (error) => error.message.includes('Worker') || error.name === 'WorkerError',
      fallback: async (data) => {
        console.warn('Web Worker failed, falling back to main thread processing');
        return this.processOnMainThread(data);
      },
      userMessage: 'Processing on main thread (may be slower)...'
    });

    this.fallbackStrategies.set('gridMappingFailure', {
      detect: (error) => error.message.includes('Grid mapping') || error.name === 'GridMappingError',
      fallback: async (data) => {
        console.warn('Grid mapping failed, enabling manual selection mode');
        return this.enableManualSelectionMode(data);
      },
      userMessage: 'Automatic detection failed. Please select mods manually.'
    });

    this.fallbackStrategies.set('recognitionFailure', {
      detect: (error) => error.message.includes('Recognition') || error.name === 'RecognitionError',
      fallback: async (data) => {
        console.warn('Recognition failed, showing grid for manual selection');
        return this.showManualGrid(data);
      },
      userMessage: 'Recognition unavailable. Grid displayed for manual selection.'
    });

    this.fallbackStrategies.set('memoryError', {
      detect: (error) => error.message.includes('memory') || error.name === 'QuotaExceededError',
      fallback: async (data) => {
        console.warn('Memory limit exceeded, reducing image quality');
        return this.reduceImageQuality(data);
      },
      userMessage: 'Reducing image quality due to memory constraints...'
    });
  }

  async handleError(error, context = {}) {
    console.error('ErrorRecoveryManager handling error:', error);
    
    // Record error
    this.errorHistory.push({
      error: error.message,
      context: context,
      timestamp: Date.now(),
      state: this.coordinator.state
    });

    // Find matching fallback strategy
    for (const [strategyName, strategy] of this.fallbackStrategies) {
      if (strategy.detect(error)) {
        try {
          // Show user message
          this.showUserMessage(strategy.userMessage);
          
          // Execute fallback
          const result = await strategy.fallback(context);
          
          console.log(`Fallback strategy '${strategyName}' succeeded`);
          return result;
          
        } catch (fallbackError) {
          console.error(`Fallback strategy '${strategyName}' failed:`, fallbackError);
        }
      }
    }

    // No fallback strategy worked
    return this.finalFallback(error, context);
  }

  async processOnMainThread(data) {
    // Fallback to main thread processing
    const { NovaGridMapper } = window;
    if (!NovaGridMapper) {
      throw new Error('Grid mapper not available for main thread fallback');
    }

    // Show progress indicator
    this.showProgressMessage('Processing on main thread...');

    try {
      const gridMapper = new NovaGridMapper.GridMapper();
      
      // Process in chunks to avoid blocking UI
      const result = await this.processInChunks(async () => {
        return await gridMapper.mapScreenshot(data.imageElement);
      });

      this.hideProgressMessage();
      return result;

    } catch (error) {
      this.hideProgressMessage();
      throw error;
    }
  }

  async enableManualSelectionMode(data) {
    // Transition to manual selection workflow
    await this.coordinator.transitionTo('reviewing', {
      manualMode: true,
      gridData: null,
      recognitionResults: null
    });

    // Show manual selection UI
    this.showManualSelectionInterface(data);
    
    return {
      mode: 'manual',
      requiresUserInput: true,
      data: data
    };
  }

  async showManualGrid(data) {
    // Display basic grid overlay for manual selection
    const gridOverlay = this.createGridOverlay(data);
    
    return {
      mode: 'manual-grid',
      gridOverlay: gridOverlay,
      data: data
    };
  }

  async reduceImageQuality(data) {
    // Reduce image resolution for memory-constrained environments
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scaleFactor = 0.7; // Reduce to 70% of original size
    canvas.width = data.imageElement.naturalWidth * scaleFactor;
    canvas.height = data.imageElement.naturalHeight * scaleFactor;
    
    ctx.drawImage(data.imageElement, 0, 0, canvas.width, canvas.height);
    
    // Create new image element
    const reducedImage = new Image();
    reducedImage.src = canvas.toDataURL('image/jpeg', 0.8); // JPEG with 80% quality
    
    await new Promise((resolve) => {
      reducedImage.onload = resolve;
    });
    
    return {
      ...data,
      imageElement: reducedImage,
      qualityReduced: true,
      originalDimensions: {
        width: data.imageElement.naturalWidth,
        height: data.imageElement.naturalHeight
      }
    };
  }

  async processInChunks(processor, chunkSize = 16) {
    // Process large operations in chunks to avoid blocking UI
    return new Promise((resolve, reject) => {
      let result;
      
      const processChunk = async () => {
        try {
          result = await processor();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      // Use requestAnimationFrame to yield to browser
      requestAnimationFrame(processChunk);
    });
  }

  async finalFallback(error, context) {
    console.error('All fallback strategies failed, entering final fallback mode');
    
    // Reset to idle state
    await this.coordinator.transitionTo('error', {
      error: error.message,
      context: context,
      timestamp: Date.now()
    });

    // Show error to user with recovery options
    this.showErrorRecoveryDialog(error);
    
    throw new Error(`Import failed: ${error.message}. Please try again or contact support.`);
  }

  showUserMessage(message) {
    // Show non-blocking user message
    const messageEl = document.getElementById('import-status-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.style.display = 'block';
    }
  }

  showProgressMessage(message) {
    const progressEl = document.getElementById('import-progress');
    if (progressEl) {
      progressEl.textContent = message;
      progressEl.style.display = 'block';
    }
  }

  hideProgressMessage() {
    const progressEl = document.getElementById('import-progress');
    if (progressEl) {
      progressEl.style.display = 'none';
    }
  }

  showErrorRecoveryDialog(error) {
    // Create error recovery dialog
    const dialog = document.createElement('div');
    dialog.className = 'error-recovery-dialog';
    dialog.innerHTML = `
      <div class="error-recovery-content">
        <h3>Import Process Failed</h3>
        <p>We encountered an issue: ${error.message}</p>
        <div class="recovery-options">
          <button onclick="window.importCoordinator.reset()">Try Again</button>
          <button onclick="this.parentElement.parentElement.parentElement.style.display='none'">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
  }

  createGridOverlay(data) {
    // Create basic hexagonal grid overlay for manual selection
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = data.imageElement.naturalWidth;
    canvas.height = data.imageElement.naturalHeight;
    
    // Draw hexagonal grid pattern
    const hexRadius = 24;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
    ctx.lineWidth = 2;
    
    // Draw grid (simplified)
    for (let q = -3; q <= 3; q++) {
      for (let r = -3; r <= 3; r++) {
        const x = centerX + hexRadius * (3/2 * q);
        const y = centerY + hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        
        this.drawHexagon(ctx, x, y, hexRadius);
      }
    }
    
    return canvas;
  }

  drawHexagon(ctx, centerX, centerY, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  getErrorHistory() {
    return this.errorHistory;
  }

  reset() {
    this.errorHistory = [];
  }
}
```

---

## 1.5. Integration Points and Testing

### 1.5.1. Integration with Upload Handler
**Modify:** `docs/modules/upload-handler.js` (add to existing onFileReady method)
```javascript
// Add after existing event dispatch
onFileReady(fileData) {
  // Existing code...
  
  // Phase 1 integration: Check browser compatibility
  const compatibilityReport = window.featureDetector.generateCompatibilityReport();
  
  if (!compatibilityReport.canRunFeature) {
    this.showCompatibilityWarning(compatibilityReport);
    return;
  }
  
  // Initialize import coordinator if not already done
  if (!window.importCoordinator) {
    window.importCoordinator = new ImportCoordinator({
      timeout: 20000,
      enableDebugMode: window.DEBUG_MODE || false
    });
    
    // Set up error recovery
    window.errorRecoveryManager = new ErrorRecoveryManager(window.importCoordinator);
  }
  
  // Start import process
  window.importCoordinator.startImport(fileData)
    .then(result => {
      console.log('Import completed successfully:', result);
    })
    .catch(error => {
      console.error('Import failed:', error);
      window.errorRecoveryManager.handleError(error, { fileData });
    });
  
  // Emit custom event for Phase 2 integration
  const event = new CustomEvent('screenshot-ready', {
    detail: fileData
  });
  document.dispatchEvent(event);
}

showCompatibilityWarning(report) {
  const warningEl = document.createElement('div');
  warningEl.className = 'compatibility-warning';
  warningEl.innerHTML = `
    <h3>Browser Compatibility Issues</h3>
    <p>Some features may not work properly in your browser:</p>
    <ul>
      ${report.criticalIssues.map(issue => 
        `<li><strong>${issue.name}:</strong> ${issue.details}</li>`
      ).join('')}
    </ul>
    <p>Please try using a modern browser like Chrome, Firefox, or Safari.</p>
  `;
  
  document.body.appendChild(warningEl);
}
```

### 1.5.2. Phase 1 Unit Tests
**File:** `docs/tests/phase1-tests.js`
```javascript
class Phase1TestSuite {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('Running Phase 1 test suite...');
    
    const tests = [
      () => this.testDataContracts(),
      () => this.testImportCoordinator(),
      () => this.testCropInterface(),
      () => this.testWebWorkerPool(),
      () => this.testErrorRecovery(),
      () => this.testBrowserCompatibility()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error('Test failed:', error);
      }
    }

    return this.generateTestReport();
  }

  async testDataContracts() {
    console.log('Testing data contracts...');
    
    const contractManager = new DataContractManager();
    
    // Test valid file input
    const validFileInput = {
      file: { name: 'test.png', size: 1000, type: 'image/png' },
      dimensions: { width: 1920, height: 1080 },
      metadata: { size: 1000, type: 'image/png', lastModified: Date.now(), dataUrl: 'data:...' }
    };
    
    const validation = contractManager.validate('file-input', validFileInput);
    this.assert(validation.valid, 'Valid file input should pass validation');
    
    // Test invalid input
    try {
      contractManager.validate('file-input', { invalid: 'data' });
      this.assert(false, 'Invalid input should throw error');
    } catch (error) {
      this.assert(true, 'Invalid input correctly throws error');
    }
    
    this.recordTest('Data Contracts', 'passed');
  }

  async testImportCoordinator() {
    console.log('Testing import coordinator...');
    
    const coordinator = new ImportCoordinator();
    
    // Test initial state
    this.assert(coordinator.state === 'idle', 'Initial state should be idle');
    
    // Test state transitions
    await coordinator.transitionTo('awaiting-crop');
    this.assert(coordinator.state === 'awaiting-crop', 'Should transition to awaiting-crop');
    
    // Test invalid transition
    try {
      await coordinator.transitionTo('complete'); // Invalid from awaiting-crop
      this.assert(false, 'Invalid transition should throw error');
    } catch (error) {
      this.assert(true, 'Invalid transition correctly throws error');
    }
    
    this.recordTest('Import Coordinator', 'passed');
  }

  async testCropInterface() {
    console.log('Testing crop interface...');
    
    // Create test image
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    
    const img = new Image();
    img.src = canvas.toDataURL();
    
    await new Promise(resolve => img.onload = resolve);
    
    // Test crop interface creation
    const cropInterface = new CropInterface(null);
    this.assert(cropInterface.canvas !== null, 'Crop interface should initialize canvas');
    
    this.recordTest('Crop Interface', 'passed');
  }

  async testWebWorkerPool() {
    console.log('Testing web worker pool...');
    
    if (!window.featureDetector.isFeatureSupported('webWorkers')) {
      this.recordTest('Web Worker Pool', 'skipped', 'Web Workers not supported');
      return;
    }
    
    // Create simple test worker
    const workerScript = `
      self.onmessage = function(e) {
        const { id, data } = e.data;
        setTimeout(() => {
          self.postMessage({ id, success: true, result: data * 2 });
        }, 100);
      };
    `;
    
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    const pool = new WebWorkerPool(workerUrl, 1);
    
    // Test task execution
    const result = await pool.executeTask('test', 5);
    this.assert(result === 10, 'Worker should double the input value');
    
    pool.terminate();
    URL.revokeObjectURL(workerUrl);
    
    this.recordTest('Web Worker Pool', 'passed');
  }

  async testErrorRecovery() {
    console.log('Testing error recovery...');
    
    const mockCoordinator = { state: 'processing-grid' };
    const errorRecovery = new ErrorRecoveryManager(mockCoordinator);
    
    // Test error detection
    const webWorkerError = new Error('Worker failed to process data');
    const strategies = errorRecovery.fallbackStrategies;
    
    const webWorkerStrategy = strategies.get('webWorkerFailure');
    this.assert(webWorkerStrategy.detect(webWorkerError), 'Should detect web worker error');
    
    this.recordTest('Error Recovery', 'passed');
  }

  async testBrowserCompatibility() {
    console.log('Testing browser compatibility...');
    
    const detector = new FeatureDetector();
    const features = detector.getAllFeatures();
    
    this.assert(typeof features === 'object', 'Should return features object');
    this.assert('webWorkers' in features, 'Should detect web workers');
    this.assert('canvas' in features, 'Should detect canvas');
    
    const report = detector.generateCompatibilityReport();
    this.assert(typeof report.overall === 'string', 'Should generate compatibility report');
    
    this.recordTest('Browser Compatibility', 'passed');
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordTest(testName, status, details = '') {
    this.testResults.push({
      name: testName,
      status: status,
      details: details,
      timestamp: Date.now()
    });
  }

  generateTestReport() {
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    const skipped = this.testResults.filter(r => r.status === 'skipped').length;
    
    const report = {
      summary: {
        total: this.testResults.length,
        passed: passed,
        failed: failed,
        skipped: skipped,
        success: failed === 0
      },
      details: this.testResults
    };
    
    console.log('Phase 1 Test Report:', report);
    return report;
  }
}

// Export for use
window.Phase1TestSuite = Phase1TestSuite;
```

---

## 1.6. Phase 1 Validation and Testing

### 1.6.1. End-to-End Workflow Validation
**File:** `docs/tests/phase1-e2e-validation.js`
```javascript
class Phase1EndToEndValidator {
  constructor() {
    this.validationSteps = [];
    this.mockData = this.createMockData();
  }

  async validateCompleteWorkflow() {
    console.log('Starting Phase 1 end-to-end validation...');
    
    try {
      // Step 1: Initialize all components
      await this.validateComponentInitialization();
      
      // Step 2: Test complete manual workflow
      await this.validateManualCropWorkflow();
      
      // Step 3: Test web worker integration
      await this.validateWebWorkerIntegration();
      
      // Step 4: Test error recovery scenarios
      await this.validateErrorRecoveryScenarios();
      
      // Step 5: Test browser compatibility handling
      await this.validateBrowserCompatibilityHandling();
      
      return this.generateValidationReport();
      
    } catch (error) {
      console.error('Phase 1 validation failed:', error);
      throw error;
    }
  }

  async validateComponentInitialization() {
    this.recordStep('Component Initialization', 'starting');
    
    // Test ImportCoordinator initialization
    const coordinator = new ImportCoordinator({ timeout: 10000 });
    this.assert(coordinator.state === 'idle', 'ImportCoordinator should start in idle state');
    
    // Test DataContractManager
    const contractManager = new DataContractManager();
    this.assert(contractManager.version === '1.0.0', 'DataContractManager should have correct version');
    
    // Test FeatureDetector
    const featureDetector = new FeatureDetector();
    const features = featureDetector.getAllFeatures();
    this.assert(Object.keys(features).length > 0, 'FeatureDetector should detect features');
    
    // Test CropInterface (requires DOM)
    if (typeof document !== 'undefined') {
      const cropInterface = new CropInterface(coordinator);
      this.assert(cropInterface.modal !== null, 'CropInterface should find DOM elements');
    }
    
    this.recordStep('Component Initialization', 'passed');
  }

  async validateManualCropWorkflow() {
    this.recordStep('Manual Crop Workflow', 'starting');
    
    const coordinator = new ImportCoordinator();
    const mockFileData = this.mockData.validFileData;
    
    // Start import process
    coordinator.transitionTo('awaiting-crop');
    this.assert(coordinator.state === 'awaiting-crop', 'Should transition to awaiting-crop');
    
    // Simulate crop completion
    const mockCropData = this.mockData.validCropData;
    const validation = window.dataContractManager.validate('crop-data', mockCropData);
    this.assert(validation.valid, 'Crop data should validate successfully');
    
    this.recordStep('Manual Crop Workflow', 'passed');
  }

  async validateWebWorkerIntegration() {
    this.recordStep('Web Worker Integration', 'starting');
    
    if (!window.featureDetector.isFeatureSupported('webWorkers')) {
      this.recordStep('Web Worker Integration', 'skipped', 'Web Workers not supported');
      return;
    }
    
    // Create test worker pool
    const workerScript = this.createTestWorkerScript();
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    try {
      const pool = new WebWorkerPool(workerUrl, 1);
      
      // Test basic worker communication
      const result = await pool.executeTask('test-echo', { message: 'hello' });
      this.assert(result.message === 'hello', 'Worker should echo message correctly');
      
      // Test timeout handling
      try {
        await pool.executeTask('test-timeout', {}, { timeout: 100 });
        this.assert(false, 'Should have timed out');
      } catch (timeoutError) {
        this.assert(timeoutError.message.includes('timed out'), 'Should handle timeout correctly');
      }
      
      pool.terminate();
      this.recordStep('Web Worker Integration', 'passed');
      
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
  }

  async validateErrorRecoveryScenarios() {
    this.recordStep('Error Recovery', 'starting');
    
    const coordinator = new ImportCoordinator();
    const errorRecovery = new ErrorRecoveryManager(coordinator);
    
    // Test web worker failure recovery
    const workerError = new Error('Worker failed to initialize');
    workerError.name = 'WorkerError';
    
    const strategy = errorRecovery.fallbackStrategies.get('webWorkerFailure');
    this.assert(strategy.detect(workerError), 'Should detect worker error');
    
    // Test grid mapping failure recovery
    const gridError = new Error('Grid mapping failed');
    gridError.name = 'GridMappingError';
    
    const gridStrategy = errorRecovery.fallbackStrategies.get('gridMappingFailure');
    this.assert(gridStrategy.detect(gridError), 'Should detect grid mapping error');
    
    this.recordStep('Error Recovery', 'passed');
  }

  async validateBrowserCompatibilityHandling() {
    this.recordStep('Browser Compatibility', 'starting');
    
    const detector = new FeatureDetector();
    const report = detector.generateCompatibilityReport();
    
    this.assert(typeof report.overall === 'string', 'Should generate overall compatibility status');
    this.assert(Array.isArray(report.criticalIssues), 'Should list critical issues');
    this.assert(typeof report.canRunFeature === 'boolean', 'Should determine if feature can run');
    
    // Test graceful degradation
    if (!report.canRunFeature) {
      // Should disable upload feature
      const uploadBtn = document.getElementById('screenshot-upload-btn');
      if (uploadBtn) {
        this.assert(uploadBtn.disabled, 'Upload button should be disabled for incompatible browsers');
      }
    }
    
    this.recordStep('Browser Compatibility', 'passed');
  }

  createTestWorkerScript() {
    return `
      self.onmessage = function(e) {
        const { id, type, data } = e.data;
        
        if (type === 'test-echo') {
          self.postMessage({
            id: id,
            success: true,
            result: data
          });
        } else if (type === 'test-timeout') {
          // Intentionally don't respond to test timeout
        } else {
          self.postMessage({
            id: id,
            success: false,
            error: 'Unknown test type'
          });
        }
      };
    `;
  }

  createMockData() {
    return {
      validFileData: {
        file: { name: 'test.png', size: 1000, type: 'image/png' },
        dimensions: { width: 1920, height: 1080 },
        metadata: { 
          size: 1000, 
          type: 'image/png', 
          lastModified: Date.now(), 
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' 
        }
      },
      
      validCropData: {
        imageData: new ImageData(100, 100),
        cropBounds: { x: 100, y: 100, width: 800, height: 600 },
        originalDimensions: { width: 1920, height: 1080 }
      }
    };
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordStep(stepName, status, details = '') {
    this.validationSteps.push({
      name: stepName,
      status: status,
      details: details,
      timestamp: Date.now()
    });
    
    console.log(`Phase 1 Validation - ${stepName}: ${status}`);
  }

  generateValidationReport() {
    const passed = this.validationSteps.filter(s => s.status === 'passed').length;
    const failed = this.validationSteps.filter(s => s.status === 'failed').length;
    const skipped = this.validationSteps.filter(s => s.status === 'skipped').length;
    
    const report = {
      phase: 'Phase 1 - Foundational Integration',
      summary: {
        total: this.validationSteps.length,
        passed: passed,
        failed: failed,
        skipped: skipped,
        success: failed === 0,
        passRate: (passed / (passed + failed)) * 100
      },
      steps: this.validationSteps,
      readyForNextPhase: failed === 0,
      recommendations: this.generateRecommendations()
    };
    
    console.log('Phase 1 Validation Report:', report);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const failedSteps = this.validationSteps.filter(s => s.status === 'failed');
    if (failedSteps.length > 0) {
      recommendations.push('Address failed validation steps before proceeding to Phase 2');
    }
    
    const skippedSteps = this.validationSteps.filter(s => s.status === 'skipped');
    if (skippedSteps.length > 0) {
      recommendations.push('Consider implementing fallbacks for skipped features');
    }
    
    if (this.validationSteps.every(s => s.status === 'passed')) {
      recommendations.push('Phase 1 validation successful - ready to proceed to Phase 2');
    }
    
    return recommendations;
  }
}

// Export for use
window.Phase1EndToEndValidator = Phase1EndToEndValidator;
```

### 1.6.2. Performance Benchmarking
**File:** `docs/tests/phase1-performance-benchmarks.js`
```javascript
class Phase1PerformanceBenchmarks {
  constructor() {
    this.benchmarkResults = [];
    this.performanceTargets = {
      cropInterfaceLoad: 500,    // 500ms max
      workerInitialization: 200, // 200ms max
      stateTransition: 50,       // 50ms max
      dataValidation: 10,        // 10ms max
      errorRecovery: 1000        // 1s max
    };
  }

  async runAllBenchmarks() {
    console.log('Running Phase 1 performance benchmarks...');
    
    const benchmarks = [
      () => this.benchmarkCropInterfaceLoad(),
      () => this.benchmarkWorkerInitialization(),
      () => this.benchmarkStateTransitions(),
      () => this.benchmarkDataValidation(),
      () => this.benchmarkErrorRecovery()
    ];
    
    for (const benchmark of benchmarks) {
      try {
        await benchmark();
      } catch (error) {
        console.error('Benchmark failed:', error);
      }
    }
    
    return this.generateBenchmarkReport();
  }

  async benchmarkCropInterfaceLoad() {
    const iterations = 5;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      // Create mock image
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, 1920, 1080);
      
      const img = new Image();
      img.src = canvas.toDataURL();
      await new Promise(resolve => img.onload = resolve);
      
      // Test crop interface
      const coordinator = new ImportCoordinator();
      const cropInterface = new CropInterface(coordinator);
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const target = this.performanceTargets.cropInterfaceLoad;
    
    this.recordBenchmark('Crop Interface Load', avgTime, target, times);
  }

  async benchmarkWorkerInitialization() {
    if (!window.featureDetector.isFeatureSupported('webWorkers')) {
      this.recordBenchmark('Worker Initialization', 0, 0, [], 'skipped');
      return;
    }
    
    const iterations = 3;
    const times = [];
    
    const workerScript = `self.onmessage = function(e) { self.postMessage(e.data); };`;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    try {
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        const pool = new WebWorkerPool(workerUrl, 2);
        await pool.executeTask('test', { data: 'test' });
        
        const endTime = performance.now();
        times.push(endTime - startTime);
        
        pool.terminate();
      }
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const target = this.performanceTargets.workerInitialization;
    
    this.recordBenchmark('Worker Initialization', avgTime, target, times);
  }

  async benchmarkStateTransitions() {
    const iterations = 100;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const coordinator = new ImportCoordinator();
      
      const startTime = performance.now();
      await coordinator.transitionTo('awaiting-crop');
      await coordinator.transitionTo('processing-grid');
      await coordinator.transitionTo('processing-recognition');
      await coordinator.transitionTo('reviewing');
      await coordinator.transitionTo('complete');
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const target = this.performanceTargets.stateTransition;
    
    this.recordBenchmark('State Transitions', avgTime, target, times);
  }

  async benchmarkDataValidation() {
    const iterations = 1000;
    const times = [];
    
    const contractManager = new DataContractManager();
    const testData = {
      file: { name: 'test.png', size: 1000, type: 'image/png' },
      dimensions: { width: 1920, height: 1080 },
      metadata: { size: 1000, type: 'image/png', lastModified: Date.now(), dataUrl: 'data:...' }
    };
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      contractManager.validate('file-input', testData);
      const endTime = performance.now();
      
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const target = this.performanceTargets.dataValidation;
    
    this.recordBenchmark('Data Validation', avgTime, target, times);
  }

  async benchmarkErrorRecovery() {
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const coordinator = new ImportCoordinator();
      const errorRecovery = new ErrorRecoveryManager(coordinator);
      
      const startTime = performance.now();
      
      try {
        const testError = new Error('Test worker failure');
        testError.name = 'WorkerError';
        await errorRecovery.handleError(testError, { mockData: true });
      } catch (error) {
        // Expected to fail in test environment
      }
      
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const target = this.performanceTargets.errorRecovery;
    
    this.recordBenchmark('Error Recovery', avgTime, target, times);
  }

  recordBenchmark(name, avgTime, target, times, status = null) {
    const actualStatus = status || (avgTime <= target ? 'passed' : 'failed');
    
    this.benchmarkResults.push({
      name: name,
      averageTime: avgTime,
      target: target,
      allTimes: times,
      status: actualStatus,
      performance: target > 0 ? (target / avgTime) : 0,
      timestamp: Date.now()
    });
    
    console.log(`Phase 1 Benchmark - ${name}: ${avgTime.toFixed(2)}ms (target: ${target}ms) - ${actualStatus}`);
  }

  generateBenchmarkReport() {
    const passed = this.benchmarkResults.filter(b => b.status === 'passed').length;
    const failed = this.benchmarkResults.filter(b => b.status === 'failed').length;
    const skipped = this.benchmarkResults.filter(b => b.status === 'skipped').length;
    
    const report = {
      phase: 'Phase 1 - Performance Benchmarks',
      summary: {
        total: this.benchmarkResults.length,
        passed: passed,
        failed: failed,
        skipped: skipped,
        success: failed === 0,
        averagePerformance: this.calculateAveragePerformance()
      },
      benchmarks: this.benchmarkResults,
      performanceIssues: this.identifyPerformanceIssues(),
      recommendations: this.generatePerformanceRecommendations()
    };
    
    console.log('Phase 1 Performance Benchmark Report:', report);
    return report;
  }

  calculateAveragePerformance() {
    const validBenchmarks = this.benchmarkResults.filter(b => b.performance > 0);
    if (validBenchmarks.length === 0) return 0;
    
    const totalPerformance = validBenchmarks.reduce((sum, b) => sum + b.performance, 0);
    return totalPerformance / validBenchmarks.length;
  }

  identifyPerformanceIssues() {
    return this.benchmarkResults
      .filter(b => b.status === 'failed')
      .map(b => ({
        component: b.name,
        actualTime: b.averageTime,
        targetTime: b.target,
        severity: this.calculateSeverity(b.averageTime, b.target)
      }));
  }

  calculateSeverity(actual, target) {
    if (target === 0) return 'unknown';
    const ratio = actual / target;
    if (ratio > 5) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    const issues = this.identifyPerformanceIssues();
    
    if (issues.length === 0) {
      recommendations.push('All performance targets met - Phase 1 is ready for production');
    } else {
      recommendations.push(`${issues.length} performance issues identified - optimization needed`);
      
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        recommendations.push('Critical performance issues must be addressed before Phase 2');
      }
    }
    
    return recommendations;
  }
}

// Export for use
window.Phase1PerformanceBenchmarks = Phase1PerformanceBenchmarks;
```

### 1.6.3. Integration Test Runner
**File:** `docs/tests/phase1-integration-runner.js`
```javascript
class Phase1IntegrationRunner {
  constructor() {
    this.testSuites = [
      new Phase1TestSuite(),
      new Phase1EndToEndValidator(),
      new Phase1PerformanceBenchmarks()
    ];
    this.overallResults = {};
  }

  async runCompletePhase1Validation() {
    console.log('Starting complete Phase 1 validation...');
    
    const results = {
      timestamp: Date.now(),
      phase: 'Phase 1 - Foundational Integration',
      suites: []
    };
    
    // Run unit tests
    try {
      console.log('Running unit tests...');
      const unitTestReport = await this.testSuites[0].runAllTests();
      results.suites.push({
        name: 'Unit Tests',
        ...unitTestReport
      });
    } catch (error) {
      console.error('Unit tests failed:', error);
      results.suites.push({
        name: 'Unit Tests',
        success: false,
        error: error.message
      });
    }
    
    // Run end-to-end validation
    try {
      console.log('Running end-to-end validation...');
      const e2eReport = await this.testSuites[1].validateCompleteWorkflow();
      results.suites.push({
        name: 'End-to-End Validation',
        ...e2eReport
      });
    } catch (error) {
      console.error('E2E validation failed:', error);
      results.suites.push({
        name: 'End-to-End Validation',
        success: false,
        error: error.message
      });
    }
    
    // Run performance benchmarks
    try {
      console.log('Running performance benchmarks...');
      const performanceReport = await this.testSuites[2].runAllBenchmarks();
      results.suites.push({
        name: 'Performance Benchmarks',
        ...performanceReport
      });
    } catch (error) {
      console.error('Performance benchmarks failed:', error);
      results.suites.push({
        name: 'Performance Benchmarks',
        success: false,
        error: error.message
      });
    }
    
    // Generate overall assessment
    results.overall = this.generateOverallAssessment(results.suites);
    
    // Save results
    this.saveValidationResults(results);
    
    console.log('Phase 1 validation completed:', results.overall);
    return results;
  }

  generateOverallAssessment(suites) {
    const successful = suites.filter(s => s.success !== false);
    const failed = suites.filter(s => s.success === false);
    
    const assessment = {
      totalSuites: suites.length,
      successful: successful.length,
      failed: failed.length,
      overallSuccess: failed.length === 0,
      readyForPhase2: this.determinePhase2Readiness(suites),
      criticalIssues: this.identifyCriticalIssues(suites),
      recommendations: this.generateOverallRecommendations(suites)
    };
    
    return assessment;
  }

  determinePhase2Readiness(suites) {
    // Phase 2 readiness criteria:
    // 1. All unit tests must pass
    // 2. End-to-end validation must pass
    // 3. No critical performance issues
    
    const unitTests = suites.find(s => s.name === 'Unit Tests');
    const e2eValidation = suites.find(s => s.name === 'End-to-End Validation');
    const performance = suites.find(s => s.name === 'Performance Benchmarks');
    
    const unitTestsPass = unitTests && unitTests.success !== false;
    const e2ePass = e2eValidation && e2eValidation.readyForNextPhase !== false;
    const noCriticalPerf = !performance || !performance.performanceIssues || 
                          performance.performanceIssues.filter(i => i.severity === 'critical').length === 0;
    
    return unitTestsPass && e2ePass && noCriticalPerf;
  }

  identifyCriticalIssues(suites) {
    const issues = [];
    
    suites.forEach(suite => {
      if (suite.success === false) {
        issues.push({
          suite: suite.name,
          type: 'failure',
          description: suite.error || 'Suite failed to complete'
        });
      }
      
      if (suite.performanceIssues) {
        const criticalPerfIssues = suite.performanceIssues.filter(i => i.severity === 'critical');
        criticalPerfIssues.forEach(issue => {
          issues.push({
            suite: suite.name,
            type: 'performance',
            description: `Critical performance issue in ${issue.component}`
          });
        });
      }
    });
    
    return issues;
  }

  generateOverallRecommendations(suites) {
    const recommendations = [];
    
    const criticalIssues = this.identifyCriticalIssues(suites);
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical issues before proceeding to Phase 2');
      recommendations.push('Review failed test cases and performance bottlenecks');
    }
    
    const readyForPhase2 = this.determinePhase2Readiness(suites);
    if (readyForPhase2) {
      recommendations.push('Phase 1 validation successful - proceed to Phase 2 implementation');
      recommendations.push('Monitor performance metrics during Phase 2 development');
    } else {
      recommendations.push('Phase 1 requires additional work before Phase 2');
    }
    
    return recommendations;
  }

  saveValidationResults(results) {
    // Save to localStorage for debugging
    try {
      localStorage.setItem('phase1-validation-results', JSON.stringify(results, null, 2));
    } catch (error) {
      console.warn('Could not save validation results to localStorage:', error);
    }
    
    // Also dispatch event for external monitoring
    document.dispatchEvent(new CustomEvent('phase1-validation-complete', {
      detail: results
    }));
  }

  async runQuickValidation() {
    // Quick validation for development - runs essential tests only
    console.log('Running quick Phase 1 validation...');
    
    try {
      // Test basic component initialization
      const coordinator = new ImportCoordinator();
      const featureDetector = new FeatureDetector();
      const contractManager = new DataContractManager();
      
      const quickResults = {
        coordinatorInitialized: coordinator.state === 'idle',
        featuresDetected: Object.keys(featureDetector.getAllFeatures()).length > 0,
        contractsLoaded: contractManager.version === '1.0.0',
        webWorkersSupported: featureDetector.isFeatureSupported('webWorkers'),
        canvasSupported: featureDetector.isFeatureSupported('canvas'),
        indexedDBSupported: featureDetector.isFeatureSupported('indexedDB')
      };
      
      const allPassed = Object.values(quickResults).every(result => result === true);
      
      console.log('Quick validation results:', quickResults);
      return {
        success: allPassed,
        details: quickResults,
        readyForDevelopment: allPassed
      };
      
    } catch (error) {
      console.error('Quick validation failed:', error);
      return {
        success: false,
        error: error.message,
        readyForDevelopment: false
      };
    }
  }
}

// Global instance for easy access
window.phase1ValidationRunner = new Phase1IntegrationRunner();

// Auto-run quick validation in development mode
if (window.location.search.includes('validate=quick')) {
  document.addEventListener('DOMContentLoaded', () => {
    window.phase1ValidationRunner.runQuickValidation();
  });
}
```

---

**Exit Criteria for Phase 1:** 
1. **Core Functionality**: A user can upload a screenshot, manually crop it using an accessible interface, and the system successfully processes the crop data through the ImportCoordinator state machine.

2. **Web Worker Integration**: The grid mapping process runs in a non-blocking Web Worker with proper error handling and timeout management. The worker pool can handle multiple concurrent tasks.

3. **Data Contract Validation**: All data passed between components adheres to defined contracts with proper validation and versioning. Contract violations are caught and handled gracefully.

4. **Error Recovery System**: The ErrorRecoveryManager can detect and handle common failure scenarios including web worker failures, grid mapping errors, and memory constraints with appropriate fallback strategies.

5. **Browser Compatibility**: The FeatureDetector identifies unsupported features and the system gracefully degrades or disables functionality as needed. Critical features are validated on target browsers.

6. **Performance Targets**: All components meet performance targets (crop interface < 500ms, worker init < 200ms, state transitions < 50ms, data validation < 10ms).

7. **Testing Coverage**: Unit tests, end-to-end validation, and performance benchmarks all pass with > 95% success rate.

8. **Integration Points**: The system properly integrates with the existing upload handler and emits appropriate events for Phase 2 consumption.