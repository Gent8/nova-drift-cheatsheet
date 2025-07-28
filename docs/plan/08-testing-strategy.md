# 08 - Testing Strategy

## Overview

This document outlines a comprehensive testing strategy for the Screenshot Import Assistant, covering unit tests, integration tests, visual regression tests, and performance benchmarks. The testing approach ensures reliability, accuracy, and maintainability.

## Testing Pyramid

```
                    Manual/E2E Tests
                  ┌─────────────────────┐
                  │  User Acceptance    │
                  │  Cross-browser      │
                  │  Performance        │
                  └─────────────────────┘
                           │
                Integration Tests
              ┌─────────────────────────────┐
              │  Component Integration      │
              │  API Contracts             │
              │  Data Flow                 │
              └─────────────────────────────┘
                           │
                   Unit Tests
          ┌───────────────────────────────────┐
          │  Individual Functions             │
          │  Class Methods                   │
          │  Utility Functions               │
          └───────────────────────────────────┘
```

## Test Environment Setup

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/docs/js/screenshot-import/$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  collectCoverageFrom: [
    'docs/js/screenshot-import/**/*.js',
    '!docs/js/screenshot-import/**/*.test.js',
    '!docs/js/screenshot-import/workers/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  testTimeout: 30000 // Extended for OpenCV operations
};
```

### Test Setup
```javascript
// tests/setup.js
import 'jest-canvas-mock';

// Mock OpenCV.js
global.cv = {
  imread: jest.fn(),
  imshow: jest.fn(),
  cvtColor: jest.fn(),
  matchTemplate: jest.fn(),
  minMaxLoc: jest.fn(),
  Mat: jest.fn(() => ({
    delete: jest.fn(),
    rows: 100,
    cols: 100,
    data: new Uint8Array(40000)
  })),
  COLOR_RGBA2GRAY: 7,
  TM_CCOEFF_NORMED: 3,
  NORM_MINMAX: 32
};

// Mock IndexedDB
require('fake-indexeddb/auto');

// Mock File API
global.File = class File extends Blob {
  constructor(fileBits, fileName, options = {}) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = Date.now();
    this.size = this.size || 0;
  }
};

// Mock FileReader
global.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onload = null;
    this.onerror = null;
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
};

// Mock Canvas
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(400),
    width: 10,
    height: 10
  })),
  putImageData: jest.fn(),
  clearRect: jest.fn()
}));

// Mock Image
global.Image = class Image {
  constructor() {
    this.src = '';
    this.onload = null;
    this.onerror = null;
    this.width = 100;
    this.height = 100;
  }
  
  set src(value) {
    this._src = value;
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  
  get src() {
    return this._src;
  }
};
```

## Unit Tests

### Image Processing Tests
```javascript
// tests/unit/image-processor.test.js
import { ImageLoader } from '@/image-loader.js';
import { AutoCropper } from '@/auto-cropper.js';
import { ImagePreprocessor } from '@/image-preprocessor.js';

describe('ImageLoader', () => {
  let loader;
  
  beforeEach(() => {
    loader = new ImageLoader();
  });
  
  test('validates file types correctly', () => {
    const validFile = new File([''], 'test.png', { type: 'image/png' });
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });
    
    expect(() => loader.validateFile(validFile)).not.toThrow();
    expect(() => loader.validateFile(invalidFile)).toThrow('Unsupported file format');
  });
  
  test('validates file size correctly', () => {
    const largeFile = new File([new ArrayBuffer(15 * 1024 * 1024)], 'large.png', { 
      type: 'image/png' 
    });
    
    expect(() => loader.validateFile(largeFile)).toThrow('File too large');
  });
  
  test('loads image to canvas', async () => {
    const file = new File(['mock image data'], 'test.png', { type: 'image/png' });
    const canvas = await loader.loadFromFile(file);
    
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });
  
  test('validates canvas dimensions', () => {
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 100;
    smallCanvas.height = 100;
    
    expect(() => loader.validateDimensions(smallCanvas)).toThrow('Image too small');
    
    const largeCanvas = document.createElement('canvas');
    largeCanvas.width = 5000;
    largeCanvas.height = 5000;
    
    expect(() => loader.validateDimensions(largeCanvas)).toThrow('Image too large');
  });
});

