/**
 * Nova Drift Edge Detector - Phase 4
 * Analyzes hex regions based on edge patterns for selection detection
 */

(function(global) {
  'use strict';

  // Import dependencies
  const RecognitionUtils = global.RecognitionUtils || require('./recognition-utils.js');

  /**
   * Edge-based detection algorithm
   * Analyzes edge patterns and borders to detect selection state
   */
  class EdgeDetector {
    constructor(config = {}) {
      this.config = {
        edgeThreshold: 0.3,
        borderWidth: 3,
        selectionBorderIntensity: 0.4,
        cornerDetectionRadius: 5,
        ...config
      };
      
      this.name = 'edge';
      this.version = '1.0.0';
      
      // Sobel kernels for edge detection
      this.sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      this.sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    }

    /**
     * Analyze an image region for selection status based on edge patterns
     * @param {ImageData} imageData - 48x48 normalized hex region
     * @param {Object} metadata - Additional context about the region
     * @returns {Object} Analysis result with selection prediction and confidence
     */
    analyze(imageData, metadata = {}) {
      try {
        const startTime = performance.now();
        
        // Apply Sobel edge detection
        const edgeData = this.detectEdges(imageData);
        
        // Analyze edge characteristics
        const edgeProfile = this.analyzeEdgeProfile(edgeData);
        const borderAnalysis = this.analyzeBorderPattern(edgeData, imageData);
        const cornerAnalysis = this.analyzeCornerStrength(edgeData);
        const edgeDistribution = this.analyzeEdgeDistribution(edgeData);
        const selectionBorderAnalysis = this.analyzeSelectionBorder(edgeData, imageData);
        
        // Selection predictions based on edge analysis
        const borderPrediction = this.predictSelectionFromBorder(borderAnalysis);
        const cornerPrediction = this.predictSelectionFromCorners(cornerAnalysis);
        const distributionPrediction = this.predictSelectionFromDistribution(edgeDistribution);
        const selectionBorderPrediction = this.predictSelectionFromSelectionBorder(selectionBorderAnalysis);
        
        // Calculate confidence based on edge analysis
        const confidence = this.calculateConfidence({
          edgeProfile,
          borderAnalysis,
          cornerAnalysis,
          edgeDistribution,
          selectionBorderAnalysis,
          borderPrediction,
          cornerPrediction,
          distributionPrediction,
          selectionBorderPrediction
        });
        
        // Final selection decision with consensus
        const predictions = [
          borderPrediction,
          cornerPrediction,
          distributionPrediction,
          selectionBorderPrediction
        ];
        const selectedCount = predictions.filter(p => p.selected).length;
        const selected = selectedCount >= 2; // Majority vote
        
        const processingTime = performance.now() - startTime;
        
        return {
          selected,
          confidence,
          edgeStrength: edgeProfile.averageStrength,
          analysisData: {
            edgeProfile,
            borderAnalysis,
            cornerAnalysis,
            edgeDistribution,
            selectionBorderAnalysis,
            predictions: {
              border: borderPrediction,
              corner: cornerPrediction,
              distribution: distributionPrediction,
              selectionBorder: selectionBorderPrediction
            }
          },
          metadata: {
            algorithm: this.name,
            version: this.version,
            processingTime,
            edgePixelCount: edgeProfile.edgePixelCount,
            timestamp: Date.now()
          }
        };
        
      } catch (error) {
        console.error('Edge detection failed:', error);
        return {
          selected: false,
          confidence: 0,
          edgeStrength: 0,
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
     * Apply Sobel edge detection to the image
     * @param {ImageData} imageData - Image data to process
     * @returns {ImageData} Edge-detected image data
     */
    detectEdges(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const output = new Uint8ClampedArray(data.length);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) {
            const index = (y * width + x) * 4;
            output[index] = 0;
            output[index + 1] = 0;
            output[index + 2] = 0;
            output[index + 3] = 0;
            continue;
          }
          
          let gx = 0, gy = 0;
          
          // Apply Sobel kernels
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
              const gray = RecognitionUtils.calculateLuminance(
                data[pixelIndex],
                data[pixelIndex + 1],
                data[pixelIndex + 2]
              );
              
              const kernelIndex = (ky + 1) * 3 + (kx + 1);
              gx += gray * this.sobelX[kernelIndex];
              gy += gray * this.sobelY[kernelIndex];
            }
          }
          
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          const direction = Math.atan2(gy, gx);
          const outputIndex = (y * width + x) * 4;
          
          // Store magnitude in RGB channels, direction in alpha
          output[outputIndex] = Math.min(255, magnitude * 255);
          output[outputIndex + 1] = Math.min(255, magnitude * 255);
          output[outputIndex + 2] = Math.min(255, magnitude * 255);
          output[outputIndex + 3] = Math.min(255, (direction + Math.PI) / (2 * Math.PI) * 255);
        }
      }
      
      return new ImageData(output, width, height);
    }

    /**
     * Analyze overall edge profile
     * @param {ImageData} edgeData - Edge-detected image data
     * @returns {Object} Edge profile analysis
     */
    analyzeEdgeProfile(edgeData) {
      const data = edgeData.data;
      const width = edgeData.width;
      const height = edgeData.height;
      
      let totalEdgeStrength = 0;
      let edgePixelCount = 0;
      let maxEdgeStrength = 0;
      const edgeStrengths = [];
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const index = (y * width + x) * 4;
          const edgeStrength = data[index] / 255; // Normalized edge strength
          
          if (edgeStrength > this.config.edgeThreshold) {
            totalEdgeStrength += edgeStrength;
            edgePixelCount++;
            maxEdgeStrength = Math.max(maxEdgeStrength, edgeStrength);
            edgeStrengths.push(edgeStrength);
          }
        }
      }
      
      const averageStrength = edgePixelCount > 0 ? totalEdgeStrength / edgePixelCount : 0;
      
      // Calculate edge strength distribution
      edgeStrengths.sort((a, b) => a - b);
      const median = edgeStrengths.length > 0 ? 
        edgeStrengths[Math.floor(edgeStrengths.length / 2)] : 0;
      
      return {
        averageStrength,
        maxEdgeStrength,
        medianStrength: median,
        edgePixelCount,
        edgeDensity: edgePixelCount / (width * height),
        edgeStrengths
      };
    }

    /**
     * Analyze border patterns around the hex
     * @param {ImageData} edgeData - Edge-detected image data
     * @param {ImageData} originalData - Original image data
     * @returns {Object} Border analysis
     */
    analyzeBorderPattern(edgeData, originalData) {
      const width = edgeData.width;
      const height = edgeData.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const borderRadius = Math.min(width, height) * 0.35; // Sample border area
      
      const borderEdgeStrengths = [];
      const borderAngles = [];
      
      // Sample points around the hex border
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
        const x = Math.round(centerX + Math.cos(angle) * borderRadius);
        const y = Math.round(centerY + Math.sin(angle) * borderRadius);
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const index = (y * width + x) * 4;
          const edgeStrength = edgeData.data[index] / 255;
          
          if (edgeStrength > this.config.edgeThreshold) {
            borderEdgeStrengths.push(edgeStrength);
            borderAngles.push(angle);
          }
        }
      }
      
      const borderContinuity = this.calculateBorderContinuity(borderAngles);
      const averageBorderStrength = borderEdgeStrengths.length > 0 ?
        borderEdgeStrengths.reduce((a, b) => a + b) / borderEdgeStrengths.length : 0;
      
      return {
        borderEdgeCount: borderEdgeStrengths.length,
        averageBorderStrength,
        borderContinuity,
        hasCompleteBorder: borderContinuity > 0.7 && borderEdgeStrengths.length > 8
      };
    }

    /**
     * Calculate border continuity
     * @param {Array} borderAngles - Array of angles where edges were detected
     * @returns {number} Continuity score (0-1)
     */
    calculateBorderContinuity(borderAngles) {
      if (borderAngles.length < 2) return 0;
      
      // Sort angles
      const sortedAngles = borderAngles.slice().sort((a, b) => a - b);
      
      // Calculate gaps between consecutive edges
      const gaps = [];
      for (let i = 1; i < sortedAngles.length; i++) {
        gaps.push(sortedAngles[i] - sortedAngles[i - 1]);
      }
      
      // Add the gap from last to first (wrapping around)
      gaps.push((2 * Math.PI) - sortedAngles[sortedAngles.length - 1] + sortedAngles[0]);
      
      // Calculate uniformity of gaps (more uniform = more continuous)
      const averageGap = (2 * Math.PI) / borderAngles.length;
      const gapVariance = gaps.reduce((sum, gap) => 
        sum + Math.pow(gap - averageGap, 2), 0) / gaps.length;
      const gapStdDev = Math.sqrt(gapVariance);
      
      // Lower standard deviation indicates better continuity
      return Math.max(0, 1 - (gapStdDev / averageGap));
    }

    /**
     * Analyze corner strength and patterns
     * @param {ImageData} edgeData - Edge-detected image data
     * @returns {Object} Corner analysis
     */
    analyzeCornerStrength(edgeData) {
      const width = edgeData.width;
      const height = edgeData.height;
      const radius = this.config.cornerDetectionRadius;
      
      // Sample corner regions (typical hex corners)
      const hexCorners = this.getHexCornerPositions(width, height);
      const cornerStrengths = [];
      
      hexCorners.forEach(corner => {
        let cornerEdgeStrength = 0;
        let sampleCount = 0;
        
        // Sample area around each corner
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const x = corner.x + dx;
            const y = corner.y + dy;
            
            if (x >= 0 && x < width && y >= 0 && y < height && 
                RecognitionUtils.isInHexMask(x, y, width, height)) {
              const index = (y * width + x) * 4;
              const edgeStrength = edgeData.data[index] / 255;
              cornerEdgeStrength += edgeStrength;
              sampleCount++;
            }
          }
        }
        
        const averageCornerStrength = sampleCount > 0 ? cornerEdgeStrength / sampleCount : 0;
        cornerStrengths.push(averageCornerStrength);
      });
      
      const averageCornerStrength = cornerStrengths.length > 0 ?
        cornerStrengths.reduce((a, b) => a + b) / cornerStrengths.length : 0;
      
      const strongCorners = cornerStrengths.filter(s => s > this.config.edgeThreshold).length;
      
      return {
        cornerStrengths,
        averageCornerStrength,
        strongCornerCount: strongCorners,
        hasDefinedCorners: strongCorners >= 4 // At least 4 of 6 hex corners
      };
    }

    /**
     * Get expected hexagon corner positions
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {Array} Array of corner positions
     */
    getHexCornerPositions(width, height) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.4;
      const corners = [];
      
      // 6 corners of a hexagon
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3; // 60-degree increments
        corners.push({
          x: Math.round(centerX + Math.cos(angle) * radius),
          y: Math.round(centerY + Math.sin(angle) * radius)
        });
      }
      
      return corners;
    }

    /**
     * Analyze edge distribution across the hex
     * @param {ImageData} edgeData - Edge-detected image data
     * @returns {Object} Edge distribution analysis
     */
    analyzeEdgeDistribution(edgeData) {
      const width = edgeData.width;
      const height = edgeData.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Divide hex into radial zones
      const zones = [
        { name: 'center', innerRadius: 0, outerRadius: 0.2 },
        { name: 'inner', innerRadius: 0.2, outerRadius: 0.35 },
        { name: 'outer', innerRadius: 0.35, outerRadius: 0.5 }
      ];
      
      const zoneEdgeCounts = zones.map(zone => ({ ...zone, edgeCount: 0, totalPixels: 0 }));
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const normalizedDistance = distance / (Math.min(width, height) / 2);
          
          // Find which zone this pixel belongs to
          for (const zone of zoneEdgeCounts) {
            if (normalizedDistance >= zone.innerRadius && normalizedDistance < zone.outerRadius) {
              zone.totalPixels++;
              
              const index = (y * width + x) * 4;
              const edgeStrength = edgeData.data[index] / 255;
              if (edgeStrength > this.config.edgeThreshold) {
                zone.edgeCount++;
              }
              break;
            }
          }
        }
      }
      
      // Calculate edge densities
      zoneEdgeCounts.forEach(zone => {
        zone.edgeDensity = zone.totalPixels > 0 ? zone.edgeCount / zone.totalPixels : 0;
      });
      
      return {
        zones: zoneEdgeCounts,
        centerToEdgeRatio: zoneEdgeCounts[0].edgeDensity / (zoneEdgeCounts[2].edgeDensity + 0.001),
        outerToInnerRatio: zoneEdgeCounts[2].edgeDensity / (zoneEdgeCounts[1].edgeDensity + 0.001)
      };
    }

    /**
     * Analyze patterns specific to selection borders
     * @param {ImageData} edgeData - Edge-detected image data
     * @param {ImageData} originalData - Original image data for context
     * @returns {Object} Selection border analysis
     */
    analyzeSelectionBorder(edgeData, originalData) {
      const width = edgeData.width;
      const height = edgeData.height;
      
      // Look for bright edges (typical of selection highlights)
      const brightEdges = this.findBrightEdges(edgeData, originalData);
      const continuousBrightBorder = this.analyzeContinuousBrightBorder(brightEdges);
      
      // Analyze edge thickness (selection borders might be thicker)
      const edgeThickness = this.analyzeEdgeThickness(edgeData);
      
      return {
        brightEdgeCount: brightEdges.length,
        brightEdgeDensity: brightEdges.length / (width * height),
        continuousBrightBorder,
        averageEdgeThickness: edgeThickness.average,
        hasThickBorder: edgeThickness.average > this.config.borderWidth,
        hasSelectionPattern: continuousBrightBorder && edgeThickness.average > this.config.borderWidth
      };
    }

    /**
     * Find bright edges that might indicate selection
     * @param {ImageData} edgeData - Edge-detected image data
     * @param {ImageData} originalData - Original image data
     * @returns {Array} Array of bright edge positions
     */
    findBrightEdges(edgeData, originalData) {
      const width = edgeData.width;
      const height = edgeData.height;
      const brightEdges = [];
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const edgeIndex = (y * width + x) * 4;
          const originalIndex = (y * width + x) * 4;
          
          const edgeStrength = edgeData.data[edgeIndex] / 255;
          const originalBrightness = RecognitionUtils.calculateLuminance(
            originalData.data[originalIndex],
            originalData.data[originalIndex + 1],
            originalData.data[originalIndex + 2]
          );
          
          // Edge is considered "bright" if it's strong AND the original pixel is bright
          if (edgeStrength > this.config.edgeThreshold && originalBrightness > 0.6) {
            brightEdges.push({ x, y, strength: edgeStrength, brightness: originalBrightness });
          }
        }
      }
      
      return brightEdges;
    }

    /**
     * Analyze continuous bright border
     * @param {Array} brightEdges - Array of bright edge positions
     * @returns {boolean} True if continuous bright border detected
     */
    analyzeContinuousBrightBorder(brightEdges) {
      if (brightEdges.length < 8) return false; // Minimum edges for a border
      
      // Check if bright edges form a continuous border pattern
      const borderPixels = brightEdges.filter(edge => this.isNearBorder(edge));
      return borderPixels.length >= brightEdges.length * 0.7; // 70% should be near border
    }

    /**
     * Check if an edge point is near the hex border
     * @param {Object} edge - Edge position {x, y}
     * @returns {boolean} True if near border
     */
    isNearBorder(edge) {
      // This is a simplified check - could be more sophisticated
      const centerX = 24; // Assuming 48x48 image
      const centerY = 24;
      const distance = Math.sqrt((edge.x - centerX) ** 2 + (edge.y - centerY) ** 2);
      const borderRadius = 18; // Approximate hex border
      
      return Math.abs(distance - borderRadius) < 3; // Within 3 pixels of border
    }

    /**
     * Analyze edge thickness
     * @param {ImageData} edgeData - Edge-detected image data
     * @returns {Object} Edge thickness analysis
     */
    analyzeEdgeThickness(edgeData) {
      // This is a simplified thickness analysis
      // In a more sophisticated implementation, you would trace edge contours
      const width = edgeData.width;
      const height = edgeData.height;
      const thicknesses = [];
      
      // Sample thickness at several points
      for (let y = 2; y < height - 2; y += 4) {
        for (let x = 2; x < width - 2; x += 4) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const index = (y * width + x) * 4;
          const edgeStrength = edgeData.data[index] / 255;
          
          if (edgeStrength > this.config.edgeThreshold) {
            const thickness = this.measureLocalThickness(edgeData, x, y);
            thicknesses.push(thickness);
          }
        }
      }
      
      const average = thicknesses.length > 0 ?
        thicknesses.reduce((a, b) => a + b) / thicknesses.length : 0;
      
      return {
        average,
        samples: thicknesses.length,
        maxThickness: thicknesses.length > 0 ? Math.max(...thicknesses) : 0
      };
    }

    /**
     * Measure local edge thickness at a point
     * @param {ImageData} edgeData - Edge-detected image data
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Local thickness measurement
     */
    measureLocalThickness(edgeData, x, y) {
      const width = edgeData.width;
      let thickness = 1; // At minimum, the edge pixel itself
      
      // Check in 4 directions for connected edge pixels
      const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      
      for (const [dx, dy] of directions) {
        let distance = 1;
        while (distance <= 3) { // Check up to 3 pixels away
          const checkX = x + dx * distance;
          const checkY = y + dy * distance;
          
          if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < edgeData.height) {
            const index = (checkY * width + checkX) * 4;
            const edgeStrength = edgeData.data[index] / 255;
            
            if (edgeStrength > this.config.edgeThreshold) {
              thickness = Math.max(thickness, distance + 1);
            } else {
              break; // Stop if we hit a non-edge pixel
            }
          }
          distance++;
        }
      }
      
      return thickness;
    }

    /**
     * Predict selection based on border analysis
     * @param {Object} borderAnalysis - Border analysis results
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromBorder(borderAnalysis) {
      const selected = borderAnalysis.hasCompleteBorder && 
                     borderAnalysis.averageBorderStrength > this.config.selectionBorderIntensity;
      const confidence = Math.min(1, borderAnalysis.averageBorderStrength);
      
      return { selected, confidence, reason: 'border-pattern' };
    }

    /**
     * Predict selection based on corner analysis
     * @param {Object} cornerAnalysis - Corner analysis results
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromCorners(cornerAnalysis) {
      const selected = cornerAnalysis.hasDefinedCorners && 
                     cornerAnalysis.averageCornerStrength > this.config.edgeThreshold;
      const confidence = Math.min(1, cornerAnalysis.averageCornerStrength);
      
      return { selected, confidence, reason: 'corner-definition' };
    }

    /**
     * Predict selection based on edge distribution
     * @param {Object} edgeDistribution - Edge distribution analysis
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromDistribution(edgeDistribution) {
      // Selected hexes might have more edges in outer zones (borders)
      const selected = edgeDistribution.outerToInnerRatio > 1.2;
      const confidence = Math.min(1, Math.abs(edgeDistribution.outerToInnerRatio - 1));
      
      return { selected, confidence, reason: 'edge-distribution' };
    }

    /**
     * Predict selection based on selection border analysis
     * @param {Object} selectionBorderAnalysis - Selection border analysis
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromSelectionBorder(selectionBorderAnalysis) {
      const selected = selectionBorderAnalysis.hasSelectionPattern;
      const confidence = selectionBorderAnalysis.hasSelectionPattern ? 0.8 : 0.2;
      
      return { selected, confidence, reason: 'selection-border' };
    }

    /**
     * Calculate overall confidence in the edge analysis
     * @param {Object} analysisData - All analysis data
     * @returns {number} Overall confidence (0-1)
     */
    calculateConfidence(analysisData) {
      const {
        edgeProfile,
        borderAnalysis,
        cornerAnalysis,
        selectionBorderAnalysis,
        borderPrediction,
        cornerPrediction,
        distributionPrediction,
        selectionBorderPrediction
      } = analysisData;
      
      // Base confidence from border analysis
      let confidence = borderPrediction.confidence;
      
      // Weight predictions
      const predictions = [
        { pred: borderPrediction, weight: 0.3 },
        { pred: cornerPrediction, weight: 0.25 },
        { pred: distributionPrediction, weight: 0.2 },
        { pred: selectionBorderPrediction, weight: 0.25 }
      ];
      
      const agreement = this.calculatePredictionAgreement(predictions);
      confidence = Math.min(1, confidence + agreement * 0.3);
      
      // Boost confidence for strong overall edge characteristics
      if (edgeProfile.averageStrength > 0.5) {
        confidence = Math.min(1, confidence * 1.1);
      }
      
      // Boost confidence for selection-specific patterns
      if (selectionBorderAnalysis.hasSelectionPattern) {
        confidence = Math.min(1, confidence * 1.2);
      }
      
      // Reduce confidence for insufficient edge data
      if (edgeProfile.edgePixelCount < 10) {
        confidence *= 0.7;
      }
      
      // Reduce confidence for very weak edges
      if (edgeProfile.averageStrength < 0.2) {
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
     * Update thresholds based on calibration data
     * @param {Array} calibrationData - Array of calibration examples
     */
    calibrate(calibrationData) {
      if (!calibrationData || calibrationData.length < 10) {
        console.warn('Insufficient calibration data for edge detector');
        return;
      }
      
      // Analyze edge characteristics of selected vs unselected mods
      const selectedEdgeStrengths = calibrationData
        .filter(d => d.actualSelection && d.edgeStrength !== undefined)
        .map(d => d.edgeStrength);
      
      const unselectedEdgeStrengths = calibrationData
        .filter(d => !d.actualSelection && d.edgeStrength !== undefined)
        .map(d => d.edgeStrength);
      
      if (selectedEdgeStrengths.length > 0 && unselectedEdgeStrengths.length > 0) {
        const selectedMean = selectedEdgeStrengths.reduce((a, b) => a + b) / selectedEdgeStrengths.length;
        const unselectedMean = unselectedEdgeStrengths.reduce((a, b) => a + b) / unselectedEdgeStrengths.length;
        
        // Update threshold to be between the means
        this.config.selectionBorderIntensity = (selectedMean + unselectedMean) / 2;
        this.config.edgeThreshold = Math.min(this.config.edgeThreshold, unselectedMean - 0.1);
        
        console.log(`Edge detector calibrated: edgeThreshold=${this.config.edgeThreshold.toFixed(2)}, selectionBorderIntensity=${this.config.selectionBorderIntensity.toFixed(2)}`);
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
        config: { ...this.config }
      };
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeDetector;
  } else {
    global.EdgeDetector = EdgeDetector;
  }

})(typeof window !== 'undefined' ? window : global);
