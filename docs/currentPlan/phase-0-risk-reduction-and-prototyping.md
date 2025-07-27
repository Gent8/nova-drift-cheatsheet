# Phase 0: Risk Reduction & Prototyping

**Objective:** To de-risk the most critical and technically uncertain components of the feature *before* full implementation. This phase is focused on validating core assumptions about performance, accuracy, and failure modes.

---

## 0.1. Create Validation Dataset (Foundation Task)

### 0.1.1. Dataset Structure Setup
**Create:** `docs/validation-dataset/` directory structure:
```
validation-dataset/
├── screenshots/           # Original test screenshots
├── ground-truth/         # Manually annotated correct build data
├── cropped-hexes/        # Individual hex extractions for recognition testing
├── metadata.json         # Dataset metadata and test cases
└── validation-results/   # Algorithm test results
```

### 0.1.2. Screenshot Collection Requirements
**Target:** 35-40 diverse real-world screenshots with:
- **Resolution Variety:** 1920x1080 (15), 2560x1440 (10), 3840x2160 (8), Other (7)
- **UI Scale Coverage:** 100% (20), 125% (10), 150% (10)
- **Capture Types:** Fullscreen (25), Windowed (15)
- **Visual Artifacts:** Clean (20), YouTube overlays (8), Compression artifacts (7), Watermarks (5)
- **Edge Cases:** Partial crops (5), Unusual aspect ratios (3), Dark/bright lighting (7)

### 0.1.3. Ground Truth Annotation
**Create:** `validation-dataset/ground-truth-annotator.html` tool:
```javascript
// Manual annotation interface for marking:
// - Build configuration rectangle boundaries
// - Individual hex positions and mod identifications
// - UI scale factors
// - Quality ratings
```

**Process:**
1. Load each screenshot into annotator
2. Mark build area rectangle with pixel coordinates
3. Identify and tag visible mods with positions
4. Record metadata (resolution, scale, quality score)
5. Export annotations to JSON format

---

## 0.2. Prototype ROI Detection Algorithms

### 0.2.1. Create ROI Detector Module
**File:** `docs/modules/roi-detector.js`
```javascript
class ROIDetector {
  constructor(config = {}) {
    this.approaches = ['edge', 'color', 'template', 'corner'];
    this.performance = new Map();
    this.accuracyResults = new Map();
  }

  async detectROI(imageElement, approach = 'auto') {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    let result = null;
    try {
      switch(approach) {
        case 'edge': result = await this.edgeBasedDetection(imageElement); break;
        case 'color': result = await this.colorSegmentation(imageElement); break;
        case 'template': result = await this.templateMatching(imageElement); break;
        case 'corner': result = await this.cornerDetection(imageElement); break;
        case 'auto': result = await this.consensusDetection(imageElement); break;
      }
    } finally {
      this.recordPerformance(approach, performance.now() - startTime, 
                           this.getMemoryUsage() - startMemory);
    }
    
    return result;
  }
}
```

### 0.2.2. Approach A: Edge-Based Detection
**Implementation:**
```javascript
async edgeBasedDetection(imageElement) {
  // 1. Convert to grayscale
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  // 2. Apply Canny edge detection
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const edges = this.cannyEdgeDetection(imageData);
  
  // 3. Find rectangular contours
  const contours = this.findRectangularContours(edges, canvas.width, canvas.height);
  
  // 4. Filter contours by size and aspect ratio
  const candidates = contours.filter(contour => {
    const { width, height } = contour.bounds;
    const aspectRatio = width / height;
    return width > 300 && height > 200 && 
           aspectRatio > 1.2 && aspectRatio < 2.5; // Nova Drift build area ratio
  });
  
  // 5. Score candidates based on content analysis
  const scored = await Promise.all(candidates.map(async candidate => {
    const score = await this.scoreROICandidate(imageElement, candidate.bounds);
    return { ...candidate, score };
  }));
  
  // 6. Return best candidate
  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best ? {
    bounds: best.bounds,
    confidence: best.score,
    method: 'edge-detection'
  } : null;
}
```

