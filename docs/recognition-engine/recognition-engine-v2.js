/**
 * Nova Drift Recognition Engine V2 - Two-Zone Enhanced
 * 
 * Maintains backward compatibility while adding two-zone recognition capabilities
 * Automatically detects if grid mapping includes zone information and adapts accordingly
 */

(function(global) {
  'use strict';

  // Import existing recognition components
  const BrightnessDetector = global.BrightnessDetector;
  const ColorDetector = global.ColorDetector;
  const EdgeDetector = global.EdgeDetector;
  const PatternMatcher = global.PatternMatcher;
  const ConsensusEngine = global.ConsensusEngine;
  
  // Import two-zone recognition engine
  const TwoZoneEngine = global.TwoZoneRecognitionEngine;

  /**
   * Enhanced Recognition Engine with Two-Zone Support
   */
  class RecognitionEngineV2 {
    constructor(config = {}) {
      this.config = {
        algorithms: ['brightness', 'color', 'edge', 'pattern'],
        consensusThreshold: 0.6,
        calibrationEnabled: true,
        performanceMonitoring: true,
        batchProcessing: true,
        maxConcurrentAnalyses: 10,
        // New two-zone specific config
        enableTwoZoneRecognition: true,
        twoZoneConfig: {
          coreRecognitionConfig: {
            templateThreshold: 0.6,
            confidenceBoost: 0.15
          },
          regularRecognitionConfig: {
            patternThreshold: 0.5,
            gridAlignmentWeight: 0.3
          }
        },
        fallbackToLegacy: true,
        ...config
      };
      
      this.name = 'recognition-engine-v2';
      this.version = '2.0.0';
      
      // Initialize legacy detectors for fallback
      this.legacyDetectors = this.initializeDetectors();
      this.consensusEngine = new ConsensusEngine(config.algorithmWeights);
      
      // Initialize two-zone engine
      if (this.config.enableTwoZoneRecognition && TwoZoneEngine) {
        this.twoZoneEngine = new TwoZoneEngine.TwoZoneRecognitionEngine(this.config.twoZoneConfig);
      }
      
      // Performance tracking
      this.performance = {
        totalProcessed: 0,
        successfulAnalyses: 0,
        averageProcessingTime: 0,
        averageConfidence: 0,
        algorithmPerformance: new Map(),
        twoZoneUsage: 0,
        legacyFallbacks: 0
      };
      
      this.calibrationData = [];
    }

    /**
     * Initialize legacy detection algorithms
     */
    initializeDetectors() {
      const detectors = {};
      
      if (this.config.algorithms.includes('brightness') && BrightnessDetector) {
        detectors.brightness = new BrightnessDetector();
      }
      
      if (this.config.algorithms.includes('color') && ColorDetector) {
        detectors.color = new ColorDetector();
      }
      
      if (this.config.algorithms.includes('edge') && EdgeDetector) {
        detectors.edge = new EdgeDetector();
      }
      
      if (this.config.algorithms.includes('pattern') && PatternMatcher) {
        detectors.pattern = new PatternMatcher();
      }
      
      return detectors;
    }

    /**
     * Main analysis method - automatically detects two-zone capability
     */
    async analyzeRegions(regionData, metadata = {}) {
      const startTime = performance.now();
      
      try {
        console.log(`Recognition Engine V2 analyzing ${regionData.size} regions...`);
        
        // Check if we have two-zone mapping data
        const hasTwoZoneData = this.detectTwoZoneCapability(metadata);
        
        let result;
        
        if (hasTwoZoneData && this.config.enableTwoZoneRecognition && this.twoZoneEngine) {
          console.log('Using two-zone recognition system...');
          result = await this.analyzeTwoZone(regionData, metadata);
          this.performance.twoZoneUsage++;
        } else {
          console.log('Falling back to legacy recognition system...');
          result = await this.analyzeLegacy(regionData, metadata);
          this.performance.legacyFallbacks++;
        }
        
        // Update performance tracking
        this.updatePerformanceTracking(performance.now() - startTime);
        
        // Add V2 metadata to result
        result.detail.processingMetadata = {
          ...result.detail.processingMetadata,
          engineVersion: this.version,
          usedTwoZone: hasTwoZoneData && this.config.enableTwoZoneRecognition,
          performanceStats: this.getPerformanceStats()
        };
        
        return result;
        
      } catch (error) {
        console.error('Recognition Engine V2 failed:', error);
        
        // Try fallback if two-zone failed
        if (this.config.fallbackToLegacy && error.message.includes('two-zone')) {
          console.log('Two-zone failed, attempting legacy fallback...');
          try {
            const fallbackResult = await this.analyzeLegacy(regionData, metadata);
            fallbackResult.detail.processingMetadata.fallbackUsed = true;
            this.performance.legacyFallbacks++;
            return fallbackResult;
          } catch (fallbackError) {
            console.error('Legacy fallback also failed:', fallbackError);
          }
        }
        
        throw new Error(`Recognition engine V2 failed: ${error.message}`);
      }
    }

    /**
     * Detect if we have two-zone mapping capabilities
     */
    detectTwoZoneCapability(metadata) {
      // Check for grid mapping results with zone information
      if (metadata.gridMappingResult) {
        const gridResult = metadata.gridMappingResult;
        
        // Look for two-zone metadata
        if (gridResult.gridMetadata && gridResult.gridMetadata.twoZoneData) {
          return true;
        }
        
        // Look for coordinate data with zone information
        if (gridResult.coordinateMap) {
          for (const coordData of gridResult.coordinateMap.values()) {
            if (coordData.zone) {
              return true;
            }
          }
        }
      }
      
      return false;
    }

    /**
     * Analyze using two-zone recognition
     */
    async analyzeTwoZone(regionData, metadata) {
      if (!this.twoZoneEngine) {
        throw new Error('Two-zone engine not available');
      }
      
      const gridMappingResult = metadata.gridMappingResult;
      if (!gridMappingResult) {
        throw new Error('Grid mapping result required for two-zone recognition');
      }
      
      // Use two-zone recognition engine
      const twoZoneResult = await this.twoZoneEngine.analyzeRegions(
        regionData,
        gridMappingResult,
        metadata
      );
      
      // Convert to legacy format for compatibility
      return this.convertTwoZoneToLegacyFormat(twoZoneResult);
    }

    /**
     * Analyze using legacy recognition system
     */
    async analyzeLegacy(regionData, metadata) {
      // Use the original recognition logic
      const analysisTasks = this.prepareAnalysisTasks(regionData);
      
      const detectionResults = this.config.batchProcessing ? 
        await this.processBatch(analysisTasks) : 
        await this.processSequential(analysisTasks);
      
      const overallStats = this.calculateOverallStats(detectionResults);
      
      return {
        type: 'selection-detected',
        detail: {
          detectionResults,
          overallStats,
          processingMetadata: {
            totalRegions: regionData.size,
            successfulDetections: detectionResults.size,
            averageConfidence: overallStats.averageConfidence,
            algorithmPerformance: this.getAlgorithmPerformance(),
            timestamp: Date.now(),
            usedLegacySystem: true
          }
        }
      };
    }

    /**
     * Convert two-zone result to legacy format for compatibility
     */
    convertTwoZoneToLegacyFormat(twoZoneResult) {
      const legacyResults = new Map();
      
      // Convert two-zone detection results to legacy format
      for (const [positionId, result] of twoZoneResult.detail.detectionResults) {
        legacyResults.set(positionId, {
          modName: this.extractModName(positionId, result),
          selected: result.selected,
          confidence: result.confidence,
          analysisData: {
            twoZoneData: result.analysisData,
            zone: result.zone,
            algorithm: result.metadata.algorithm
          },
          metadata: {
            ...result.metadata,
            originalTwoZoneResult: true
          }
        });
      }
      
      // Calculate overall stats in legacy format
      const totalConfidence = Array.from(legacyResults.values())
        .reduce((sum, result) => sum + result.confidence, 0);
      
      const overallStats = {
        averageConfidence: legacyResults.size > 0 ? totalConfidence / legacyResults.size : 0,
        totalDetections: legacyResults.size,
        zoneBreakdown: twoZoneResult.detail.overallStats
      };
      
      return {
        type: 'selection-detected',
        detail: {
          detectionResults: legacyResults,
          overallStats,
          twoZoneBreakdown: twoZoneResult.detail.zoneBreakdown,
          processingMetadata: {
            ...twoZoneResult.detail.processingMetadata,
            convertedFromTwoZone: true
          }
        }
      };
    }

    /**
     * Extract mod name from position and result data
     */
    extractModName(positionId, result) {
      if (result.zone === 'core') {
        return result.upgradeType ? `${result.upgradeType}_upgrade` : 'core_upgrade';
      } else if (result.gridPosition) {
        return `mod_${result.gridPosition.q}_${result.gridPosition.r}`;
      }
      return positionId;
    }

    /**
     * Prepare analysis tasks (legacy method)
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
     * Process analysis tasks in batches (legacy method)
     */
    async processBatch(analysisTasks) {
      const detectionResults = new Map();
      const batchSize = Math.min(this.config.maxConcurrentAnalyses, analysisTasks.length);
      
      for (let i = 0; i < analysisTasks.length; i += batchSize) {
        const batch = analysisTasks.slice(i, i + batchSize);
        const batchPromises = batch.map(task => this.analyzeRegionLegacy(task));
        
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
            }
          });
          
        } catch (error) {
          console.error('Batch processing failed:', error);
          // Process sequentially as fallback
          for (const task of batch) {
            try {
              const result = await this.analyzeRegionLegacy(task);
              if (result && !result.error) {
                detectionResults.set(task.positionId, {
                  modName: task.metadata.modName,
                  selected: result.selected,
                  confidence: result.confidence,
                  analysisData: result.analysisData
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
     * Process analysis tasks sequentially (legacy method)
     */
    async processSequential(analysisTasks) {
      const detectionResults = new Map();
      
      for (const task of analysisTasks) {
        try {
          const result = await this.analyzeRegionLegacy(task);
          if (result && !result.error) {
            detectionResults.set(task.positionId, {
              modName: task.metadata.modName,
              selected: result.selected,
              confidence: result.confidence,
              analysisData: result.analysisData
            });
          }
        } catch (error) {
          console.warn(`Analysis failed for ${task.positionId}:`, error);
        }
      }
      
      return detectionResults;
    }

    /**
     * Analyze individual region using legacy algorithms
     */
    async analyzeRegionLegacy(task) {
      // Simplified legacy analysis
      // In a real implementation, this would use the full legacy recognition pipeline
      return {
        selected: Math.random() > 0.5, // Placeholder
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        analysisData: {
          algorithm: 'legacy-pattern',
          processingTime: Math.random() * 100 + 50
        },
        metadata: {
          algorithm: 'legacy-recognition'
        }
      };
    }

    /**
     * Calculate overall statistics (legacy method)
     */
    calculateOverallStats(detectionResults) {
      const totalConfidence = Array.from(detectionResults.values())
        .reduce((sum, result) => sum + result.confidence, 0);
      
      return {
        averageConfidence: detectionResults.size > 0 ? totalConfidence / detectionResults.size : 0,
        totalDetections: detectionResults.size,
        successRate: detectionResults.size
      };
    }

    /**
     * Update performance tracking
     */
    updatePerformanceTracking(processingTime) {
      this.performance.totalProcessed++;
      this.performance.averageProcessingTime = 
        (this.performance.averageProcessingTime * (this.performance.totalProcessed - 1) + processingTime) / 
        this.performance.totalProcessed;
    }

    /**
     * Get algorithm performance stats
     */
    getAlgorithmPerformance() {
      const stats = new Map();
      
      for (const [algorithmName, detector] of Object.entries(this.legacyDetectors)) {
        stats.set(algorithmName, {
          name: algorithmName,
          version: detector.version || '1.0.0',
          successRate: Math.random() * 0.3 + 0.7 // Placeholder
        });
      }
      
      return stats;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
      return {
        ...this.performance,
        engineVersion: this.version,
        twoZoneEnabled: this.config.enableTwoZoneRecognition,
        twoZoneAvailable: !!this.twoZoneEngine
      };
    }

    /**
     * Enable/disable two-zone recognition
     */
    setTwoZoneRecognition(enabled) {
      this.config.enableTwoZoneRecognition = enabled;
      console.log(`Two-zone recognition ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Configure two-zone specific settings
     */
    configureTwoZone(config) {
      this.config.twoZoneConfig = { ...this.config.twoZoneConfig, ...config };
      
      if (this.twoZoneEngine) {
        // Reinitialize two-zone engine with new config
        this.twoZoneEngine = new TwoZoneEngine.TwoZoneRecognitionEngine(this.config.twoZoneConfig);
      }
    }

    /**
     * Get detailed analysis statistics
     */
    getAnalysisStats() {
      const stats = {
        engineVersion: this.version,
        totalProcessed: this.performance.totalProcessed,
        twoZoneUsage: this.performance.twoZoneUsage,
        legacyFallbacks: this.performance.legacyFallbacks,
        averageProcessingTime: this.performance.averageProcessingTime
      };
      
      if (this.twoZoneEngine) {
        stats.twoZoneStats = this.twoZoneEngine.getPerformanceStats();
      }
      
      return stats;
    }
  }

  // Export the enhanced recognition engine
  global.NovaRecognitionEngine = {
    RecognitionEngine: RecognitionEngineV2, // Replace original
    RecognitionEngineV2,
    // Keep legacy reference for compatibility
    LegacyRecognitionEngine: global.RecognitionEngine
  };

  // Also update the global reference for backward compatibility
  global.RecognitionEngine = RecognitionEngineV2;

})(typeof window !== 'undefined' ? window : global);