/**
 * ROI Detector - Main coordinator for Region of Interest detection
 * Implements multiple algorithms and selects best result
 */

class ROIDetector {
  constructor(config = {}) {
    this.config = {
      algorithms: ['edge', 'color', 'template'],
      timeout: 4000, // 4 second timeout
      confidenceThreshold: 0.7,
      enableFallback: true,
      debugMode: false,
      ...config
    };

    this.algorithms = new Map();
    this.performance = new Map();
    this.lastResult = null;
    
    this.init();
  }

  /**
   * Initialize detection algorithms
   */
  init() {
    console.log('ROIDetector: Initializing detection algorithms');

    // Initialize available algorithms
    if (window.EdgeROIDetector) {
      this.algorithms.set('edge', new window.EdgeROIDetector());
    }
    if (window.ColorROIDetector) {
      this.algorithms.set('color', new window.ColorROIDetector());
    }
    if (window.TemplateROIDetector) {
      this.algorithms.set('template', new window.TemplateROIDetector());
    }

    console.log(`ROIDetector: Initialized ${this.algorithms.size} algorithms:`, Array.from(this.algorithms.keys()));
  }

  /**
   * Detect ROI using the best available algorithm
   */
  async detectROI(imageElement, options = {}) {
    const startTime = performance.now();
    
    console.log('ROIDetector: Starting ROI detection');
    
    try {
      // Validate input
      if (!imageElement || !imageElement.complete) {
        throw new Error('Invalid or incomplete image element');
      }

      // Register canvas for memory management
      const canvasId = window.registerCanvas(document.createElement('canvas'), 'roi-detection');

      // Setup timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ROI detection timeout')), this.config.timeout);
      });

      // Run detection with timeout
      const detectionPromise = this.runDetection(imageElement, options);
      const result = await Promise.race([detectionPromise, timeoutPromise]);

      // Record performance
      const processingTime = performance.now() - startTime;
      this.recordPerformance('total', processingTime, result?.confidence || 0);

      console.log(`ROIDetector: Detection completed in ${processingTime.toFixed(2)}ms with confidence ${result?.confidence || 0}`);
      