describe('AutoCropper', () => {
  let cropper;
  let mockCanvas;
  
  beforeEach(() => {
    cropper = new AutoCropper();
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
  });
  
  test('detects perfectly cropped images', async () => {
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = 600;
    smallCanvas.height = 800;
    
    global.cv.mean = jest.fn(() => [30]); // Dark background
    
    const region = await cropper.detectUpgradeArea(smallCanvas, global.cv);
    
    expect(region.x).toBe(0);
    expect(region.y).toBe(0);
    expect(region.width).toBe(600);
    expect(region.height).toBe(800);
  });
  
  test('applies crop correctly', () => {
    const region = { x: 100, y: 50, width: 300, height: 400 };
    const cropped = cropper.applyCrop(mockCanvas, region);
    
    expect(cropped.width).toBe(300);
    expect(cropped.height).toBe(400);
  });
});

describe('ImagePreprocessor', () => {
  let preprocessor;
  let mockCanvas;
  
  beforeEach(() => {
    preprocessor = new ImagePreprocessor();
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 100;
    mockCanvas.height = 100;
  });
  
  test('preprocesses image without errors', () => {
    global.cv.fastNlMeansDenoisingColored = jest.fn();
    global.cv.filter2D = jest.fn();
    global.cv.imshow = jest.fn();
    
    const processed = preprocessor.preprocess(mockCanvas, global.cv);
    
    expect(processed).toBeInstanceOf(HTMLCanvasElement);
    expect(global.cv.fastNlMeansDenoisingColored).toHaveBeenCalled();
  });
});
```

### Recognition Engine Tests
```javascript
// tests/unit/recognition-engine.test.js
import { TemplateManager } from '@/template-manager.js';
import { MatchingEngine } from '@/matching-engine.js';

describe('TemplateManager', () => {
  let templateManager;
  
  beforeEach(() => {
    templateManager = new TemplateManager();
    
    // Mock upgrade data
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve([
          { id: 'weapon1', name: 'Test Weapon', type: 'weapon' },
          { id: 'body1', name: 'Test Body', type: 'body' }
        ])
      })
    );
  });
  
  test('loads upgrade data', async () => {
    const data = await templateManager.loadUpgradeData();
    
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('weapon1');
  });
  
  test('calculates perceptual hash', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const hash = templateManager.calculatePerceptualHash(canvas);
    
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[01]+$/);
  });
  
  test('prepares template correctly', () => {
    const canvas = document.createElement('canvas');
    global.cv.ORB = jest.fn(() => ({
      detectAndCompute: jest.fn()
    }));
    global.cv.KeyPointVector = jest.fn(() => ({}));
    
    const templateData = templateManager.prepareTemplate(canvas, global.cv);
    
    expect(templateData).toHaveProperty('mat');
    expect(templateData).toHaveProperty('gray');
    expect(templateData).toHaveProperty('hash');
  });
});

