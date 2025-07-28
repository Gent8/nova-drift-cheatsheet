/**
 * Manual Crop Interface Module
 * Primary interface for manually cropping Nova Drift screenshots
 * Provides drag-resize functionality with Nova Drift layout guides
 */
class ManualCropInterface {
  constructor(options = {}) {
    this.options = {
      minCropWidth: 200,
      minCropHeight: 150,
      maxCropWidth: 4096,
      maxCropHeight: 4096,
      gridSnapTolerance: 10,
      previewScale: 0.8,
      showLayoutGuides: true,
      enableKeyboardControls: true,
      touchEnabled: true,
      ...options
    };

    this.state = {
      isVisible: false,
      isResizing: false,
      isDragging: false,
      resizeHandle: null,
      currentImage: null,
      imageData: null,
      cropArea: { x: 0, y: 0, width: 0, height: 0 },
      lastSavedCrop: null,
      previewCanvas: null
    };

    this.elements = {};
    this.listeners = [];
    
    this.init();
  }

  /**
   * Initialize the manual crop interface
   */
  init() {
    this.createInterface();
    this.setupEventListeners();
    this.loadSavedCropArea();
    
    if (this.options.enableKeyboardControls) {
      this.setupKeyboardControls();
    }
    
    console.log('Manual crop interface initialized');
  }

  /**
   * Create the DOM structure for the crop interface
   */
  createInterface() {
    // Main container
    const container = document.createElement('div');
    container.id = 'manual-crop-container';
    container.className = 'manual-crop-container';
    container.style.display = 'none';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-label', 'Manual crop interface');
    container.setAttribute('aria-modal', 'true');

    container.innerHTML = `
      <div class="crop-overlay">
        <div class="crop-header">
          <h3>📐 Manual Crop - Nova Drift Screenshot</h3>
          <button class="crop-close" aria-label="Close crop interface">×</button>
        </div>
        
        <div class="crop-content">
          <div class="crop-image-container">
            <canvas class="crop-canvas" aria-label="Screenshot crop area"></canvas>
            <div class="crop-selection" aria-label="Crop selection area">
              <div class="crop-handles">
                <div class="crop-handle nw" data-handle="nw" title="Resize from top-left"></div>
                <div class="crop-handle ne" data-handle="ne" title="Resize from top-right"></div>
                <div class="crop-handle sw" data-handle="sw" title="Resize from bottom-left"></div>
                <div class="crop-handle se" data-handle="se" title="Resize from bottom-right"></div>
                <div class="crop-handle n" data-handle="n" title="Resize from top"></div>
                <div class="crop-handle s" data-handle="s" title="Resize from bottom"></div>
                <div class="crop-handle w" data-handle="w" title="Resize from left"></div>
                <div class="crop-handle e" data-handle="e" title="Resize from right"></div>
              </div>
              <div class="crop-drag-area" title="Drag to move crop area"></div>
            </div>
            <div class="layout-guides" style="display: none;">
              <div class="guide-line guide-horizontal-top"></div>
              <div class="guide-line guide-horizontal-center"></div>
              <div class="guide-line guide-horizontal-bottom"></div>
              <div class="guide-line guide-vertical-left"></div>
              <div class="guide-line guide-vertical-center"></div>
              <div class="guide-line guide-vertical-right"></div>
            </div>
          </div>
          
          <div class="crop-controls">
            <div class="crop-presets">
              <h4>Quick Presets</h4>
              <div class="preset-buttons">
                <button class="preset-btn" data-preset="fullscreen" title="Full screen Nova Drift capture">
                  🖥️ Fullscreen
                </button>
                <button class="preset-btn" data-preset="windowed" title="Windowed Nova Drift capture">
                  🪟 Windowed
                </button>
                <button class="preset-btn" data-preset="build-area" title="Build area only">
                  ⬡ Build Area
                </button>
                <button class="preset-btn" data-preset="custom" title="Custom crop area">
                  ✂️ Custom
                </button>
              </div>
            </div>
            
            <div class="crop-info">
              <h4>Crop Details</h4>
              <div class="info-grid">
                <span>Position:</span>
                <span class="crop-position">0, 0</span>
                <span>Size:</span>
                <span class="crop-size">0 × 0</span>
                <span>Aspect:</span>
                <span class="crop-aspect">1:1</span>
              </div>
            </div>
            
            <div class="crop-preview">
              <h4>Preview</h4>
              <canvas class="preview-canvas" width="200" height="150"></canvas>
            </div>
          </div>
        </div>
        
        <div class="crop-footer">
          <div class="crop-actions">
            <button class="btn-secondary" id="crop-cancel">Cancel</button>
            <button class="btn-secondary" id="crop-reset">Reset</button>
            <button class="btn-primary" id="crop-apply">Apply Crop</button>
          </div>
          <div class="crop-help">
            <small>💡 Drag to move • Resize from corners/edges • Use presets for common layouts</small>
          </div>
        </div>
      </div>
    `;

    // Insert into DOM
    const uploadContainer = document.getElementById('screenshot-upload-container');
    if (uploadContainer) {
      uploadContainer.appendChild(container);
    } else {
      document.body.appendChild(container);
    }

    // Store element references
    this.elements = {
      container,
      canvas: container.querySelector('.crop-canvas'),
      previewCanvas: container.querySelector('.preview-canvas'),
      selection: container.querySelector('.crop-selection'),
      dragArea: container.querySelector('.crop-drag-area'),
      handles: container.querySelectorAll('.crop-handle'),
      presetButtons: container.querySelectorAll('.preset-btn'),
      layoutGuides: container.querySelector('.layout-guides'),
      closeBtn: container.querySelector('.crop-close'),
      cancelBtn: container.querySelector('#crop-cancel'),
      resetBtn: container.querySelector('#crop-reset'),
      applyBtn: container.querySelector('#crop-apply'),
      positionDisplay: container.querySelector('.crop-position'),
      sizeDisplay: container.querySelector('.crop-size'),
      aspectDisplay: container.querySelector('.crop-aspect')
    };
  }

