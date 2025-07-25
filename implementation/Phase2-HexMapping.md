# Phase 2: Hex Grid Mapping & Coordinate System

**Duration:** 3-4 days  
**Dependencies:** Phase 1 (File upload and validation)  
**Output:** Coordinate mapping system that translates screenshot pixels to mod positions

## 📋 Table of Contents
1. [Overview](#overview)
2. [Mathematical Foundation](#mathematical-foundation)
3. [Implementation Sub-Steps](#implementation-sub-steps)
4. [Library Analysis](#library-analysis)
5. [Code Implementation](#code-implementation)
6. [Calibration Process](#calibration-process)
7. [Testing Requirements](#testing-requirements)
8. [Risk Assessment](#risk-assessment)

---

## Overview

This phase creates a robust coordinate mapping system that translates pixel coordinates in uploaded screenshots to specific mod positions in the Nova Drift cheatsheet. The system must handle various screenshot resolutions, UI scaling factors, and potential layout variations.

### Success Criteria
- ✅ Accurate mapping of screenshot coordinates to mod positions (>95% accuracy)
- ✅ Support for common screenshot resolutions (1920x1080, 2560x1440, 3840x2160)
- ✅ Automatic scaling detection and compensation
- ✅ Robust calibration system for layout changes
- ✅ Integration with existing mod data structure

### Input from Phase 1
```javascript
// Event received from Phase 1
{
  type: 'screenshot-ready',
  detail: {
    file: File,              // Validated image file
    dimensions: { width: number, height: number },
    metadata: { size: number, type: string, lastModified: number }
  }
}
```

### Output for Phase 3
```javascript
// Data structure for Phase 3
{
  type: 'grid-mapped',
  detail: {
    imageElement: HTMLImageElement,    // Loaded image
    coordinateMap: Map<string, CoordinateData>,  // Mod name to pixel coordinates
    scalingFactor: number,             // Detected UI scale
    referenceData: ReferenceMetadata,  // Calibration information
    boundingBox: Rectangle             // Detected mod grid boundaries
  }
}
```

---

## Mathematical Foundation

### Hex Grid Coordinate Systems

The Nova Drift mod grid uses a hexagonal layout. We need to handle three coordinate systems:

1. **Axial Coordinates** (q, r) - Mathematical hex grid representation
2. **Pixel Coordinates** (x, y) - Screen position in screenshot
3. **CSS Coordinates** (x, y) - Position in web interface

#### Coordinate Conversion Formulas

```javascript
// Axial to Pixel conversion
function axialToPixel(q, r, hexSize) {
  const x = hexSize * (3/2 * q);
  const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x, y };
}

// Pixel to Axial conversion
function pixelToAxial(x, y, hexSize) {
  const q = (2/3 * x) / hexSize;
  const r = (-1/3 * x + Math.sqrt(3)/3 * y) / hexSize;
  return { q: Math.round(q), r: Math.round(r) };
}

// Axial to Offset (for easier array indexing)
function axialToOffset(q, r) {
  const col = q;
  const row = r + (q - (q & 1)) / 2;
  return { col, row };
}
```

### Scaling Factor Detection

Screenshots may be taken at different UI scales. We need to detect and compensate:

```javascript
// Detect scaling based on known reference elements
function detectScalingFactor(screenshot, referenceData) {
  const knownElementSize = referenceData.hexDiameter; // Known size: 48px
  const detectedSize = measureHexInScreenshot(screenshot);
  return detectedSize / knownElementSize;
}
```

---

## Implementation Sub-Steps

### 2.1 Reference Data Generation

**Input:** Clean reference screenshots and existing mod data  
**Output:** JSON mapping file with coordinate data  
**Files Created:** `implementation/assets/hex-positions.json`, `docs/modules/reference-generator.js`

#### Decision Points
- **Reference Resolution:** Use 1920x1080 as baseline vs. multiple resolutions
  - **Chosen:** Single baseline with scaling factor calculation
- **Coordinate System:** Store as axial coordinates vs. direct pixel coordinates
  - **Chosen:** Store both for flexibility and verification

#### Implementation Steps
1. **Create reference screenshot** at baseline resolution (1920x1080, 100% UI scale)
2. **Manual coordinate marking** for key mods to establish grid pattern
3. **Algorithmic generation** of remaining coordinates using hex grid math
4. **Validation and refinement** using secondary reference images

#### Reference Data Structure
```javascript
// hex-positions.json structure
{
  "metadata": {
    "version": "1.0",
    "baselineResolution": { "width": 1920, "height": 1080 },
    "uiScale": 1.0,
    "hexDiameter": 48,
    "gridCenter": { "x": 960, "y": 540 },
    "generatedAt": "2025-01-20T00:00:00Z"
  },
  "positions": {
    "Amp": {
      "axial": { "q": 0, "r": -2 },
      "pixel": { "x": 960, "y": 456 },
      "css": { "x": 960, "y": 456 },
      "modData": {
        "className": "Amp",
        "displayName": "Amplifier",
        "category": "weapon"
      }
    }
    // ... more mod positions
  },
  "gridLayout": {
    "center": { "q": 0, "r": 0 },
    "radius": 5,
    "totalPositions": 61
  }
}
```

---

### 2.2 Screenshot Analysis & Scale Detection

**Input:** Image element from Phase 1  
**Output:** Detected scale factor and grid boundaries  
**Files Created:** `docs/modules/scale-detector.js`

#### Scale Detection Algorithm
```javascript
class ScaleDetector {
  constructor(referenceData) {
    this.reference = referenceData;
    this.detectionMethods = [
      this.detectByHexSize.bind(this),
      this.detectByGridSpacing.bind(this),
      this.detectByUIElements.bind(this)
    ];
  }
  
  async detectScale(imageElement) {
    const results = [];
    
    for (const method of this.detectionMethods) {
      try {
        const result = await method(imageElement);
        if (result.confidence > 0.7) {
          results.push(result);
        }
      } catch (error) {
        console.warn(`Scale detection method failed:`, error);
      }
    }
    
    return this.consolidateResults(results);
  }
  
  async detectByHexSize(imageElement) {
    // Analyze hex sprite dimensions in screenshot
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);
    
    // Find hex boundaries using edge detection
    const hexBounds = await this.findHexBoundaries(ctx);
    const detectedSize = Math.max(hexBounds.width, hexBounds.height);
    const scaleFactor = detectedSize / this.reference.metadata.hexDiameter;
    
    return {
      method: 'hexSize',
      scaleFactor,
      confidence: this.calculateConfidence(detectedSize, hexBounds),
      bounds: hexBounds
    };
  }
}
```

#### Grid Boundary Detection
```javascript
// Detect the mod grid area within the screenshot
async function detectGridBoundaries(imageElement, scaleFactor) {
  const expectedCenter = {
    x: imageElement.width / 2,
    y: imageElement.height / 2
  };
  
  const expectedRadius = 5 * 48 * scaleFactor; // 5 hex radius * scaled size
  
  return {
    center: expectedCenter,
    radius: expectedRadius,
    boundingBox: {
      x: expectedCenter.x - expectedRadius,
      y: expectedCenter.y - expectedRadius,
      width: expectedRadius * 2,
      height: expectedRadius * 2
    }
  };
}
```

---

### 2.3 Coordinate Transformation Pipeline

**Input:** Reference coordinates and detected scale factor  
**Output:** Transformed coordinate map for current screenshot  
**Files Modified:** `docs/modules/hex-mapper.js`

#### Transformation Pipeline
```javascript
class CoordinateTransformer {
  constructor(referenceData) {
    this.reference = referenceData;
  }
  
  transformCoordinates(scaleFactor, offset = { x: 0, y: 0 }) {
    const transformedMap = new Map();
    
    for (const [modName, positionData] of Object.entries(this.reference.positions)) {
      const transformed = this.applyTransformation(
        positionData.pixel,
        scaleFactor,
        offset
      );
      
      transformedMap.set(modName, {
        ...positionData,
        transformedPixel: transformed,
        scaleFactor,
        offset
      });
    }
    
    return transformedMap;
  }
  
  applyTransformation(originalPixel, scaleFactor, offset) {
    return {
      x: (originalPixel.x * scaleFactor) + offset.x,
      y: (originalPixel.y * scaleFactor) + offset.y
    };
  }
  
  // Inverse transformation for validation
  reverseTransformation(transformedPixel, scaleFactor, offset) {
    return {
      x: (transformedPixel.x - offset.x) / scaleFactor,
      y: (transformedPixel.y - offset.y) / scaleFactor
    };
  }
}
```

#### Validation and Refinement
```javascript
// Validate transformation accuracy
async function validateTransformation(imageElement, coordinateMap) {
  const validationResults = [];
  
  // Sample a few known positions and verify they contain expected hex sprites
  const sampleMods = ['Amp', 'Bastion', 'Helix', 'Orbital', 'Charged'];
  
  for (const modName of sampleMods) {
    const coord = coordinateMap.get(modName);
    if (!coord) continue;
    
    const region = extractRegion(imageElement, coord.transformedPixel, 48);
    const isValidHex = await validateHexRegion(region);
    
    validationResults.push({
      modName,
      coordinate: coord.transformedPixel,
      isValid: isValidHex,
      confidence: isValidHex ? 1.0 : 0.0
    });
  }
  
  const averageConfidence = validationResults.reduce((sum, r) => sum + r.confidence, 0) / validationResults.length;
  
  return {
    isValid: averageConfidence > 0.8,
    confidence: averageConfidence,
    details: validationResults
  };
}
```

---

### 2.4 Integration with Existing Mod Data

**Input:** Coordinate map and existing CSV mod data  
**Output:** Enhanced coordinate map with mod metadata  
**Files Modified:** `docs/modules/mod-data-integration.js`

#### Data Integration Strategy
```javascript
class ModDataIntegrator {
  constructor() {
    this.modShorten = window.modShorten || {};
    this.modLongen = window.modLongen || {};
    this.modPrefab = window.modPrefab || {};
    this.modName = window.modName || {};
  }
  
  enhanceCoordinateMap(coordinateMap) {
    const enhancedMap = new Map();
    
    for (const [modName, coordData] of coordinateMap) {
      const enhancedData = {
        ...coordData,
        metadata: this.getModMetadata(modName),
        cssSelector: `.hex.${modName}`,
        elementQuery: `[data-hex-name="${modName}"]`
      };
      
      enhancedMap.set(modName, enhancedData);
    }
    
    return enhancedMap;
  }
  
  getModMetadata(modName) {
    return {
      shortName: this.modShorten[modName] || modName,
      longName: this.modLongen[modName] || modName,
      prefabName: this.modPrefab[modName] || '',
      displayName: this.getDisplayName(modName)
    };
  }
  
  getDisplayName(modName) {
    // Extract display name from existing DOM elements
    const element = document.querySelector(`[data-hex-name="${modName}"]`);
    return element?.title?.split('\n')[0] || modName;
  }
}
```

---

## Library Analysis

### Option 1: Honeycomb Grid Library (Recommended)
**Repository:** [flauwekeul/honeycomb](https://github.com/flauwekeul/honeycomb)  
**Bundle Size:** ~15KB minified  
**Documentation:** [Honeycomb Docs](https://honeycomb.flauwekeul.nl/)

**Pros:**
- Mature hex grid mathematics library
- Built-in coordinate system conversions
- Excellent documentation and examples
- TypeScript support
- Active maintenance

**Cons:**
- Additional dependency
- May be overkill for our coordinate mapping needs
- Learning curve for hex grid concepts

**Code Example:**
```javascript
import { defineHex, Grid } from 'honeycomb-grid';

// Define hex prototype
const Hex = defineHex({
  dimensions: 48,  // pixel size
  origin: 'topLeft'
});

// Create grid
const grid = new Grid(Hex, /* positions */);

// Convert coordinates
const hexAtPixel = grid.pointToHex({ x: 500, y: 300 });
const pixelCenter = hexAtPixel.toPoint();
```

### Option 2: Custom Mathematics Implementation
**Bundle Size:** ~2KB for coordinate functions  

**Pros:**
- No external dependencies
- Full control over coordinate system
- Minimal bundle size impact
- Custom optimizations possible

**Cons:**
- Need to implement hex grid math from scratch
- Higher chance of mathematical errors
- More testing required

**Code Example:**
```javascript
// Custom hex math implementation
class HexMath {
  static axialToPixel(q, r, size) {
    const x = size * (3/2 * q);
    const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  }
  
  static pixelToAxial(x, y, size) {
    const q = (2/3 * x) / size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
    return { q: Math.round(q), r: Math.round(r) };
  }
}
```

### Option 3: D3.js Hexbin
**Repository:** [d3/d3-hexbin](https://github.com/d3/d3-hexbin)  

**Pros:**
- Part of established D3 ecosystem
- Good for visualization and analysis
- Well-tested mathematics

**Cons:**
- Large bundle size (~30KB for D3 core)
- Designed for data visualization, not coordinate mapping
- Complex API for simple coordinate conversion

**Recommendation:** Use custom mathematics implementation for maximum control and minimal dependencies, with Honeycomb as fallback if coordinate math becomes complex.

---

## Code Implementation

### Core Hex Mapper Module

**File:** `docs/modules/hex-mapper.js`

```javascript
/**
 * Hex Grid Mapper
 * Handles coordinate mapping between screenshots and mod positions
 */
class HexGridMapper {
  constructor(referenceData) {
    this.reference = referenceData;
    this.scaleDetector = new ScaleDetector(referenceData);
    this.transformer = new CoordinateTransformer(referenceData);
    this.integrator = new ModDataIntegrator();
  }
  
  async processScreenshot(file) {
    try {
      // Load image
      const imageElement = await this.loadImage(file);
      
      // Detect scale and grid boundaries
      const scaleData = await this.scaleDetector.detectScale(imageElement);
      
      if (scaleData.confidence < 0.7) {
        throw new Error('Could not reliably detect screenshot scale');
      }
      
      // Transform coordinates
      const coordinateMap = this.transformer.transformCoordinates(
        scaleData.scaleFactor,
        scaleData.offset || { x: 0, y: 0 }
      );
      
      // Validate transformation
      const validation = await this.validateTransformation(imageElement, coordinateMap);
      
      if (!validation.isValid) {
        console.warn('Coordinate transformation validation failed:', validation);
      }
      
      // Enhance with mod metadata
      const enhancedMap = this.integrator.enhanceCoordinateMap(coordinateMap);
      
      // Emit event for Phase 3
      this.emitGridMappedEvent(imageElement, enhancedMap, scaleData);
      
    } catch (error) {
      this.handleMappingError(error);
    }
  }
  
  async loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }
  
  emitGridMappedEvent(imageElement, coordinateMap, scaleData) {
    const event = new CustomEvent('grid-mapped', {
      detail: {
        imageElement,
        coordinateMap,
        scalingFactor: scaleData.scaleFactor,
        referenceData: this.reference,
        boundingBox: scaleData.boundingBox,
        confidence: scaleData.confidence
      }
    });
    
    document.dispatchEvent(event);
  }
  
  handleMappingError(error) {
    console.error('Hex grid mapping failed:', error);
    
    const errorEvent = new CustomEvent('grid-mapping-error', {
      detail: {
        error: error.message,
        code: error.code || 'MAPPING_FAILED'
      }
    });
    
    document.dispatchEvent(errorEvent);
  }
}

// Custom hex mathematics (lightweight alternative to Honeycomb)
class HexMath {
  static hexSize = 48; // Base hex diameter in pixels
  
  static axialToPixel(q, r, size = this.hexSize) {
    const x = size * (3/2 * q);
    const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
    return { x, y };
  }
  
  static pixelToAxial(x, y, size = this.hexSize) {
    const q = (2/3 * x) / size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / size;
    return { q: Math.round(q), r: Math.round(r) };
  }
  
  static distance(hex1, hex2) {
    return (Math.abs(hex1.q - hex2.q) + 
            Math.abs(hex1.q + hex1.r - hex2.q - hex2.r) + 
            Math.abs(hex1.r - hex2.r)) / 2;
  }
  
  static neighbor(hex, direction) {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    const dir = directions[direction];
    return { q: hex.q + dir.q, r: hex.r + dir.r };
  }
}
```

### Reference Data Generator

**File:** `implementation/assets/reference-generator.js`

```javascript
/**
 * Reference Data Generator
 * Creates coordinate mapping data from reference screenshots
 */
class ReferenceDataGenerator {
  constructor() {
    this.knownMods = this.extractModListFromDOM();
    this.gridCenter = { x: 960, y: 540 }; // 1920x1080 center
    this.hexSize = 48;
  }
  
  extractModListFromDOM() {
    // Extract mod names from existing DOM
    const hexElements = document.querySelectorAll('.hex[data-hex-name]');
    return Array.from(hexElements).map(el => ({
      name: el.getAttribute('data-hex-name'),
      className: el.className.split(' ').find(c => c !== 'hex'),
      displayName: el.title?.split('\n')[0] || ''
    }));
  }
  
  generateCoordinateData() {
    const positions = {};
    
    // Define the hex grid layout based on visual analysis
    const gridLayout = this.defineGridLayout();
    
    for (const layout of gridLayout) {
      const modData = this.knownMods.find(m => m.name === layout.modName);
      if (!modData) continue;
      
      const pixelCoord = HexMath.axialToPixel(
        layout.axial.q, 
        layout.axial.r, 
        this.hexSize
      );
      
      positions[layout.modName] = {
        axial: layout.axial,
        pixel: {
          x: this.gridCenter.x + pixelCoord.x,
          y: this.gridCenter.y + pixelCoord.y
        },
        css: {
          x: this.gridCenter.x + pixelCoord.x,
          y: this.gridCenter.y + pixelCoord.y
        },
        modData: {
          className: modData.className,
          displayName: modData.displayName,
          category: this.inferCategory(modData.name)
        }
      };
    }
    
    return {
      metadata: {
        version: "1.0",
        baselineResolution: { width: 1920, height: 1080 },
        uiScale: 1.0,
        hexDiameter: this.hexSize,
        gridCenter: this.gridCenter,
        generatedAt: new Date().toISOString()
      },
      positions,
      gridLayout: {
        center: { q: 0, r: 0 },
        radius: 5,
        totalPositions: Object.keys(positions).length
      }
    };
  }
  
  defineGridLayout() {
    // Manual layout definition based on Nova Drift mod screen analysis
    // This would be created by analyzing reference screenshots
    return [
      { modName: 'Amp', axial: { q: 0, r: -2 } },
      { modName: 'Bastion', axial: { q: 1, r: -2 } },
      { modName: 'Helix', axial: { q: -1, r: -1 } },
      { modName: 'Orbital', axial: { q: 0, r: -1 } },
      { modName: 'Charged', axial: { q: 1, r: -1 } },
      // ... more positions would be defined here
      // This requires manual analysis of the actual Nova Drift mod screen
    ];
  }
  
  inferCategory(modName) {
    // Basic category inference based on mod names
    const weaponMods = ['Amp', 'Charged', 'Split', 'Torrent'];
    const bodyMods = ['Bastion', 'Stealth', 'Velocity'];
    const shieldMods = ['Reflect', 'Warp', 'Temporal'];
    
    if (weaponMods.includes(modName)) return 'weapon';
    if (bodyMods.includes(modName)) return 'body';
    if (shieldMods.includes(modName)) return 'shield';
    return 'upgrade';
  }
}
```

---

## Calibration Process

### 2.1 Initial Calibration Setup

**Prerequisites:**
- Clean reference screenshot at 1920x1080, 100% UI scale
- Nova Drift mod screen with no mods selected (clean state)
- All mod positions visible and unobstructed

**Steps:**
1. **Capture Reference Screenshot**
   ```bash
   # Guidelines for reference screenshot
   # - 1920x1080 resolution
   # - 100% browser zoom
   # - 100% Windows display scaling
   # - No browser UI visible (F11 fullscreen)
   # - Mod selection screen with no selections
   ```

2. **Manual Coordinate Marking**
   ```javascript
   // Use browser dev tools to mark coordinates
   const calibrationPoints = [
     { name: 'Amp', pixel: { x: 960, y: 456 } },      // Center top
     { name: 'Orbital', pixel: { x: 960, y: 540 } },   // Center
     { name: 'Bastion', pixel: { x: 1032, y: 498 } }, // Right of center
     // Mark 5-7 well-distributed points for initial calibration
   ];
   ```

3. **Grid Pattern Validation**
   ```javascript
   // Verify hex grid mathematics
   function validateGridPattern(calibrationPoints) {
     for (let i = 0; i < calibrationPoints.length - 1; i++) {
       for (let j = i + 1; j < calibrationPoints.length; j++) {
         const p1 = calibrationPoints[i];
         const p2 = calibrationPoints[j];
         const distance = Math.sqrt(
           Math.pow(p2.pixel.x - p1.pixel.x, 2) + 
           Math.pow(p2.pixel.y - p1.pixel.y, 2)
         );
         
         // Verify distance matches hex grid expectations
         console.log(`Distance ${p1.name} to ${p2.name}: ${distance}px`);
       }
     }
   }
   ```

### 2.2 Multi-Resolution Testing

**Test Resolutions:**
- 1366x768 (laptop standard)
- 1920x1080 (desktop standard)  
- 2560x1440 (high-DPI)
- 3840x2160 (4K)

**Scaling Factor Validation:**
```javascript
// Test scaling detection accuracy
const testCases = [
  { resolution: '1366x768', expectedScale: 0.711 },
  { resolution: '1920x1080', expectedScale: 1.0 },
  { resolution: '2560x1440', expectedScale: 1.333 },
  { resolution: '3840x2160', expectedScale: 2.0 }
];

async function validateScalingDetection(testCases) {
  for (const testCase of testCases) {
    const screenshot = await loadTestScreenshot(testCase.resolution);
    const detectedScale = await scaleDetector.detectScale(screenshot);
    
    const accuracy = Math.abs(detectedScale.scaleFactor - testCase.expectedScale);
    console.log(`${testCase.resolution}: Expected ${testCase.expectedScale}, Got ${detectedScale.scaleFactor}, Error: ${accuracy}`);
  }
}
```

### 2.3 Accuracy Benchmarking

**Benchmark Process:**
```javascript
// Measure coordinate mapping accuracy
async function benchmarkAccuracy(testScreenshots) {
  const results = [];
  
  for (const screenshot of testScreenshots) {
    const coordinateMap = await mapper.processScreenshot(screenshot.file);
    const accuracy = await validateCoordinateAccuracy(screenshot, coordinateMap);
    
    results.push({
      screenshot: screenshot.name,
      resolution: screenshot.resolution,
      accuracy: accuracy.percentage,
      errors: accuracy.errors
    });
  }
  
  return results;
}

// Target: >95% accuracy for high-quality screenshots
// Acceptable: >90% accuracy for compressed/lower quality images
```

---

## Testing Requirements

### 2.1 Unit Tests

**File:** `tests/unit/hex-mapper.test.js`

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { HexGridMapper, HexMath } from '../docs/modules/hex-mapper.js';

describe('HexMath', () => {
  it('should convert axial to pixel coordinates correctly', () => {
    const result = HexMath.axialToPixel(0, -1, 48);
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(-83.14, 1);
  });
  
  it('should convert pixel to axial coordinates correctly', () => {
    const result = HexMath.pixelToAxial(72, 41.57, 48);
    expect(result.q).toBe(1);
    expect(result.r).toBe(0);
  });
  
  it('should calculate hex distance correctly', () => {
    const hex1 = { q: 0, r: 0 };
    const hex2 = { q: 2, r: -1 };
    const distance = HexMath.distance(hex1, hex2);
    expect(distance).toBe(2);
  });
});

describe('HexGridMapper', () => {
  let mapper;
  let mockReferenceData;
  
  beforeEach(() => {
    mockReferenceData = createMockReferenceData();
    mapper = new HexGridMapper(mockReferenceData);
  });
  
  it('should load image from file correctly', async () => {
    const mockFile = createMockImageFile();
    const imageElement = await mapper.loadImage(mockFile);
    expect(imageElement).toBeInstanceOf(HTMLImageElement);
  });
  
  it('should detect scale factor within acceptable range', async () => {
    const mockImage = createMockImageElement(1920, 1080);
    const scaleData = await mapper.scaleDetector.detectScale(mockImage);
    expect(scaleData.scaleFactor).toBeGreaterThan(0.5);
    expect(scaleData.scaleFactor).toBeLessThan(3.0);
    expect(scaleData.confidence).toBeGreaterThan(0.7);
  });
});
```

### 2.2 Integration Tests

**File:** `tests/integration/coordinate-mapping.test.js`

```javascript
import { describe, it, expect } from 'vitest';

describe('Coordinate Mapping Integration', () => {
  it('should map coordinates end-to-end', async () => {
    // Test full pipeline from file upload to coordinate mapping
    const testFile = await loadTestScreenshot('1920x1080-clean.png');
    
    // Simulate Phase 1 output
    const uploadEvent = new CustomEvent('screenshot-ready', {
      detail: { file: testFile }
    });
    
    // Process through Phase 2
    const mapper = new HexGridMapper(referenceData);
    await mapper.processScreenshot(testFile);
    
    // Verify Phase 3 input event is emitted
    const gridMappedEvent = await waitForEvent('grid-mapped');
    expect(gridMappedEvent.detail.coordinateMap).toBeDefined();
    expect(gridMappedEvent.detail.scalingFactor).toBeGreaterThan(0);
  });
});
```

### 2.3 Performance Tests

```javascript
describe('Performance Benchmarks', () => {
  it('should process screenshots within time limits', async () => {
    const startTime = performance.now();
    
    const largeScreenshot = createTestScreenshot(3840, 2160);
    await mapper.processScreenshot(largeScreenshot);
    
    const processingTime = performance.now() - startTime;
    expect(processingTime).toBeLessThan(2000); // < 2 seconds
  });
  
  it('should maintain memory usage within limits', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    await mapper.processScreenshot(testScreenshot);
    
    const peakMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = peakMemory - initialMemory;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB
  });
});
```

---

## Risk Assessment

### High Risk Issues

#### Coordinate Drift Over Time
**Risk:** Game UI updates changing mod positions, breaking coordinate mapping  
**Likelihood:** Medium  
**Impact:** High  

**Mitigation:**
- Version-controlled reference data with game version tracking
- Automated validation against known good screenshots
- User reporting system for coordinate errors
- Multiple reference points for cross-validation

**Code Example:**
```javascript
// Version tracking system
const coordinateVersioning = {
  gameVersion: "2.1.4",
  coordinateVersion: "1.2.0",
  lastValidated: "2025-01-20",
  validationMethod: "automated",
  accuracyThreshold: 0.95
};

// Validation against multiple reference points
function validateCoordinateStability(newScreenshot) {
  const knownGoodPoints = ['Amp', 'Orbital', 'Bastion', 'Charged'];
  const validationResults = knownGoodPoints.map(modName => 
    validateSingleCoordinate(newScreenshot, modName)
  );
  
  const averageAccuracy = validationResults.reduce((sum, r) => sum + r.accuracy, 0) / validationResults.length;
  
  if (averageAccuracy < 0.90) {
    console.warn('Coordinate mapping may be outdated. Game UI might have changed.');
    return false;
  }
  
  return true;
}
```

#### Scale Detection Failure
**Risk:** Unable to detect correct scaling factor for unusual screenshots  
**Likelihood:** Medium  
**Impact:** High  

**Mitigation:**
- Multiple detection methods with fallbacks
- Manual scale override option
- Conservative confidence thresholds
- User feedback integration

```javascript
// Fallback scale detection
class RobustScaleDetector {
  async detectScale(imageElement) {
    const methods = [
      this.detectByHexSize,
      this.detectByGridSpacing,
      this.detectByUIElements,
      this.detectByImageSize
    ];
    
    for (const method of methods) {
      try {
        const result = await method(imageElement);
        if (result.confidence > 0.8) return result;
      } catch (error) {
        console.warn(`Scale detection method failed: ${method.name}`, error);
      }
    }
    
    // Fallback to image size ratio
    return this.fallbackScaleEstimation(imageElement);
  }
  
  fallbackScaleEstimation(imageElement) {
    const standardRatio = imageElement.width / 1920;
    return {
      method: 'fallback',
      scaleFactor: standardRatio,
      confidence: 0.6,
      warning: 'Using fallback scale detection'
    };
  }
}
```

### Medium Risk Issues

#### Reference Data Corruption
**Risk:** Reference coordinate data becomes corrupted or inaccurate  
**Mitigation:**
- Git version control for reference data
- Checksum validation
- Multiple reference screenshots for cross-validation

#### Performance Issues with Large Screenshots
**Risk:** 4K+ screenshots causing browser performance issues  
**Mitigation:**
- Image size limits and downscaling
- Progressive processing with Web Workers
- Memory usage monitoring

### Low Risk Issues

#### Browser Compatibility Edge Cases
**Risk:** Coordinate calculation differences between browsers  
**Mitigation:**
- Cross-browser testing
- Standardized canvas operations
- Fallback methods for edge cases

---

## Implementation Checklist

### Phase 2.1: Reference Data Generation
- [ ] Capture clean reference screenshot (1920x1080, 100% scale)
- [ ] Manually mark 10+ key mod positions
- [ ] Implement coordinate generation algorithm
- [ ] Validate hex grid mathematics
- [ ] Create reference data JSON file
- [ ] Test coordinate accuracy with sample screenshots
- [ ] Document calibration process

### Phase 2.2: Scale Detection
- [ ] Implement hex size detection method
- [ ] Add grid spacing analysis
- [ ] Create UI element detection fallback
- [ ] Test with multiple resolution screenshots
- [ ] Validate confidence scoring accuracy
- [ ] Add performance benchmarks
- [ ] Implement error handling and fallbacks

### Phase 2.3: Coordinate Transformation
- [ ] Build coordinate transformation pipeline
- [ ] Implement offset and scaling calculations
- [ ] Add transformation validation
- [ ] Test with edge case screenshots (cropped, skewed)
- [ ] Optimize for performance
- [ ] Add memory usage monitoring
- [ ] Create debugging and visualization tools

### Phase 2.4: Integration & Testing
- [ ] Integrate with Phase 1 event system
- [ ] Implement Phase 3 event emission
- [ ] Write comprehensive unit tests
- [ ] Create integration test suite
- [ ] Benchmark performance across resolutions
- [ ] Test accuracy with real screenshots
- [ ] Document API and data structures
- [ ] Create troubleshooting guide

---

## Phase 2 Outputs

### Data Outputs for Phase 3
```javascript
// Event payload for Phase 3
{
  type: 'grid-mapped',
  detail: {
    imageElement: HTMLImageElement,    // Loaded screenshot
    coordinateMap: Map<string, {       // Mod positions
      axial: { q: number, r: number },
      pixel: { x: number, y: number },
      transformedPixel: { x: number, y: number },
      modData: {
        className: string,
        displayName: string,
        category: string
      },
      metadata: {
        shortName: string,
        longName: string,
        prefabName: string
      }
    }>,
    scalingFactor: number,             // Detected UI scale
    referenceData: ReferenceData,      // Original reference
    boundingBox: {                     // Grid boundaries
      x: number, y: number,
      width: number, height: number
    },
    confidence: number                 // Mapping confidence (0-1)
  }
}
```

### Files Created/Modified
- ✅ `implementation/assets/hex-positions.json` - Reference coordinate data
- ✅ `docs/modules/hex-mapper.js` - Core mapping logic
- ✅ `docs/modules/scale-detector.js` - Scale detection algorithms
- ✅ `docs/modules/mod-data-integration.js` - Mod metadata integration
- ✅ `implementation/assets/reference-generator.js` - Calibration tools
- ✅ `tests/unit/hex-mapper.test.js` - Unit tests
- ✅ `tests/integration/coordinate-mapping.test.js` - Integration tests

### Integration Points for Phase 3
- **Event System:** `grid-mapped` event with coordinate data
- **Error Handling:** Consistent error reporting for mapping failures
- **Performance:** Optimized coordinate transformation for large images
- **Validation:** Confidence scoring for image processing decisions

---

**Next Phase:** [Phase 3: Image Processing & Region Extraction](Phase3-ImageProcessing.md)
