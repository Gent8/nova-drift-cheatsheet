/**
 * Nova Drift Color Detector - Phase 4
 * Analyzes hex regions based on color patterns for selection detection
 */

(function(global) {
  'use strict';

  // Import dependencies
  const RecognitionUtils = global.RecognitionUtils || require('./recognition-utils.js');

  /**
   * Color-based detection algorithm
   * Analyzes dominant colors and color patterns to detect selection state
   */
  class ColorDetector {
    constructor(config = {}) {
      this.config = {
        dominantColorCount: 5,
        colorSimilarityThreshold: 30,
        selectedColorBoost: 1.2,
        unselectedColorPenalty: 0.8,
        ...config
      };
      
      this.name = 'color';
      this.version = '1.0.0';
      
      // Load reference color profiles
      this.selectedColorProfiles = this.loadSelectedColorProfiles();
      this.unselectedColorProfiles = this.loadUnselectedColorProfiles();
    }

    /**
     * Analyze an image region for selection status based on color patterns
     * @param {ImageData} imageData - 48x48 normalized hex region
     * @param {Object} metadata - Additional context about the region
     * @returns {Object} Analysis result with selection prediction and confidence
     */
    analyze(imageData, metadata = {}) {
      try {
        const startTime = performance.now();
        
        // Extract dominant colors from the hex region
        const dominantColors = RecognitionUtils.extractDominantColors(
          imageData, 
          this.config.dominantColorCount
        );
        
        // Build color profile for this region
        const colorProfile = this.buildColorProfile(dominantColors);
        
        // Analyze color characteristics
        const colorTemperature = this.calculateColorTemperature(dominantColors);
        const saturation = this.calculateAverageSaturation(dominantColors);
        const colorVariety = this.calculateColorVariety(dominantColors);
        const contrastRatio = this.calculateContrastRatio(dominantColors);
        
        // Match against reference color profiles
        const selectedScore = this.matchColorProfile(colorProfile, this.selectedColorProfiles);
        const unselectedScore = this.matchColorProfile(colorProfile, this.unselectedColorProfiles);
        
        // Advanced color analysis
        const glowAnalysis = this.analyzeGlowEffect(imageData, dominantColors);
        const highlightAnalysis = this.analyzeHighlightPattern(dominantColors);
        
        // Selection prediction based on color analysis
        const profilePrediction = this.predictSelectionFromProfiles(selectedScore, unselectedScore);
        const temperaturePrediction = this.predictSelectionFromTemperature(colorTemperature);
        const saturationPrediction = this.predictSelectionFromSaturation(saturation);
        const glowPrediction = this.predictSelectionFromGlow(glowAnalysis);
        
        // Calculate confidence based on multiple color factors
        const confidence = this.calculateConfidence({
          dominantColors,
          colorProfile,
          selectedScore,
          unselectedScore,
          colorTemperature,
          saturation,
          colorVariety,
          contrastRatio,
          glowAnalysis,
          highlightAnalysis,
          profilePrediction,
          temperaturePrediction,
          saturationPrediction,
          glowPrediction
        });
        
        // Final selection decision with consensus
        const predictions = [profilePrediction, temperaturePrediction, saturationPrediction, glowPrediction];
        const selectedCount = predictions.filter(p => p.selected).length;
        const selected = selectedCount >= 2; // Majority vote
        
        const processingTime = performance.now() - startTime;
        
        return {
          selected,
          confidence,
          colorProfile,
          analysisData: {
            dominantColors,
            colorTemperature,
            saturation,
            colorVariety,
            contrastRatio,
            selectedScore,
            unselectedScore,
            glowAnalysis,
            highlightAnalysis,
            predictions: {
              profile: profilePrediction,
              temperature: temperaturePrediction,
              saturation: saturationPrediction,
              glow: glowPrediction
            }
          },
          metadata: {
            algorithm: this.name,
            version: this.version,
            processingTime,
            dominantColorCount: dominantColors.length,
            timestamp: Date.now()
          }
        };
        
      } catch (error) {
        console.error('Color detection failed:', error);
        return {
          selected: false,
          confidence: 0,
          colorProfile: null,
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
     * Build a color profile from dominant colors
     * @param {Array} dominantColors - Array of dominant color objects
     * @returns {Object} Color profile
     */
    buildColorProfile(dominantColors) {
      if (!dominantColors || dominantColors.length === 0) {
        return { primary: null, secondary: null, accent: null, distribution: {} };
      }
      
      // Sort by frequency
      const sortedColors = dominantColors.sort((a, b) => b.count - a.count);
      
      return {
        primary: sortedColors[0] || null,
        secondary: sortedColors[1] || null,
        accent: sortedColors[2] || null,
        distribution: this.calculateColorDistribution(sortedColors),
        totalPixels: sortedColors.reduce((sum, color) => sum + color.count, 0)
      };
    }

    /**
     * Calculate color distribution percentages
     * @param {Array} colors - Array of color objects with counts
     * @returns {Object} Distribution percentages
     */
    calculateColorDistribution(colors) {
      const totalPixels = colors.reduce((sum, color) => sum + color.count, 0);
      const distribution = {};
      
      colors.forEach((color, index) => {
        const key = `color${index + 1}`;
        distribution[key] = totalPixels > 0 ? color.count / totalPixels : 0;
      });
      
      return distribution;
    }

    /**
     * Calculate average color temperature (warmth/coolness)
     * @param {Array} dominantColors - Array of dominant colors
     * @returns {number} Color temperature (0=cool, 1=warm)
     */
    calculateColorTemperature(dominantColors) {
      if (!dominantColors || dominantColors.length === 0) return 0.5;
      
      let totalTemperature = 0;
      let totalWeight = 0;
      
      dominantColors.forEach(color => {
        // Simplified color temperature calculation
        const temperature = (color.r + color.g * 0.5) / (color.b + 1); // Avoid division by zero
        totalTemperature += temperature * color.count;
        totalWeight += color.count;
      });
      
      const avgTemperature = totalWeight > 0 ? totalTemperature / totalWeight : 1;
      
      // Normalize to 0-1 range
      return Math.min(1, Math.max(0, avgTemperature / 3));
    }

    /**
     * Calculate average saturation of dominant colors
     * @param {Array} dominantColors - Array of dominant colors
     * @returns {number} Average saturation (0-1)
     */
    calculateAverageSaturation(dominantColors) {
      if (!dominantColors || dominantColors.length === 0) return 0;
      
      let totalSaturation = 0;
      let totalWeight = 0;
      
      dominantColors.forEach(color => {
        const max = Math.max(color.r, color.g, color.b);
        const min = Math.min(color.r, color.g, color.b);
        const saturation = max > 0 ? (max - min) / max : 0;
        
        totalSaturation += saturation * color.count;
        totalWeight += color.count;
      });
      
      return totalWeight > 0 ? totalSaturation / totalWeight : 0;
    }

    /**
     * Calculate color variety (number of distinct color groups)
     * @param {Array} dominantColors - Array of dominant colors
     * @returns {number} Color variety score (0-1)
     */
    calculateColorVariety(dominantColors) {
      if (!dominantColors || dominantColors.length === 0) return 0;
      
      // Count colors with significant representation (>5% of pixels)
      const totalPixels = dominantColors.reduce((sum, color) => sum + color.count, 0);
      const significantColors = dominantColors.filter(color => 
        color.count / totalPixels > 0.05
      );
      
      // Normalize to 0-1 (assuming max 5 significant colors)
      return Math.min(1, significantColors.length / 5);
    }

    /**
     * Calculate contrast ratio between dominant colors
     * @param {Array} dominantColors - Array of dominant colors
     * @returns {number} Contrast ratio
     */
    calculateContrastRatio(dominantColors) {
      if (!dominantColors || dominantColors.length < 2) return 0;
      
      const primary = dominantColors[0];
      const secondary = dominantColors[1];
      
      const primaryLuminance = RecognitionUtils.calculateLuminance(primary.r, primary.g, primary.b);
      const secondaryLuminance = RecognitionUtils.calculateLuminance(secondary.r, secondary.g, secondary.b);
      
      const lighter = Math.max(primaryLuminance, secondaryLuminance);
      const darker = Math.min(primaryLuminance, secondaryLuminance);
      
      return darker > 0 ? (lighter + 0.05) / (darker + 0.05) : 1;
    }

    /**
     * Analyze potential glow effect in the image
     * @param {ImageData} imageData - Image data to analyze
     * @param {Array} dominantColors - Dominant colors for reference
     * @returns {Object} Glow analysis results
     */
    analyzeGlowEffect(imageData, dominantColors) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Sample brightness from center to edge
      const radiusSamples = 5;
      const brightnessProfile = [];
      
      for (let i = 0; i < radiusSamples; i++) {
        const radius = (i + 1) * (Math.min(width, height) * 0.4) / radiusSamples;
        let totalBrightness = 0;
        let sampleCount = 0;
        
        // Sample points around the circle at this radius
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const x = Math.round(centerX + Math.cos(angle) * radius);
          const y = Math.round(centerY + Math.sin(angle) * radius);
          
          if (x >= 0 && x < width && y >= 0 && y < height && 
              RecognitionUtils.isInHexMask(x, y, width, height)) {
            const index = (y * width + x) * 4;
            const brightness = RecognitionUtils.calculateLuminance(
              data[index], data[index + 1], data[index + 2]
            );
            totalBrightness += brightness;
            sampleCount++;
          }
        }
        
        brightnessProfile.push(sampleCount > 0 ? totalBrightness / sampleCount : 0);
      }
      
      // Analyze brightness profile for glow pattern
      const hasGlow = this.detectGlowPattern(brightnessProfile);
      const glowIntensity = this.calculateGlowIntensity(brightnessProfile);
      
      return {
        hasGlow,
        glowIntensity,
        brightnessProfile
      };
    }

    /**
     * Detect glow pattern in brightness profile
     * @param {Array} brightnessProfile - Brightness from center to edge
     * @returns {boolean} True if glow pattern detected
     */
    detectGlowPattern(brightnessProfile) {
      if (brightnessProfile.length < 3) return false;
      
      // Look for decreasing brightness from center to edge (typical glow)
      let decreasingCount = 0;
      for (let i = 1; i < brightnessProfile.length; i++) {
        if (brightnessProfile[i] < brightnessProfile[i - 1]) {
          decreasingCount++;
        }
      }
      
      // At least 60% of samples should show decreasing trend
      return decreasingCount / (brightnessProfile.length - 1) >= 0.6;
    }

    /**
     * Calculate glow intensity
     * @param {Array} brightnessProfile - Brightness from center to edge
     * @returns {number} Glow intensity (0-1)
     */
    calculateGlowIntensity(brightnessProfile) {
      if (brightnessProfile.length === 0) return 0;
      
      const centerBrightness = brightnessProfile[0];
      const edgeBrightness = brightnessProfile[brightnessProfile.length - 1];
      const falloff = centerBrightness - edgeBrightness;
      
      return Math.max(0, Math.min(1, falloff));
    }

    /**
     * Analyze highlight patterns in color data
     * @param {Array} dominantColors - Dominant colors to analyze
     * @returns {Object} Highlight analysis
     */
    analyzeHighlightPattern(dominantColors) {
      if (!dominantColors || dominantColors.length === 0) {
        return { hasHighlight: false, highlightIntensity: 0 };
      }
      
      // Look for very bright colors that might indicate highlights
      const brightColors = dominantColors.filter(color => {
        const brightness = RecognitionUtils.calculateLuminance(color.r, color.g, color.b);
        return brightness > 0.8;
      });
      
      const hasHighlight = brightColors.length > 0;
      const totalPixels = dominantColors.reduce((sum, color) => sum + color.count, 0);
      const highlightPixels = brightColors.reduce((sum, color) => sum + color.count, 0);
      const highlightIntensity = totalPixels > 0 ? highlightPixels / totalPixels : 0;
      
      return {
        hasHighlight,
        highlightIntensity,
        brightColorCount: brightColors.length
      };
    }

    /**
     * Match color profile against reference profiles
     * @param {Object} colorProfile - Color profile to match
     * @param {Array} referenceProfiles - Reference color profiles
     * @returns {number} Matching score (0-1)
     */
    matchColorProfile(colorProfile, referenceProfiles) {
      if (!colorProfile || !colorProfile.primary || !referenceProfiles) return 0;
      
      let bestScore = 0;
      
      referenceProfiles.forEach(refProfile => {
        const score = this.calculateColorProfileSimilarity(colorProfile, refProfile);
        bestScore = Math.max(bestScore, score);
      });
      
      return bestScore;
    }

    /**
     * Calculate similarity between two color profiles
     * @param {Object} profile1 - First color profile
     * @param {Object} profile2 - Second color profile
     * @returns {number} Similarity score (0-1)
     */
    calculateColorProfileSimilarity(profile1, profile2) {
      if (!profile1.primary || !profile2.primary) return 0;
      
      // Compare primary colors
      const primaryDistance = RecognitionUtils.calculateColorDistance(
        profile1.primary, 
        profile2.primary
      );
      const primarySimilarity = Math.max(0, 1 - primaryDistance / 255);
      
      // Compare secondary colors if available
      let secondarySimilarity = 0.5; // Neutral if no secondary color
      if (profile1.secondary && profile2.secondary) {
        const secondaryDistance = RecognitionUtils.calculateColorDistance(
          profile1.secondary, 
          profile2.secondary
        );
        secondarySimilarity = Math.max(0, 1 - secondaryDistance / 255);
      }
      
      // Weighted combination
      return primarySimilarity * 0.7 + secondarySimilarity * 0.3;
    }

    /**
     * Predict selection based on color profile matching
     * @param {number} selectedScore - Score against selected profiles
     * @param {number} unselectedScore - Score against unselected profiles
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromProfiles(selectedScore, unselectedScore) {
      const scoreDifference = selectedScore - unselectedScore;
      const selected = selectedScore > unselectedScore;
      const confidence = Math.min(1, Math.abs(scoreDifference) / 0.5);
      
      return { selected, confidence, reason: 'color-profile-match' };
    }

    /**
     * Predict selection based on color temperature
     * @param {number} temperature - Color temperature (0-1)
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromTemperature(temperature) {
      // Selected mods might have warmer colors (more yellow/orange)
      const selected = temperature > 0.6;
      const confidence = Math.abs(temperature - 0.5) * 2; // Distance from neutral
      
      return { selected, confidence, reason: 'color-temperature' };
    }

    /**
     * Predict selection based on saturation
     * @param {number} saturation - Average saturation (0-1)
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromSaturation(saturation) {
      // Selected mods might have higher saturation
      const selected = saturation > 0.3;
      const confidence = Math.min(1, saturation);
      
      return { selected, confidence, reason: 'color-saturation' };
    }

    /**
     * Predict selection based on glow analysis
     * @param {Object} glowAnalysis - Glow analysis results
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromGlow(glowAnalysis) {
      const selected = glowAnalysis.hasGlow && glowAnalysis.glowIntensity > 0.3;
      const confidence = glowAnalysis.glowIntensity;
      
      return { selected, confidence, reason: 'glow-effect' };
    }

    /**
     * Calculate overall confidence in the color analysis
     * @param {Object} analysisData - All analysis data
     * @returns {number} Overall confidence (0-1)
     */
    calculateConfidence(analysisData) {
      const {
        dominantColors,
        selectedScore,
        unselectedScore,
        profilePrediction,
        temperaturePrediction,
        saturationPrediction,
        glowPrediction,
        contrastRatio
      } = analysisData;
      
      // Base confidence from profile matching
      let confidence = profilePrediction.confidence;
      
      // Weight predictions based on their reliability
      const predictions = [
        { pred: profilePrediction, weight: 0.4 },
        { pred: temperaturePrediction, weight: 0.2 },
        { pred: saturationPrediction, weight: 0.2 },
        { pred: glowPrediction, weight: 0.2 }
      ];
      
      const agreement = this.calculatePredictionAgreement(predictions);
      confidence = Math.min(1, confidence + agreement * 0.3);
      
      // Boost confidence for high contrast (clearer features)
      if (contrastRatio > 2) {
        confidence = Math.min(1, confidence * 1.1);
      }
      
      // Reduce confidence for insufficient color data
      if (!dominantColors || dominantColors.length < 2) {
        confidence *= 0.7;
      }
      
      // Reduce confidence if scores are very similar (ambiguous)
      const scoreDifference = Math.abs(selectedScore - unselectedScore);
      if (scoreDifference < 0.1) {
        confidence *= 0.8;
      }
      
      return Math.max(0.1, Math.min(1, confidence));
    }

    /**
     * Calculate agreement between predictions
     * @param {Array} predictions - Array of prediction objects with weights
     * @returns {number} Agreement score (0-1)
     */
    calculatePredictionAgreement(predictions) {
      const totalWeight = predictions.reduce((sum, p) => sum + p.weight, 0);
      let agreementScore = 0;
      
      // Calculate weighted consensus
      for (let i = 0; i < predictions.length; i++) {
        for (let j = i + 1; j < predictions.length; j++) {
          const pred1 = predictions[i];
          const pred2 = predictions[j];
          
          if (pred1.pred.selected === pred2.pred.selected) {
            const weight = (pred1.weight + pred2.weight) / (2 * totalWeight);
            agreementScore += weight;
          }
        }
      }
      
      return agreementScore;
    }

    /**
     * Load selected color profiles (reference data)
     * @returns {Array} Array of selected color profiles
     */
    loadSelectedColorProfiles() {
      // These would ideally be loaded from training data
      // For now, use representative selected mod colors
      return [
        {
          primary: { r: 200, g: 180, b: 120 }, // Golden highlight
          secondary: { r: 160, g: 140, b: 100 },
          name: 'selected-golden'
        },
        {
          primary: { r: 180, g: 200, b: 140 }, // Green highlight  
          secondary: { r: 140, g: 160, b: 110 },
          name: 'selected-green'
        },
        {
          primary: { r: 190, g: 170, b: 200 }, // Purple highlight
          secondary: { r: 150, g: 130, b: 160 },
          name: 'selected-purple'
        }
      ];
    }

    /**
     * Load unselected color profiles (reference data)
     * @returns {Array} Array of unselected color profiles
     */
    loadUnselectedColorProfiles() {
      // Representative unselected mod colors
      return [
        {
          primary: { r: 80, g: 90, b: 100 }, // Dark gray
          secondary: { r: 60, g: 70, b: 80 },
          name: 'unselected-gray'
        },
        {
          primary: { r: 70, g: 80, b: 90 }, // Blue-gray
          secondary: { r: 50, g: 60, b: 70 },
          name: 'unselected-blue-gray'
        },
        {
          primary: { r: 90, g: 80, b: 70 }, // Brown-gray
          secondary: { r: 70, g: 60, b: 50 },
          name: 'unselected-brown-gray'
        }
      ];
    }

    /**
     * Update color profiles based on calibration data
     * @param {Array} calibrationData - Array of calibration examples
     */
    calibrate(calibrationData) {
      if (!calibrationData || calibrationData.length < 5) {
        console.warn('Insufficient calibration data for color detector');
        return;
      }
      
      // Extract color profiles from calibration data
      const selectedProfiles = calibrationData
        .filter(d => d.actualSelection && d.colorProfile)
        .map(d => d.colorProfile);
      
      const unselectedProfiles = calibrationData
        .filter(d => !d.actualSelection && d.colorProfile)
        .map(d => d.colorProfile);
      
      if (selectedProfiles.length > 0) {
        this.selectedColorProfiles = this.selectedColorProfiles.concat(
          selectedProfiles.slice(0, 3) // Add up to 3 new profiles
        );
      }
      
      if (unselectedProfiles.length > 0) {
        this.unselectedColorProfiles = this.unselectedColorProfiles.concat(
          unselectedProfiles.slice(0, 3) // Add up to 3 new profiles
        );
      }
      
      console.log(`Color detector calibrated with ${selectedProfiles.length} selected and ${unselectedProfiles.length} unselected profiles`);
    }

    /**
     * Get current algorithm configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
      return {
        name: this.name,
        version: this.version,
        config: { ...this.config },
        selectedProfiles: this.selectedColorProfiles.length,
        unselectedProfiles: this.unselectedColorProfiles.length
      };
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorDetector;
  } else {
    global.ColorDetector = ColorDetector;
  }

})(typeof window !== 'undefined' ? window : global);