  /**
   * Setup event listeners for crop interface
   */
  setupEventListeners() {
    const { container, canvas, selection, dragArea, handles, presetButtons, closeBtn, cancelBtn, resetBtn, applyBtn } = this.elements;

    // Close/Cancel handlers
    this.addListener(closeBtn, 'click', () => this.hide());
    this.addListener(cancelBtn, 'click', () => this.hide());
    
    // Reset handler
    this.addListener(resetBtn, 'click', () => this.resetCrop());
    
    // Apply handler
    this.addListener(applyBtn, 'click', () => this.applyCrop());

    // Preset button handlers
    presetButtons.forEach(btn => {
      this.addListener(btn, 'click', (e) => {
        const preset = e.target.dataset.preset;
        this.applyPreset(preset);
      });
    });

    // Mouse/touch handlers for dragging
    this.addListener(dragArea, 'mousedown', (e) => this.startDrag(e));
    this.addListener(dragArea, 'touchstart', (e) => this.startDrag(e), { passive: false });

    // Mouse/touch handlers for resizing
    handles.forEach(handle => {
      this.addListener(handle, 'mousedown', (e) => this.startResize(e, handle.dataset.handle));
      this.addListener(handle, 'touchstart', (e) => this.startResize(e, handle.dataset.handle), { passive: false });
    });

    // Global mouse/touch move and end handlers
    this.addListener(document, 'mousemove', (e) => this.handleMouseMove(e));
    this.addListener(document, 'mouseup', (e) => this.handleMouseUp(e));
    this.addListener(document, 'touchmove', (e) => this.handleMouseMove(e), { passive: false });
    this.addListener(document, 'touchend', (e) => this.handleMouseUp(e));

    // Prevent context menu on crop area
    this.addListener(selection, 'contextmenu', (e) => e.preventDefault());

    // Escape key handler
    this.addListener(document, 'keydown', (e) => {
      if (e.key === 'Escape' && this.state.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Setup keyboard controls for crop adjustment
   */
  setupKeyboardControls() {
    this.addListener(document, 'keydown', (e) => {
      if (!this.state.isVisible) return;

      const moveStep = e.shiftKey ? 10 : 1;
      const resizeStep = e.shiftKey ? 10 : 1;
      let handled = false;

      switch (e.key) {
        case 'ArrowLeft':
          if (e.ctrlKey) {
            this.adjustCrop(-resizeStep, 0, 0, 0); // Resize left
          } else {
            this.adjustCrop(-moveStep, 0, 0, 0); // Move left
          }
          handled = true;
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            this.adjustCrop(0, 0, resizeStep, 0); // Resize right
          } else {
            this.adjustCrop(moveStep, 0, 0, 0); // Move right
          }
          handled = true;
          break;
        case 'ArrowUp':
          if (e.ctrlKey) {
            this.adjustCrop(0, -resizeStep, 0, 0); // Resize up
          } else {
            this.adjustCrop(0, -moveStep, 0, 0); // Move up
          }
          handled = true;
          break;
        case 'ArrowDown':
          if (e.ctrlKey) {
            this.adjustCrop(0, 0, 0, resizeStep); // Resize down
          } else {
            this.adjustCrop(0, moveStep, 0, 0); // Move down
          }
          handled = true;
          break;
        case 'Enter':
          this.applyCrop();
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  /**
   * Helper to add event listeners and track them for cleanup
   */
  addListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler, options });
  }

  /**
   * Show the crop interface with an image
   * @param {Object} imageData - Image data from upload handler
   */
  show(imageData) {
    this.state.imageData = imageData;
    this.state.isVisible = true;
    
    // Load image onto canvas
    this.loadImage(imageData);
    
    // Show container
    this.elements.container.style.display = 'flex';
    
    // Focus management for accessibility
    this.elements.container.focus();
    
    // Initialize crop area
    this.initializeCropArea();
    
    console.log('Manual crop interface shown', imageData);
  }

  /**
   * Hide the crop interface
   */
  hide() {
    this.state.isVisible = false;
    this.state.isDragging = false;
    this.state.isResizing = false;
    
    this.elements.container.style.display = 'none';
    
    // Save current crop area for next time
    this.saveCropArea();
    
    console.log('Manual crop interface hidden');
  }

  /**
   * Load image data onto the canvas
   * @param {Object} imageData - Image data from upload
   */
  loadImage(imageData) {
    const { canvas } = this.elements;
    const ctx = canvas.getContext('2d');
    
    // Create image from data URL
    const img = new Image();
    img.onload = () => {
      // Calculate display size (fit to container with max width/height)
      const containerRect = canvas.parentElement.getBoundingClientRect();
      const maxWidth = Math.min(containerRect.width - 40, 800);
      const maxHeight = Math.min(containerRect.height - 40, 600);
      
      const scale = Math.min(
        maxWidth / img.width,
        maxHeight / img.height,
        1 // Don't scale up
      );
      
      const displayWidth = img.width * scale;
      const displayHeight = img.height * scale;
      
      // Set canvas size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
      
      // Draw image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      
      // Store scaling info for coordinate conversion
      this.state.imageScale = scale;
      this.state.originalSize = { width: img.width, height: img.height };
      this.state.displaySize = { width: displayWidth, height: displayHeight };
      this.state.currentImage = img;
      
      // Update layout guides
      if (this.options.showLayoutGuides) {
        this.updateLayoutGuides();
      }
    };
    
    img.onerror = () => {
      console.error('Failed to load image for cropping');
    };
    
    img.src = imageData.metadata.dataUrl;
  }

  /**
   * Initialize the crop area (either from saved settings or defaults)
   */
  initializeCropArea() {
    const { displaySize } = this.state;
    
    // Try to use saved crop area, or create default
    let cropArea;
    if (this.state.lastSavedCrop && this.isValidCropArea(this.state.lastSavedCrop)) {
      cropArea = { ...this.state.lastSavedCrop };
    } else {
      // Default to center 80% of image
      const margin = 0.1;
      cropArea = {
        x: displaySize.width * margin,
        y: displaySize.height * margin,
        width: displaySize.width * (1 - 2 * margin),
        height: displaySize.height * (1 - 2 * margin)
      };
    }
    
    this.setCropArea(cropArea);
  }

  /**
   * Validate if crop area is within bounds
   * @param {Object} cropArea - Crop area to validate
   * @returns {boolean} Whether crop area is valid
   */
  isValidCropArea(cropArea) {
    const { displaySize } = this.state;
    if (!displaySize) return false;
    
    return (
      cropArea.x >= 0 &&
      cropArea.y >= 0 &&
      cropArea.x + cropArea.width <= displaySize.width &&
      cropArea.y + cropArea.height <= displaySize.height &&
      cropArea.width >= this.options.minCropWidth &&
      cropArea.height >= this.options.minCropHeight
    );
  }

  /**
   * Set the crop area and update UI
   * @param {Object} cropArea - New crop area
   */
  setCropArea(cropArea) {
    // Constrain to canvas bounds
    cropArea = this.constrainCropArea(cropArea);
    
    this.state.cropArea = cropArea;
    
    // Update selection visual
    this.updateSelectionVisual();
    
    // Update info displays
    this.updateInfoDisplays();
    
    // Update preview
    this.updatePreview();
  }

  /**
   * Constrain crop area to valid bounds
   * @param {Object} cropArea - Crop area to constrain
   * @returns {Object} Constrained crop area
   */
  constrainCropArea(cropArea) {
    const { displaySize } = this.state;
    const { minCropWidth, minCropHeight } = this.options;
    
    // Ensure minimum size
    cropArea.width = Math.max(cropArea.width, minCropWidth);
    cropArea.height = Math.max(cropArea.height, minCropHeight);
    
    // Ensure within canvas bounds
    cropArea.x = Math.max(0, Math.min(cropArea.x, displaySize.width - cropArea.width));
    cropArea.y = Math.max(0, Math.min(cropArea.y, displaySize.height - cropArea.height));
    
    // Ensure doesn't exceed canvas bounds
    if (cropArea.x + cropArea.width > displaySize.width) {
      cropArea.width = displaySize.width - cropArea.x;
    }
    if (cropArea.y + cropArea.height > displaySize.height) {
      cropArea.height = displaySize.height - cropArea.y;
    }
    
    return cropArea;
  }

  /**
   * Update the visual selection rectangle
   */
  updateSelectionVisual() {
    const { selection } = this.elements;
    const { cropArea } = this.state;
    
    selection.style.left = cropArea.x + 'px';
    selection.style.top = cropArea.y + 'px';
    selection.style.width = cropArea.width + 'px';
    selection.style.height = cropArea.height + 'px';
  }

  /**
   * Update info displays (position, size, aspect ratio)
   */
  updateInfoDisplays() {
    const { positionDisplay, sizeDisplay, aspectDisplay } = this.elements;
    const { cropArea, imageScale } = this.state;
    
    // Convert to original image coordinates
    const originalX = Math.round(cropArea.x / imageScale);
    const originalY = Math.round(cropArea.y / imageScale);
    const originalWidth = Math.round(cropArea.width / imageScale);
    const originalHeight = Math.round(cropArea.height / imageScale);
    
    positionDisplay.textContent = `${originalX}, ${originalY}`;
    sizeDisplay.textContent = `${originalWidth} × ${originalHeight}`;
    
    // Calculate aspect ratio
    const gcd = this.calculateGCD(originalWidth, originalHeight);
    const aspectW = originalWidth / gcd;
    const aspectH = originalHeight / gcd;
    aspectDisplay.textContent = `${aspectW}:${aspectH}`;
  }

  /**
   * Calculate greatest common divisor for aspect ratio
   * @param {number} a - First number
   * @param {number} b - Second number
   * @returns {number} GCD
   */
  calculateGCD(a, b) {
    return b === 0 ? a : this.calculateGCD(b, a % b);
  }

  /**
   * Update the preview canvas
   */
  updatePreview() {
    const { previewCanvas } = this.elements;
    const { cropArea, currentImage, imageScale } = this.state;
    
    if (!currentImage) return;
    
    const ctx = previewCanvas.getContext('2d');
    
    // Convert crop area to original image coordinates
    const sourceX = cropArea.x / imageScale;
    const sourceY = cropArea.y / imageScale;
    const sourceWidth = cropArea.width / imageScale;
    const sourceHeight = cropArea.height / imageScale;
    
    // Calculate preview size (fit to preview canvas)
    const previewWidth = previewCanvas.width;
    const previewHeight = previewCanvas.height;
    const scale = Math.min(previewWidth / sourceWidth, previewHeight / sourceHeight);
    
    const destWidth = sourceWidth * scale;
    const destHeight = sourceHeight * scale;
    const destX = (previewWidth - destWidth) / 2;
    const destY = (previewHeight - destHeight) / 2;
    
    // Clear and draw preview
    ctx.clearRect(0, 0, previewWidth, previewHeight);
    ctx.drawImage(
      currentImage,
      sourceX, sourceY, sourceWidth, sourceHeight,
      destX, destY, destWidth, destHeight
    );
  }

  /**
   * Update layout guides for Nova Drift specific layouts
   */
  updateLayoutGuides() {
    const { layoutGuides } = this.elements;
    const { displaySize } = this.state;
    
    if (!this.options.showLayoutGuides) {
      layoutGuides.style.display = 'none';
      return;
    }
    
    layoutGuides.style.display = 'block';
    
    // Position guides for common Nova Drift layouts
    const guides = layoutGuides.children;
    
    // Horizontal guides (for core upgrade zone separation)
    guides[0].style.top = (displaySize.height * 0.25) + 'px'; // Top zone
    guides[1].style.top = (displaySize.height * 0.4) + 'px'; // Zone separation
    guides[2].style.top = (displaySize.height * 0.75) + 'px'; // Bottom zone
    
    // Vertical guides (for mod grid alignment)
    guides[3].style.left = (displaySize.width * 0.25) + 'px'; // Left edge
    guides[4].style.left = (displaySize.width * 0.5) + 'px'; // Center
    guides[5].style.left = (displaySize.width * 0.75) + 'px'; // Right edge
  }

  /**
   * Apply a crop preset
   * @param {string} preset - Preset name
   */
  applyPreset(preset) {
    const { displaySize } = this.state;
    let cropArea;
    
    switch (preset) {
      case 'fullscreen':
        // Full image crop
        cropArea = {
          x: 0,
          y: 0,
          width: displaySize.width,
          height: displaySize.height
        };
        break;
        
      case 'windowed':
        // Typical windowed game capture (center 90%)
        const windowMargin = 0.05;
        cropArea = {
          x: displaySize.width * windowMargin,
          y: displaySize.height * windowMargin,
          width: displaySize.width * (1 - 2 * windowMargin),
          height: displaySize.height * (1 - 2 * windowMargin)
        };
        break;
        
      case 'build-area':
        // Focus on just the build area (center 70%)
        const buildMargin = 0.15;
        cropArea = {
          x: displaySize.width * buildMargin,
          y: displaySize.height * buildMargin,
          width: displaySize.width * (1 - 2 * buildMargin),
          height: displaySize.height * (1 - 2 * buildMargin)
        };
        break;
        
      case 'custom':
      default:
        // Reset to default crop area
        this.initializeCropArea();
        return;
    }
    
    this.setCropArea(cropArea);
    
    // Highlight selected preset
    this.elements.presetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === preset);
    });
  }

  /**
   * Start dragging the crop area
   * @param {Event} e - Mouse/touch event
   */
  startDrag(e) {
    e.preventDefault();
    
    this.state.isDragging = true;
    
    const rect = this.elements.canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    this.state.dragStart = {
      x: clientX - rect.left - this.state.cropArea.x,
      y: clientY - rect.top - this.state.cropArea.y
    };
    
    document.body.style.cursor = 'grabbing';
    this.elements.selection.classList.add('dragging');
  }

  /**
   * Start resizing the crop area  
   * @param {Event} e - Mouse/touch event
   * @param {string} handle - Resize handle identifier
   */
  startResize(e, handle) {
    e.preventDefault();
    e.stopPropagation();
    
    this.state.isResizing = true;
    this.state.resizeHandle = handle;
    
    const rect = this.elements.canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    this.state.resizeStart = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      cropArea: { ...this.state.cropArea }
    };
    
    document.body.style.cursor = this.getResizeCursor(handle);
    this.elements.selection.classList.add('resizing');
  }

