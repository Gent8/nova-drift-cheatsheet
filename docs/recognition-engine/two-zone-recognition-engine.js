/**
 * Two-Zone Recognition Engine
 * Enhanced recognition system that handles Nova Drift's dual-zone layout
 * 
 * Zone-aware processing with different algorithms for:
 * - Core upgrades (template-based matching)
 * - Regular mods (grid-based pattern recognition)
 */

(function(global) {
  'use strict';

  // Import existing recognition components
  const BrightnessDetector = global.BrightnessDetector;
  const ColorDetector = global.ColorDetector;
  const EdgeDetector = global.EdgeDetector;
  const PatternMatcher = global.PatternMatcher;
  const ConsensusEngine = global.ConsensusEngine;
  
  // Import two-zone grid mapper
  const TwoZone = global.TwoZoneGridMapper;

  /**
   * Core Upgrade Recognition Specialist
   * Uses template matching optimized for core upgrades
   */
  class CoreUpgradeRecognizer {
    constructor(config = {}) {
      this.config = {
        templateThreshold: 0.6,
        confidenceBoost: 0.15, // Core upgrades are more reliable
        sizeVariationTolerance: 0.2,
        ...config
      };
      
      this.coreTemplates = this.initializeCoreTemplates();
    }

    /**
     * Initialize templates specific to core upgrades
     */
    initializeCoreTemplates() {
      return {
        body: {
          selected: this.createBodySelectedTemplate(),
          unselected: this.createBodyUnselectedTemplate(),
          characteristics: { 
            primaryColor: [180, 60, 60], // Reddish for body
            shape: 'hexagon',
            iconType: 'shield'
          }
        },
        shield: {
          selected: this.createShieldSelectedTemplate(),
          unselected: this.createShieldUnselectedTemplate(),
          characteristics: {
            primaryColor: [60, 60, 180], // Blue for shield
            shape: 'hexagon',
            iconType: 'barrier'
          }
        },
        weapon: {
          selected: this.createWeaponSelectedTemplate(),
          unselected: this.createWeaponUnselectedTemplate(),
          characteristics: {
            primaryColor: [180, 120, 60], // Orange for weapon
            shape: 'hexagon',
            iconType: 'projectile'
          }
        }
      };
    }

    /**
     * Analyze a core upgrade region
     */
    async analyzeCoreUpgrade(imageData, upgradeType, bounds, metadata = {}) {
      const startTime = performance.now();
      
      try {
        // Get the appropriate template for this upgrade type
        const template = this.coreTemplates[upgradeType];
        if (!template) {
          throw new Error(`Unknown core upgrade type: ${upgradeType}`);
        }

        // Preprocess the image for template matching
        const processedImage = this.preprocessCoreImage(imageData);
        
        // Template matching
        const selectionMatch = this.matchTemplate(processedImage, template.selected);
        const unselectionMatch = this.matchTemplate(processedImage, template.unselected);
        
        // Color analysis specific to this upgrade type
        const colorAnalysis = this.analyzeCoreColors(imageData, template.characteristics);
        
        // Icon detection
        const iconAnalysis = this.detectCoreIcon(imageData, template.characteristics.iconType);
        
        // Combine results
        const isSelected = this.determineCoreSelection({
          selectionMatch,
          unselectionMatch,
          colorAnalysis,
          iconAnalysis,
          upgradeType
        });
        
        const confidence = this.calculateCoreConfidence({
          selectionMatch,
          unselectionMatch,
          colorAnalysis,
          iconAnalysis,
          upgradeType
        });

        return {
          zone: 'core',
          upgradeType,
          selected: isSelected,
          confidence: Math.min(1.0, confidence + this.config.confidenceBoost),
          analysisData: {
            templateMatching: { selectionMatch, unselectionMatch },
            colorAnalysis,
            iconAnalysis,
            processingTime: performance.now() - startTime
          },
          metadata: {
            bounds,
            algorithm: 'core-template-matching',
            ...metadata
          }
        };

      } catch (error) {
        console.error(`Core upgrade analysis failed for ${upgradeType}:`, error);
        return {
          zone: 'core',
          upgradeType,
          selected: false,
          confidence: 0,
          error: error.message,
          analysisData: {
            processingTime: performance.now() - startTime
          }
        };
      }
    }

    /**
     * Template matching for core upgrades
     */
    matchTemplate(image, template) {
      // Simplified template matching
      // In a real implementation, this would use normalized cross-correlation
      const similarity = this.calculateSimilarity(image, template);
      return {
        score: similarity,
        confidence: similarity > this.config.templateThreshold ? similarity : 0,
        matched: similarity > this.config.templateThreshold
      };
    }

    /**
     * Analyze colors specific to core upgrades
     */
    analyzeCoreColors(imageData, characteristics) {
      const data = imageData.data;
      const targetColor = characteristics.primaryColor;
      let colorMatchPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is close to expected color
        const colorDistance = Math.sqrt(
          Math.pow(r - targetColor[0], 2) +
          Math.pow(g - targetColor[1], 2) +
          Math.pow(b - targetColor[2], 2)
        );
        
        if (colorDistance < 100) { // Tolerance threshold
          colorMatchPixels++;
        }
        totalPixels++;
      }
      
      const colorMatchRatio = colorMatchPixels / totalPixels;
      return {
        expectedColor: targetColor,
        matchRatio: colorMatchRatio,
        confidence: Math.min(1.0, colorMatchRatio * 2) // Scale up
      };
    }

    /**
     * Detect core upgrade icons
     */
    detectCoreIcon(imageData, iconType) {
      // Simplified icon detection
      // Would implement specific pattern recognition for each icon type
      return {
        iconType,
        detected: true, // Placeholder
        confidence: 0.7 // Placeholder
      };
    }

    /**
     * Determine selection status for core upgrades
     */
    determineCoreSelection({ selectionMatch, unselectionMatch, colorAnalysis, iconAnalysis }) {
      // Weight different factors
      const templateScore = selectionMatch.matched ? selectionMatch.score : 0;
      const colorScore = colorAnalysis.confidence;
      const iconScore = iconAnalysis.confidence;
      
      const totalScore = (templateScore * 0.5) + (colorScore * 0.3) + (iconScore * 0.2);
      return totalScore > 0.5;
    }

    /**
     * Calculate confidence for core upgrades
     */
    calculateCoreConfidence({ selectionMatch, unselectionMatch, colorAnalysis, iconAnalysis }) {
      const templateConfidence = Math.max(selectionMatch.confidence, unselectionMatch.confidence);
      const colorConfidence = colorAnalysis.confidence;
      const iconConfidence = iconAnalysis.confidence;
      
      return (templateConfidence * 0.5) + (colorConfidence * 0.3) + (iconConfidence * 0.2);
    }

    // Template creation methods (simplified placeholders)
    createBodySelectedTemplate() { return { type: 'body', state: 'selected' }; }
    createBodyUnselectedTemplate() { return { type: 'body', state: 'unselected' }; }
    createShieldSelectedTemplate() { return { type: 'shield', state: 'selected' }; }
    createShieldUnselectedTemplate() { return { type: 'shield', state: 'unselected' }; }
    createWeaponSelectedTemplate() { return { type: 'weapon', state: 'selected' }; }
    createWeaponUnselectedTemplate() { return { type: 'weapon', state: 'unselected' }; }

    preprocessCoreImage(imageData) {
      // Preprocessing specific to core upgrades
      return imageData; // Placeholder
    }

    calculateSimilarity(image1, image2) {
      // Simplified similarity calculation
      return Math.random() * 0.4 + 0.5; // Placeholder returning 0.5-0.9
    }
  }

  /**
   * Regular Mod Recognition Specialist
   * Uses grid-based pattern recognition for regular mods
   */
  class RegularModRecognizer {
    constructor(config = {}) {
      this.config = {
        patternThreshold: 0.5,
        gridAlignmentWeight: 0.3,
        consistencyBonus: 0.1,
        neighborAnalysis: true,
        ...config
      };
      
      this.patternMatcher = new PatternMatcher();
    }

    /**
     * Analyze a regular mod region
     */
    async analyzeRegularMod(imageData, gridPosition, bounds, metadata = {}) {
      const startTime = performance.now();
      
      try {
        // Use existing pattern matching for regular mods
        const patternResult = await this.patternMatcher.analyze(imageData, metadata);
        
        // Add grid-specific analysis
        const gridAnalysis = this.analyzeGridAlignment(imageData, gridPosition, bounds);
        
        // Neighbor consistency check
        const neighborAnalysis = this.config.neighborAnalysis ? 
          await this.analyzeNeighborConsistency(gridPosition, metadata) : null;
        
        // Regular mod specific adjustments
        const regularModAdjustments = this.applyRegularModAdjustments(patternResult);
        
        const confidence = this.calculateRegularConfidence({
          patternResult,
          gridAnalysis,
          neighborAnalysis,
          regularModAdjustments
        });

        return {
          zone: 'regular',
          gridPosition,
          selected: patternResult.selected,
          confidence,
          analysisData: {
            patternMatching: patternResult.analysisData,
            gridAnalysis,
            neighborAnalysis,
            adjustments: regularModAdjustments,
            processingTime: performance.now() - startTime
          },
          metadata: {
            bounds,
            algorithm: 'regular-grid-pattern',
            ...metadata
          }
        };

      } catch (error) {
        console.error(`Regular mod analysis failed at ${gridPosition.q},${gridPosition.r}:`, error);
        return {
          zone: 'regular',
          gridPosition,
          selected: false,
          confidence: 0,
          error: error.message,
          analysisData: {
            processingTime: performance.now() - startTime
          }
        };
      }
    }

    /**
     * Analyze how well the region aligns with grid expectations
     */
    analyzeGridAlignment(imageData, gridPosition, bounds) {
      // Check if the region characteristics match expected grid position
      const expectedSize = 48; // Expected hex size
      const actualSize = Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top);
      const sizeAlignment = 1 - Math.abs(actualSize - expectedSize) / expectedSize;
      
      return {
        sizeAlignment: Math.max(0, sizeAlignment),
        positionAlignment: 1.0, // Placeholder - would check actual positioning
        overallAlignment: sizeAlignment * 0.7 + 1.0 * 0.3
      };
    }

    /**
     * Analyze consistency with neighboring mods
     */
    async analyzeNeighborConsistency(gridPosition, metadata) {
      // Placeholder for neighbor analysis
      // Would check if surrounding mods have consistent selection patterns
      return {
        neighboringMods: 0,
        consistentNeighbors: 0,
        consistencyScore: 0.5 // Neutral
      };
    }

    /**
     * Apply adjustments specific to regular mods
     */
    applyRegularModAdjustments(patternResult) {
      // Regular mods might need different thresholds or interpretations
      return {
        confidenceAdjustment: 0,
        selectionAdjustment: false,
        reasoning: 'standard-regular-mod'
      };
    }

    /**
     * Calculate confidence for regular mods
     */
    calculateRegularConfidence({ patternResult, gridAnalysis, neighborAnalysis, regularModAdjustments }) {
      let baseConfidence = patternResult.confidence;
      
      // Grid alignment bonus
      if (gridAnalysis) {
        baseConfidence += gridAnalysis.overallAlignment * this.config.gridAlignmentWeight;
      }
      
      // Neighbor consistency bonus
      if (neighborAnalysis && neighborAnalysis.consistencyScore > 0.7) {
        baseConfidence += this.config.consistencyBonus;
      }
      
      // Apply adjustments
      baseConfidence += regularModAdjustments.confidenceAdjustment;
      
      return Math.min(1.0, Math.max(0, baseConfidence));
    }
  }

  /**
   * Main Two-Zone Recognition Engine
   */
  class TwoZoneRecognitionEngine {
    constructor(config = {}) {
      this.config = {
        coreRecognitionConfig: {},
        regularRecognitionConfig: {},
        zoneValidation: true,
        performanceTracking: true,
        ...config
      };
      
      this.coreRecognizer = new CoreUpgradeRecognizer(this.config.coreRecognitionConfig);
      this.regularRecognizer = new RegularModRecognizer(this.config.regularRecognitionConfig);
      
      this.performance = {
        coreAnalyses: 0,
        regularAnalyses: 0,
        totalProcessingTime: 0,
        successRate: 0
      };
    }

    /**
     * Analyze regions with zone awareness
     */
    async analyzeRegions(regionData, gridMappingResult, metadata = {}) {
      const startTime = performance.now();
      
      try {
        console.log(`Two-zone recognition analyzing ${regionData.size} regions...`);
        
        const results = new Map();
        const coreResults = [];
        const regularResults = [];
        
        // Process each region based on its zone
        for (const [positionId, regionInfo] of regionData) {
          const zoneInfo = this.determineZone(positionId, gridMappingResult);
          
          let analysisResult;
          
          if (zoneInfo.zone === 'core') {
            analysisResult = await this.coreRecognizer.analyzeCoreUpgrade(
              regionInfo.imageData,
              zoneInfo.upgradeType,
              regionInfo.bounds,
              { ...metadata, positionId }
            );
            coreResults.push(analysisResult);
            this.performance.coreAnalyses++;
            
          } else if (zoneInfo.zone === 'regular') {
            analysisResult = await this.regularRecognizer.analyzeRegularMod(
              regionInfo.imageData,
              zoneInfo.gridPosition,
              regionInfo.bounds,
              { ...metadata, positionId }
            );
            regularResults.push(analysisResult);
            this.performance.regularAnalyses++;
          } else {
            console.warn(`Unknown zone for position ${positionId}:`, zoneInfo);
            continue;
          }
          
          if (analysisResult && !analysisResult.error) {
            results.set(positionId, analysisResult);
          }
        }
        
        // Calculate overall statistics
        const overallStats = this.calculateTwoZoneStats(results, coreResults, regularResults);
        
        // Update performance tracking
        this.updatePerformanceTracking(performance.now() - startTime, results.size);
        
        const finalResult = {
          type: 'two-zone-recognition-complete',
          detail: {
            detectionResults: results,
            zoneBreakdown: {
              coreResults: new Map(coreResults.map((r, i) => [i, r])),
              regularResults: new Map(regularResults.map((r, i) => [i, r]))
            },
            overallStats,
            processingMetadata: {
              totalRegions: regionData.size,
              successfulDetections: results.size,
              coreUpgradesAnalyzed: coreResults.length,
              regularModsAnalyzed: regularResults.length,
              processingTime: performance.now() - startTime,
              timestamp: Date.now()
            }
          }
        };
        
        console.log(`Two-zone recognition completed: ${results.size}/${regionData.size} successful`);
        return finalResult;
        
      } catch (error) {
        console.error('Two-zone recognition failed:', error);
        throw new Error(`Two-zone recognition engine failed: ${error.message}`);
      }
    }

    /**
     * Determine which zone a region belongs to
     */
    determineZone(positionId, gridMappingResult) {
      // Extract zone information from grid mapping result
      if (gridMappingResult && gridMappingResult.coordinateMap) {
        const coordData = gridMappingResult.coordinateMap.get(positionId);
        
        if (coordData) {
          if (coordData.zone === 'core') {
            // Determine core upgrade type from position or name
            const upgradeType = this.identifyCoreUpgradeType(coordData);
            return {
              zone: 'core',
              upgradeType
            };
          } else if (coordData.zone === 'regular') {
            return {
              zone: 'regular',
              gridPosition: coordData.gridPosition
            };
          }
        }
      }
      
      // Fallback zone determination
      return {
        zone: 'unknown',
        reason: 'No zone information available'
      };
    }

    /**
     * Identify core upgrade type from coordinate data
     */
    identifyCoreUpgradeType(coordData) {
      const modName = coordData.modName?.toLowerCase() || '';
      
      if (modName.includes('body') || coordData.upgradeType === 'body') {
        return 'body';
      } else if (modName.includes('shield') || coordData.upgradeType === 'shield') {
        return 'shield';
      } else if (modName.includes('weapon') || coordData.upgradeType === 'weapon') {
        return 'weapon';
      }
      
      // Fallback to position-based identification
      if (coordData.centerPoint) {
        // Use relative position to guess upgrade type
        // This is simplified - real implementation would use more sophisticated logic
        return 'weapon'; // Default to weapon
      }
      
      return 'unknown';
    }

    /**
     * Calculate statistics for two-zone analysis
     */
    calculateTwoZoneStats(allResults, coreResults, regularResults) {
      const totalConfidence = Array.from(allResults.values())
        .reduce((sum, result) => sum + (result.confidence || 0), 0);
      
      const coreConfidence = coreResults
        .reduce((sum, result) => sum + (result.confidence || 0), 0);
      
      const regularConfidence = regularResults
        .reduce((sum, result) => sum + (result.confidence || 0), 0);
      
      return {
        totalRegions: allResults.size,
        averageConfidence: allResults.size > 0 ? totalConfidence / allResults.size : 0,
        coreUpgrades: {
          count: coreResults.length,
          averageConfidence: coreResults.length > 0 ? coreConfidence / coreResults.length : 0,
          successRate: coreResults.filter(r => !r.error).length / Math.max(1, coreResults.length)
        },
        regularMods: {
          count: regularResults.length,
          averageConfidence: regularResults.length > 0 ? regularConfidence / regularResults.length : 0,
          successRate: regularResults.filter(r => !r.error).length / Math.max(1, regularResults.length)
        }
      };
    }

    /**
     * Update performance tracking
     */
    updatePerformanceTracking(processingTime, successfulResults) {
      this.performance.totalProcessingTime += processingTime;
      this.performance.successRate = successfulResults / 
        (this.performance.coreAnalyses + this.performance.regularAnalyses);
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
      return {
        ...this.performance,
        averageProcessingTime: this.performance.totalProcessingTime / 
          (this.performance.coreAnalyses + this.performance.regularAnalyses)
      };
    }

    /**
     * Enable/disable zone validation
     */
    setZoneValidation(enabled) {
      this.config.zoneValidation = enabled;
    }
  }

  // Export for use
  global.TwoZoneRecognitionEngine = {
    TwoZoneRecognitionEngine,
    CoreUpgradeRecognizer,
    RegularModRecognizer
  };

})(typeof window !== 'undefined' ? window : global);