describe('MatchingEngine', () => {
  let engine;
  let mockTemplateManager;
  
  beforeEach(() => {
    mockTemplateManager = {
      templates: new Map([
        ['weapon1', {
          gray: {},
          keypoints: { size: () => 10 },
          descriptors: { rows: 5 },
          hash: '1010101010101010'
        }]
      ]),
      templateMetadata: new Map([
        ['weapon1', { name: 'Test Weapon', type: 'weapon' }]
      ])
    };
    
    engine = new MatchingEngine(mockTemplateManager);
  });
  
  test('calculates hamming distance correctly', () => {
    const hash1 = '1010';
    const hash2 = '1100';
    
    const distance = engine.hammingDistance(hash1, hash2);
    
    expect(distance).toBe(1);
  });
  
  test('calculates confidence correctly', () => {
    const data = {
      scores: { template: 0.8, feature: 0.7, hash: 0.9 },
      weightedScore: 0.8
    };
    
    const confidence = engine.calculateConfidence(data);
    
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});
```

### Storage Tests
```javascript
// tests/unit/storage.test.js
import { StorageManager } from '@/storage/storage-manager.js';
import { SessionTracker } from '@/storage/session-tracker.js';

describe('StorageManager', () => {
  let storage;
  
  beforeEach(async () => {
    storage = new StorageManager();
    await storage.initialize();
  });
  
  afterEach(() => {
    // Clean up test database
    if (storage.db) {
      storage.db.close();
    }
  });
  
  test('initializes database correctly', () => {
    expect(storage.initialized).toBe(true);
    expect(storage.db).toBeDefined();
  });
  
  test('saves and retrieves corrections', async () => {
    const correction = {
      sessionId: 'test-session',
      imageHash: 'test-hash',
      originalUpgradeId: 'weapon1',
      correctedUpgradeId: 'weapon2',
      confidence: 0.75
    };
    
    const id = await storage.saveCorrection(correction);
    expect(id).toBeDefined();
    
    const corrections = await storage.getCorrections({ 
      imageHash: 'test-hash' 
    });
    
    expect(corrections).toHaveLength(1);
    expect(corrections[0].originalUpgradeId).toBe('weapon1');
  });
  
  test('saves performance metrics', async () => {
    const metric = {
      sessionId: 'test-session',
      phase: 'recognition',
      duration: 1500,
      hexagonCount: 25
    };
    
    const id = await storage.savePerformanceMetric(metric);
    expect(id).toBeDefined();
  });
});

describe('SessionTracker', () => {
  let tracker;
  let mockStorage;
  
  beforeEach(() => {
    mockStorage = {
      saveSession: jest.fn(),
      saveCorrection: jest.fn(),
      savePerformanceMetric: jest.fn()
    };
    
    tracker = new SessionTracker(mockStorage);
  });
  
  test('starts session correctly', () => {
    const imageInfo = {
      size: { width: 1920, height: 1080 },
      fileSize: 1024000,
      format: 'png'
    };
    
    const sessionId = tracker.startSession(imageInfo);
    
    expect(sessionId).toMatch(/^session_/);
    expect(tracker.currentSession).toBeDefined();
    expect(mockStorage.saveSession).toHaveBeenCalled();
  });
  
  test('records corrections', () => {
    tracker.startSession({ size: {}, fileSize: 0, format: 'png' });
    
    const correction = {
      originalUpgradeId: 'weapon1',
      correctedUpgradeId: 'weapon2'
    };
    
    tracker.recordCorrection(correction);
    
    expect(mockStorage.saveCorrection).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: tracker.currentSession.sessionId,
        ...correction
      })
    );
  });
});
```

## Integration Tests

### Pipeline Integration Tests
```javascript
// tests/integration/pipeline.test.js
import { ImageProcessingPipeline } from '@/image-processing-pipeline.js';

describe('Image Processing Pipeline Integration', () => {
  let pipeline;
  
  beforeEach(async () => {
    // Setup mock OpenCV
    pipeline = new ImageProcessingPipeline(global.cv);
  });
  
  test('processes complete workflow', async () => {
    const mockFile = new File(['mock image'], 'test.png', { type: 'image/png' });
    
    let progressCalls = [];
    const progressCallback = (progress) => {
      progressCalls.push(progress);
    };
    
    const result = await pipeline.process(mockFile, progressCallback);
    
    expect(result).toHaveProperty('originalCanvas');
    expect(result).toHaveProperty('croppedCanvas');
    expect(result).toHaveProperty('hexagons');
    expect(result.hexagons).toBeInstanceOf(Array);
    
    // Verify progress callbacks
    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[progressCalls.length - 1].stage).toBe('complete');
  });
  
  test('handles processing errors gracefully', async () => {
    // Mock an error in the pipeline
    global.cv.imread = jest.fn(() => {
      throw new Error('OpenCV processing failed');
    });
    
    const mockFile = new File([''], 'test.png', { type: 'image/png' });
    
    let errorCaught = false;
    const progressCallback = (progress) => {
      if (progress.stage === 'error') {
        errorCaught = true;
      }
    };
    
    await expect(pipeline.process(mockFile, progressCallback))
      .rejects.toThrow('OpenCV processing failed');
    
    expect(errorCaught).toBe(true);
  });
});
```

### UI Integration Tests
```javascript
// tests/integration/ui.test.js
import { UploadComponent } from '@/ui-components/upload-component.js';
import { ReviewModeUI } from '@/ui-components/review-mode.js';

