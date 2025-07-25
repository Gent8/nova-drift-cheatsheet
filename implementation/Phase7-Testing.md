# Phase 7: Testing & Calibration

**Duration:** 4-5 days  
**Dependencies:** Phases 1-6 (Complete implementation)  
**Output:** Comprehensive test suite, performance benchmarks, and calibrated recognition thresholds

## 📋 Table of Contents
1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Implementation Sub-Steps](#implementation-sub-steps)
4. [Test Suite Development](#test-suite-development)
5. [Calibration Procedures](#calibration-procedures)
6. [Performance Benchmarking](#performance-benchmarking)
7. [Automation Setup](#automation-setup)
8. [Quality Assurance](#quality-assurance)

---

## Overview

This phase establishes a comprehensive testing framework to ensure the screenshot recognition system meets accuracy, performance, and reliability requirements. It includes unit tests, integration tests, performance benchmarks, and calibration procedures for optimal recognition accuracy.

### Success Criteria
- ✅ >95% test coverage across all modules
- ✅ >90% recognition accuracy on validation dataset
- ✅ <2s processing time for 1920x1080 images
- ✅ Automated test suite with CI/CD integration
- ✅ Calibrated thresholds for optimal performance
- ✅ Performance benchmarks and monitoring

---

## Testing Strategy

### Test Pyramid Structure
```
    /\     E2E Tests (5%)
   /  \    - Full workflow validation
  /____\   - Cross-browser testing
 /      \  
/__________\ Integration Tests (25%)
/            \ - Module interactions
/              \ - API contract testing
/________________\
     Unit Tests (70%)
   - Individual functions
   - Edge case coverage
   - Mock dependencies
```

### Test Categories
| Category | Coverage | Tools | Automation |
|----------|----------|-------|------------|
| Unit Tests | 70% | Vitest, JSDoc | CI on every commit |
| Integration | 25% | Vitest, Playwright | CI on PR |
| E2E Tests | 5% | Playwright, Real browsers | Nightly + Release |
| Performance | Continuous | Custom benchmarks | CI + Monitoring |
| Accessibility | 100% | axe-core, WAVE | CI on UI changes |

---

## Implementation Sub-Steps

### 7.1 Test Environment Setup

**Duration:** 0.5 days  
**Responsible:** Lead developer  
**Files:** `implementation/tests/`, `package.json`, `vitest.config.js`

#### 7.1.1 Testing Dependencies Installation
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/dom": "^9.3.0",
    "@testing-library/user-event": "^14.0.0",
    "playwright": "^1.40.0",
    "jsdom": "^23.0.0",
    "canvas": "^2.11.0",
    "@axe-core/playwright": "^4.8.0",
    "benchmark": "^2.1.4"
  }
}
```

#### 7.1.2 Vitest Configuration
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      '@modules': resolve(__dirname, 'docs/modules'),
      '@tests': resolve(__dirname, 'implementation/tests')
    }
  }
});
```

#### 7.1.3 Test Environment Setup
```javascript
// tests/setup.js
import { vi } from 'vitest';
import 'canvas';

// Mock browser APIs not available in jsdom
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}));

// Mock File API
global.File = class extends Blob {
  constructor(fileBits, fileName, options) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = Date.now();
  }
};

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === '2d') {
    return {
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: vi.fn(),
      // ... other canvas methods
    };
  }
});
```

#### Deliverables:
- [ ] Vitest configuration with coverage reporting
- [ ] Playwright setup for E2E testing
- [ ] Test environment with proper mocks
- [ ] CI/CD pipeline integration
- [ ] Coverage reporting dashboard

### 7.2 Unit Test Development

**Duration:** 2 days  
**Responsible:** All developers  
**Files:** `implementation/tests/unit/`

#### 7.2.1 Upload Handler Tests
```javascript
// tests/unit/upload-handler.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UploadHandler } from '@modules/upload-handler.js';

describe('UploadHandler', () => {
  let uploadHandler;
  let mockFileInput;

  beforeEach(() => {
    uploadHandler = new UploadHandler();
    mockFileInput = document.createElement('input');
    mockFileInput.type = 'file';
  });

  describe('file validation', () => {
    it('should accept valid PNG files', () => {
      const validFile = new File(['test'], 'test.png', { type: 'image/png' });
      expect(uploadHandler.validateFile(validFile)).toBe(true);
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { 
        type: 'image/png' 
      });
      expect(uploadHandler.validateFile(largeFile)).toBe(false);
    });

    it('should reject unsupported file types', () => {
      const invalidFile = new File(['test'], 'test.gif', { type: 'image/gif' });
      expect(uploadHandler.validateFile(invalidFile)).toBe(false);
    });

    it('should validate file dimensions', async () => {
      const mockImage = {
        width: 1920,
        height: 1080,
        onload: null,
        onerror: null
      };
      
      vi.spyOn(window, 'Image').mockImplementation(() => mockImage);
      
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const result = uploadHandler.validateDimensions(file);
      
      // Simulate image load
      mockImage.onload();
      
      await expect(result).resolves.toBe(true);
    });
  });

  describe('drag and drop', () => {
    it('should handle dragover events', () => {
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: { effectAllowed: 'copy' }
      };

      uploadHandler.handleDragOver(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should handle drop events with valid files', () => {
      const validFile = new File(['test'], 'test.png', { type: 'image/png' });
      const mockEvent = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        dataTransfer: {
          files: [validFile]
        }
      };

      const processFileSpy = vi.spyOn(uploadHandler, 'processFile');
      uploadHandler.handleDrop(mockEvent);
      
      expect(processFileSpy).toHaveBeenCalledWith(validFile);
    });
  });

  describe('error handling', () => {
    it('should emit error events for invalid files', () => {
      const errorSpy = vi.fn();
      uploadHandler.on('error', errorSpy);
      
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      uploadHandler.processFile(invalidFile);
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'invalid_file_type',
          message: expect.stringContaining('file type')
        })
      );
    });
  });
});
```

#### 7.2.2 Recognition Engine Tests
```javascript
// tests/unit/recognition-engine.test.js
import { describe, it, expect, vi } from 'vitest';
import { RecognitionEngine } from '@modules/recognition-engine.js';

describe('RecognitionEngine', () => {
  let engine;
  let mockImageData;

  beforeEach(() => {
    engine = new RecognitionEngine();
    mockImageData = {
      data: new Uint8ClampedArray(4 * 100 * 100), // 100x100 image
      width: 100,
      height: 100
    };
  });

  describe('selection detection', () => {
    it('should detect selected hex positions', () => {
      // Mock selected hex (bright pixels)
      const selectedRegion = engine.extractHexRegion(mockImageData, { x: 50, y: 50 });
      selectedRegion.data.fill(255); // Bright white
      
      const isSelected = engine.analyzeSelection(selectedRegion);
      expect(isSelected.confidence).toBeGreaterThan(0.8);
      expect(isSelected.selected).toBe(true);
    });

    it('should detect unselected hex positions', () => {
      // Mock unselected hex (dark pixels)
      const unselectedRegion = engine.extractHexRegion(mockImageData, { x: 25, y: 25 });
      unselectedRegion.data.fill(50); // Dark gray
      
      const isSelected = engine.analyzeSelection(unselectedRegion);
      expect(isSelected.confidence).toBeGreaterThan(0.8);
      expect(isSelected.selected).toBe(false);
    });

    it('should handle ambiguous selections', () => {
      // Mock partially selected hex
      const ambiguousRegion = engine.extractHexRegion(mockImageData, { x: 75, y: 75 });
      // Fill with mixed brightness
      for (let i = 0; i < ambiguousRegion.data.length; i += 4) {
        ambiguousRegion.data[i] = 128; // Medium gray
        ambiguousRegion.data[i + 1] = 128;
        ambiguousRegion.data[i + 2] = 128;
        ambiguousRegion.data[i + 3] = 255;
      }
      
      const result = engine.analyzeSelection(ambiguousRegion);
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.selected).toBe(null); // Ambiguous
    });
  });

  describe('confidence scoring', () => {
    it('should calculate confidence based on pixel consistency', () => {
      const consistentData = new Uint8ClampedArray(400);
      consistentData.fill(255); // All bright pixels
      
      const confidence = engine.calculateConfidence(consistentData);
      expect(confidence).toBeGreaterThan(0.9);
    });

    it('should lower confidence for inconsistent pixels', () => {
      const inconsistentData = new Uint8ClampedArray(400);
      // Alternating bright and dark pixels
      for (let i = 0; i < inconsistentData.length; i += 8) {
        inconsistentData[i] = 255; // Bright
        inconsistentData[i + 4] = 50; // Dark
      }
      
      const confidence = engine.calculateConfidence(inconsistentData);
      expect(confidence).toBeLessThan(0.6);
    });
  });

  describe('threshold adaptation', () => {
    it('should adapt thresholds based on image characteristics', () => {
      const darkImage = { averageBrightness: 30, contrast: 0.5 };
      const adaptedThresholds = engine.adaptThresholds(darkImage);
      
      expect(adaptedThresholds.selectionThreshold).toBeLessThan(
        engine.defaultThresholds.selectionThreshold
      );
    });

    it('should maintain thresholds for normal images', () => {
      const normalImage = { averageBrightness: 128, contrast: 0.8 };
      const adaptedThresholds = engine.adaptThresholds(normalImage);
      
      expect(adaptedThresholds.selectionThreshold).toBeCloseTo(
        engine.defaultThresholds.selectionThreshold,
        1
      );
    });
  });
});
```

#### 7.2.3 Additional Unit Tests
```javascript
// tests/unit/hex-mapper.test.js - Hex grid coordinate tests
// tests/unit/image-processor.test.js - Canvas manipulation tests
// tests/unit/results-display.test.js - UI component tests
// tests/unit/integration-layer.test.js - System integration tests
```

#### Deliverables:
- [ ] 100% function coverage for all modules
- [ ] Edge case testing for all inputs
- [ ] Mock-based testing for external dependencies
- [ ] Performance regression tests
- [ ] Error condition testing

### 7.3 Integration Test Development

**Duration:** 1 day  
**Responsible:** Lead developer + QA engineer  
**Files:** `implementation/tests/integration/`

#### 7.3.1 Full Pipeline Integration Test
```javascript
// tests/integration/recognition-pipeline.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RecognitionPipeline } from '@modules/recognition-pipeline.js';

describe('Recognition Pipeline Integration', () => {
  let pipeline;
  let testImages;

  beforeAll(async () => {
    pipeline = new RecognitionPipeline();
    testImages = await loadTestImages();
  });

  it('should process complete upload-to-result workflow', async () => {
    const testImage = testImages.validScreenshot;
    
    // Step 1: Upload and validate
    const uploadResult = await pipeline.processUpload(testImage);
    expect(uploadResult.success).toBe(true);
    
    // Step 2: Map hex coordinates
    const mappingResult = await pipeline.mapHexGrid(uploadResult.imageData);
    expect(mappingResult.hexPositions).toHaveLength(91); // Expected hex count
    
    // Step 3: Extract regions
    const regions = await pipeline.extractRegions(mappingResult);
    expect(regions).toHaveLength(91);
    
    // Step 4: Analyze selections
    const recognitionResults = await pipeline.analyzeSelections(regions);
    expect(recognitionResults.selections).toBeInstanceOf(Array);
    expect(recognitionResults.confidence).toBeGreaterThan(0.8);
    
    // Step 5: Apply to cheatsheet
    const applicationResult = await pipeline.applySelections(recognitionResults);
    expect(applicationResult.success).toBe(true);
  }, 10000); // 10 second timeout for full pipeline

  it('should handle pipeline errors gracefully', async () => {
    const invalidImage = new File(['invalid'], 'test.txt', { type: 'text/plain' });
    
    const result = await pipeline.processUpload(invalidImage);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error.type).toBe('invalid_file_type');
  });

  it('should maintain state consistency across steps', async () => {
    const testImage = testImages.partialSelection;
    
    const initialState = pipeline.getState();
    await pipeline.processUpload(testImage);
    
    const afterUploadState = pipeline.getState();
    expect(afterUploadState.currentImage).toBeDefined();
    expect(afterUploadState.stage).toBe('uploaded');
    
    await pipeline.mapHexGrid(afterUploadState.imageData);
    const afterMappingState = pipeline.getState();
    expect(afterMappingState.hexMap).toBeDefined();
    expect(afterMappingState.stage).toBe('mapped');
  });
});
```

#### 7.3.2 Browser Compatibility Tests
```javascript
// tests/integration/browser-compatibility.test.js
import { test, expect } from '@playwright/test';

const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserName => {
  test.describe(`${browserName} compatibility`, () => {
    test('should support file upload', async ({ page }) => {
      await page.goto('/');
      
      const fileInput = page.locator('#file-upload');
      await expect(fileInput).toBeVisible();
      
      // Test file selection
      await fileInput.setInputFiles('tests/assets/test-screenshot.png');
      
      // Verify upload starts
      await expect(page.locator('.upload-progress')).toBeVisible();
    });

    test('should support drag and drop', async ({ page }) => {
      await page.goto('/');
      
      const dropZone = page.locator('.drop-zone');
      
      // Simulate drag and drop
      await dropZone.dragAndDrop('tests/assets/test-screenshot.png');
      
      // Verify processing starts
      await expect(page.locator('.processing-indicator')).toBeVisible();
    });

    test('should display recognition results', async ({ page }) => {
      await page.goto('/');
      
      // Upload test image
      await page.locator('#file-upload').setInputFiles('tests/assets/test-screenshot.png');
      
      // Wait for recognition to complete
      await page.waitForSelector('.recognition-results', { timeout: 5000 });
      
      // Verify results display
      const results = page.locator('.hex-result');
      await expect(results.first()).toBeVisible();
    });
  });
});
```

#### Deliverables:
- [ ] End-to-end pipeline testing
- [ ] Cross-browser compatibility validation
- [ ] State management integration tests
- [ ] Error propagation testing
- [ ] Performance impact testing

### 7.4 Calibration Procedures

**Duration:** 1 day  
**Responsible:** ML engineer + Lead developer  
**Files:** `implementation/calibration/`

#### 7.4.1 Threshold Calibration Framework
```javascript
// calibration/threshold-calibrator.js
class ThresholdCalibrator {
  constructor() {
    this.validationSet = [];
    this.currentThresholds = {
      selectionThreshold: 0.6,
      confidenceThreshold: 0.8,
      brightnessThreshold: 0.4,
      contrastThreshold: 0.3
    };
  }

  async loadValidationSet() {
    // Load manually labeled screenshots for validation
    const labeledImages = await fetch('/tests/assets/labeled-dataset.json');
    this.validationSet = await labeledImages.json();
  }

  async calibrateThresholds() {
    const results = [];
    
    // Test different threshold combinations
    for (let selection = 0.3; selection <= 0.9; selection += 0.1) {
      for (let confidence = 0.5; confidence <= 0.95; confidence += 0.05) {
        const thresholds = {
          ...this.currentThresholds,
          selectionThreshold: selection,
          confidenceThreshold: confidence
        };
        
        const accuracy = await this.testThresholds(thresholds);
        results.push({ thresholds, accuracy });
      }
    }
    
    // Find optimal combination
    const optimal = results.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    );
    
    return optimal.thresholds;
  }

  async testThresholds(thresholds) {
    let correctPredictions = 0;
    let totalPredictions = 0;
    
    for (const sample of this.validationSet) {
      const predictions = await this.recognizeWithThresholds(
        sample.imageData, 
        thresholds
      );
      
      // Compare with ground truth
      for (let i = 0; i < predictions.length; i++) {
        totalPredictions++;
        if (predictions[i].selected === sample.groundTruth[i]) {
          correctPredictions++;
        }
      }
    }
    
    return correctPredictions / totalPredictions;
  }

  generateCalibrationReport(results) {
    return {
      optimalThresholds: results.thresholds,
      accuracy: results.accuracy,
      calibrationDate: new Date().toISOString(),
      validationSetSize: this.validationSet.length,
      performanceMetrics: {
        precision: this.calculatePrecision(results),
        recall: this.calculateRecall(results),
        f1Score: this.calculateF1Score(results)
      }
    };
  }
}
```

#### 7.4.2 Performance Calibration
```javascript
// calibration/performance-calibrator.js
class PerformanceCalibrator {
  constructor() {
    this.benchmarks = new Map();
  }

  async calibrateProcessingTime() {
    const imageSizes = [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 3840, height: 2160 }
    ];

    for (const size of imageSizes) {
      const times = [];
      
      for (let i = 0; i < 10; i++) {
        const testImage = await this.generateTestImage(size);
        const startTime = performance.now();
        
        await this.processImage(testImage);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      this.benchmarks.set(`${size.width}x${size.height}`, {
        averageTime: times.reduce((a, b) => a + b) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        standardDeviation: this.calculateStdDev(times)
      });
    }
  }

  getPerformanceTargets() {
    return {
      '1280x720': { target: 800, alert: 2000 },   // 800ms target, 2s alert
      '1920x1080': { target: 1500, alert: 3000 }, // 1.5s target, 3s alert
      '2560x1440': { target: 2500, alert: 5000 }, // 2.5s target, 5s alert
      '3840x2160': { target: 4000, alert: 8000 }  // 4s target, 8s alert
    };
  }
}
```

#### Deliverables:
- [ ] Automated threshold calibration system
- [ ] Performance benchmark suite
- [ ] Calibration report generation
- [ ] Threshold optimization algorithms
- [ ] Validation dataset creation

### 7.5 Automated Testing Setup

**Duration:** 1 day  
**Responsible:** DevOps engineer + Lead developer  
**Files:** `.github/workflows/`, `scripts/`

#### 7.5.1 CI/CD Pipeline Configuration
```yaml
# .github/workflows/test-suite.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-results
          path: test-results/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run performance benchmarks
        run: npm run test:performance
      
      - name: Store benchmark results
        uses: benchmark-action/github-action-benchmark@v1
        with:
          tool: 'customSmallerIsBetter'
          output-file-path: performance-results.json
```

#### 7.5.2 Test Scripts Configuration
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:performance": "node scripts/run-benchmarks.js",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:calibration": "node scripts/run-calibration.js",
    "test:accuracy": "node scripts/validate-accuracy.js"
  }
}
```

#### 7.5.3 Monitoring Setup
```javascript
// scripts/test-monitoring.js
class TestMonitoring {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }

  recordTestResult(suite, test, result) {
    const key = `${suite}.${test}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        passCount: 0,
        failCount: 0,
        totalRuns: 0,
        averageTime: 0
      });
    }

    const metric = this.metrics.get(key);
    metric.totalRuns++;
    
    if (result.passed) {
      metric.passCount++;
    } else {
      metric.failCount++;
      this.checkForAlerts(key, result);
    }
    
    // Update average time
    metric.averageTime = (
      (metric.averageTime * (metric.totalRuns - 1) + result.duration) / 
      metric.totalRuns
    );
  }

  checkForAlerts(testKey, result) {
    // Alert on consecutive failures
    const metric = this.metrics.get(testKey);
    const recentFailures = this.getRecentFailures(testKey);
    
    if (recentFailures >= 3) {
      this.alerts.push({
        type: 'consecutive_failures',
        test: testKey,
        count: recentFailures,
        timestamp: new Date().toISOString()
      });
    }

    // Alert on performance regression
    if (result.duration > metric.averageTime * 2) {
      this.alerts.push({
        type: 'performance_regression',
        test: testKey,
        expectedTime: metric.averageTime,
        actualTime: result.duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  generateReport() {
    return {
      testMetrics: Object.fromEntries(this.metrics),
      alerts: this.alerts,
      overallStats: this.calculateOverallStats(),
      reportDate: new Date().toISOString()
    };
  }
}
```

#### Deliverables:
- [ ] Complete CI/CD pipeline setup
- [ ] Automated test execution on commits
- [ ] Performance regression detection
- [ ] Test result monitoring and alerting
- [ ] Coverage reporting integration

---

## Quality Assurance

### 7.6 Accuracy Validation

#### 7.6.1 Ground Truth Dataset Creation
```javascript
// Create manually labeled dataset for validation
const groundTruthDataset = {
  images: [
    {
      filename: 'perfect_selection_1.png',
      selections: [
        { hexId: 'central', selected: true },
        { hexId: 'tier1_0', selected: true },
        { hexId: 'tier1_1', selected: false },
        // ... all 91 hex positions
      ],
      metadata: {
        resolution: '1920x1080',
        uiScale: 1.0,
        gameVersion: '1.5.2'
      }
    }
    // ... 50+ labeled images
  ]
};
```

#### 7.6.2 Accuracy Metrics
- **Overall Accuracy:** Correctly identified selections / Total selections
- **Precision:** True positives / (True positives + False positives)
- **Recall:** True positives / (True positives + False negatives)
- **F1 Score:** 2 × (Precision × Recall) / (Precision + Recall)
- **Confidence Correlation:** How well confidence scores match actual accuracy

### 7.7 Performance Validation

#### Target Performance Metrics
| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Processing Time (1080p) | <2s | >3s |
| Memory Usage Peak | <100MB | >150MB |
| Recognition Accuracy | >90% | <85% |
| UI Response Time | <200ms | >500ms |
| File Upload Time | <1s | >2s |

---

## Risk Assessment

### Testing Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Insufficient test coverage | High | Medium | Automated coverage reporting |
| Flaky tests | Medium | High | Robust test isolation and mocking |
| Performance regression | High | Medium | Automated performance monitoring |
| Browser compatibility issues | Medium | Medium | Cross-browser CI testing |

### Calibration Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Overfitting to test data | High | Medium | Diverse validation dataset |
| Threshold drift over time | Medium | High | Regular recalibration |
| Poor recognition accuracy | High | Low | Comprehensive testing and tuning |
| Performance degradation | Medium | Medium | Performance monitoring |

---

## Implementation Checklist

### Test Development
- [ ] Unit test suite with >95% coverage
- [ ] Integration tests for all module interactions
- [ ] E2E tests for complete user workflows
- [ ] Performance benchmarks and regression tests
- [ ] Accessibility tests with axe-core
- [ ] Cross-browser compatibility tests

### Calibration
- [ ] Ground truth dataset creation (50+ images)
- [ ] Automated threshold calibration system
- [ ] Performance benchmarking suite
- [ ] Accuracy validation framework
- [ ] Calibration report generation

### Automation
- [ ] CI/CD pipeline configuration
- [ ] Automated test execution on commits
- [ ] Performance monitoring setup
- [ ] Test result reporting and alerts
- [ ] Coverage tracking and reporting

### Quality Assurance
- [ ] Test result analysis and optimization
- [ ] Performance tuning and optimization
- [ ] Accuracy improvement iterations
- [ ] Documentation of test procedures
- [ ] Handoff to Phase 8 documentation

---

**Phase Dependencies:**
- **Input from Phase 6:** Complete implementation with user feedback interface
- **Output to Phase 8:** Test results, performance benchmarks, calibration data, quality metrics

**Critical Path Items:**
- Test coverage must reach >95% before deployment
- Recognition accuracy must exceed 90% on validation dataset
- Performance benchmarks must meet targets
- All automated tests must pass in CI/CD pipeline

**Success Measurement:**
- All tests passing with required coverage thresholds
- Performance targets met across all supported browsers
- Recognition accuracy validated on diverse dataset
- Automated monitoring and alerting operational