  /**
   * Get appropriate cursor for resize handle
   * @param {string} handle - Handle identifier
   * @returns {string} CSS cursor value
   */
  getResizeCursor(handle) {
    const cursors = {
      'nw': 'nw-resize',
      'ne': 'ne-resize', 
      'sw': 'sw-resize',
      'se': 'se-resize',
      'n': 'n-resize',
      's': 's-resize',
      'w': 'w-resize',
      'e': 'e-resize'
    };
    return cursors[handle] || 'default';
  }

  /**
   * Handle mouse/touch move events
   * @param {Event} e - Mouse/touch event
   */
  handleMouseMove(e) {
    if (!this.state.isVisible) return;
    
    const rect = this.elements.canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;
    
    if (this.state.isDragging) {
      this.handleDrag(currentX, currentY);
    } else if (this.state.isResizing) {
      this.handleResize(currentX, currentY);
    }
  }

  /**
   * Handle dragging logic
   * @param {number} currentX - Current X position
   * @param {number} currentY - Current Y position  
   */
  handleDrag(currentX, currentY) {
    const newX = currentX - this.state.dragStart.x;
    const newY = currentY - this.state.dragStart.y;
    
    const newCropArea = {
      ...this.state.cropArea,
      x: newX,
      y: newY
    };
    
    this.setCropArea(newCropArea);
  }