describe('UI Component Integration', () => {
  let container;
  
  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  test('upload component integration', () => {
    let uploadedFile = null;
    
    const uploadComponent = new UploadComponent(container, {
      onFileSelected: (file) => {
        uploadedFile = file;
      }
    });
    
    uploadComponent.render();
    
    // Verify button is rendered
    const button = container.querySelector('.screenshot-upload-btn');
    expect(button).toBeDefined();
    
    // Simulate click
    button.click();
    
    // Verify modal appears
    const modal = document.querySelector('.upload-modal');
    expect(modal).toBeDefined();
  });
  
  test('review mode integration', () => {
    const cheatsheet = document.createElement('div');
    cheatsheet.innerHTML = `
      <input type="checkbox" data-upgrade-id="weapon1">
      <input type="checkbox" data-upgrade-id="body1">
    `;
    document.body.appendChild(cheatsheet);
    
    const reviewMode = new ReviewModeUI(cheatsheet);
    
    const matches = [
      {
        matched: true,
        upgradeId: 'weapon1',
        confidence: 0.95
      },
      {
        matched: true,
        upgradeId: 'body1',
        confidence: 0.75
      }
    ];
    
    reviewMode.enterReviewMode(matches);
    
    // Verify overlay is created
    const overlay = document.querySelector('.review-mode-overlay');
    expect(overlay).toBeDefined();
    
    // Verify checkboxes are checked
    const weaponCheckbox = cheatsheet.querySelector('[data-upgrade-id="weapon1"]');
    const bodyCheckbox = cheatsheet.querySelector('[data-upgrade-id="body1"]');
    
    expect(weaponCheckbox.checked).toBe(true);
    expect(bodyCheckbox.checked).toBe(true);
  });
});
```

## Visual Regression Tests

### Screenshot Comparison Tests
```javascript
// tests/visual/screenshot-tests.js
import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

describe('Visual Regression Tests', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('upload button renders correctly', async () => {
    await page.goto('http://localhost:8080/test.html');
    
    // Wait for component to load
    await page.waitForSelector('.screenshot-upload-btn');
    
    // Take screenshot
    const screenshot = await page.screenshot({
      clip: { x: 0, y: 0, width: 200, height: 50 }
    });
    
    // Compare with baseline
    await compareScreenshot('upload-button', screenshot);
  });
  
  test('upload modal renders correctly', async () => {
    await page.goto('http://localhost:8080/test.html');
    
    // Click upload button
    await page.click('.screenshot-upload-btn');
    
    // Wait for modal
    await page.waitForSelector('.upload-modal.active');
    
    // Take screenshot
    const screenshot = await page.screenshot();
    
    await compareScreenshot('upload-modal', screenshot);
  });
  
  test('review mode renders correctly', async () => {
    await page.goto('http://localhost:8080/test.html');
    
    // Simulate review mode state
    await page.evaluate(() => {
      window.testEnterReviewMode();
    });
    
    // Wait for review overlay
    await page.waitForSelector('.review-mode-overlay.active');
    
    const screenshot = await page.screenshot({
      clip: { x: 0, y: 0, width: 1920, height: 100 }
    });
    
    await compareScreenshot('review-mode', screenshot);
  });
});

async function compareScreenshot(name, screenshot) {
  const baselinePath = path.join(__dirname, 'baselines', `${name}.png`);
  const actualPath = path.join(__dirname, 'actual', `${name}.png`);
  const diffPath = path.join(__dirname, 'diff', `${name}.png`);
  
  // Ensure directories exist
  fs.mkdirSync(path.dirname(actualPath), { recursive: true });
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });
  
  // Save actual screenshot
  fs.writeFileSync(actualPath, screenshot);
  
  // If no baseline exists, create it
  if (!fs.existsSync(baselinePath)) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, screenshot);
    console.warn(`Created baseline for ${name}`);
    return;
  }
  
  // Compare images
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const actual = PNG.sync.read(screenshot);
  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  
  const numDiffPixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );
  
  // Save diff if there are differences
  if (numDiffPixels > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    
    const diffPercentage = (numDiffPixels / (width * height)) * 100;
    
    if (diffPercentage > 1) { // Allow 1% difference
      throw new Error(
        `Visual regression detected in ${name}: ${diffPercentage.toFixed(2)}% pixels differ`
      );
    }
  }
}
```

## Performance Tests

### Benchmark Tests
```javascript
// tests/performance/benchmarks.test.js
import { PerformanceTester } from './performance-tester.js';

