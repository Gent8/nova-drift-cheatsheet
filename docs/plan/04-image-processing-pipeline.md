# 04 - Image Processing Pipeline

## Overview

The image processing pipeline transforms raw screenshot input into normalized, segmented hexagon images ready for template matching. This document details each stage of the pipeline with implementation examples.

## Pipeline Stages

```
Screenshot Input
    ↓
1. Image Loading & Validation
    ↓
2. Auto-Crop Detection
    ↓
3. Image Preprocessing
    ↓
4. Hexagon Detection & Segmentation
    ↓
5. Hexagon Normalization
    ↓
Template Matching Ready
```

## Stage 1: Image Loading & Validation

### Implementation
```javascript
// image-loader.js
export class ImageLoader {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.supportedFormats = ['image/png', 'image/jpeg', 'image/jpg'];
    this.minDimensions = { width: 800, height: 600 };
    this.maxDimensions = { width: 4096, height: 4096 };
  }

  async loadFromFile(file) {
    // Validate file
    this.validateFile(file);
    
    // Read file
    const dataUrl = await this.readFile(file);
    
    // Load into canvas
    const canvas = await this.loadToCanvas(dataUrl);
    
    // Validate dimensions
    this.validateDimensions(canvas);
    
    return canvas;
  }

  validateFile(file) {
    if (!this.supportedFormats.includes(file.type)) {
      throw new Error(`Unsupported file format: ${file.type}`);
    }
    
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async loadToCanvas(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  validateDimensions(canvas) {
    if (canvas.width < this.minDimensions.width || 
        canvas.height < this.minDimensions.height) {
      throw new Error('Image too small for reliable detection');
    }
    
    if (canvas.width > this.maxDimensions.width || 
        canvas.height > this.maxDimensions.height) {
      throw new Error('Image too large, please use a smaller screenshot');
    }
  }
}
```

## Stage 2: Auto-Crop Detection

### Crop Detection Algorithm
```javascript
// auto-cropper.js
export class AutoCropper {
  constructor() {
    this.upgradeAreaRatio = 0.3; // Upgrade area is ~30% of screen width
    this.edgeThreshold = 30; // Minimum edge strength
  }

  async detectUpgradeArea(canvas, cv) {
    // Convert to OpenCV Mat
    const src = cv.imread(canvas);
    const gray = new cv.Mat();
    
    try {
      // Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Detect if perfectly cropped
      if (this.isPerfectlyCropped(gray, cv)) {
        return { x: 0, y: 0, width: canvas.width, height: canvas.height };
      }
      
      // Detect left panel edges
      const edges = this.detectEdges(gray, cv);
      const region = this.findUpgradePanel(edges, cv);
      
      return region;
    } finally {
      // Clean up
      src.delete();
      gray.delete();
    }
  }

  isPerfectlyCropped(gray, cv) {
    // Check if image has consistent dark background
    const mean = cv.mean(gray);
    const avgBrightness = mean[0];
    
    // Cropped images typically have dark backgrounds
    return avgBrightness < 50 && gray.cols < 800;
  }

  detectEdges(gray, cv) {
    const edges = new cv.Mat();
    
    // Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    const ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0);
    
    // Canny edge detection
    cv.Canny(blurred, edges, 50, 150);
    
    blurred.delete();
    return edges;
  }

  findUpgradePanel(edges, cv) {
    // Use Hough lines to detect vertical panel boundary
    const lines = new cv.Mat();
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 100, 50, 10);
    
    // Find strong vertical lines in left 40% of image
    const verticalLines = [];
    for (let i = 0; i < lines.rows; ++i) {
      const [x1, y1, x2, y2] = lines.data32S.slice(i * 4, (i + 1) * 4);
      
      // Check if line is vertical and in left portion
      if (Math.abs(x1 - x2) < 5 && x1 < edges.cols * 0.4) {
        verticalLines.push({ x: x1, height: Math.abs(y2 - y1) });
      }
    }
    
    // Find rightmost strong vertical line
    if (verticalLines.length > 0) {
      verticalLines.sort((a, b) => b.x - a.x);
      const panelRight = verticalLines[0].x;
      
      return {
        x: 0,
        y: 0,
        width: panelRight + 50, // Add margin
        height: edges.rows
      };
    }
    
    // Fallback: use fixed ratio
    return {
      x: 0,
      y: 0,
      width: Math.floor(edges.cols * this.upgradeAreaRatio),
      height: edges.rows
    };
  }

  applyCrop(canvas, region) {
    const cropped = document.createElement('canvas');
    cropped.width = region.width;
    cropped.height = region.height;
    
    const ctx = cropped.getContext('2d');
    ctx.drawImage(
      canvas,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height
    );
    
    return cropped;
  }
}
```