  /**
   * Handle resizing logic
   * @param {number} currentX - Current X position
   * @param {number} currentY - Current Y position
   */
  handleResize(currentX, currentY) {
    const { resizeStart, resizeHandle } = this.state;
    const deltaX = currentX - resizeStart.x;
    const deltaY = currentY - resizeStart.y;
    
    let newCropArea = { ...resizeStart.cropArea };
    
    // Apply resize based on handle
    switch (resizeHandle) {
      case 'nw':
        newCropArea.x += deltaX;
        newCropArea.y += deltaY;
        newCropArea.width -= deltaX;
        newCropArea.height -= deltaY;
        break;
      case 'ne':
        newCropArea.y += deltaY;
        newCropArea.width += deltaX;
        newCropArea.height -= deltaY;
        break;
      case 'sw':
        newCropArea.x += deltaX;
        newCropArea.width -= deltaX;
        newCropArea.height += deltaY;
        break;
      case 'se':
        newCropArea.width += deltaX;
        newCropArea.height += deltaY;
        break;
      case 'n':
        newCropArea.y += deltaY;
        newCropArea.height -= deltaY;
        break;
      case 's':
        newCropArea.height += deltaY;
        break;
      case 'w':
        newCropArea.x += deltaX;
        newCropArea.width -= deltaX;
        break;
      case 'e':
        newCropArea.width += deltaX;
        break;
    }
    
    this.setCropArea(newCropArea);
  }

