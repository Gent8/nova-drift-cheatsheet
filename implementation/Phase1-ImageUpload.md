# Phase 1: Image Upload & User Experience

**Duration:** 2-3 days  
**Dependencies:** None  
**Output:** File upload interface integrated with existing Nova Drift Cheatsheet UI

## 📋 Table of Contents
1. [Overview](#overview)
2. [Technical Requirements](#technical-requirements)
3. [Implementation Sub-Steps](#implementation-sub-steps)
4. [Library Analysis](#library-analysis)
5. [Code Implementation](#code-implementation)
6. [Integration Points](#integration-points)
7. [Testing Requirements](#testing-requirements)
8. [Risk Assessment](#risk-assessment)

---

## Overview

This phase implements a user-friendly file upload interface that allows users to upload screenshots of their Nova Drift mod selection screen. The interface must integrate seamlessly with the existing cheatsheet UI while providing robust file validation and user feedback.

### Success Criteria
- ✅ Users can upload PNG/JPG files via click or drag-and-drop
- ✅ File validation prevents invalid uploads with clear error messages
- ✅ Upload progress indication for larger files
- ✅ Integration with existing toolbar UI without layout disruption
- ✅ Accessibility compliance (keyboard navigation, screen readers)

---

## Technical Requirements

### Browser Support
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| File API | 90+ | 90+ | 14+ | 90+ |
| Drag & Drop | 90+ | 90+ | 14+ | 90+ |
| Canvas API | 90+ | 90+ | 14+ | 90+ |
| Web Workers | 90+ | 90+ | 14+ | 90+ |

### File Constraints
```javascript
const FILE_CONSTRAINTS = {
  maxSize: 10 * 1024 * 1024,      // 10MB maximum
  minSize: 1024,                   // 1KB minimum
  allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
  maxDimensions: { width: 4096, height: 4096 },
  minDimensions: { width: 300, height: 200 }
};
```

### Performance Targets
- **File Validation:** <100ms for files up to 10MB
- **UI Response:** <50ms for drag-and-drop visual feedback
- **Memory Usage:** <20MB additional during upload processing
- **Error Recovery:** Clear error messages within 200ms of failure

---

## Implementation Sub-Steps

### 1.1 UI Component Design

**Input:** Existing `docs/index.html` toolbar structure  
**Output:** Screenshot upload button and drop zone elements  
**Files Modified:** `docs/index.html`, `docs/style.css`

#### Decision Points
- **Location:** Integrate with existing toolbar vs. separate section
  - **Chosen:** Integrate with toolbar after "Copy Link" button for logical workflow
- **Visual Style:** Button-only vs. combined button/drop zone
  - **Chosen:** Combined approach with expandable drop zone

#### Implementation Steps
1. **Add HTML elements** to existing toolbar section
2. **Create CSS styles** for upload components  
3. **Implement responsive design** for mobile compatibility
4. **Add accessibility attributes** (ARIA labels, tab indices)

#### Code Example
```html
<!-- Add after existing toolbar buttons in docs/index.html -->
<div id="screenshot-upload-container" class="toolbar-section">
  <button id="screenshot-upload-btn" class="toolbar-button" aria-label="Upload screenshot">
    📷 Upload Screenshot
  </button>
  <input type="file" id="screenshot-input" accept="image/*" style="display: none;" 
         aria-describedby="upload-help">
  <div id="screenshot-drop-zone" class="drop-zone" style="display: none;"
       role="button" tabindex="0" aria-label="Drop screenshot here">
    <div class="drop-zone-content">
      <span class="drop-icon">📁</span>
      <span class="drop-text">Drop screenshot here or click to browse</span>
      <span class="drop-help" id="upload-help">Supports PNG and JPG files up to 10MB</span>
    </div>
  </div>
</div>
```

---

### 1.2 File Validation Module

**Input:** File object from upload  
**Output:** Validation result with error details  
**Files Created:** `docs/modules/upload-validator.js`

#### Validation Chain
```javascript
class UploadValidator {
  static async validateFile(file) {
    const validations = [
      this.validateFileType,
      this.validateFileSize,
      this.validateImageDimensions,
      this.validateImageContent
    ];
    
    for (const validate of validations) {
      const result = await validate(file);
      if (!result.valid) return result;
    }
    
    return { valid: true, file };
  }
}
```

#### Validation Steps
1. **File Type Check** - MIME type validation
2. **Size Validation** - File size within limits
3. **Image Dimensions** - Width/height requirements
4. **Content Validation** - Ensure it's actually an image

#### Error Handling Strategy
```javascript
const ValidationErrors = {
  INVALID_TYPE: {
    code: 'INVALID_TYPE',
    message: 'Please upload a PNG or JPG image file.',
    action: 'Choose a different file'
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE', 
    message: 'File size must be less than 10MB.',
    action: 'Resize your image or choose a smaller file'
  },
  DIMENSIONS_TOO_SMALL: {
    code: 'DIMENSIONS_TOO_SMALL',
    message: 'Image must be at least 300x200 pixels.',
    action: 'Upload a larger screenshot'
  }
};
```

---

### 1.3 Drag & Drop Implementation

**Input:** Drag events from browser  
**Output:** File object ready for validation  
**Files Modified:** `docs/modules/upload-handler.js`

#### Event Handling Chain
```javascript
class DragDropHandler {
  constructor(dropZone, fileInput) {
    this.dropZone = dropZone;
    this.fileInput = fileInput;
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Prevent default browser drag behavior
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });
    
    // Visual feedback events
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this.highlight.bind(this), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      this.dropZone.addEventListener(eventName, this.unhighlight.bind(this), false);
    });
    
    // File processing
    this.dropZone.addEventListener('drop', this.handleDrop.bind(this), false);
  }
}
```

#### Visual Feedback States
1. **Default State** - Normal drop zone appearance
2. **Drag Over** - Highlighted border and background
3. **Valid File** - Green highlight with checkmark
4. **Invalid File** - Red highlight with error icon
5. **Processing** - Loading spinner and progress indication

---

### 1.4 Progress Indication

**Input:** File processing events  
**Output:** Visual progress feedback  
**Files Modified:** `docs/modules/progress-indicator.js`

#### Progress States
```javascript
const ProgressStates = {
  IDLE: 'idle',
  UPLOADING: 'uploading',      // File selection/validation
  PROCESSING: 'processing',     // Image analysis preparation
  ANALYZING: 'analyzing',       // Recognition in progress
  COMPLETE: 'complete',         // Success state
  ERROR: 'error'               // Error state
};
```

#### Implementation Pattern
```javascript
class ProgressIndicator {
  constructor(container) {
    this.container = container;
    this.progressBar = this.createProgressBar();
    this.statusText = this.createStatusText();
  }
  
  updateProgress(state, percentage = 0, message = '') {
    this.progressBar.style.width = `${percentage}%`;
    this.statusText.textContent = message;
    this.container.setAttribute('data-state', state);
  }
}
```

---

## Library Analysis

### Option 1: Native File API (Recommended)
**Pros:**
- Zero dependencies, smallest bundle size
- Full control over validation logic
- Native browser support in all target browsers
- Direct integration with existing codebase

**Cons:**
- More implementation work required
- Need to handle all edge cases manually

**References:**
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [MDN Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)

### Option 2: Dropzone.js
**Pros:**
- Mature library with extensive features
- Built-in validation and progress indication
- Good accessibility support

**Cons:**
- 45KB additional bundle size
- May conflict with existing CSS styles
- Overkill for simple upload requirements

### Option 3: FilePond
**Pros:**
- Modern, lightweight design
- Excellent mobile support
- Plugin architecture for extensibility

**Cons:**
- 25KB bundle size
- Requires CSS framework integration
- Learning curve for customization

**Recommendation:** Use Native File API for maximum control and minimal dependencies.

---

## Code Implementation

### Core Upload Handler Module

**File:** `docs/modules/upload-handler.js`

```javascript
/**
 * Screenshot Upload Handler
 * Manages file uploads, validation, and user feedback for screenshot recognition
 */
class ScreenshotUploadHandler {
  constructor(options = {}) {
    this.options = {
      maxFileSize: 10 * 1024 * 1024,
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      ...options
    };
    
    this.elements = this.initializeElements();
    this.validator = new UploadValidator(this.options);
    this.progressIndicator = new ProgressIndicator(this.elements.container);
    
    this.setupEventListeners();
    this.bindKeyboardHandlers();
  }
  
  initializeElements() {
    return {
      container: document.getElementById('screenshot-upload-container'),
      button: document.getElementById('screenshot-upload-btn'),
      input: document.getElementById('screenshot-input'),
      dropZone: document.getElementById('screenshot-drop-zone'),
      errorDisplay: document.getElementById('upload-error-display')
    };
  }
  
  setupEventListeners() {
    // Button click handler
    this.elements.button.addEventListener('click', () => {
      this.elements.input.click();
    });
    
    // File input change
    this.elements.input.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
    });
    
    // Drag and drop
    this.setupDragAndDrop();
  }
  
  setupDragAndDrop() {
    const { dropZone } = this.elements;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
      }, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      this.handleFileSelection(files);
    }, false);
  }
  
  async handleFileSelection(files) {
    if (files.length === 0) return;
    
    const file = files[0]; // Only handle first file
    this.progressIndicator.updateProgress('uploading', 10, 'Validating file...');
    
    try {
      const validationResult = await this.validator.validateFile(file);
      
      if (!validationResult.valid) {
        this.showError(validationResult.error);
        return;
      }
      
      this.progressIndicator.updateProgress('processing', 50, 'Preparing image...');
      
      // Trigger next phase (image processing)
      this.onFileReady(validationResult.file);
      
    } catch (error) {
      this.showError({
        code: 'PROCESSING_ERROR',
        message: 'Failed to process the uploaded file.',
        action: 'Please try again with a different image.'
      });
    }
  }
  
  onFileReady(file) {
    // Emit custom event for next phase to handle
    const event = new CustomEvent('screenshot-ready', {
      detail: { file }
    });
    document.dispatchEvent(event);
  }
  
  showError(error) {
    this.progressIndicator.updateProgress('error', 0, error.message);
    // Additional error display logic
  }
  
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
}
```

### CSS Styles

**File:** `docs/style.css` (additions)

```css
/* Screenshot Upload Components */
#screenshot-upload-container {
  display: inline-block;
  margin-left: 10px;
  position: relative;
}

.toolbar-button {
  background: #4a90e2;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.toolbar-button:hover {
  background: #357abd;
}

.toolbar-button:focus {
  outline: 2px solid #ff6b35;
  outline-offset: 2px;
}

.drop-zone {
  position: absolute;
  top: 100%;
  left: 0;
  width: 300px;
  height: 150px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  z-index: 1000;
  transition: all 0.2s;
  cursor: pointer;
}

.drop-zone.drag-over {
  border-color: #4a90e2;
  background: #e7f3ff;
}

.drop-zone-content {
  text-align: center;
  color: #666;
}

.drop-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.drop-text {
  font-weight: bold;
  display: block;
  margin-bottom: 4px;
}

.drop-help {
  font-size: 12px;
  color: #999;
}

/* Progress Indicator */
.progress-container {
  margin-top: 8px;
  display: none;
}

.progress-container[data-state="uploading"],
.progress-container[data-state="processing"] {
  display: block;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4a90e2;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

/* Error Display */
.upload-error {
  background: #ffebee;
  border: 1px solid #f44336;
  color: #c62828;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 12px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .drop-zone {
    width: 250px;
    height: 120px;
  }
  
  .drop-icon {
    font-size: 24px;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .toolbar-button {
    border: 2px solid white;
  }
  
  .drop-zone {
    border-width: 3px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .toolbar-button,
  .drop-zone,
  .progress-fill {
    transition: none;
  }
}
```

---

## Integration Points

### 1. Existing Toolbar Integration

**File:** `docs/index.html`  
**Location:** After line 150 (near copy-link button)

```html
<!-- Add after existing toolbar buttons -->
<div id="hex-controls-extended">
  <!-- Existing buttons -->
  <button id="copy-link">Copy Link</button>
  <button id="copy-prefab">Copy Prefab</button>
  
  <!-- NEW: Screenshot upload -->
  <div id="screenshot-upload-container" class="toolbar-section">
    <!-- Upload components here -->
  </div>
</div>
```

### 2. Event System Integration

**File:** `docs/base.js`  
**Integration Point:** Add event listener for screenshot processing

```javascript
// Add to existing event handlers section
document.addEventListener('screenshot-ready', function(event) {
  const file = event.detail.file;
  
  // Trigger Phase 2: Hex Grid Mapping
  if (window.HexGridMapper) {
    window.HexGridMapper.processScreenshot(file);
  }
});
```

### 3. Existing CSS Integration

**Considerations:**
- Maintain consistent visual style with existing buttons
- Respect existing color scheme and typography
- Ensure mobile responsive behavior matches current design
- Preserve accessibility features of existing interface

---

## Testing Requirements

### 1. Unit Tests

**File:** `tests/unit/upload-handler.test.js`

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenshotUploadHandler } from '../docs/modules/upload-handler.js';

describe('ScreenshotUploadHandler', () => {
  let handler;
  let mockElements;
  
  beforeEach(() => {
    // Setup DOM mock
    mockElements = setupDOMElements();
    handler = new ScreenshotUploadHandler();
  });
  
  it('should validate PNG files correctly', async () => {
    const pngFile = createMockFile('test.png', 'image/png', 1024);
    const result = await handler.validator.validateFile(pngFile);
    expect(result.valid).toBe(true);
  });
  
  it('should reject files that are too large', async () => {
    const largeFile = createMockFile('large.png', 'image/png', 15 * 1024 * 1024);
    const result = await handler.validator.validateFile(largeFile);
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('FILE_TOO_LARGE');
  });
  
  it('should handle drag and drop events', () => {
    const dropEvent = createMockDropEvent();
    handler.handleFileSelection(dropEvent.dataTransfer.files);
    // Assert proper handling
  });
});
```

### 2. Integration Tests

**Test Scenarios:**
- File upload triggering Phase 2 processing
- Error states displaying proper UI feedback
- Keyboard navigation through upload interface
- Screen reader compatibility

### 3. Browser Compatibility Tests

**Test Matrix:**
| Browser | Version | File API | Drag/Drop | Canvas |
|---------|---------|----------|-----------|--------|
| Chrome | 90+ | ✅ | ✅ | ✅ |
| Firefox | 90+ | ✅ | ✅ | ✅ |
| Safari | 14+ | ✅ | ✅ | ✅ |
| Edge | 90+ | ✅ | ✅ | ✅ |

### 4. Performance Tests

**Benchmarks:**
- File validation time for various file sizes
- Memory usage during file processing
- UI responsiveness during upload
- Error recovery time

---

## Risk Assessment

### High Risk Issues

#### File Size Memory Consumption
**Risk:** Large image files causing browser memory issues  
**Mitigation:** 
- Implement file size limits (10MB max)
- Add progressive loading for large files
- Use Web Workers for processing when possible

**Code Example:**
```javascript
// Memory-safe file reading
function readFileInChunks(file, chunkSize = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File too large'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

#### Browser Compatibility Edge Cases
**Risk:** Older browsers lacking File API support  
**Mitigation:**
- Feature detection before enabling upload
- Graceful degradation with helpful error messages
- Polyfills for missing functionality

**Code Example:**
```javascript
// Feature detection
function checkUploadSupport() {
  const hasFileAPI = window.File && window.FileReader && window.FileList && window.Blob;
  const hasDragDrop = 'draggable' in document.createElement('span');
  
  if (!hasFileAPI) {
    showFeatureUnavailable('File uploads require a modern browser');
    return false;
  }
  
  return true;
}
```

### Medium Risk Issues

#### UI Layout Disruption
**Risk:** Upload interface breaking existing layout  
**Mitigation:**
- Thorough CSS testing across devices
- CSS containment and namespacing
- Responsive design validation

#### File Type Spoofing
**Risk:** Malicious files disguised as images  
**Mitigation:**
- Multiple validation layers (MIME type + content validation)
- File signature verification
- Error handling for corrupted files

### Low Risk Issues

#### Drag & Drop Conflicts
**Risk:** Interfering with existing page drag behaviors  
**Mitigation:**
- Careful event handling and prevention
- Scoped drag/drop zones
- Testing with existing UI elements

---

## Implementation Checklist

### Phase 1.1: UI Components
- [ ] Add upload button to toolbar section
- [ ] Create drop zone with proper styling
- [ ] Implement responsive design for mobile
- [ ] Add accessibility attributes (ARIA labels, tab order)
- [ ] Test visual integration with existing design
- [ ] Validate color contrast ratios
- [ ] Test keyboard navigation flow

### Phase 1.2: File Validation
- [ ] Implement file type validation (PNG/JPG)
- [ ] Add file size validation (max 10MB)
- [ ] Create image dimension validation
- [ ] Add content verification (actual image data)
- [ ] Implement error message system
- [ ] Test with various invalid file types
- [ ] Test with corrupted image files

### Phase 1.3: Drag & Drop
- [ ] Implement drag event handlers
- [ ] Add visual feedback for drag states
- [ ] Prevent default browser drag behaviors
- [ ] Handle multiple file drops (take first)
- [ ] Test drag and drop on mobile devices
- [ ] Verify no conflicts with existing page elements
- [ ] Test accessibility with keyboard-only navigation

### Phase 1.4: Progress & Feedback
- [ ] Create progress indicator component
- [ ] Implement state management for upload process
- [ ] Add error display with recovery options
- [ ] Test progress updates during file processing
- [ ] Validate error message clarity
- [ ] Test with screen readers
- [ ] Verify performance with large files

### Phase 1.5: Integration & Testing
- [ ] Integrate with existing base.js event system
- [ ] Add custom event emission for Phase 2
- [ ] Write comprehensive unit tests
- [ ] Perform cross-browser compatibility testing
- [ ] Test memory usage with large files
- [ ] Validate accessibility compliance
- [ ] Document API for next phase integration

---

## Phase 1 Outputs

### Data Outputs for Phase 2
```javascript
// Event payload for Phase 2
{
  type: 'screenshot-ready',
  detail: {
    file: File,              // Validated image file
    dimensions: {            // Image dimensions
      width: number,
      height: number
    },
    metadata: {              // Additional file info
      size: number,
      type: string,
      lastModified: number
    }
  }
}
```

### Files Created/Modified
- ✅ `docs/index.html` - Added upload UI components
- ✅ `docs/style.css` - Added upload styling
- ✅ `docs/modules/upload-handler.js` - Core upload logic
- ✅ `docs/modules/upload-validator.js` - File validation
- ✅ `docs/modules/progress-indicator.js` - Progress feedback
- ✅ `tests/unit/upload-handler.test.js` - Unit tests

### Integration Points for Phase 2
- **Event System:** `screenshot-ready` event with file data
- **Error Handling:** Consistent error types and messages
- **UI State:** Progress indication that Phase 2 can update
- **Accessibility:** Maintained throughout processing chain

---

**Next Phase:** [Phase 2: Hex Grid Mapping](Phase2-HexMapping.md)