## Stage 3: Image Preprocessing

### Preprocessing Pipeline
```javascript
// image-preprocessor.js
export class ImagePreprocessor {
  constructor() {
    this.targetBrightness = 128;
    this.contrastFactor = 1.2;
  }

  preprocess(canvas, cv) {
    const src = cv.imread(canvas);
    const processed = new cv.Mat();
    
    try {
      // Step 1: Denoise
      this.denoise(src, processed, cv);
      
      // Step 2: Adjust brightness and contrast
      this.adjustBrightnessContrast(processed, cv);
      
      // Step 3: Sharpen
      this.sharpen(processed, cv);
      
      // Convert back to canvas
      const result = this.matToCanvas(processed, cv);
      return result;
    } finally {
      src.delete();
      processed.delete();
    }
  }

  denoise(src, dst, cv) {
    // Non-local means denoising
    cv.fastNlMeansDenoisingColored(src, dst, 10, 10, 7, 21);
  }

  adjustBrightnessContrast(mat, cv) {
    // Calculate current brightness
    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    const mean = cv.mean(gray);
    const currentBrightness = mean[0];
    
    // Calculate adjustment
    const alpha = this.contrastFactor; // Contrast
    const beta = this.targetBrightness - currentBrightness; // Brightness
    
    // Apply adjustment
    mat.convertTo(mat, -1, alpha, beta);
    
    gray.delete();
  }

  sharpen(mat, cv) {
    // Create sharpening kernel
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]);
    
    // Apply filter
    cv.filter2D(mat, mat, cv.CV_8U, kernel);
    kernel.delete();
  }

  matToCanvas(mat, cv) {
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, mat);
    return canvas;
  }
}
```

## Stage 4: Hexagon Detection & Segmentation

### Hexagon Detection
```javascript
// hexagon-detector.js
export class HexagonDetector {
  constructor() {
    this.hexagonSize = { width: 64, height: 56 }; // Approximate
    this.coreUpgradesY = 50; // Approximate Y position
    this.modGroupY = 150; // Where mod group starts
  }

  detectHexagons(canvas, cv) {
    const src = cv.imread(canvas);
    const hexagons = [];
    
    try {
      // Detect core upgrades (top 3)
      const coreHexagons = this.detectCoreUpgrades(src, cv);
      
      // Detect mod group
      const modHexagons = this.detectModGroup(src, cv);
      
      hexagons.push(...coreHexagons, ...modHexagons);
      
      return hexagons;
    } finally {
      src.delete();
    }
  }

  detectCoreUpgrades(src, cv) {
    const hexagons = [];
    const expectedPositions = [
      { x: 50, y: 50, type: 'weapon' },
      { x: 50, y: 120, type: 'body' },
      { x: 50, y: 190, type: 'shield' }
    ];
    
    expectedPositions.forEach(pos => {
      const hexagon = this.extractHexagonAt(src, pos, cv);
      if (hexagon) {
        hexagons.push({
          ...hexagon,
          type: pos.type,
          category: 'core'
        });
      }
    });
    
    return hexagons;
  }

  detectModGroup(src, cv) {
    const hexagons = [];
    
    // Convert to grayscale for edge detection
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    // Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      gray,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
    
    // Filter hexagon-like contours
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      
      // Check if area matches hexagon size
      const expectedArea = this.hexagonSize.width * this.hexagonSize.height * 0.8;
      if (area > expectedArea * 0.7 && area < expectedArea * 1.3) {
        const rect = cv.boundingRect(contour);
        
        // Skip if in core upgrade area
        if (rect.y < this.modGroupY) continue;
        
        const hexagon = this.extractHexagonFromRect(src, rect, cv);
        if (hexagon) {
          hexagons.push({
            ...hexagon,
            category: 'mod'
          });
        }
      }
    }
    
    // Clean up
    gray.delete();
    contours.delete();
    hierarchy.delete();
    
    return hexagons;
  }

  extractHexagonAt(src, position, cv) {
    const roi = new cv.Rect(
      position.x - this.hexagonSize.width / 2,
      position.y - this.hexagonSize.height / 2,
      this.hexagonSize.width,
      this.hexagonSize.height
    );
    
    // Ensure ROI is within bounds
    if (roi.x < 0 || roi.y < 0 || 
        roi.x + roi.width > src.cols || 
        roi.y + roi.height > src.rows) {
      return null;
    }
    
    const hexMat = src.roi(roi);
    const canvas = this.matToCanvas(hexMat, cv);
    
    return {
      canvas,
      position: { x: position.x, y: position.y },
      bounds: roi
    };
  }

  extractHexagonFromRect(src, rect, cv) {
    // Add padding
    const padding = 5;
    const roi = new cv.Rect(
      Math.max(0, rect.x - padding),
      Math.max(0, rect.y - padding),
      Math.min(rect.width + padding * 2, src.cols - rect.x),
      Math.min(rect.height + padding * 2, src.rows - rect.y)
    );
    
    const hexMat = src.roi(roi);
    const canvas = this.matToCanvas(hexMat, cv);
    
    return {
      canvas,
      position: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      bounds: roi
    };
  }

  matToCanvas(mat, cv) {
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, mat);
    return canvas;
  }
}
```