  /**
   * Handle mouse/touch end events
   * @param {Event} e - Mouse/touch event
   */
  handleMouseUp(e) {
    if (this.state.isDragging || this.state.isResizing) {
      this.state.isDragging = false;
      this.state.isResizing = false;
      this.state.resizeHandle = null;
      
      document.body.style.cursor = '';
      this.elements.selection.classList.remove('dragging', 'resizing');
    }
  }

  /**
   * Adjust crop area by deltas (for keyboard controls)
   * @param {number} dx - X delta
   * @param {number} dy - Y delta  
   * @param {number} dw - Width delta
   * @param {number} dh - Height delta
   */
  adjustCrop(dx, dy, dw, dh) {
    const newCropArea = {
      x: this.state.cropArea.x + dx,
      y: this.state.cropArea.y + dy,
      width: this.state.cropArea.width + dw,
      height: this.state.cropArea.height + dh
    };
    
    this.setCropArea(newCropArea);
  }

  /**
   * Reset crop area to default
   */
  resetCrop() {
    this.initializeCropArea();
    
    // Clear preset selection
    this.elements.presetButtons.forEach(btn => {
      btn.classList.remove('active');
    });
  }

  /**
   * Apply the crop and proceed to next step
   */
  applyCrop() {
    const { cropArea, imageScale, originalSize, imageData } = this.state;
    
    // Convert crop area to original image coordinates
    const originalCrop = {
      x: Math.round(cropArea.x / imageScale),
      y: Math.round(cropArea.y / imageScale),
      width: Math.round(cropArea.width / imageScale),
      height: Math.round(cropArea.height / imageScale)
    };
    
    // Create cropped image data
    const croppedImageData = {
      ...imageData,
      cropArea: originalCrop,
      originalDimensions: originalSize,
      croppedDimensions: {
        width: originalCrop.width,
        height: originalCrop.height
      }
    };
    
    // Save crop area for next time
    this.saveCropArea();
    
    // Hide interface
    this.hide();
    
    // Emit event for next processing step
    const event = new CustomEvent('crop-applied', {
      detail: croppedImageData
    });
    document.dispatchEvent(event);
    
    console.log('Crop applied:', originalCrop);
  }

