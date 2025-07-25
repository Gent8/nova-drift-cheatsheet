/**
 * Real-World Validation System for Nova Drift Grid Mapping
 * Tests coordinate accuracy against actual game screenshots
 */

(function(global) {
  'use strict';

  /**
   * Real-world validation system for testing coordinate accuracy
   */
  class RealWorldValidator {
    constructor() {
      this.validationSamples = [];
      this.benchmarkResults = [];
      this.accuracyThreshold = 0.95; // 95% accuracy requirement
    }

    /**
     * Add a validation sample with known ground truth coordinates
     */
    addValidationSample(imageUrl, groundTruthCoordinates, metadata = {}) {
      this.validationSamples.push({
        imageUrl,
        groundTruthCoordinates, // Map of mod names to pixel coordinates
        metadata: {
          resolution: metadata.resolution || 'unknown',
          uiScale: metadata.uiScale || 1.0,
          source: metadata.source || 'manual',
          addedAt: new Date().toISOString(),
          ...metadata
        }
      });
    }

    /**
     * Run validation against all samples
     */
    async runValidation(gridMapper) {
      console.log(`Starting validation against ${this.validationSamples.length} samples...`);
      
      const results = [];
      let totalAccuracy = 0;
      let processedSamples = 0;

      for (const sample of this.validationSamples) {
        try {
          const result = await this.validateSample(sample, gridMapper);
          results.push(result);
          totalAccuracy += result.accuracy;
          processedSamples++;
          
          console.log(`Sample ${processedSamples}: ${(result.accuracy * 100).toFixed(1)}% accuracy`);
        } catch (error) {
          console.error(`Validation failed for sample:`, error);
          results.push({
            sample: sample.imageUrl,
            accuracy: 0,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      const overallAccuracy = processedSamples > 0 ? totalAccuracy / processedSamples : 0;
      
      const validationReport = {
        overallAccuracy,
        meetsRequirement: overallAccuracy >= this.accuracyThreshold,
        processedSamples,
        totalSamples: this.validationSamples.length,
        results,
        timestamp: new Date().toISOString()
      };

      console.log(`Validation Complete: ${(overallAccuracy * 100).toFixed(1)}% overall accuracy`);
      
      if (!validationReport.meetsRequirement) {
        console.warn(`❌ Accuracy below ${(this.accuracyThreshold * 100)}% requirement`);
      } else {
        console.log(`✅ Meets ${(this.accuracyThreshold * 100)}% accuracy requirement`);
      }

      return validationReport;
    }

    /**
     * Validate a single sample
     */
    async validateSample(sample, gridMapper) {
      // Load the image
      const image = await this.loadImage(sample.imageUrl);
      
      // Run grid mapping
      const mappingResult = await gridMapper.mapScreenshot(image);
      
      // Compare against ground truth
      const comparison = this.compareWithGroundTruth(
        mappingResult.coordinateMap, 
        sample.groundTruthCoordinates,
        sample.metadata
      );

      return {
        sample: sample.imageUrl,
        accuracy: comparison.accuracy,
        details: comparison.details,
        mappingConfidence: mappingResult.confidence,
        scalingFactor: mappingResult.scalingFactor,
        metadata: sample.metadata,
        timestamp: new Date().toISOString()
      };
    }

    /**
     * Compare mapping results with ground truth coordinates
     */
    compareWithGroundTruth(coordinateMap, groundTruth, metadata) {
      const details = {
        totalPositions: Object.keys(groundTruth).length,
        correctPositions: 0,
        positionErrors: [],
        averageError: 0,
        maxError: 0
      };

      let totalError = 0;
      let validComparisons = 0;

      for (const [modName, expectedCoord] of Object.entries(groundTruth)) {
        const detectedCoord = coordinateMap.get(modName);
        
        if (detectedCoord) {
          const error = this.calculatePositionError(
            detectedCoord.centerPoint,
            expectedCoord,
            metadata
          );

          details.positionErrors.push({
            modName,
            expected: expectedCoord,
            detected: detectedCoord.centerPoint,
            error: error.distance,
            errorPercent: error.percent
          });

          totalError += error.distance;
          validComparisons++;

          if (error.percent < 0.05) { // Within 5% tolerance
            details.correctPositions++;
          }

          details.maxError = Math.max(details.maxError, error.distance);
        } else {
          // Position not detected
          details.positionErrors.push({
            modName,
            expected: expectedCoord,
            detected: null,
            error: Infinity,
            errorPercent: 1.0
          });
        }
      }

      details.averageError = validComparisons > 0 ? totalError / validComparisons : Infinity;
      details.accuracy = details.correctPositions / details.totalPositions;

      return { accuracy: details.accuracy, details };
    }

    /**
     * Calculate position error between detected and expected coordinates
     */
    calculatePositionError(detected, expected, metadata) {
      const distance = Math.sqrt(
        Math.pow(detected.x - expected.x, 2) + 
        Math.pow(detected.y - expected.y, 2)
      );

      // Calculate error as percentage of image diagonal
      const imageWidth = metadata.resolution?.width || 1920;
      const imageHeight = metadata.resolution?.height || 1080;
      const imageDiagonal = Math.sqrt(imageWidth * imageWidth + imageHeight * imageHeight);
      const errorPercent = distance / imageDiagonal;

      return { distance, percent: errorPercent };
    }

    /**
     * Load an image from URL
     */
    loadImage(url) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
      });
    }

    /**
     * Generate benchmark reference screenshots
     */
    async generateBenchmarkSamples() {
      // This would be used to create reference screenshots with known coordinates
      // In a real implementation, this could capture screenshots at different resolutions
      console.log('Benchmark sample generation would require actual Nova Drift integration');
      
      // For now, add some synthetic validation samples
      this.addSyntheticValidationSamples();
    }

    /**
     * Add synthetic validation samples for testing
     */
    addSyntheticValidationSamples() {
      // Sample 1: 1920x1080 baseline
      this.addValidationSample(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
        {
          'DefaultWeapon': { x: 960, y: 540 },
          'Amp': { x: 996, y: 519 },
          'Split': { x: 960, y: 498 }
        },
        {
          resolution: { width: 1920, height: 1080 },
          uiScale: 1.0,
          source: 'synthetic'
        }
      );

      // Sample 2: 2560x1440 scaled
      this.addValidationSample(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        {
          'DefaultWeapon': { x: 1280, y: 720 },
          'Amp': { x: 1328, y: 692 },
          'Split': { x: 1280, y: 664 }
        },
        {
          resolution: { width: 2560, height: 1440 },
          uiScale: 1.0,
          source: 'synthetic'
        }
      );

      console.log(`Added ${this.validationSamples.length} synthetic validation samples`);
    }

    /**
     * Create manual calibration interface for failed cases
     */
    createCalibrationInterface(sample, mappingResult) {
      // This would create a UI for manual correction when automatic detection fails
      const calibrationData = {
        originalSample: sample,
        detectedCoordinates: mappingResult.coordinateMap,
        manualCorrections: new Map(),
        timestamp: new Date().toISOString()
      };

      // In a real implementation, this would show an overlay interface
      console.log('Manual calibration interface would be created here');
      
      return calibrationData;
    }

    /**
     * Apply manual corrections to improve accuracy
     */
    applyManualCorrections(coordinateMap, corrections) {
      for (const [modName, correction] of corrections) {
        const coordData = coordinateMap.get(modName);
        if (coordData) {
          coordData.centerPoint = correction.centerPoint;
          coordData.confidence = Math.max(coordData.confidence, 0.9); // High confidence for manual corrections
          coordData.source = 'manual_correction';
        }
      }
    }

    /**
     * Performance benchmark testing
     */
    async runPerformanceBenchmark(gridMapper) {
      const performanceResults = {
        averageProcessingTime: 0,
        memoryUsage: [],
        iterations: 10,
        results: []
      };

      console.log('Running performance benchmark...');

      for (let i = 0; i < performanceResults.iterations; i++) {
        if (this.validationSamples.length > 0) {
          const sample = this.validationSamples[i % this.validationSamples.length];
          const image = await this.loadImage(sample.imageUrl);
          
          const startTime = performance.now();
          const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          await gridMapper.mapScreenshot(image);
          
          const endTime = performance.now();
          const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          const processingTime = endTime - startTime;
          const memoryIncrease = endMemory - startMemory;
          
          performanceResults.results.push({
            iteration: i + 1,
            processingTime,
            memoryIncrease
          });
          
          performanceResults.memoryUsage.push(memoryIncrease);
        }
      }

      performanceResults.averageProcessingTime = performanceResults.results.reduce(
        (sum, r) => sum + r.processingTime, 0
      ) / performanceResults.results.length;

      const requirement = 2000; // 2 second requirement
      performanceResults.meetsPerformanceRequirement = performanceResults.averageProcessingTime <= requirement;

      console.log(`Average processing time: ${performanceResults.averageProcessingTime.toFixed(1)}ms`);
      console.log(`Performance requirement (<${requirement}ms): ${performanceResults.meetsPerformanceRequirement ? '✅' : '❌'}`);

      return performanceResults;
    }

    /**
     * Generate comprehensive validation report
     */
    generateValidationReport(validationResults, performanceResults) {
      const report = {
        summary: {
          overallAccuracy: validationResults.overallAccuracy,
          meetsAccuracyRequirement: validationResults.meetsRequirement,
          averageProcessingTime: performanceResults.averageProcessingTime,
          meetsPerformanceRequirement: performanceResults.meetsPerformanceRequirement,
          systemReady: validationResults.meetsRequirement && performanceResults.meetsPerformanceRequirement
        },
        accuracyDetails: validationResults,
        performanceDetails: performanceResults,
        recommendations: this.generateRecommendations(validationResults, performanceResults),
        timestamp: new Date().toISOString()
      };

      return report;
    }

    /**
     * Generate improvement recommendations
     */
    generateRecommendations(validationResults, performanceResults) {
      const recommendations = [];

      if (!validationResults.meetsRequirement) {
        recommendations.push({
          type: 'accuracy',
          priority: 'high',
          description: 'Coordinate accuracy below 95% requirement',
          suggestions: [
            'Improve edge detection algorithms',
            'Add more validation points',
            'Enhance UI element recognition',
            'Collect more reference screenshots'
          ]
        });
      }

      if (!performanceResults.meetsPerformanceRequirement) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          description: 'Processing time exceeds 2 second requirement',
          suggestions: [
            'Optimize image processing algorithms',
            'Implement worker thread processing',
            'Cache detection results',
            'Reduce analysis resolution for initial detection'
          ]
        });
      }

      if (validationResults.results.some(r => r.mappingConfidence < 0.8)) {
        recommendations.push({
          type: 'confidence',
          priority: 'medium',
          description: 'Some detections have low confidence',
          suggestions: [
            'Implement fallback detection methods',
            'Add manual calibration interface',
            'Improve confidence calculation',
            'Add user feedback mechanisms'
          ]
        });
      }

      return recommendations;
    }
  }

  // Export to global scope
  global.NovaRealWorldValidator = {
    RealWorldValidator: RealWorldValidator
  };

})(typeof window !== 'undefined' ? window : global);