## Stage 5: Hexagon Normalization

### Normalization Process
```javascript
// hexagon-normalizer.js
export class HexagonNormalizer {
  constructor() {
    this.targetSize = { width: 64, height: 64 };
    this.backgroundColor = { r: 0, g: 0, b: 0, a: 255 };
  }

  normalizeHexagons(hexagons, cv) {
    return hexagons.map(hexagon => {
      const normalized = this.normalizeHexagon(hexagon.canvas, cv);
      return {
        ...hexagon,
        normalizedCanvas: normalized,
        hash: this.calculateHash(normalized)
      };
    });
  }

  normalizeHexagon(canvas, cv) {
    const src = cv.imread(canvas);
    const normalized = new cv.Mat();
    
    try {
      // Step 1: Remove background
      const noBackground = this.removeBackground(src, cv);
      
      // Step 2: Center and resize
      const centered = this.centerAndResize(noBackground, cv);
      
      // Step 3: Normalize colors
      this.normalizeColors(centered, cv);
      
      // Convert to canvas
      const result = this.matToCanvas(centered, cv);
      
      noBackground.delete();
      centered.delete();
      
      return result;
    } finally {
      src.delete();
      normalized.delete();
    }
  }

  removeBackground(src, cv) {
    // Create mask for hexagon shape
    const mask = new cv.Mat(src.rows, src.cols, cv.CV_8UC1, new cv.Scalar(0));
    
    // Define hexagon points
    const center = { x: src.cols / 2, y: src.rows / 2 };
    const radius = Math.min(src.cols, src.rows) / 2 - 5;
    const hexPoints = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      hexPoints.push(new cv.Point(
        center.x + radius * Math.cos(angle),
        center.y + radius * Math.sin(angle)
      ));
    }
    
    // Fill hexagon mask
    const pts = cv.matFromArray(6, 1, cv.CV_32SC2, 
      hexPoints.flatMap(p => [p.x, p.y]));
    const ptsVector = new cv.MatVector();
    ptsVector.push_back(pts);
    
    cv.fillPoly(mask, ptsVector, new cv.Scalar(255));
    
    // Apply mask
    const result = new cv.Mat();
    src.copyTo(result, mask);
    
    // Clean up
    mask.delete();
    pts.delete();
    ptsVector.delete();
    
    return result;
  }

  centerAndResize(src, cv) {
    // Find bounding box of non-zero pixels
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    
    const points = new cv.Mat();
    cv.findNonZero(gray, points);
    
    if (points.rows === 0) {
      gray.delete();
      points.delete();
      return src.clone();
    }
    
    const rect = cv.boundingRect(points);
    
    // Extract ROI
    const roi = src.roi(rect);
    
    // Resize to target size
    const resized = new cv.Mat();
    const dsize = new cv.Size(this.targetSize.width, this.targetSize.height);
    cv.resize(roi, resized, dsize, 0, 0, cv.INTER_AREA);
    
    // Clean up
    gray.delete();
    points.delete();
    
    return resized;
  }

  normalizeColors(mat, cv) {
    // Convert to LAB color space
    const lab = new cv.Mat();
    cv.cvtColor(mat, lab, cv.COLOR_RGBA2RGB);
    cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);
    
    // Split channels
    const channels = new cv.MatVector();
    cv.split(lab, channels);
    
    // Normalize L channel (lightness)
    const L = channels.get(0);
    cv.normalize(L, L, 0, 255, cv.NORM_MINMAX);
    
    // Merge back
    cv.merge(channels, lab);
    
    // Convert back to RGBA
    cv.cvtColor(lab, mat, cv.COLOR_Lab2RGB);
    cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);
    
    // Clean up
    lab.delete();
    channels.delete();
  }

  calculateHash(canvas) {
    // Simple perceptual hash for quick comparison
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Resize to 8x8 for hash
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 8;
    smallCanvas.height = 8;
    const smallCtx = smallCanvas.getContext('2d');
    smallCtx.drawImage(canvas, 0, 0, 8, 8);
    
    const smallData = smallCtx.getImageData(0, 0, 8, 8).data;
    
    // Calculate average
    let avg = 0;
    for (let i = 0; i < smallData.length; i += 4) {
      avg += smallData[i]; // Use red channel
    }
    avg /= 64;
    
    // Generate hash
    let hash = '';
    for (let i = 0; i < smallData.length; i += 4) {
      hash += smallData[i] > avg ? '1' : '0';
    }
    
    return hash;
  }

  matToCanvas(mat, cv) {
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, mat);
    return canvas;
  }
}
```

