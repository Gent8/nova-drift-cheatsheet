/**
 * ROI Algorithm Benchmark Runner
 * Comprehensive testing framework for Phase 0 validation
 */

class ROIBenchmarkRunner {
  constructor(validationDataset) {
    this.dataset = validationDataset || [];
    this.results = new Map();
    this.performance = new Map();
    this.config = {
      algorithms: ['edge', 'color', 'template', 'corner'],
      timeoutMs: 10000,
      accuracyThreshold: 0.7,
      performanceTargets: {
        maxProcessingTime: 4000, // 4 seconds per image
        maxMemoryUsage: 150 * 1024 * 1024, // 150MB
        minAccuracy: 0.7
      }
    };
    
    this.detectorInstance = null;
    this.reportData = null;
  }

  /**
   * Initialize the benchmark runner
   */
  async initialize() {
    console.log('ROIBenchmarkRunner: Initializing benchmark system');
    
    // Load required detector classes
    await this.loadDetectorClasses();
    
    // Initialize ROI detector
    this.detectorInstance = new ROIDetector({
      algorithms: this.config.algorithms,
      timeout: this.config.timeoutMs,
      debugMode: true
    });
    
    console.log(`ROIBenchmarkRunner: Initialized with ${this.config.algorithms.length} algorithms`);
  }

  /**
   * Load all required detector classes
   */
  async loadDetectorClasses() {
    const requiredClasses = [
      'EdgeROIDetector',
      'ColorROIDetector', 
      'TemplateROIDetector',
      'CornerROIDetector'
    ];
    
    const missingClasses = requiredClasses.filter(className => !window[className]);
    
    if (missingClasses.length > 0) {
      console.warn(`ROIBenchmarkRunner: Missing detector classes: ${missingClasses.join(', ')}`);
      throw new Error(`Required detector classes not loaded: ${missingClasses.join(', ')}`);
    }
    
    console.log('ROIBenchmarkRunner: All detector classes available');
  }

  /**
   * Run complete benchmark suite
   */
  async runFullBenchmark() {
    console.log('ROIBenchmarkRunner: Starting full benchmark suite');
    
    if (!this.detectorInstance) {
      await this.initialize();
    }
    
    if (this.dataset.length === 0) {
      throw new Error('No validation dataset provided');
    }
    
    const startTime = performance.now();
    
    try {
      // Run benchmark for each test case
      for (let i = 0; i < this.dataset.length; i++) {
        const testCase = this.dataset[i];
        console.log(`ROIBenchmarkRunner: Testing ${i + 1}/${this.dataset.length}: ${testCase.filename}`);
        
        await this.runTestCase(testCase, i);
      }
      
      // Generate comprehensive report
      this.reportData = this.generateReport();
      
      const totalTime = performance.now() - startTime;
      console.log(`ROIBenchmarkRunner: Benchmark completed in ${totalTime.toFixed(2)}ms`);
      
      return this.reportData;
      
    } catch (error) {
      console.error('ROIBenchmarkRunner: Benchmark failed:', error);
      throw error;
    }
  }

  /**
   * Run benchmark for a single test case
   */
  async runTestCase(testCase, index) {
    // Load image
    const imageElement = await this.loadTestImage(testCase);
    
    // Test each algorithm individually
    for (const algorithm of this.config.algorithms) {
      try {
        const result = await this.testAlgorithm(testCase, imageElement, algorithm);
        this.recordResult(testCase, algorithm, result);
      } catch (error) {
        console.error(`ROIBenchmarkRunner: Algorithm ${algorithm} failed on ${testCase.filename}:`, error);
        this.recordResult(testCase, algorithm, {
          success: false,
          error: error.message,
          processingTime: 0,
          memoryUsed: 0,
          accuracy: 0
        });
      }
    }
    
    // Test consensus approach (all algorithms together)
    try {
      const consensusResult = await this.testConsensusApproach(testCase, imageElement);
      this.recordResult(testCase, 'consensus', consensusResult);
    } catch (error) {
      console.error(`ROIBenchmarkRunner: Consensus approach failed on ${testCase.filename}:`, error);
    }
  }