  /**
   * Save current crop area to localStorage
   */
  saveCropArea() {
    try {
      const cropData = {
        cropArea: this.state.cropArea,
        timestamp: Date.now()
      };
      localStorage.setItem('nova-drift-crop-area', JSON.stringify(cropData));
    } catch (error) {
      console.warn('Failed to save crop area:', error);
    }
  }

  /**
   * Load saved crop area from localStorage
   */
  loadSavedCropArea() {
    try {
      const saved = localStorage.getItem('nova-drift-crop-area');
      if (saved) {
        const cropData = JSON.parse(saved);
        
        // Only use if recent (within 24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - cropData.timestamp < maxAge) {
          this.state.lastSavedCrop = cropData.cropArea;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved crop area:', error);
    }
  }

  /**
   * Get current crop area in original image coordinates
   * @returns {Object} Crop area
   */
  getCropArea() {
    const { cropArea, imageScale } = this.state;
    
    return {
      x: Math.round(cropArea.x / imageScale),
      y: Math.round(cropArea.y / imageScale),
      width: Math.round(cropArea.width / imageScale),
      height: Math.round(cropArea.height / imageScale)
    };
  }

  /**
   * Check if interface is currently visible
   * @returns {boolean} Visibility state
   */
  isVisible() {
    return this.state.isVisible;
  }

  /**
   * Destroy the interface and clean up resources
   */
  destroy() {
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler, options }) => {
      element.removeEventListener(event, handler, options);
    });
    this.listeners = [];
    
    // Remove DOM element
    if (this.elements.container && this.elements.container.parentNode) {
      this.elements.container.parentNode.removeChild(this.elements.container);
    }
    
    // Clear state
    this.state = {
      isVisible: false,
      isResizing: false,
      isDragging: false,
      resizeHandle: null,
      currentImage: null,
      imageData: null,
      cropArea: { x: 0, y: 0, width: 0, height: 0 },
      lastSavedCrop: null,
      previewCanvas: null
    };
    
    console.log('Manual crop interface destroyed');
  }
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ManualCropInterface;
} else {
  window.ManualCropInterface = ManualCropInterface;
}