# 02 - Technical Architecture

## Research Foundation

### OpenCV.js 4.x Implementation Patterns (2024)

Based on current OpenCV.js 4.8.0 documentation:

**Memory Management Best Practices:**
- Always call `.delete()` on Mat objects to prevent memory leaks in Emscripten's heap
- Use `Module.onRuntimeInitialized()` callback to ensure OpenCV is ready before operations
- Implement try-finally blocks for guaranteed cleanup

**Template Matching Methods:**
- **TM_CCOEFF_NORMED**: Most robust method, recommended for complex matching scenarios
- **TM_SQDIFF_NORMED**: Lowest values indicate best matches, sensitive to pixel differences  
- **TM_CCORR_NORMED**: Handles brightness/contrast variations effectively
- Use normalized methods (NORMED variants) for consistent results across different image conditions

**Performance Optimization:**
- Load OpenCV.js asynchronously to improve page load times: `<script async src="opencv.js" onload="onOpenCvReady();">`
- Process images only after they are fully loaded
- Use canvas for efficient image rendering

### Modern Browser APIs for Image Processing

**Canvas API (Baseline Widely Available since 2015):**
- Supported across all major browsers (Chrome, Firefox, Safari, Edge)
- Optimized for 2D graphics processing with pixel-level manipulation
- Memory considerations: Can be "extremely powerful, but not always simple to use"
- Best practices: Use specialized libraries (Fabric.js, p5.js, Konva.js) for complex operations

**WebGL API:**
- "Present in all modern browsers" with hardware acceleration
- Provides "high-performance interactive 3D and 2D graphics"
- Performance benefits: Direct GPU rendering vs Canvas 2D
- Memory optimization: Supports compressed texture formats and uniform buffer objects
- Integration: Compatible with libraries like three.js, Pixi.js, vtk.js

**WebAssembly:**
- "Low-level assembly-like language with compact binary format that runs with near-native performance"
- Ideal for computationally intensive image processing algorithms
- "Designed to complement and run alongside JavaScript"
- Memory management: Explicit control through `WebAssembly.Memory()` with resizable ArrayBuffer
- Use cases: Complex algorithms like convolution, edge detection, filtering

### Similar Project Analysis

**1. ppu-ocv - Modern OpenCV.js Wrapper (2024)**
- Type-safe, chainable image processing library built on OpenCV.js
- **Key Insights:**
  - Implements fluent API pattern: `processor.grayscale().blur().threshold().toCanvas()`
  - Emphasizes memory cleanup with explicit `destroy()` methods
  - Uses operation pipelines for sequential processing
  - Separates concerns with CanvasToolkit, Contours, and ImageAnalysis classes