describe('Performance Benchmarks', () => {
  let tester;
  
  beforeEach(() => {
    tester = new PerformanceTester();
  });
  
  test('image processing performance', async () => {
    const testSizes = [
      { width: 1920, height: 1080, name: 'Full HD' },
      { width: 2560, height: 1440, name: '1440p' },
      { width: 3840, height: 2160, name: '4K' }
    ];
    
    for (const size of testSizes) {
      const mockImage = tester.createMockImage(size.width, size.height);
      
      const startTime = performance.now();
      await tester.processImage(mockImage);
      const duration = performance.now() - startTime;
      
      console.log(`${size.name} processing: ${duration.toFixed(2)}ms`);
      
      // Performance thresholds
      if (size.name === 'Full HD') {
        expect(duration).toBeLessThan(5000); // 5 seconds
      } else if (size.name === '1440p') {
        expect(duration).toBeLessThan(8000); // 8 seconds
      } else if (size.name === '4K') {
        expect(duration).toBeLessThan(15000); // 15 seconds
      }
    }
  });
  
  test('template matching performance', async () => {
    const hexagonCount = [10, 25, 50];
    
    for (const count of hexagonCount) {
      const mockHexagons = tester.createMockHexagons(count);
      
      const startTime = performance.now();
      await tester.performTemplateMatching(mockHexagons);
      const duration = performance.now() - startTime;
      
      console.log(`${count} hexagons matching: ${duration.toFixed(2)}ms`);
      
      // Should scale linearly
      const expectedDuration = count * 100; // 100ms per hexagon
      expect(duration).toBeLessThan(expectedDuration);
    }
  });
  
  test('memory usage during processing', async () => {
    if (!performance.memory) {
      console.warn('Memory measurements not available');
      return;
    }
    
    const initialMemory = performance.memory.usedJSHeapSize;
    
    // Process multiple images
    for (let i = 0; i < 5; i++) {
      const mockImage = tester.createMockImage(1920, 1080);
      await tester.processImage(mockImage);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    
    // Should not increase by more than 100MB
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});

class PerformanceTester {
  createMockImage(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    
    // Fill with gradient to simulate realistic image
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    return canvas;
  }
  
  createMockHexagons(count) {
    const hexagons = [];
    
    for (let i = 0; i < count; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = `hsl(${i * 360 / count}, 50%, 50%)`;
      ctx.fillRect(0, 0, 64, 64);
      
      hexagons.push({
        normalizedCanvas: canvas,
        hash: this.generateRandomHash()
      });
    }
    
    return hexagons;
  }
  
  generateRandomHash() {
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += Math.random() > 0.5 ? '1' : '0';
    }
    return hash;
  }
  
  async processImage(canvas) {
    // Simulate image processing pipeline
    return new Promise(resolve => {
      setTimeout(() => {
        // Simulate CPU-intensive work
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
          sum += Math.random();
        }
        resolve(sum);
      }, 10);
    });
  }
  
  async performTemplateMatching(hexagons) {
    // Simulate template matching
    return new Promise(resolve => {
      setTimeout(() => {
        const results = hexagons.map(hex => ({
          upgradeId: `upgrade_${Math.floor(Math.random() * 100)}`,
          confidence: Math.random()
        }));
        resolve(results);
      }, hexagons.length * 10);
    });
  }
}
```

## End-to-End Tests

### User Workflow Tests
```javascript
// tests/e2e/user-workflows.test.js
import puppeteer from 'puppeteer';

describe('User Workflow E2E Tests', () => {
  let browser, page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: process.env.CI !== 'false',
      devtools: !process.env.CI
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('complete upload workflow', async () => {
    await page.goto('http://localhost:8080');
    
    // Upload screenshot
    await page.click('.screenshot-upload-btn');
    await page.waitForSelector('.upload-modal.active');
    
    // Simulate file upload
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('tests/fixtures/test-screenshot.png');
    
    // Wait for processing
    await page.waitForSelector('.progress-container.active');
    await page.waitForSelector('.review-mode-overlay.active', { timeout: 30000 });
    
    // Verify review mode
    const reviewStats = await page.$eval('.review-stats', el => el.textContent);
    expect(reviewStats).toContain('Total:');
    expect(reviewStats).toContain('Confident:');
    
    // Confirm build
    await page.click('#confirm-review');
    
    // Verify build is applied
    const checkedBoxes = await page.$$eval(
      'input[type="checkbox"]:checked',
      boxes => boxes.length
    );
    
    expect(checkedBoxes).toBeGreaterThan(0);
  });
  
  test('correction workflow', async () => {
    await page.goto('http://localhost:8080');
    
    // Simulate review mode with low confidence items
    await page.evaluate(() => {
      window.testEnterReviewModeWithCorrections();
    });
    
    await page.waitForSelector('.hexagon-confidence-low');
    
    // Click flagged hexagon
    await page.click('.hexagon-confidence-low');
    
    // Wait for correction modal
    await page.waitForSelector('.correction-modal.active');
    
    // Select different candidate
    await page.click('.candidate-item:nth-child(2)');
    
    // Confirm correction
    await page.click('#confirm-correction');
    
    // Verify correction was applied
    const correctionModal = await page.$('.correction-modal.active');
    expect(correctionModal).toBeNull();
  });
  
  test('error handling', async () => {
    await page.goto('http://localhost:8080');
    
    // Try to upload invalid file
    await page.click('.screenshot-upload-btn');
    
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile('tests/fixtures/invalid-file.txt');
    
    // Should show error message
    await page.waitForFunction(() => {
      return window.alert.toString().includes('PNG or JPEG');
    });
  });
});
```

## Test Data and Fixtures

### Test Image Generator
```javascript
// tests/fixtures/image-generator.js
export class TestImageGenerator {
  static generateScreenshot(type = 'fullscreen', hexagonCount = 25) {
    const canvas = document.createElement('canvas');
    
    if (type === 'fullscreen') {
      canvas.width = 1920;
      canvas.height = 1080;
    } else {
      canvas.width = 600;
      canvas.height = 800;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw upgrade panel area
    const panelWidth = type === 'fullscreen' ? 400 : canvas.width;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, panelWidth, canvas.height);
    
    // Draw hexagons
    this.drawHexagons(ctx, hexagonCount, type === 'fullscreen' ? 200 : 100);
    
    return canvas;
  }
  
  static drawHexagons(ctx, count, centerX) {
    const hexSize = 30;
    const spacing = 70;
    const startY = 100;
    
    // Core upgrades (top 3)
    for (let i = 0; i < 3; i++) {
      this.drawHexagon(ctx, centerX, startY + i * spacing, hexSize, `hsl(${i * 120}, 70%, 50%)`);
    }
    
    // Mod group hexagons
    let x = centerX - 100;
    let y = startY + 200;
    let cols = 3;
    
    for (let i = 3; i < count; i++) {
      const col = (i - 3) % cols;
      const row = Math.floor((i - 3) / cols);
      
      const hexX = x + col * spacing;
      const hexY = y + row * spacing;
      
      this.drawHexagon(ctx, hexX, hexY, hexSize, `hsl(${i * 20}, 60%, 60%)`);
    }
  }
  
  static drawHexagon(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    
    // Draw hexagon shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hx = size * Math.cos(angle);
      const hy = size * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hx, hy);
      } else {
        ctx.lineTo(hx, hy);
      }
    }
    ctx.closePath();
    
    // Fill
    ctx.fillStyle = color;
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }
  
  static async canvasToFile(canvas, filename = 'test-screenshot.png') {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        const file = new File([blob], filename, { type: 'image/png' });
        resolve(file);
      });
    });
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Screenshot Import Assistant