  /**
   * Load test image from dataset
   */
  async loadTestImage(testCase) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${testCase.filename}`));
      
      // Handle different image source formats
      if (testCase.imageData) {
        img.src = testCase.imageData;
      } else if (testCase.imagePath) {
        img.src = testCase.imagePath;
      } else {
        reject(new Error(`No image source found for ${testCase.filename}`));
      }
    });
  }

  /**
   * Test a specific algorithm on a test case
   */
  async testAlgorithm(testCase, imageElement, algorithm) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Algorithm timeout')), this.config.timeoutMs);
      });
      
      // Run algorithm detection
      const detectionPromise = this.detectorInstance.runAlgorithm(algorithm, imageElement);
      
      // Race against timeout
      const detection = await Promise.race([detectionPromise, timeoutPromise]);
      
      const processingTime = performance.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;
      
      // Calculate accuracy if ground truth available
      let accuracy = 0;
      if (testCase.groundTruth) {
        accuracy = this.calculateAccuracy(detection, testCase.groundTruth);
      }
      
      return {
        success: true,
        detection: detection,
        accuracy: accuracy,
        confidence: detection?.confidence || 0,
        processingTime: processingTime,
        memoryUsed: memoryUsed,
        bounds: detection?.bounds,
        metadata: detection?.metadata
      };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const memoryUsed = Math.max(0, this.getMemoryUsage() - startMemory);
      
      return {
        success: false,
        error: error.message,
        processingTime: processingTime,
        memoryUsed: memoryUsed,
        accuracy: 0,
        confidence: 0
      };
    }
  }

  /**
   * Test consensus approach using all algorithms
   */
  async testConsensusApproach(testCase, imageElement) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    try {
      const detection = await this.detectorInstance.detectROI(imageElement);
      
      const processingTime = performance.now() - startTime;
      const memoryUsed = this.getMemoryUsage() - startMemory;
      
      let accuracy = 0;
      if (testCase.groundTruth) {
        accuracy = this.calculateAccuracy(detection, testCase.groundTruth);
      }
      
      return {
        success: true,
        detection: detection,
        accuracy: accuracy,
        confidence: detection?.confidence || 0,
        processingTime: processingTime,
        memoryUsed: memoryUsed,
        selectedAlgorithm: detection?.method,
        algorithmResults: detection?.metadata?.algorithmResults || []
      };
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        processingTime: processingTime,
        memoryUsed: 0,
        accuracy: 0
      };
    }
  }

  /**
   * Calculate accuracy using Intersection over Union (IoU)
   */
  calculateAccuracy(detection, groundTruth) {
    if (!detection || !detection.bounds || !groundTruth || !groundTruth.buildArea) {
      return 0;
    }
    
    const detected = detection.bounds;
    const truth = groundTruth.buildArea;
    
    // Calculate intersection
    const intersectionLeft = Math.max(detected.x, truth.left);
    const intersectionTop = Math.max(detected.y, truth.top);
    const intersectionRight = Math.min(detected.x + detected.width, truth.right);
    const intersectionBottom = Math.min(detected.y + detected.height, truth.bottom);
    
    if (intersectionRight <= intersectionLeft || intersectionBottom <= intersectionTop) {
      return 0; // No intersection
    }
    
    const intersectionArea = (intersectionRight - intersectionLeft) * (intersectionBottom - intersectionTop);
    const detectedArea = detected.width * detected.height;
    const truthArea = truth.width * truth.height;
    const unionArea = detectedArea + truthArea - intersectionArea;
    
    return intersectionArea / unionArea;
  }

  /**
   * Record test result
   */
  recordResult(testCase, algorithm, result) {
    const testKey = `${testCase.filename}_${algorithm}`;
    
    this.results.set(testKey, {
      testCase: testCase.filename,
      algorithm: algorithm,
      timestamp: Date.now(),
      ...result
    });
    
    // Update performance tracking
    if (!this.performance.has(algorithm)) {
      this.performance.set(algorithm, {
        totalTests: 0,
        successfulTests: 0,
        totalAccuracy: 0,
        totalProcessingTime: 0,
        totalMemoryUsed: 0,
        failures: []
      });
    }
    
    const perf = this.performance.get(algorithm);
    perf.totalTests++;
    
    if (result.success) {
      perf.successfulTests++;
      perf.totalAccuracy += result.accuracy;
      perf.totalProcessingTime += result.processingTime;
      perf.totalMemoryUsed += result.memoryUsed;
    } else {
      perf.failures.push({
        testCase: testCase.filename,
        error: result.error
      });
    }
  }

  /**
   * Generate comprehensive benchmark report
   */
  generateReport() {
    console.log('ROIBenchmarkRunner: Generating comprehensive report');
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalTests: this.dataset.length,
        algorithmsTestted: this.config.algorithms.length,
        performanceTargets: this.config.performanceTargets
      },
      summary: this.generateSummaryStats(),
      algorithmRankings: this.rankAlgorithms(),
      detailedResults: this.generateDetailedResults(),
      performanceAnalysis: this.generatePerformanceAnalysis(),
      recommendations: this.generateRecommendations(),
      exportData: this.prepareExportData()
    };
    
    console.log('ROIBenchmarkRunner: Report generated');
    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummaryStats() {
    const summary = {
      totalTestCases: this.dataset.length,
      totalResults: this.results.size,
      algorithms: {}
    };
    
    for (const algorithm of this.config.algorithms.concat(['consensus'])) {
      const perf = this.performance.get(algorithm);
      if (perf) {
        summary.algorithms[algorithm] = {
          successRate: perf.totalTests > 0 ? (perf.successfulTests / perf.totalTests) : 0,
          averageAccuracy: perf.successfulTests > 0 ? (perf.totalAccuracy / perf.successfulTests) : 0,
          averageProcessingTime: perf.successfulTests > 0 ? (perf.totalProcessingTime / perf.successfulTests) : 0,
          averageMemoryUsage: perf.successfulTests > 0 ? (perf.totalMemoryUsed / perf.successfulTests) : 0,
          failureCount: perf.failures.length
        };
      }
    }
    
    return summary;
  }

  /**
   * Rank algorithms by weighted performance score
   */
  rankAlgorithms() {
    const rankings = [];
    
    for (const algorithm of this.config.algorithms.concat(['consensus'])) {
      const perf = this.performance.get(algorithm);
      if (!perf || perf.totalTests === 0) continue;
      
      const successRate = perf.successfulTests / perf.totalTests;
      const avgAccuracy = perf.successfulTests > 0 ? (perf.totalAccuracy / perf.successfulTests) : 0;
      const avgProcessingTime = perf.successfulTests > 0 ? (perf.totalProcessingTime / perf.successfulTests) : 0;
      const avgMemoryUsage = perf.successfulTests > 0 ? (perf.totalMemoryUsed / perf.successfulTests) : 0;
      
      // Performance score calculation
      const accuracyScore = avgAccuracy; // 0-1
      const speedScore = Math.max(0, (this.config.performanceTargets.maxProcessingTime - avgProcessingTime) / this.config.performanceTargets.maxProcessingTime);
      const memoryScore = Math.max(0, (this.config.performanceTargets.maxMemoryUsage - avgMemoryUsage) / this.config.performanceTargets.maxMemoryUsage);
      const reliabilityScore = successRate;
      
      // Weighted final score: 50% accuracy, 20% speed, 15% memory, 15% reliability
      const weightedScore = (accuracyScore * 0.5) + (speedScore * 0.2) + (memoryScore * 0.15) + (reliabilityScore * 0.15);
      
      rankings.push({
        algorithm: algorithm,
        weightedScore: weightedScore,
        metrics: {
          accuracy: avgAccuracy,
          processingTime: avgProcessingTime,
          memoryUsage: avgMemoryUsage,
          successRate: successRate
        },
        meetsRequirements: {
          accuracy: avgAccuracy >= this.config.performanceTargets.minAccuracy,
          speed: avgProcessingTime <= this.config.performanceTargets.maxProcessingTime,
          memory: avgMemoryUsage <= this.config.performanceTargets.maxMemoryUsage,
          overall: avgAccuracy >= this.config.performanceTargets.minAccuracy && 
                  avgProcessingTime <= this.config.performanceTargets.maxProcessingTime &&
                  avgMemoryUsage <= this.config.performanceTargets.maxMemoryUsage
        }
      });
    }
    
    // Sort by weighted score
    rankings.sort((a, b) => b.weightedScore - a.weightedScore);
    
    return rankings;
  }

  /**
   * Generate detailed results breakdown
   */
  generateDetailedResults() {
    const detailed = {
      byAlgorithm: {},
      byTestCase: {},
      failures: []
    };
    
    // Group by algorithm
    for (const algorithm of this.config.algorithms.concat(['consensus'])) {
      detailed.byAlgorithm[algorithm] = [];
    }
    
    // Group by test case
    for (const testCase of this.dataset) {
      detailed.byTestCase[testCase.filename] = [];
    }
    
    // Process all results
    for (const [key, result] of this.results) {
      detailed.byAlgorithm[result.algorithm].push(result);
      detailed.byTestCase[result.testCase].push(result);
      
      if (!result.success) {
        detailed.failures.push(result);
      }
    }
    
    return detailed;
  }

  /**
   * Generate performance analysis
   */
  generatePerformanceAnalysis() {
    const analysis = {
      bottlenecks: [],
      trends: {},
      resourceUsage: {},
      timeDistribution: {}
    };
    
    // Identify performance bottlenecks
    for (const [algorithm, perf] of this.performance) {
      const avgTime = perf.successfulTests > 0 ? (perf.totalProcessingTime / perf.successfulTests) : 0;
      const avgMemory = perf.successfulTests > 0 ? (perf.totalMemoryUsed / perf.successfulTests) : 0;
      
      if (avgTime > this.config.performanceTargets.maxProcessingTime) {
        analysis.bottlenecks.push({
          algorithm: algorithm,
          type: 'processing_time',
          actual: avgTime,
          target: this.config.performanceTargets.maxProcessingTime,
          severity: avgTime / this.config.performanceTargets.maxProcessingTime
        });
      }
      
      if (avgMemory > this.config.performanceTargets.maxMemoryUsage) {
        analysis.bottlenecks.push({
          algorithm: algorithm,
          type: 'memory_usage',
          actual: avgMemory,
          target: this.config.performanceTargets.maxMemoryUsage,
          severity: avgMemory / this.config.performanceTargets.maxMemoryUsage
        });
      }
    }
    
    return analysis;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations() {
    const recommendations = [];
    const rankings = this.rankAlgorithms();
    
    if (rankings.length === 0) {
      recommendations.push({
        type: 'critical',
        message: 'No algorithms completed successfully. Review implementation and test data.'
      });
      return recommendations;
    }
    
    const topAlgorithm = rankings[0];
    
    // Algorithm selection recommendation
    if (topAlgorithm.meetsRequirements.overall) {
      recommendations.push({
        type: 'success',
        message: `Recommend ${topAlgorithm.algorithm} algorithm for production use`,
        details: {
          algorithm: topAlgorithm.algorithm,
          score: topAlgorithm.weightedScore,
          accuracy: topAlgorithm.metrics.accuracy,
          processingTime: topAlgorithm.metrics.processingTime
        }
      });
    } else {
      recommendations.push({
        type: 'warning',
        message: `Best algorithm (${topAlgorithm.algorithm}) does not meet all requirements`,
        details: topAlgorithm.meetsRequirements
      });
    }
    
    // Performance recommendations
    if (topAlgorithm.metrics.processingTime > 2000) {
      recommendations.push({
        type: 'optimization',
        message: 'Consider optimizing processing time for better user experience',
        suggestion: 'Implement progressive results or reduce image resolution for initial detection'
      });
    }
    
    // Accuracy recommendations
    if (topAlgorithm.metrics.accuracy < 0.8) {
      recommendations.push({
        type: 'optimization',
        message: 'Consider improving accuracy through algorithm tuning or ensemble methods',
        suggestion: 'Experiment with parameter optimization or hybrid approaches'
      });
    }
    
    return recommendations;
  }

  /**
   * Prepare data for export
   */
  prepareExportData() {
    return {
      rawResults: Array.from(this.results.entries()),
      performanceMetrics: Array.from(this.performance.entries()),
      configuration: this.config,
      dataset: this.dataset.map(tc => ({
        filename: tc.filename,
        metadata: tc.metadata
      }))
    };
  }

  /**
   * Get current memory usage (rough estimate)
   */
  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0; // Fallback for browsers without memory API
  }

  /**
   * Export results to JSON file
   */
  exportResults(filename = null) {
    if (!this.reportData) {
      throw new Error('No benchmark results to export. Run benchmark first.');
    }
    
    const exportFilename = filename || `roi-benchmark-results-${new Date().toISOString().split('T')[0]}.json`;
    
    const blob = new Blob([JSON.stringify(this.reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`ROIBenchmarkRunner: Results exported to ${exportFilename}`);
  }

  /**
   * Load validation dataset from JSON file
   */
  static async loadDatasetFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          if (data.annotations && Array.isArray(data.annotations)) {
            resolve(data.annotations);
          } else {
            reject(new Error('Invalid dataset format'));
          }
        } catch (error) {
          reject(new Error('Failed to parse dataset JSON: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read dataset file'));
      reader.readAsText(file);
    });
  }

  /**
   * Create a quick validation test with mock data
   */
  static createMockValidationTest() {
    const mockDataset = [
      {
        filename: 'mock-test-1.png',
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        groundTruth: {
          buildArea: {
            left: 100,
            top: 100,
            width: 400,
            height: 300,
            right: 500,
            bottom: 400
          }
        },
        metadata: {
          uiScale: '100',
          captureType: 'fullscreen',
          qualityScore: 8
        }
      }
    ];
    
    return new ROIBenchmarkRunner(mockDataset);
  }
}

// Export for global use
window.ROIBenchmarkRunner = ROIBenchmarkRunner;

console.log('ROIBenchmarkRunner: Benchmark runner loaded');