**2. OpenCV.js Implementations (2018-2019)**
- **theseanything/opencvjs**: WebAssembly-focused implementation
- **muzijunyan/opencv.js**: Web application image processing examples
- **Key Learnings:**
  - WebAssembly requires HTTP serving (not file://) for security
  - Emscripten compilation for custom OpenCV builds improves performance
  - Template-based image processing workflows are common patterns

**3. Screenshot Processing Patterns**
- **ComputerVisionCrawler**: Uses OpenCV for pixel-by-pixel screenshot comparison
- **Key Approaches:**
  - Image pattern recognition through template matching
  - Pixel value comparison for visual similarity detection
  - DOM-independent visual analysis methods

### Accessibility Guidelines Integration

**WCAG 2.1 Compliance Requirements:**
- **File Upload (3.3.2)**: Clear labels and instructions for upload inputs
- **Progress Indicators (4.1.3)**: Status messages communicated to assistive technologies
- **Error Handling (3.3.1, 3.3.3)**: Error identification and correction suggestions
- **Keyboard Navigation (2.1.1, 2.1.2)**: Full keyboard accessibility, no keyboard traps
- **Screen Reader Support (4.1.2)**: Proper name, role, value semantics

**Implementation Requirements:**
- Alternative text for all image elements
- ARIA labels for upload controls and progress indicators  
- Keyboard-accessible drag-and-drop alternatives
- Screen reader announcements for processing status
- Error messages with specific guidance for resolution

## System Architecture Overview

### Component Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Upload Button │ Review Mode UI │ Correction Interface      │
└────────────────┴────────────────┴───────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                   Processing Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│  Image Loader → Auto-Cropper → Pre-processor → Recognition  │
└─────────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Core Components                           │
├──────────────────┬──────────────────┬──────────────────────┤
│ Template Manager │ Matching Engine  │ Confidence Scorer    │
└──────────────────┴──────────────────┴──────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
├──────────────────┬──────────────────┬──────────────────────┤
│   IndexedDB      │  LocalStorage    │  Session Storage     │
└──────────────────┴──────────────────┴──────────────────────┘
```

## Core Components

### 1. Image Processing Pipeline

#### 1.1 ImageLoader
```javascript
class ImageLoader {
  constructor() {
    this.supportedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }
  
  async loadImage(file) {
    // Validate file
    // Create Image object
    // Return Canvas with image
  }
}
```

#### 1.2 AutoCropper
```javascript
class AutoCropper {
  detectUpgradeArea(canvas) {
    // Detect left-side upgrade panel
    // Return cropped region coordinates
  }
  
  manualCrop(canvas, region) {
    // Apply user-defined crop
  }
}
```

#### 1.3 ImagePreprocessor
```javascript
class ImagePreprocessor {
  normalize(canvas) {
    // Adjust brightness/contrast
    // Reduce noise
    // Enhance edges
  }
  
  extractHexagons(canvas) {
    // Detect hexagonal regions
    // Return array of hexagon canvases
  }
}
```

### 2. Recognition Engine

#### 2.1 TemplateManager
```javascript
class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.spriteSheet = null;
  }
  
  async initialize() {
    // Load hex.png sprite sheet
    // Extract individual templates
    // Pre-process templates for matching
  }
  
  getTemplate(upgradeId) {
    // Return processed template
  }
}
```

#### 2.2 MatchingEngine
```javascript
class MatchingEngine {
  constructor() {
    this.methods = [
      'TM_CCOEFF_NORMED',
      'TM_CCORR_NORMED',
      'TM_SQDIFF_NORMED'
    ];
  }
  
  async match(hexagonImage, templates) {
    // Apply multiple matching methods
    // Combine results
    // Return matches with confidence scores
  }
}
```

#### 2.3 ConfidenceScorer
```javascript
class ConfidenceScorer {
  calculateConfidence(matchResults) {
    // Analyze match quality
    // Consider multiple factors
    // Return normalized confidence score
  }
  
  flagLowConfidence(matches, threshold = 0.9) {
    // Identify matches below threshold
  }
}
```

### 3. User Interface Components

#### 3.1 UploadComponent
```javascript
class UploadComponent {
  constructor(containerElement) {
    this.container = containerElement;
    this.fileInput = null;
    this.dropZone = null;
  }
  
  render() {
    // Create upload button
    // Set up drag-and-drop
    // Handle file selection
  }
}
```

#### 3.2 ReviewModeUI
```javascript
class ReviewModeUI {
  constructor(cheatsheetElement) {
    this.cheatsheet = cheatsheetElement;
    this.flaggedItems = [];
  }
  
  enterReviewMode(matches) {
    // Display review header
    // Highlight low-confidence items
    // Enable correction interface
  }
}
```

#### 3.3 CorrectionInterface
```javascript
class CorrectionInterface {
  showCorrection(hexagonImage, candidates) {
    // Display modal/overlay
    // Show original hexagon
    // List candidate matches
    // Handle user selection
  }
}
```

### 4. Data Management

#### 4.1 StorageManager
```javascript
class StorageManager {
  constructor() {
    this.db = null;
  }
  
  async initialize() {
    // Open IndexedDB
    // Create object stores
  }
  
  async saveCorrection(imageHash, correction) {
    // Store user corrections
  }
  