on:
  push:
    branches: [ main, feature/* ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run performance tests
      run: npm run test:performance
    
    - name: Generate coverage report
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
    
    - name: Run E2E tests
      run: |
        npm run build
        npm run test:e2e
    
    - name: Visual regression tests
      run: npm run test:visual
      
    - name: Upload visual diff artifacts
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: visual-diffs
        path: tests/visual/diff/
```

### Test Scripts
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "jest --testPathPattern=tests/e2e",
    "test:performance": "jest --testPathPattern=tests/performance",
    "test:visual": "jest --testPathPattern=tests/visual",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

## Quality Gates

### Coverage Requirements
- **Unit Tests**: 85% line coverage minimum
- **Integration Tests**: All major workflows covered
- **E2E Tests**: Critical user paths tested

### Performance Requirements
- **Processing Time**: <20 seconds for typical screenshots
- **Memory Usage**: <100MB increase during processing
- **Bundle Size**: <2MB total JavaScript

### Accessibility Requirements
- **Keyboard Navigation**: All interactions accessible
- **Screen Reader**: Proper ARIA labels
- **Color Contrast**: WCAG AA compliance

## Monitoring and Alerts

### Test Result Monitoring
```javascript
// tests/monitoring/test-monitor.js
export class TestMonitor {
  static reportResults(results) {
    const summary = {
      timestamp: new Date().toISOString(),
      total: results.numTotalTests,
      passed: results.numPassedTests,
      failed: results.numFailedTests,
      coverage: results.coverageMap?.getCoverageSummary()
    };
    
    // Send to monitoring service
    if (process.env.TEST_WEBHOOK_URL) {
      fetch(process.env.TEST_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary)
      });
    }
    
    console.log('Test Summary:', summary);
  }
}
```

## Next Steps

With comprehensive testing in place, proceed to:
- Finalize deployment procedures (see `09-deployment.md`)
- Set up production monitoring
- Plan rollout strategy