## Complete Pipeline Integration

### Pipeline Manager
```javascript
// image-processing-pipeline.js
import { ImageLoader } from './image-loader.js';
import { AutoCropper } from './auto-cropper.js';
import { ImagePreprocessor } from './image-preprocessor.js';
import { HexagonDetector } from './hexagon-detector.js';
import { HexagonNormalizer } from './hexagon-normalizer.js';

export class ImageProcessingPipeline {
  constructor(cv) {
    this.cv = cv;
    this.loader = new ImageLoader();
    this.cropper = new AutoCropper();
    this.preprocessor = new ImagePreprocessor();
    this.detector = new HexagonDetector();
    this.normalizer = new HexagonNormalizer();
  }

  async process(file, progressCallback) {
    try {
      // Stage 1: Load image
      progressCallback?.({ stage: 'loading', progress: 0 });
      const canvas = await this.loader.loadFromFile(file);
      
      // Stage 2: Auto-crop
      progressCallback?.({ stage: 'cropping', progress: 20 });
      const cropRegion = await this.cropper.detectUpgradeArea(canvas, this.cv);
      const cropped = this.cropper.applyCrop(canvas, cropRegion);
      
      // Stage 3: Preprocess
      progressCallback?.({ stage: 'preprocessing', progress: 40 });
      const preprocessed = this.preprocessor.preprocess(cropped, this.cv);
      
      // Stage 4: Detect hexagons
      progressCallback?.({ stage: 'detecting', progress: 60 });
      const hexagons = this.detector.detectHexagons(preprocessed, this.cv);
      
      // Stage 5: Normalize hexagons
      progressCallback?.({ stage: 'normalizing', progress: 80 });
      const normalized = this.normalizer.normalizeHexagons(hexagons, this.cv);
      
      progressCallback?.({ stage: 'complete', progress: 100 });
      
      return {
        originalCanvas: canvas,
        croppedCanvas: cropped,
        preprocessedCanvas: preprocessed,
        hexagons: normalized,
        metadata: {
          originalSize: { width: canvas.width, height: canvas.height },
          cropRegion,
          hexagonCount: normalized.length
        }
      };
    } catch (error) {
      progressCallback?.({ stage: 'error', error: error.message });
      throw error;
    }
  }
}
```

## Usage Example

```javascript
// Initialize OpenCV and pipeline
const cv = await loadOpenCV();
const pipeline = new ImageProcessingPipeline(cv);

// Process image
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  try {
    const result = await pipeline.process(file, (progress) => {
      console.log(`Processing ${progress.stage}: ${progress.progress}%`);
    });
    
    console.log(`Detected ${result.hexagons.length} hexagons`);
    
    // Pass to recognition engine
    recognitionEngine.recognize(result.hexagons);
  } catch (error) {
    console.error('Processing failed:', error);
  }
});
```

## Performance Optimization Tips

1. **Use Web Workers** for heavy processing
2. **Process in chunks** to maintain UI responsiveness
3. **Cache preprocessing results** using image hashes
4. **Downscale large images** before processing
5. **Use SIMD-enabled OpenCV.js** build

## Next Steps

With processed and normalized hexagon images, proceed to:
- Implement the recognition engine (see `05-recognition-engine.md`)
- Build the template matching system
- Create confidence scoring algorithms