### 0.2.3. Approach B: Color Segmentation
**Implementation:**
```javascript
async colorSegmentation(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // 1. Identify Nova Drift's characteristic dark background
  const darkRegions = this.segmentByColor(imageData, {
    targetColor: { r: 20, g: 25, b: 35 }, // Dark space background
    tolerance: 40,
    minRegionSize: 50000 // Minimum pixels for build area
  });
  
  // 2. Find largest connected dark region
  const largestRegion = darkRegions.reduce((max, region) => 
    region.size > max.size ? region : max, darkRegions[0]);
  
  if (!largestRegion) return null;
  
  // 3. Extract bounding rectangle with padding
  const bounds = this.getBoundingRect(largestRegion.pixels);
  const paddedBounds = this.addPadding(bounds, 50); // 50px padding
  
  // 4. Validate region contains hex-like structures
  const hexScore = await this.analyzeHexPresence(imageElement, paddedBounds);
  
  return {
    bounds: paddedBounds,
    confidence: hexScore,
    method: 'color-segmentation',
    regionSize: largestRegion.size
  };
}
```

### 0.2.4. Approach C: Template Matching
**Implementation:**
```javascript
async templateMatching(imageElement) {
  // 1. Load UI frame templates for different resolutions
  const templates = await this.loadUIFrameTemplates();
  
  const results = [];
  
  for (const template of templates) {
    // 2. Perform normalized cross-correlation
    const matches = await this.performTemplateMatching(imageElement, template);
    
    // 3. Filter matches by confidence threshold
    const validMatches = matches.filter(match => match.confidence > 0.6);
    
    for (const match of validMatches) {
      // 4. Calculate build area from UI frame position
      const buildBounds = this.calculateBuildAreaFromUIFrame(match, template);
      
      // 5. Validate calculated area
      const validation = await this.validateBuildArea(imageElement, buildBounds);
      
      if (validation.isValid) {
        results.push({
          bounds: buildBounds,
          confidence: match.confidence * validation.score,
          method: 'template-matching',
          templateUsed: template.name
        });
      }
    }
  }
  
  return results.length > 0 ? 
    results.sort((a, b) => b.confidence - a.confidence)[0] : null;
}
```

### 0.2.5. Approach D: Corner Detection
**Implementation:**
```javascript
async cornerDetection(imageElement) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  ctx.drawImage(imageElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // 1. Apply Harris corner detection
  const corners = this.harrisCornerDetection(imageData);
  
  // 2. Filter corners by strength and locality
  const strongCorners = corners.filter(corner => corner.strength > 0.1);
  
  // 3. Group corners into potential rectangles
  const rectangles = this.findRectanglesFromCorners(strongCorners);
  
  // 4. Score rectangles based on Nova Drift characteristics
  const candidates = [];
  for (const rect of rectangles) {
    const score = await this.scoreUIRectangle(imageElement, rect);
    if (score > 0.3) {
      candidates.push({
        bounds: rect,
        confidence: score,
        method: 'corner-detection',
        cornersUsed: rect.corners.length
      });
    }
  }
  
  return candidates.length > 0 ? 
    candidates.sort((a, b) => b.confidence - a.confidence)[0] : null;
}
```

---

## 0.3. Benchmarking and Algorithm Selection

### 0.3.1. Create Automated Testing Framework
**File:** `docs/validation-dataset/benchmark-runner.js`
```javascript
class ROIBenchmarkRunner {
  constructor(validationDataset) {
    this.dataset = validationDataset;
    this.results = new Map();
  }

  async runFullBenchmark() {
    const detector = new ROIDetector();
    
    for (const testCase of this.dataset.testCases) {
      console.log(`Testing ${testCase.filename}...`);
      
      // Test each approach
      for (const approach of ['edge', 'color', 'template', 'corner']) {
        const result = await this.testApproach(detector, testCase, approach);
        this.recordResult(testCase, approach, result);
      }
    }
    
    return this.generateReport();
  }

  async testApproach(detector, testCase, approach) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const detection = await detector.detectROI(testCase.image, approach);
      const accuracy = this.calculateAccuracy(detection, testCase.groundTruth);
      
      return {
        success: true,
        accuracy: accuracy,
        confidence: detection?.confidence || 0,
        processingTime: performance.now() - startTime,
        memoryUsed: this.getMemoryUsage() - startMemory,
        bounds: detection?.bounds
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        processingTime: performance.now() - startTime,
        memoryUsed: this.getMemoryUsage() - startMemory
      };
    }
  }

  generateReport() {
    const report = {
      summary: this.calculateSummaryStats(),
      algorithmRankings: this.rankAlgorithms(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations()
    };
    
    // Save report
    this.saveReport(report);
    return report;
  }

  rankAlgorithms() {
    const scores = new Map();
    
    for (const [testCase, results] of this.results) {
      for (const [approach, result] of Object.entries(results)) {
        if (!scores.has(approach)) {
          scores.set(approach, { accuracy: 0, performance: 0, reliability: 0, count: 0 });
        }
        
        const score = scores.get(approach);
        if (result.success) {
          score.accuracy += result.accuracy;
          score.performance += (4000 - result.processingTime) / 4000; // Normalize to 4s budget
          score.reliability += 1;
        }
        score.count += 1;
      }
    }
    
    // Calculate weighted final scores
    const finalScores = [];
    for (const [approach, metrics] of scores) {
      const avgAccuracy = metrics.accuracy / metrics.count;
      const avgPerformance = metrics.performance / metrics.count;
      const reliability = metrics.reliability / metrics.count;
      
      const weightedScore = (avgAccuracy * 0.5) + (avgPerformance * 0.3) + (reliability * 0.2);
      
      finalScores.push({
        approach,
        weightedScore,
        accuracy: avgAccuracy,
        performance: avgPerformance,
        reliability
      });
    }
    
    return finalScores.sort((a, b) => b.weightedScore - a.weightedScore);
  }
}
```

