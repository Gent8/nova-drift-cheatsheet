/**
 * Nova Drift Brightness Detector - Phase 4
 * Analyzes hex regions based on brightness patterns for selection detection
 */

(function(global) {
  'use strict';

  // Import RecognitionUtils for shared functionality
  const RecognitionUtils = global.RecognitionUtils || require('./recognition-utils.js');

  /**
   * Brightness-based detection algorithm
   * Selected hexes tend to be brighter than unselected ones
   */
  class BrightnessDetector {
    constructor(thresholds = {}) {
      this.thresholds = {
        selectedMin: 0.6,        // Selected hexes are typically brighter
        unselectedMax: 0.45,     // Unselected hexes are typically dimmer
        ambiguousRange: 0.15,    // Range where confidence is reduced
        contrastMin: 0.1,        // Minimum contrast for reliable detection
        brightnessVarianceThreshold: 0.05, // Max acceptable variance for uniform regions
        ...thresholds
      };
      
      this.name = 'brightness';
      this.version = '1.0.0';
    }

    /**
     * Analyze an image region for selection status based on brightness
     * @param {ImageData} imageData - 48x48 normalized hex region
     * @param {Object} metadata - Additional context about the region
     * @returns {Object} Analysis result with selection prediction and confidence
     */
    analyze(imageData, metadata = {}) {
      try {
        const startTime = performance.now();
        
        // Calculate basic brightness metrics
        const averageBrightness = RecognitionUtils.calculateAverageBrightness(imageData);
        const distribution = RecognitionUtils.analyzeBrightnessDistribution(imageData);
        
        // Analyze brightness patterns specific to selection state
        const centerBrightness = this.calculateCenterBrightness(imageData);
        const edgeBrightness = this.calculateEdgeBrightness(imageData);
        const brightnessGradient = this.calculateBrightnessGradient(imageData);
        const uniformity = this.calculateBrightnessUniformity(distribution);
        
        // Selection prediction based on brightness thresholds
        const brightnessPrediction = this.predictSelectionFromBrightness(averageBrightness);
        const gradientPrediction = this.predictSelectionFromGradient(brightnessGradient);
        const uniformityPrediction = this.predictSelectionFromUniformity(uniformity);
        
        // Calculate confidence based on multiple factors
        const confidence = this.calculateConfidence({
          averageBrightness,
          distribution,
          centerBrightness,
          edgeBrightness,
          brightnessGradient,
          uniformity,
          brightnessPrediction,
          gradientPrediction,
          uniformityPrediction
        });
        
        // Final selection decision with consensus
        const selectedVotes = [
          brightnessPrediction.selected,
          gradientPrediction.selected,
          uniformityPrediction.selected
        ];
        const selectedCount = selectedVotes.filter(v => v).length;
        const selected = selectedCount >= 2; // Majority vote
        
        const processingTime = performance.now() - startTime;
        
        return {
          selected,
          confidence,
          brightness: averageBrightness,
          analysisData: {
            averageBrightness,
            centerBrightness,
            edgeBrightness,
            brightnessGradient,
            uniformity,
            distribution: {
              mean: distribution.mean,
              stdDev: distribution.stdDev,
              range: distribution.range
            },
            predictions: {
              brightness: brightnessPrediction,
              gradient: gradientPrediction,
              uniformity: uniformityPrediction
            }
          },
          metadata: {
            algorithm: this.name,
            version: this.version,
            processingTime,
            pixelCount: distribution.pixelCount,
            timestamp: Date.now()
          }
        };
        
      } catch (error) {
        console.error('Brightness detection failed:', error);
        return {
          selected: false,
          confidence: 0,
          brightness: 0,
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
     * Calculate brightness in the center region of the hex
     * @param {ImageData} imageData - Image data to analyze
     * @returns {number} Center brightness (0-1)
     */
    calculateCenterBrightness(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const centerRadius = Math.min(width, height) * 0.2; // 20% of the smallest dimension
      
      let totalBrightness = 0;
      let pixelCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance <= centerRadius && RecognitionUtils.isInHexMask(x, y, width, height)) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            if (a > 0) {
              totalBrightness += RecognitionUtils.calculateLuminance(r, g, b);
              pixelCount++;
            }
          }
        }
      }
      
      return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }

    /**
     * Calculate brightness at the edges of the hex
     * @param {ImageData} imageData - Image data to analyze
     * @returns {number} Edge brightness (0-1)
     */
    calculateEdgeBrightness(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const outerRadius = Math.min(width, height) * 0.4;
      const innerRadius = outerRadius * 0.7; // Create an edge ring
      
      let totalBrightness = 0;
      let pixelCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          if (distance >= innerRadius && distance <= outerRadius && 
              RecognitionUtils.isInHexMask(x, y, width, height)) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            if (a > 0) {
              totalBrightness += RecognitionUtils.calculateLuminance(r, g, b);
              pixelCount++;
            }
          }
        }
      }
      
      return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }

    /**
     * Calculate brightness gradient from center to edge
     * @param {ImageData} imageData - Image data to analyze
     * @returns {number} Brightness gradient (positive = brighter center)
     */
    calculateBrightnessGradient(imageData) {
      const centerBrightness = this.calculateCenterBrightness(imageData);
      const edgeBrightness = this.calculateEdgeBrightness(imageData);
      return centerBrightness - edgeBrightness;
    }

    /**
     * Calculate brightness uniformity across the hex
     * @param {Object} distribution - Brightness distribution data
     * @returns {number} Uniformity score (0-1, 1 = very uniform)
     */
    calculateBrightnessUniformity(distribution) {
      // Lower standard deviation indicates more uniform brightness
      const normalizedStdDev = Math.min(1, distribution.stdDev / 0.3); // Normalize to 0-1
      return 1 - normalizedStdDev;
    }

    /**
     * Predict selection based on average brightness
     * @param {number} brightness - Average brightness (0-1)
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromBrightness(brightness) {
      const { selectedMin, unselectedMax, ambiguousRange } = this.thresholds;
      
      let selected;
      let confidence;
      
      if (brightness >= selectedMin) {
        selected = true;
        confidence = Math.min(1, (brightness - selectedMin) / (1 - selectedMin));
      } else if (brightness <= unselectedMax) {
        selected = false;
        confidence = Math.min(1, (unselectedMax - brightness) / unselectedMax);
      } else {
        // In ambiguous range
        selected = brightness > (selectedMin + unselectedMax) / 2;
        const distanceFromThreshold = Math.abs(brightness - (selectedMin + unselectedMax) / 2);
        confidence = 1 - (distanceFromThreshold / (ambiguousRange / 2));
        confidence = Math.max(0.1, confidence); // Minimum confidence in ambiguous range
      }
      
      return { selected, confidence, reason: 'brightness-threshold' };
    }

    /**
     * Predict selection based on brightness gradient
     * @param {number} gradient - Brightness gradient
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromGradient(gradient) {
      // Selected hexes often have a positive gradient (brighter center)
      // Unselected hexes may have negative or minimal gradient
      const selected = gradient > 0.05;
      const confidence = Math.min(1, Math.abs(gradient) / 0.2);
      
      return { selected, confidence, reason: 'brightness-gradient' };
    }

    /**
     * Predict selection based on brightness uniformity
     * @param {number} uniformity - Uniformity score (0-1)
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromUniformity(uniformity) {
      // Very uniform regions might indicate selection highlight
      // But some variation is normal
      const selected = uniformity > 0.7 && uniformity < 0.95;
      const confidence = selected ? Math.min(1, uniformity) : 0.3;
      
      return { selected, confidence, reason: 'brightness-uniformity' };
    }

    /**
     * Calculate overall confidence in the brightness analysis
     * @param {Object} analysisData - All analysis data
     * @returns {number} Overall confidence (0-1)
     */
    calculateConfidence(analysisData) {
      const {
        averageBrightness,
        distribution,
        brightnessGradient,
        brightnessPrediction,
        gradientPrediction,
        uniformityPrediction
      } = analysisData;
      
      // Base confidence from brightness threshold
      let confidence = brightnessPrediction.confidence;
      
      // Boost confidence if gradient supports the prediction
      if (gradientPrediction.selected === brightnessPrediction.selected) {
        confidence = Math.min(1, confidence + gradientPrediction.confidence * 0.2);
      }
      
      // Boost confidence if uniformity supports the prediction
      if (uniformityPrediction.selected === brightnessPrediction.selected) {
        confidence = Math.min(1, confidence + uniformityPrediction.confidence * 0.1);
      }
      
      // Reduce confidence for poor quality regions
      if (distribution.pixelCount < 100) {
        confidence *= 0.8; // Insufficient data
      }
      
      // Reduce confidence for very low contrast
      const contrast = distribution.range.max - distribution.range.min;
      if (contrast < this.thresholds.contrastMin) {
        confidence *= 0.7; // Low contrast reduces reliability
      }
      
      // Reduce confidence if brightness is in highly ambiguous range
      const ambiguousCenter = (this.thresholds.selectedMin + this.thresholds.unselectedMax) / 2;
      const ambiguousDistance = Math.abs(averageBrightness - ambiguousCenter);
      if (ambiguousDistance < this.thresholds.ambiguousRange / 4) {
        confidence *= 0.6; // Very close to ambiguous threshold
      }
      
      return Math.max(0.1, Math.min(1, confidence));
    }

    /**
     * Update thresholds based on calibration data
     * @param {Array} calibrationData - Array of {brightness, actualSelection} objects
     */
    calibrate(calibrationData) {
      if (!calibrationData || calibrationData.length < 10) {
        console.warn('Insufficient calibration data for brightness detector');
        return;
      }
      
      // Analyze the calibration data to optimize thresholds
      const selectedBrightness = calibrationData
        .filter(d => d.actualSelection)
        .map(d => d.brightness);
      
      const unselectedBrightness = calibrationData
        .filter(d => !d.actualSelection)
        .map(d => d.brightness);
      
      if (selectedBrightness.length > 0 && unselectedBrightness.length > 0) {
        // Calculate optimal thresholds
        const selectedMean = selectedBrightness.reduce((a, b) => a + b) / selectedBrightness.length;
        const unselectedMean = unselectedBrightness.reduce((a, b) => a + b) / unselectedBrightness.length;
        
        // Update thresholds with some conservative adjustment
        this.thresholds.selectedMin = Math.max(0.5, selectedMean - 0.1);
        this.thresholds.unselectedMax = Math.min(0.6, unselectedMean + 0.1);
        
        console.log(`Brightness detector calibrated: selectedMin=${this.thresholds.selectedMin.toFixed(2)}, unselectedMax=${this.thresholds.unselectedMax.toFixed(2)}`);
      }
    }

    /**
     * Get current algorithm configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
      return {
        name: this.name,
        version: this.version,
        thresholds: { ...this.thresholds }
      };
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrightnessDetector;
  } else {
    global.BrightnessDetector = BrightnessDetector;
  }

})(typeof window !== 'undefined' ? window : global);
