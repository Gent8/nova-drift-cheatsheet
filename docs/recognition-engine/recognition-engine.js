/**
 * Nova Drift Recognition Engine - Phase 4
 * Main orchestrator for multi-algorithm hex region recognition
 */

(function(global) {
  'use strict';

  // Import detection algorithms
  const BrightnessDetector = global.BrightnessDetector || require('./brightness-detector.js');
  const ColorDetector = global.ColorDetector || require('./color-detector.js');
  const EdgeDetector = global.EdgeDetector || require('./edge-detector.js');
  const PatternMatcher = global.PatternMatcher || require('./pattern-matcher.js');
  const ConsensusEngine = global.ConsensusEngine || require('./consensus-engine.js');

  /**
   * Main recognition engine that coordinates all detection algorithms
   */
  class RecognitionEngine {
    constructor(config = {}) {
      this.config = {
        algorithms: ['brightness', 'color', 'edge', 'pattern'],
        consensusThreshold: 0.6,
        calibrationEnabled: true,
        performanceMonitoring: true,
        batchProcessing: true,
        maxConcurrentAnalyses: 10,
        ...config
      };
      
      this.name = 'recognition-engine';
      this.version = '1.0.0';
      
      // Initialize detection algorithms
      this.detectors = this.initializeDetectors();
      
      // Initialize consensus engine
      this.consensusEngine = new ConsensusEngine(config.algorithmWeights);
      
      // Performance and calibration tracking
      this.performance = {
        totalProcessed: 0,
        successfulAnalyses: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
        algorithmPerformance: new Map()
      };
      
      this.calibrationData = [];
    }

    /**
     * Initialize all detection algorithms
     * @returns {Object} Map of algorithm instances
     */
    initializeDetectors() {
      const detectors = {};
      
      if (this.config.algorithms.includes('brightness')) {
        detectors.brightness = new BrightnessDetector();
      }
      
      if (this.config.algorithms.includes('color')) {
        detectors.color = new ColorDetector();
      }
      
      if (this.config.algorithms.includes('edge')) {
        detectors.edge = new EdgeDetector();
      }
      
      if (this.config.algorithms.includes('pattern')) {
        detectors.pattern = new PatternMatcher();
      }
      
      return detectors;
    }

    /**
     * Analyze extracted regions to detect mod selection states
     * @param {Map} regionData - Map of region data from Phase 3
     * @param {Object} metadata - Additional processing metadata
     * @returns {Object} Detection results for Phase 5
     */
    async analyzeRegions(regionData, metadata = {}) {
      try {
        const startTime = performance.now();
        
        console.log(`Recognition engine analyzing ${regionData.size} regions...`);
        
        // Prepare analysis tasks
        const analysisTasks = this.prepareAnalysisTasks(regionData);
        
        // Process regions (batch or sequential based on config)
        const detectionResults = this.config.batchProcessing ? 
          await this.processBatch(analysisTasks) : 
          await this.processSequential(analysisTasks);
        
        // Calculate overall statistics
        const overallStats = this.calculateOverallStats(detectionResults);
        
        // Update performance tracking
        this.updatePerformance(detectionResults, performance.now() - startTime);
        
        const result = {
          type: 'selection-detected',
          detail: {
            detectionResults,
            overallStats,
            processingMetadata: {
              totalRegions: regionData.size,
              successfulDetections: detectionResults.size,
              averageConfidence: overallStats.averageConfidence,
              processingTime: performance.now() - startTime,
              algorithmPerformance: this.getAlgorithmPerformance(),
              timestamp: Date.now()
            }
          }
        };
        
        console.log(`Recognition completed: ${detectionResults.size}/${regionData.size} successful in ${(performance.now() - startTime).toFixed(1)}ms`);
        
        return result;
        
      } catch (error) {
        console.error('Region analysis failed:', error);
        throw new Error(`Recognition engine failed: ${error.message}`);
      }
    }

    /**
     * Prepare analysis tasks from region data
     * @param {Map} regionData - Region data from Phase 3
     * @returns {Array} Array of analysis task objects
     */
    prepareAnalysisTasks(regionData) {
      const tasks = [];
      
      regionData.forEach((region, positionId) => {
        tasks.push({
          positionId,
          regionData: region,
          imageData: region.imageData,
          metadata: {
            modName: region.modName,
            originalBounds: region.originalBounds,
            extractionMetadata: region.extractionMetadata
          }
        });
      });
      
      return tasks;
    }

    /**
     * Process analysis tasks in batches for performance
     * @param {Array} analysisTasks - Array of analysis tasks
     * @returns {Map} Map of detection results
     */
    async processBatch(analysisTasks) {
      const detectionResults = new Map();
      const batchSize = Math.min(this.config.maxConcurrentAnalyses, analysisTasks.length);
      
      for (let i = 0; i < analysisTasks.length; i += batchSize) {
        const batch = analysisTasks.slice(i, i + batchSize);
        const batchPromises = batch.map(task => this.analyzeRegion(task));
        
        try {
          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach((result, index) => {
            const task = batch[index];
            if (result && !result.error) {
              detectionResults.set(task.positionId, {
                modName: task.metadata.modName,
                selected: result.selected,
                confidence: result.confidence,
                analysisData: result.analysisData,
                metadata: {
                  ...result.metadata,
                  originalBounds: task.metadata.originalBounds,
                  extractionQuality: task.metadata.extractionMetadata?.quality || 0
                }
              });
            } else {
              console.warn(`Analysis failed for ${task.positionId}:`, result?.error);
            }
          });
          
        } catch (error) {
          console.error('Batch processing failed:', error);
          // Process batch sequentially as fallback
          for (const task of batch) {
            try {
              const result = await this.analyzeRegion(task);
              if (result && !result.error) {
                detectionResults.set(task.positionId, {
                  modName: task.metadata.modName,
                  selected: result.selected,
                  confidence: result.confidence,
                  analysisData: result.analysisData,
                  metadata: {
                    ...result.metadata,
                    originalBounds: task.metadata.originalBounds,
                    extractionQuality: task.metadata.extractionMetadata?.quality || 0
                  }
                });
              }
            } catch (taskError) {
              console.warn(`Individual task failed for ${task.positionId}:`, taskError);
            }
          }
        }
      }
      
      return detectionResults;
    }

    /**
     * Process analysis tasks sequentially
     * @param {Array} analysisTasks - Array of analysis tasks
     * @returns {Map} Map of detection results
     */
    async processSequential(analysisTasks) {
      const detectionResults = new Map();
      
      for (const task of analysisTasks) {
        try {
          const result = await this.analyzeRegion(task);
          if (result && !result.error) {
            detectionResults.set(task.positionId, {
              modName: task.metadata.modName,
              selected: result.selected,
              confidence: result.confidence,
              analysisData: result.analysisData,
              metadata: {
                ...result.metadata,
                originalBounds: task.metadata.originalBounds,
                extractionQuality: task.metadata.extractionMetadata?.quality || 0
              }
            });
          }
        } catch (error) {
          console.warn(`Analysis failed for ${task.positionId}:`, error);
        }
      }
      
      return detectionResults;
    }

    /**
     * Analyze a single hex region using all detection algorithms
     * @param {Object} task - Analysis task object
     * @returns {Object} Combined analysis result
     */
    async analyzeRegion(task) {
      try {
        const startTime = performance.now();
        
        // Run all detection algorithms
        const algorithmResults = {};
        
        // Run algorithms in parallel for better performance
        const algorithmPromises = Object.entries(this.detectors).map(async ([name, detector]) => {
          try {
            const result = await detector.analyze(task.imageData, task.metadata);
            return { name, result };
          } catch (error) {
            console.warn(`${name} detection failed:`, error);
            return { name, result: null };
          }
        });
        
        const algorithmOutputs = await Promise.all(algorithmPromises);
        
        // Collect algorithm results
        algorithmOutputs.forEach(({ name, result }) => {
          if (result) {
            algorithmResults[name] = result;
          }
        });
        
        // Apply consensus engine
        const consensusResult = this.consensusEngine.calculateConsensus(
          algorithmResults, 
          task.metadata
        );
        
        const processingTime = performance.now() - startTime;
        
        return {
          selected: consensusResult.selected,
          confidence: consensusResult.confidence,
          analysisData: {
            brightness: algorithmResults.brightness?.analysisData || null,
            color: algorithmResults.color?.analysisData || null,
            edge: algorithmResults.edge?.analysisData || null,
            pattern: algorithmResults.pattern?.analysisData || null,
            consensus: consensusResult.consensusData
          },
          metadata: {
            algorithm: this.name,
            version: this.version,
            processingTime,
            algorithmResults: Object.keys(algorithmResults),
            consensusRule: consensusResult.consensusData.decision.rule,
            ambiguous: consensusResult.consensusData.qualityAnalysis.ambiguous,
            reliable: consensusResult.consensusData.qualityAnalysis.reliable,
            timestamp: Date.now()
          }
        };
        
      } catch (error) {
        return {
          selected: false,
          confidence: 0,
          error: error.message,
          metadata: {
            algorithm: this.name,
            version: this.version,
            failed: true,
            timestamp: Date.now()
          }
        };
      }
    }

    /**
     * Calculate overall statistics from detection results
     * @param {Map} detectionResults - Map of detection results
     * @returns {Object} Overall statistics
     */
    calculateOverallStats(detectionResults) {
      const results = Array.from(detectionResults.values());
      
      if (results.length === 0) {
        return {
          totalAnalyzed: 0,
          highConfidence: 0,
          mediumConfidence: 0,
          lowConfidence: 0,
          averageConfidence: 0,
          selectedCount: 0,
          unselectedCount: 0,
          ambiguousCount: 0,
          reliableCount: 0
        };
      }
      
      let totalConfidence = 0;
      let selectedCount = 0;
      let highConfidence = 0;
      let mediumConfidence = 0;
      let lowConfidence = 0;
      let ambiguousCount = 0;
      let reliableCount = 0;
      
      results.forEach(result => {
        totalConfidence += result.confidence;
        
        if (result.selected) selectedCount++;
        
        if (result.confidence > 0.8) highConfidence++;
        else if (result.confidence > 0.5) mediumConfidence++;
        else lowConfidence++;
        
        if (result.metadata.ambiguous) ambiguousCount++;
        if (result.metadata.reliable) reliableCount++;
      });
      
      return {
        totalAnalyzed: results.length,
        highConfidence,
        mediumConfidence,
        lowConfidence,
        averageConfidence: totalConfidence / results.length,
        selectedCount,
        unselectedCount: results.length - selectedCount,
        ambiguousCount,
        reliableCount,
        processingTime: results.reduce((sum, r) => sum + (r.metadata.processingTime || 0), 0)
      };
    }

    /**
     * Update performance tracking
     * @param {Map} detectionResults - Detection results
     * @param {number} totalTime - Total processing time
     */
    updatePerformance(detectionResults, totalTime) {
      const resultCount = detectionResults.size;
      
      if (resultCount === 0) return;
      
      // Update overall performance
      const previousTotal = this.performance.totalProcessed;
      this.performance.totalProcessed += resultCount;
      this.performance.successfulAnalyses += resultCount;
      
      // Update average processing time
      const newAvgTime = (this.performance.averageProcessingTime * previousTotal + totalTime) / 
                        this.performance.totalProcessed;
      this.performance.averageProcessingTime = newAvgTime;
      
      // Update average confidence
      const totalConfidence = Array.from(detectionResults.values())
        .reduce((sum, result) => sum + result.confidence, 0);
      const avgConfidence = totalConfidence / resultCount;
      
      const newAvgConfidence = (this.performance.averageConfidence * previousTotal + avgConfidence * resultCount) /
                              this.performance.totalProcessed;
      this.performance.averageConfidence = newAvgConfidence;
      
      // Update algorithm performance
      this.updateAlgorithmPerformance(detectionResults);
    }

    /**
     * Update individual algorithm performance tracking
     * @param {Map} detectionResults - Detection results
     */
    updateAlgorithmPerformance(detectionResults) {
      const algorithmStats = new Map();
      
      // Initialize stats for all algorithms
      Object.keys(this.detectors).forEach(algorithmName => {
        algorithmStats.set(algorithmName, {
          processedCount: 0,
          averageConfidence: 0,
          averageProcessingTime: 0
        });
      });
      
      // Collect stats from results
      detectionResults.forEach(result => {
        if (result.metadata.algorithmResults) {
          result.metadata.algorithmResults.forEach(algorithmName => {
            const stats = algorithmStats.get(algorithmName);
            if (stats) {
              stats.processedCount++;
              // Additional algorithm-specific stats would be collected here
            }
          });
        }
      });
      
      // Update performance map
      algorithmStats.forEach((stats, algorithmName) => {
        this.performance.algorithmPerformance.set(algorithmName, stats);
      });
    }

    /**
     * Get current algorithm performance stats
     * @returns {Object} Algorithm performance data
     */
    getAlgorithmPerformance() {
      const performance = {};
      this.performance.algorithmPerformance.forEach((stats, algorithmName) => {
        performance[algorithmName] = { ...stats };
      });
      return performance;
    }

    /**
     * Record user correction for calibration
     * @param {string} positionId - Position identifier
     * @param {boolean} actualSelection - Actual selection state
     * @param {Object} detectionResult - Original detection result
     */
    recordUserCorrection(positionId, actualSelection, detectionResult) {
      if (!this.config.calibrationEnabled) return;
      
      const correctionData = {
        positionId,
        actualSelection,
        detectedSelection: detectionResult.selected,
        confidence: detectionResult.confidence,
        algorithmResults: detectionResult.metadata?.algorithmResults || [],
        analysisData: detectionResult.analysisData,
        timestamp: Date.now()
      };
      
      this.calibrationData.push(correctionData);
      
      // Limit calibration data to prevent memory issues
      if (this.calibrationData.length > 1000) {
        this.calibrationData = this.calibrationData.slice(-800); // Keep latest 800 entries
      }
      
      console.log(`User correction recorded for ${positionId}: actual=${actualSelection}, detected=${detectionResult.selected}`);
    }

    /**
     * Calibrate all algorithms based on user corrections
     */
    calibrateAlgorithms() {
      if (!this.config.calibrationEnabled || this.calibrationData.length < 10) {
        console.log('Insufficient calibration data for algorithm optimization');
        return;
      }
      
      console.log(`Calibrating algorithms with ${this.calibrationData.length} correction examples...`);
      
      // Calibrate individual detectors
      Object.values(this.detectors).forEach(detector => {
        if (detector.calibrate && typeof detector.calibrate === 'function') {
          try {
            detector.calibrate(this.calibrationData);
          } catch (error) {
            console.warn(`Calibration failed for ${detector.name || 'detector'}:`, error);
          }
        }
      });
      
      // Calibrate consensus engine
      try {
        this.consensusEngine.calibrate(this.calibrationData);
      } catch (error) {
        console.warn('Consensus engine calibration failed:', error);
      }
      
      console.log('Algorithm calibration completed');
    }

    /**
     * Get comprehensive performance and status report
     * @returns {Object} Status report
     */
    getStatusReport() {
      return {
        engine: {
          name: this.name,
          version: this.version,
          config: { ...this.config },
          performance: { ...this.performance }
        },
        algorithms: Object.fromEntries(
          Object.entries(this.detectors).map(([name, detector]) => [
            name, 
            detector.getConfig ? detector.getConfig() : { name, available: true }
          ])
        ),
        consensus: this.consensusEngine.getConfig(),
        calibration: {
          enabled: this.config.calibrationEnabled,
          dataPoints: this.calibrationData.length,
          lastCalibration: this.calibrationData.length > 0 ? 
            this.calibrationData[this.calibrationData.length - 1].timestamp : null
        }
      };
    }

    /**
     * Reset all performance tracking and calibration data
     */
    reset() {
      this.performance = {
        totalProcessed: 0,
        successfulAnalyses: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
        algorithmPerformance: new Map()
      };
      
      this.calibrationData = [];
      
      // Reset consensus engine performance
      this.consensusEngine.resetPerformanceTracking();
      
      console.log('Recognition engine reset completed');
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecognitionEngine;
  } else {
    global.RecognitionEngine = RecognitionEngine;
  }

})(typeof window !== 'undefined' ? window : global);