### 0.3.2. Performance Monitoring Integration
**File:** `docs/modules/performance-monitor.js`
```javascript
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.memoryBaseline = this.getMemoryUsage();
  }

  startTimer(operationId) {
    this.metrics.set(operationId, {
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    });
  }

  endTimer(operationId) {
    const metric = this.metrics.get(operationId);
    if (!metric) return null;

    const result = {
      duration: performance.now() - metric.startTime,
      memoryDelta: this.getMemoryUsage() - metric.startMemory,
      timestamp: Date.now()
    };

    this.metrics.set(operationId, { ...metric, ...result });
    return result;
  }

  checkBudget(operationId, budgetMs, budgetMB) {
    const metric = this.metrics.get(operationId);
    if (!metric) return { withinBudget: false, reason: 'No metric found' };

    const durationOK = metric.duration <= budgetMs;
    const memoryOK = (metric.memoryDelta / 1024 / 1024) <= budgetMB;

    return {
      withinBudget: durationOK && memoryOK,
      actual: {
        duration: metric.duration,
        memory: metric.memoryDelta / 1024 / 1024
      },
      budget: { duration: budgetMs, memory: budgetMB }
    };
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return performance.memory.usedJSHeapSize;
    }
    // Fallback estimation
    return 0;
  }
}
```

---

## 0.4. Recognition Engine Validation

### 0.4.1. Create Hex Extraction Tool
**File:** `docs/validation-dataset/hex-extractor.html`
```html
<!DOCTYPE html>
<html>
<head>
    <title>Hex Extraction Tool</title>
    <style>
        .extraction-canvas { border: 2px solid #ccc; cursor: crosshair; }
        .extracted-hex { display: inline-block; margin: 5px; border: 1px solid #999; }
        .controls { margin: 10px 0; }
    </style>
</head>
<body>
    <div class="controls">
        <input type="file" id="screenshot-input" accept="image/*">
        <button id="extract-mode">Extract Mode</button>
        <button id="save-extractions">Save All Extractions</button>
    </div>
    
    <canvas id="extraction-canvas" class="extraction-canvas"></canvas>
    
    <div id="extracted-hexes"></div>
    
    <script>
        class HexExtractor {
            constructor() {
                this.canvas = document.getElementById('extraction-canvas');
                this.ctx = this.canvas.getContext('2d');
                this.extractions = [];
                this.currentImage = null;
                this.setupEventListeners();
            }
            
            extractHexAt(x, y, size = 48) {
                if (!this.currentImage) return;
                
                // Extract hex region
                const hexCanvas = document.createElement('canvas');
                const hexCtx = hexCanvas.getContext('2d');
                hexCanvas.width = size;
                hexCanvas.height = size;
                
                hexCtx.drawImage(
                    this.currentImage, 
                    x - size/2, y - size/2, size, size,
                    0, 0, size, size
                );
                
                // Add to extractions
                this.extractions.push({
                    canvas: hexCanvas,
                    position: { x, y },
                    timestamp: Date.now(),
                    id: `hex_${this.extractions.length}`
                });
                
                this.displayExtractions();
            }
            
            saveExtractions() {
                const zip = new JSZip();
                
                this.extractions.forEach((extraction, index) => {
                    extraction.canvas.toBlob(blob => {
                        zip.file(`${extraction.id}.png`, blob);
                    });
                });
                
                zip.generateAsync({type: "blob"}).then(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'extracted_hexes.zip';
                    a.click();
                });
            }
        }
        
        const extractor = new HexExtractor();
    </script>
</body>
</html>
```