  async getCorrection(imageHash) {
    // Retrieve previous corrections
  }
}
```

#### 4.2 FeedbackCollector
```javascript
class FeedbackCollector {
  collectSession() {
    // Gather all corrections
    // Format for GitHub issue
    // Generate submission URL
  }
}
```

## Integration Architecture

### 1. Entry Point Integration
```javascript
// In existing cheatsheet code
document.addEventListener('DOMContentLoaded', () => {
  const importAssistant = new ScreenshotImportAssistant();
  importAssistant.initialize();
  
  // Add to existing UI
  const uploadButton = importAssistant.createUploadButton();
  document.querySelector('.controls').appendChild(uploadButton);
});
```

### 2. State Management Integration
```javascript
class ScreenshotImportAssistant {
  applyMatches(matches) {
    // Use existing selection mechanism
    matches.forEach(match => {
      const checkbox = document.querySelector(
        `input[data-upgrade-id="${match.upgradeId}"]`
      );
      if (checkbox) checkbox.checked = true;
    });
    
    // Trigger existing update logic
    updateURL();
    updateDisplay();
  }
}
```

## Performance Optimization

### 1. Web Workers
```javascript
// recognition.worker.js
self.addEventListener('message', async (e) => {
  const { image, templates } = e.data;
  
  // Perform heavy processing
  const results = await performMatching(image, templates);
  
  self.postMessage({ results });
});
```

### 2. Progressive Processing
```javascript
class ProgressiveProcessor {
  async processInChunks(hexagons, chunkSize = 5) {
    const results = [];
    
    for (let i = 0; i < hexagons.length; i += chunkSize) {
      const chunk = hexagons.slice(i, i + chunkSize);
      const chunkResults = await this.processChunk(chunk);
      results.push(...chunkResults);
      
      // Update progress UI
      this.updateProgress(i + chunk.length, hexagons.length);
      
      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }
}
```

## Error Handling Strategy

### 1. Graceful Degradation
```javascript
class ErrorHandler {
  handleError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    // User-friendly messages
    const messages = {
      'image-load': 'Failed to load image. Please try another screenshot.',
      'recognition': 'Recognition failed. Please use manual selection.',
      'storage': 'Could not save feedback. Continuing without saving.'
    };
    
    this.showUserMessage(messages[context] || 'An error occurred.');
  }
}
```

## Security Considerations

### 1. Input Validation
- Validate file types and sizes
- Sanitize file names
- Prevent XSS in user feedback

### 2. Privacy
- All processing client-side
- No data transmission without consent
- Clear data retention policies

## Technology Stack Summary

### Core Technologies (Research-Backed)
- **OpenCV.js**: v4.8.0+ (latest stable) for image processing
  - Template matching with TM_CCOEFF_NORMED for optimal results
  - Async loading pattern for improved page performance  
  - Memory management with explicit Mat cleanup
- **Canvas API**: Baseline widely available (2015+) for image manipulation
  - Cross-browser compatibility across Chrome, Firefox, Safari, Edge
  - Pixel-level manipulation capabilities
  - Integration with specialized libraries (Fabric.js, p5.js) for complex operations
- **WebGL**: Hardware-accelerated processing for performance-critical operations
  - GPU rendering for image transformations
  - Compressed texture formats for memory optimization
- **WebAssembly**: Near-native performance for computationally intensive algorithms
  - OpenCV.js leverages WASM for core image processing functions
  - Explicit memory management through ArrayBuffer
- **IndexedDB**: Client-side persistent storage for templates and corrections
- **Web Workers**: Background processing to maintain UI responsiveness

### Accessibility Technologies
- **ARIA**: Labels, roles, and properties for assistive technology compatibility
- **Screen Reader APIs**: Status announcements and progress updates
- **Keyboard Navigation**: Focus management and logical tab order
- **WCAG 2.1 AA**: Compliance with accessibility guidelines

### Development Tools (Modern Stack)
- **Webpack 5+**: Module bundling with tree shaking and code splitting
- **TypeScript 4+**: Type safety with modern ES features
- **Jest 27+**: Unit testing with Canvas and WebGL mocking
- **Cypress**: E2E testing with visual regression capabilities
- **ESLint + Prettier**: Code quality and formatting

## Next Steps

See `03-development-setup.md` for environment configuration and dependency installation.