      this.lastResult = result;
      return result;

    } catch (error) {
      console.error('ROIDetector: Detection failed:', error);
      
      if (this.config.enableFallback) {
        return this.createFallbackResult(imageElement, error);
      }
      
      throw error;
    }
  }

  /**
   * Run detection using configured algorithms
   */
  async runDetection(imageElement, options) {
    const results = [];
    const enabledAlgorithms = options.algorithms || this.config.algorithms;

    // Run algorithms in parallel for speed
    const algorithmPromises = enabledAlgorithms
      .filter(name => this.algorithms.has(name))
      .map(name => this.runAlgorithm(name, imageElement));

    const algorithmResults = await Promise.allSettled(algorithmPromises);

    // Process results
    algorithmResults.forEach((result, index) => {
      const algorithmName = enabledAlgorithms[index];
      
      if (result.status === 'fulfilled' && result.value) {
        results.push({
          algorithm: algorithmName,
          ...result.value
        });
      } else {
        console.warn(`ROIDetector: Algorithm ${algorithmName} failed:`, result.reason);
      }
    });

    // Select best result
    return this.selectBestResult(results);
  }

  /**
   * Run a specific detection algorithm
   */
  async runAlgorithm(algorithmName, imageElement) {
    const algorithm = this.algorithms.get(algorithmName);
    if (!algorithm) {
      throw new Error(`Algorithm ${algorithmName} not available`);
    }

    const startTime = performance.now();
    
    try {
      console.log(`ROIDetector: Running ${algorithmName} algorithm`);
      
      const result = await algorithm.detect(imageElement);
      const processingTime = performance.now() - startTime;
      
      // Record performance
      this.recordPerformance(algorithmName, processingTime, result?.confidence || 0);

      if (this.config.debugMode) {
        console.log(`ROIDetector: ${algorithmName} result:`, result);
      }

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.recordPerformance(algorithmName, processingTime, 0);
      throw error;
    }
  }

  /**
   * Select the best result from multiple algorithm outputs
   */
  selectBestResult(results) {
    if (results.length === 0) {
      return null;
    }

    // Sort by confidence, then by algorithm preference
    const algorithmPriority = { template: 3, color: 2, edge: 1 };
    
    results.sort((a, b) => {
      // Primary sort by confidence
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      
      // Secondary sort by algorithm priority
      const aPriority = algorithmPriority[a.algorithm] || 0;
      const bPriority = algorithmPriority[b.algorithm] || 0;
      return bPriority - aPriority;
    });

    const bestResult = results[0];
    
    console.log(`ROIDetector: Selected ${bestResult.algorithm} algorithm with confidence ${bestResult.confidence}`);
    
    // Return standardized result
    return {
      bounds: bestResult.bounds,
      confidence: bestResult.confidence,
      method: bestResult.algorithm,
      metadata: {
        algorithmResults: results,
        selectedAlgorithm: bestResult.algorithm,
        processingTime: this.getAverageProcessingTime(),
        alternativeOptions: results.slice(1, 3) // Top 2 alternatives
      }
    };
  }

  /**
   * Create fallback result when detection fails
   */
  createFallbackResult(imageElement, error) {
    console.log('ROIDetector: Creating fallback result');
    
    // Create a fallback ROI covering most of the image center
    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;
    
    // Use 80% of image size, centered
    const roiWidth = Math.floor(width * 0.8);
    const roiHeight = Math.floor(height * 0.8);
    const roiX = Math.floor((width - roiWidth) / 2);
    const roiY = Math.floor((height - roiHeight) / 2);

    return {
      bounds: {
        x: roiX,
        y: roiY,
        width: roiWidth,
        height: roiHeight
      },
      confidence: 0.1, // Very low confidence
      method: 'fallback',
      metadata: {
        fallbackReason: error.message,
        originalError: error,
        note: 'Automatic detection failed, using center fallback'
      }
    };
  }

  /**
   * Record performance metrics for algorithms
   */
  recordPerformance(algorithm, processingTime, confidence) {
    if (!this.performance.has(algorithm)) {
      this.performance.set(algorithm, {
        runs: 0,
        totalTime: 0,
        averageTime: 0,
        totalConfidence: 0,
        averageConfidence: 0,
        successRate: 0,
        successes: 0
      });
    }

    const perf = this.performance.get(algorithm);
    perf.runs++;
    perf.totalTime += processingTime;
    perf.averageTime = perf.totalTime / perf.runs;
    
    if (confidence > 0) {
      perf.successes++;
      perf.totalConfidence += confidence;
      perf.averageConfidence = perf.totalConfidence / perf.successes;
    }
    
    perf.successRate = perf.successes / perf.runs;
  }

  /**
   * Get average processing time across all algorithms
   */
  getAverageProcessingTime() {
    let totalTime = 0;
    let totalRuns = 0;

    for (const perf of this.performance.values()) {
      totalTime += perf.totalTime;
      totalRuns += perf.runs;
    }

    return totalRuns > 0 ? totalTime / totalRuns : 0;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = {
      algorithms: {},
      overall: {
        totalDetections: 0,
        averageProcessingTime: this.getAverageProcessingTime(),
        lastResult: this.lastResult
      }
    };

    for (const [algorithm, perf] of this.performance) {
      stats.algorithms[algorithm] = { ...perf };
      stats.overall.totalDetections += perf.runs;
    }

    return stats;
  }

  /**
   * Test all algorithms against a validation dataset
   */
  async validateAgainstDataset(dataset) {
    console.log(`ROIDetector: Validating against dataset with ${dataset.length} images`);
    
    const validationResults = {
      totalImages: dataset.length,
      algorithms: {},
      overall: {
        averageAccuracy: 0,
        averageProcessingTime: 0,
        successRate: 0
      }
    };

    // Initialize algorithm results
    for (const algorithmName of this.config.algorithms) {
      validationResults.algorithms[algorithmName] = {
        processedCount: 0,
        accuracySum: 0,
        averageAccuracy: 0,
        averageProcessingTime: 0,
        successCount: 0,
        failures: []
      };
    }

    // Test each image
    for (let i = 0; i < dataset.length; i++) {
      const testCase = dataset[i];
      console.log(`ROIDetector: Testing image ${i + 1}/${dataset.length}: ${testCase.filename}`);

      try {
        // Load image
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = testCase.imageData;
        });

        // Test each algorithm
        for (const algorithmName of this.config.algorithms) {
          if (!this.algorithms.has(algorithmName)) continue;

          try {
            const result = await this.runAlgorithm(algorithmName, img);
            const accuracy = this.calculateAccuracy(result, testCase.groundTruth);
            
            const algResults = validationResults.algorithms[algorithmName];
            algResults.processedCount++;
            algResults.accuracySum += accuracy;
            algResults.averageAccuracy = algResults.accuracySum / algResults.processedCount;
            
            if (accuracy > 0.5) {
              algResults.successCount++;
            }

          } catch (error) {
            validationResults.algorithms[algorithmName].failures.push({
              image: testCase.filename,
              error: error.message
            });
          }
        }

      } catch (error) {
        console.error(`ROIDetector: Failed to process ${testCase.filename}:`, error);
      }
    }

    // Calculate overall statistics
    this.calculateOverallValidationStats(validationResults);

    console.log('ROIDetector: Validation completed:', validationResults);
    return validationResults;
  }

  /**
   * Calculate accuracy between detected and ground truth bounds
   */
  calculateAccuracy(detected, groundTruth) {
    if (!detected || !detected.bounds || !groundTruth || !groundTruth.roiBounds) {
      return 0;
    }

    const detectedBounds = detected.bounds;
    const trueBounds = groundTruth.roiBounds;

    // Calculate Intersection over Union (IoU)
    const intersectionX = Math.max(detectedBounds.x, trueBounds.x);
    const intersectionY = Math.max(detectedBounds.y, trueBounds.y);
    const intersectionRight = Math.min(detectedBounds.x + detectedBounds.width, trueBounds.x + trueBounds.width);
    const intersectionBottom = Math.min(detectedBounds.y + detectedBounds.height, trueBounds.y + trueBounds.height);

    if (intersectionRight <= intersectionX || intersectionBottom <= intersectionY) {
      return 0; // No intersection
    }

    const intersectionArea = (intersectionRight - intersectionX) * (intersectionBottom - intersectionY);
    const detectedArea = detectedBounds.width * detectedBounds.height;
    const trueArea = trueBounds.width * trueBounds.height;
    const unionArea = detectedArea + trueArea - intersectionArea;

    return intersectionArea / unionArea;
  }

  /**
   * Calculate overall validation statistics
   */
  calculateOverallValidationStats(results) {
    let totalAccuracy = 0;
    let totalProcessingTime = 0;
    let totalSuccess = 0;
    let totalProcessed = 0;

    for (const algName of Object.keys(results.algorithms)) {
      const algResults = results.algorithms[algName];
      totalAccuracy += algResults.accuracySum;
      totalSuccess += algResults.successCount;
      totalProcessed += algResults.processedCount;
      
      // Get processing time from performance stats
      const perfStats = this.performance.get(algName);
      if (perfStats) {
        totalProcessingTime += perfStats.averageTime * algResults.processedCount;
      }
    }

    if (totalProcessed > 0) {
      results.overall.averageAccuracy = totalAccuracy / totalProcessed;
      results.overall.averageProcessingTime = totalProcessingTime / totalProcessed;
      results.overall.successRate = totalSuccess / totalProcessed;
    }
  }

  /**
   * Get the best performing algorithm based on validation results
   */
  getBestAlgorithm() {
    let bestAlgorithm = null;
    let bestScore = 0;

    for (const [algorithmName, perf] of this.performance) {
      // Weighted score: 70% accuracy, 20% success rate, 10% speed
      const speedScore = Math.max(0, (4000 - perf.averageTime) / 4000); // Normalize to 4s budget
      const score = (perf.averageConfidence * 0.7) + (perf.successRate * 0.2) + (speedScore * 0.1);
      
      if (score > bestScore) {
        bestScore = score;
        bestAlgorithm = algorithmName;
      }
    }

    return {
      algorithm: bestAlgorithm,
      score: bestScore,
      stats: bestAlgorithm ? this.performance.get(bestAlgorithm) : null
    };
  }

  /**
   * Configure the detector for production use
   */
  configureForProduction(bestAlgorithm) {
    console.log(`ROIDetector: Configuring for production with ${bestAlgorithm} algorithm`);
    
    this.config.algorithms = [bestAlgorithm];
    this.config.debugMode = false;
    
    // Optimize timeout based on algorithm performance
    const perfStats = this.performance.get(bestAlgorithm);
    if (perfStats) {
      this.config.timeout = Math.max(2000, perfStats.averageTime * 3); // 3x average time as timeout
    }
  }
}

// Export for global use
window.ROIDetector = ROIDetector;

console.log('ROIDetector: Main detector class loaded');