### 0.4.2. Recognition Engine Testing
**File:** `docs/validation-dataset/recognition-tester.js`
```javascript
class RecognitionEngineTester {
  constructor(recognitionEngine) {
    this.engine = recognitionEngine;
    this.testResults = [];
  }

  async runValidationTests(extractedHexesDataset) {
    console.log('Starting recognition engine validation...');
    
    for (const hexSample of extractedHexesDataset) {
      const startTime = performance.now();
      
      try {
        // Test recognition
        const result = await this.engine.analyzeRegion(hexSample.imageData);
        const processingTime = performance.now() - startTime;
        
        // Compare with ground truth
        const accuracy = this.compareWithGroundTruth(result, hexSample.groundTruth);
        
        this.testResults.push({
          hexId: hexSample.id,
          groundTruth: hexSample.groundTruth,
          detected: result.topMatch,
          confidence: result.confidence,
          accuracy: accuracy,
          processingTime: processingTime,
          success: true
        });
        
      } catch (error) {
        this.testResults.push({
          hexId: hexSample.id,
          groundTruth: hexSample.groundTruth,
          error: error.message,
          success: false
        });
      }
    }
    
    return this.generateValidationReport();
  }

  generateValidationReport() {
    const successfulTests = this.testResults.filter(r => r.success);
    const totalAccuracy = successfulTests.reduce((sum, r) => sum + r.accuracy, 0) / successfulTests.length;
    const averageConfidence = successfulTests.reduce((sum, r) => sum + r.confidence, 0) / successfulTests.length;
    const averageProcessingTime = successfulTests.reduce((sum, r) => sum + r.processingTime, 0) / successfulTests.length;
    
    // Calculate confidence threshold recommendations
    const confidenceThresholds = [0.8, 0.85, 0.9, 0.95];
    const thresholdAnalysis = confidenceThresholds.map(threshold => {
      const aboveThreshold = successfulTests.filter(r => r.confidence >= threshold);
      const accuracyAboveThreshold = aboveThreshold.reduce((sum, r) => sum + r.accuracy, 0) / aboveThreshold.length;
      
      return {
        threshold,
        percentageAbove: (aboveThreshold.length / successfulTests.length) * 100,
        accuracyAbove: accuracyAboveThreshold
      };
    });
    
    const report = {
      summary: {
        totalTests: this.testResults.length,
        successfulTests: successfulTests.length,
        overallAccuracy: totalAccuracy,
        averageConfidence: averageConfidence,
        averageProcessingTime: averageProcessingTime,
        meetsBudget: averageProcessingTime < 100 // 100ms per hex budget
      },
      thresholdAnalysis,
      recommendations: this.generateRecommendations(totalAccuracy, thresholdAnalysis),
      detailedResults: this.testResults
    };
    
    console.log('Recognition Engine Validation Report:', report);
    return report;
  }

  generateRecommendations(accuracy, thresholdAnalysis) {
    const recommendations = [];
    
    if (accuracy < 0.75) {
      recommendations.push('CRITICAL: Recognition accuracy below 75% requirement. Review algorithm parameters.');
    }
    
    // Find optimal confidence threshold
    const optimalThreshold = thresholdAnalysis.find(t => t.accuracyAbove >= 0.95 && t.percentageAbove >= 50);
    if (optimalThreshold) {
      recommendations.push(`Recommended confidence threshold: ${optimalThreshold.threshold}`);
    } else {
      recommendations.push('No confidence threshold achieves 95% accuracy with 50% coverage. Consider algorithm improvements.');
    }
    
    return recommendations;
  }
}
```

---

## 0.5. Integration with Existing Codebase

### 0.5.1. Update Upload Handler Integration
**Modify:** `docs/modules/upload-handler.js`
```javascript
// Add to ScreenshotUploadHandler.onFileReady method:
onFileReady(fileData) {
  // Existing code...
  
  // Phase 0 integration: Test ROI detection if enabled
  if (window.ENABLE_ROI_TESTING) {
    this.testROIDetection(fileData);
  }
  
  // Emit custom event for Phase 2 integration
  const event = new CustomEvent('screenshot-ready', {
    detail: fileData
  });
  document.dispatchEvent(event);
}

async testROIDetection(fileData) {
  try {
    const roiDetector = new ROIDetector();
    const result = await roiDetector.detectROI(fileData.imageElement, 'auto');
    
    console.log('ROI Detection Test Result:', result);
    
    // Optionally display ROI overlay for visual validation
    if (result && window.SHOW_ROI_OVERLAY) {
      this.showROIOverlay(fileData.imageElement, result.bounds);
    }
  } catch (error) {
    console.warn('ROI detection test failed:', error);
  }
}
```

### 0.5.2. Performance Budget Integration
**Create:** `docs/modules/budget-monitor.js`
```javascript
// Integration with existing performance monitoring
class BudgetMonitor extends PerformanceMonitor {
  static BUDGETS = {
    ROI_DETECTION: { duration: 4000, memory: 150 },
    GRID_MAPPING: { duration: 5000, memory: 100 },
    RECOGNITION: { duration: 8000, memory: 200 },
    UI_UPDATES: { duration: 3000, memory: 50 }
  };

  checkPhaseBudget(phase, operationId) {
    const budget = BudgetMonitor.BUDGETS[phase];
    if (!budget) return { withinBudget: false, reason: 'Unknown phase' };

    const check = this.checkBudget(operationId, budget.duration, budget.memory);
    
    if (!check.withinBudget) {
      console.warn(`Phase ${phase} exceeded budget:`, check.actual, 'vs', check.budget);
      
      // Dispatch budget violation event
      document.dispatchEvent(new CustomEvent('budget-violation', {
        detail: { phase, check, operationId }
      }));
    }
    
    return check;
  }
}

// Make available globally
window.budgetMonitor = new BudgetMonitor();
```

---

## 0.6. Exit Criteria Validation

### 0.6.1. Automated Validation Script
**File:** `docs/validation-dataset/phase0-validator.js`
```javascript
class Phase0Validator {
  constructor() {
    this.validationResults = {};
  }

  async validatePhase0Completion() {
    console.log('Validating Phase 0 completion criteria...');
    
    // 1. Validate ROI detection accuracy
    const roiValidation = await this.validateROIAccuracy();
    
    // 2. Validate recognition engine accuracy
    const recognitionValidation = await this.validateRecognitionAccuracy();
    
    // 3. Validate performance budgets
    const performanceValidation = await this.validatePerformanceBudgets();
    
    // 4. Validate fallback mechanisms
    const fallbackValidation = await this.validateFallbackMechanisms();
    
    const overallResult = {
      roiDetection: roiValidation,
      recognition: recognitionValidation,
      performance: performanceValidation,
      fallbacks: fallbackValidation,
      phase0Complete: this.assessOverallCompletion([
        roiValidation, recognitionValidation, performanceValidation, fallbackValidation
      ])
    };
    
    this.generateCompletionReport(overallResult);
    return overallResult;
  }

  async validateROIAccuracy() {
    // Run ROI detection on validation dataset
    const benchmarkRunner = new ROIBenchmarkRunner(window.validationDataset);
    const results = await benchmarkRunner.runFullBenchmark();
    
    const topAlgorithm = results.algorithmRankings[0];
    const passed = topAlgorithm.accuracy >= 0.70;
    
    return {
      passed,
      accuracy: topAlgorithm.accuracy,
      selectedAlgorithm: topAlgorithm.approach,
      requirement: 0.70,
      details: results
    };
  }

  async validateRecognitionAccuracy() {
    const tester = new RecognitionEngineTester(window.recognitionEngine);
    const results = await tester.runValidationTests(window.extractedHexesDataset);
    
    const passed = results.summary.overallAccuracy >= 0.75;
    
    return {
      passed,
      accuracy: results.summary.overallAccuracy,
      requirement: 0.75,
      recommendedThreshold: 0.85,
      details: results
    };
  }

  async validatePerformanceBudgets() {
    // Test performance on sample operations
    const testResults = await this.runPerformanceTests();
    
    const allBudgetsMet = Object.values(testResults).every(test => test.withinBudget);
    
    return {
      passed: allBudgetsMet,
      budgetResults: testResults,
      totalBudget: 20000, // 20 seconds
      details: 'Performance monitoring integrated and budgets defined'
    };
  }

  async validateFallbackMechanisms() {
    // Test fallback scenarios
    const fallbackTests = [
      await this.testROIDetectionFailure(),
      await this.testRecognitionFailure(),
      await this.testPerformanceFailure()
    ];
    
    const allFallbacksWork = fallbackTests.every(test => test.passed);
    
    return {
      passed: allFallbacksWork,
      fallbackTests,
      details: 'Graceful degradation mechanisms implemented'
    };
  }

  assessOverallCompletion(validations) {
    return validations.every(v => v.passed);
  }
}
```

**Exit Criteria for Phase 0:** A proven ROI detection algorithm is selected using a defined scoring matrix, the recognition engine's baseline accuracy is confirmed, performance budgets are integrated, and a clear fallback path for automation failure is established.