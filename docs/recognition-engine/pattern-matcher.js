/**
 * Nova Drift Pattern Matcher - Phase 4
 * Analyzes hex regions using template matching for selection detection
 */

(function(global) {
  'use strict';

  // Import dependencies
  const RecognitionUtils = global.RecognitionUtils || require('./recognition-utils.js');

  /**
   * Pattern matching algorithm
   * Uses template matching with known selection/unselection patterns
   */
  class PatternMatcher {
    constructor(config = {}) {
      this.config = {
        correlationThreshold: 0.7,
        rotationTolerance: 5, // degrees
        scaleTolerance: 0.1,
        maxTemplateSize: 48,
        ...config
      };
      
      this.name = 'pattern';
      this.version = '1.0.0';
      
      // Load reference templates
      this.selectionTemplates = this.loadSelectionTemplates();
      this.unselectionTemplates = this.loadUnselectionTemplates();
    }

    /**
     * Analyze an image region for selection status using pattern matching
     * @param {ImageData} imageData - 48x48 normalized hex region
     * @param {Object} metadata - Additional context about the region
     * @returns {Object} Analysis result with selection prediction and confidence
     */
    analyze(imageData, metadata = {}) {
      try {
        const startTime = performance.now();
        
        // Preprocess image for template matching
        const processedImage = this.preprocessForMatching(imageData);
        
        // Match against selection templates
        const selectionMatches = this.matchAgainstTemplates(
          processedImage, 
          this.selectionTemplates
        );
        
        // Match against unselection templates  
        const unselectionMatches = this.matchAgainstTemplates(
          processedImage, 
          this.unselectionTemplates
        );
        
        // Find best matches
        const bestSelectionMatch = this.findBestMatch(selectionMatches);
        const bestUnselectionMatch = this.findBestMatch(unselectionMatches);
        
        // Try rotation-adjusted matching for best candidates
        const rotationAdjustedSelection = this.tryRotationAdjustment(
          processedImage, 
          bestSelectionMatch
        );
        const rotationAdjustedUnselection = this.tryRotationAdjustment(
          processedImage, 
          bestUnselectionMatch
        );
        
        // Analyze pattern characteristics
        const patternCharacteristics = this.analyzePatternCharacteristics(imageData);
        const symmetryAnalysis = this.analyzeSymmetry(imageData);
        const textureAnalysis = this.analyzeTexture(imageData);
        
        // Selection predictions
        const templatePrediction = this.predictSelectionFromTemplates(
          rotationAdjustedSelection, 
          rotationAdjustedUnselection
        );
        const symmetryPrediction = this.predictSelectionFromSymmetry(symmetryAnalysis);
        const texturePrediction = this.predictSelectionFromTexture(textureAnalysis);
        const characteristicsPrediction = this.predictSelectionFromCharacteristics(patternCharacteristics);
        
        // Calculate confidence
        const confidence = this.calculateConfidence({
          bestSelectionMatch,
          bestUnselectionMatch,
          rotationAdjustedSelection,
          rotationAdjustedUnselection,
          patternCharacteristics,
          symmetryAnalysis,
          textureAnalysis,
          templatePrediction,
          symmetryPrediction,
          texturePrediction,
          characteristicsPrediction
        });
        
        // Final selection decision
        const predictions = [templatePrediction, symmetryPrediction, texturePrediction, characteristicsPrediction];
        const selectedCount = predictions.filter(p => p.selected).length;
        const selected = selectedCount >= 2; // Majority vote
        
        const processingTime = performance.now() - startTime;
        
        return {
          selected,
          confidence,
          bestMatch: selected ? rotationAdjustedSelection : rotationAdjustedUnselection,
          analysisData: {
            selectionMatches: selectionMatches.slice(0, 3), // Top 3 matches
            unselectionMatches: unselectionMatches.slice(0, 3),
            bestSelectionMatch,
            bestUnselectionMatch,
            rotationAdjustedSelection,
            rotationAdjustedUnselection,
            patternCharacteristics,
            symmetryAnalysis,
            textureAnalysis,
            predictions: {
              template: templatePrediction,
              symmetry: symmetryPrediction,
              texture: texturePrediction,
              characteristics: characteristicsPrediction
            }
          },
          metadata: {
            algorithm: this.name,
            version: this.version,
            processingTime,
            templatesEvaluated: this.selectionTemplates.length + this.unselectionTemplates.length,
            timestamp: Date.now()
          }
        };
        
      } catch (error) {
        console.error('Pattern matching failed:', error);
        return {
          selected: false,
          confidence: 0,
          bestMatch: null,
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
     * Preprocess image for template matching
     * @param {ImageData} imageData - Original image data
     * @returns {ImageData} Processed image data
     */
    preprocessForMatching(imageData) {
      // Convert to grayscale and normalize
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const processedData = new Uint8ClampedArray(data.length);
      
      for (let i = 0; i < data.length; i += 4) {
        const gray = RecognitionUtils.calculateLuminance(data[i], data[i + 1], data[i + 2]);
        const normalizedGray = Math.round(gray * 255);
        
        processedData[i] = normalizedGray;
        processedData[i + 1] = normalizedGray;
        processedData[i + 2] = normalizedGray;
        processedData[i + 3] = data[i + 3];
      }
      
      return new ImageData(processedData, width, height);
    }

    /**
     * Match image against a set of templates
     * @param {ImageData} imageData - Image to match
     * @param {Array} templates - Array of template objects
     * @returns {Array} Array of match results sorted by correlation
     */
    matchAgainstTemplates(imageData, templates) {
      const matches = [];
      
      templates.forEach(template => {
        try {
          const correlation = RecognitionUtils.calculateNormalizedCrossCorrelation(
            imageData, 
            template.imageData
          );
          
          matches.push({
            templateId: template.id,
            templateName: template.name,
            correlation,
            template: template
          });
        } catch (error) {
          console.warn(`Template matching failed for ${template.id}:`, error);
        }
      });
      
      // Sort by correlation (best first)
      return matches.sort((a, b) => b.correlation - a.correlation);
    }

    /**
     * Find the best match from a list of matches
     * @param {Array} matches - Array of match objects
     * @returns {Object|null} Best match or null if none above threshold
     */
    findBestMatch(matches) {
      if (matches.length === 0) return null;
      
      const best = matches[0];
      return best.correlation > this.config.correlationThreshold ? best : null;
    }

    /**
     * Try rotation adjustment for improved matching
     * @param {ImageData} imageData - Image to match
     * @param {Object} bestMatch - Best match candidate
     * @returns {Object} Rotation-adjusted match result
     */
    tryRotationAdjustment(imageData, bestMatch) {
      if (!bestMatch) {
        return {
          correlation: 0,
          rotation: 0,
          templateId: null,
          templateName: null
        };
      }
      
      let bestCorrelation = bestMatch.correlation;
      let bestRotation = 0;
      
      // Try small rotations
      const rotationSteps = [-5, -2, 2, 5]; // degrees
      
      for (const rotation of rotationSteps) {
        try {
          const rotatedImage = this.rotateImage(imageData, rotation);
          const correlation = RecognitionUtils.calculateNormalizedCrossCorrelation(
            rotatedImage,
            bestMatch.template.imageData
          );
          
          if (correlation > bestCorrelation) {
            bestCorrelation = correlation;
            bestRotation = rotation;
          }
        } catch (error) {
          console.warn(`Rotation adjustment failed for ${rotation}°:`, error);
        }
      }
      
      return {
        correlation: bestCorrelation,
        rotation: bestRotation,
        templateId: bestMatch.templateId,
        templateName: bestMatch.templateName,
        originalCorrelation: bestMatch.correlation,
        improved: bestCorrelation > bestMatch.correlation
      };
    }

    /**
     * Rotate an image by a given angle
     * @param {ImageData} imageData - Image to rotate
     * @param {number} degrees - Rotation angle in degrees
     * @returns {ImageData} Rotated image
     */
    rotateImage(imageData, degrees) {
      const canvas = RecognitionUtils.createCanvas(imageData.width, imageData.height);
      const ctx = canvas.getContext('2d');
      
      // Create temporary canvas for the source image
      const sourceCanvas = RecognitionUtils.createCanvas(imageData.width, imageData.height);
      const sourceCtx = sourceCanvas.getContext('2d');
      sourceCtx.putImageData(imageData, 0, 0);
      
      // Clear destination and set up rotation
      ctx.clearRect(0, 0, imageData.width, imageData.height);
      ctx.translate(imageData.width / 2, imageData.height / 2);
      ctx.rotate(degrees * Math.PI / 180);
      ctx.translate(-imageData.width / 2, -imageData.height / 2);
      
      // Draw rotated image
      ctx.drawImage(sourceCanvas, 0, 0);
      
      return ctx.getImageData(0, 0, imageData.width, imageData.height);
    }

    /**
     * Analyze pattern characteristics
     * @param {ImageData} imageData - Image to analyze
     * @returns {Object} Pattern characteristics
     */
    analyzePatternCharacteristics(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      
      // Calculate local patterns
      const patterns = this.extractLocalPatterns(imageData);
      const repetitiveness = this.calculateRepetitiveness(patterns);
      const complexity = this.calculateComplexity(imageData);
      const uniformity = this.calculateUniformity(imageData);
      
      return {
        repetitiveness,
        complexity,
        uniformity,
        patternCount: patterns.length,
        dominantPatternType: this.identifyDominantPatternType(patterns)
      };
    }

    /**
     * Extract local patterns from the image
     * @param {ImageData} imageData - Image to analyze
     * @returns {Array} Array of local patterns
     */
    extractLocalPatterns(imageData) {
      const patterns = [];
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const patchSize = 8; // 8x8 local patches
      
      for (let y = 0; y <= height - patchSize; y += patchSize / 2) {
        for (let x = 0; x <= width - patchSize; x += patchSize / 2) {
          if (!RecognitionUtils.isInHexMask(x + patchSize/2, y + patchSize/2, width, height)) {
            continue;
          }
          
          const pattern = this.extractPatch(imageData, x, y, patchSize);
          patterns.push(pattern);
        }
      }
      
      return patterns;
    }

    /**
     * Extract a small patch from the image
     * @param {ImageData} imageData - Source image
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate  
     * @param {number} size - Patch size
     * @returns {Object} Pattern patch data
     */
    extractPatch(imageData, x, y, size) {
      const data = imageData.data;
      const width = imageData.width;
      const patchData = [];
      
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const sourceX = x + px;
          const sourceY = y + py;
          
          if (sourceX < width && sourceY < imageData.height) {
            const index = (sourceY * width + sourceX) * 4;
            const gray = RecognitionUtils.calculateLuminance(
              data[index], data[index + 1], data[index + 2]
            );
            patchData.push(gray);
          } else {
            patchData.push(0);
          }
        }
      }
      
      return {
        x, y, size,
        data: patchData,
        mean: patchData.reduce((a, b) => a + b) / patchData.length,
        variance: this.calculateVariance(patchData)
      };
    }

    /**
     * Calculate variance of an array
     * @param {Array} data - Array of numbers
     * @returns {number} Variance
     */
    calculateVariance(data) {
      const mean = data.reduce((a, b) => a + b) / data.length;
      const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
      return squaredDiffs.reduce((a, b) => a + b) / data.length;
    }

    /**
     * Calculate repetitiveness of patterns
     * @param {Array} patterns - Array of pattern patches
     * @returns {number} Repetitiveness score (0-1)
     */
    calculateRepetitiveness(patterns) {
      if (patterns.length < 2) return 0;
      
      let totalSimilarity = 0;
      let comparisons = 0;
      
      // Compare all pattern pairs
      for (let i = 0; i < patterns.length; i++) {
        for (let j = i + 1; j < patterns.length; j++) {
          const similarity = this.calculatePatternSimilarity(patterns[i], patterns[j]);
          totalSimilarity += similarity;
          comparisons++;
        }
      }
      
      return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }

    /**
     * Calculate similarity between two patterns
     * @param {Object} pattern1 - First pattern
     * @param {Object} pattern2 - Second pattern
     * @returns {number} Similarity score (0-1)
     */
    calculatePatternSimilarity(pattern1, pattern2) {
      if (pattern1.data.length !== pattern2.data.length) return 0;
      
      let sumSquaredDiff = 0;
      for (let i = 0; i < pattern1.data.length; i++) {
        const diff = pattern1.data[i] - pattern2.data[i];
        sumSquaredDiff += diff * diff;
      }
      
      const rmse = Math.sqrt(sumSquaredDiff / pattern1.data.length);
      return Math.max(0, 1 - rmse); // Convert RMSE to similarity
    }

    /**
     * Calculate image complexity
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Complexity score (0-1)
     */
    calculateComplexity(imageData) {
      // Use edge density as a proxy for complexity
      const edgeData = RecognitionUtils.applySobelEdgeDetection(imageData);
      const edgePixels = this.countEdgePixels(edgeData);
      const totalPixels = imageData.width * imageData.height;
      
      return edgePixels / totalPixels;
    }

    /**
     * Count edge pixels in edge-detected image
     * @param {ImageData} edgeData - Edge-detected image
     * @returns {number} Number of edge pixels
     */
    countEdgePixels(edgeData) {
      const data = edgeData.data;
      let edgeCount = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const edgeStrength = data[i] / 255;
        if (edgeStrength > 0.3) { // Edge threshold
          edgeCount++;
        }
      }
      
      return edgeCount;
    }

    /**
     * Calculate image uniformity
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Uniformity score (0-1)
     */
    calculateUniformity(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      let totalVariance = 0;
      let regions = 0;
      
      // Calculate variance in local regions
      const regionSize = 8;
      for (let y = 0; y <= height - regionSize; y += regionSize) {
        for (let x = 0; x <= width - regionSize; x += regionSize) {
          if (!RecognitionUtils.isInHexMask(x + regionSize/2, y + regionSize/2, width, height)) {
            continue;
          }
          
          const regionValues = [];
          for (let ry = 0; ry < regionSize; ry++) {
            for (let rx = 0; rx < regionSize; rx++) {
              const index = ((y + ry) * width + (x + rx)) * 4;
              const gray = RecognitionUtils.calculateLuminance(data[index], data[index + 1], data[index + 2]);
              regionValues.push(gray);
            }
          }
          
          totalVariance += this.calculateVariance(regionValues);
          regions++;
        }
      }
      
      const averageVariance = regions > 0 ? totalVariance / regions : 0;
      return Math.max(0, 1 - averageVariance); // Higher uniformity = lower variance
    }

    /**
     * Identify dominant pattern type
     * @param {Array} patterns - Array of patterns
     * @returns {string} Pattern type identifier
     */
    identifyDominantPatternType(patterns) {
      if (patterns.length === 0) return 'none';
      
      // Classify patterns based on variance and mean
      let highVarianceCount = 0;
      let lowVarianceCount = 0;
      let brightCount = 0;
      let darkCount = 0;
      
      patterns.forEach(pattern => {
        if (pattern.variance > 0.1) highVarianceCount++;
        else lowVarianceCount++;
        
        if (pattern.mean > 0.5) brightCount++;
        else darkCount++;
      });
      
      // Simple classification
      if (highVarianceCount > lowVarianceCount) {
        return brightCount > darkCount ? 'bright-complex' : 'dark-complex';
      } else {
        return brightCount > darkCount ? 'bright-uniform' : 'dark-uniform';
      }
    }

    /**
     * Analyze symmetry in the image
     * @param {ImageData} imageData - Image to analyze
     * @returns {Object} Symmetry analysis
     */
    analyzeSymmetry(imageData) {
      const horizontalSymmetry = this.calculateHorizontalSymmetry(imageData);
      const verticalSymmetry = this.calculateVerticalSymmetry(imageData);
      const radialSymmetry = this.calculateRadialSymmetry(imageData);
      
      return {
        horizontal: horizontalSymmetry,
        vertical: verticalSymmetry,
        radial: radialSymmetry,
        overall: (horizontalSymmetry + verticalSymmetry + radialSymmetry) / 3
      };
    }

    /**
     * Calculate horizontal symmetry
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Symmetry score (0-1)
     */
    calculateHorizontalSymmetry(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const centerY = height / 2;
      
      let totalDifference = 0;
      let comparisons = 0;
      
      for (let y = 0; y < centerY; y++) {
        for (let x = 0; x < width; x++) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const topIndex = (y * width + x) * 4;
          const bottomIndex = ((height - 1 - y) * width + x) * 4;
          
          const topGray = RecognitionUtils.calculateLuminance(data[topIndex], data[topIndex + 1], data[topIndex + 2]);
          const bottomGray = RecognitionUtils.calculateLuminance(data[bottomIndex], data[bottomIndex + 1], data[bottomIndex + 2]);
          
          totalDifference += Math.abs(topGray - bottomGray);
          comparisons++;
        }
      }
      
      const averageDifference = comparisons > 0 ? totalDifference / comparisons : 0;
      return Math.max(0, 1 - averageDifference);
    }

    /**
     * Calculate vertical symmetry
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Symmetry score (0-1)
     */
    calculateVerticalSymmetry(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const centerX = width / 2;
      
      let totalDifference = 0;
      let comparisons = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < centerX; x++) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const leftIndex = (y * width + x) * 4;
          const rightIndex = (y * width + (width - 1 - x)) * 4;
          
          const leftGray = RecognitionUtils.calculateLuminance(data[leftIndex], data[leftIndex + 1], data[leftIndex + 2]);
          const rightGray = RecognitionUtils.calculateLuminance(data[rightIndex], data[rightIndex + 1], data[rightIndex + 2]);
          
          totalDifference += Math.abs(leftGray - rightGray);
          comparisons++;
        }
      }
      
      const averageDifference = comparisons > 0 ? totalDifference / comparisons : 0;
      return Math.max(0, 1 - averageDifference);
    }

    /**
     * Calculate radial symmetry
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Symmetry score (0-1)
     */
    calculateRadialSymmetry(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      let totalDifference = 0;
      let comparisons = 0;
      
      // Sample radial pairs
      for (let angle = 0; angle < Math.PI; angle += Math.PI / 16) {
        for (let radius = 5; radius < Math.min(width, height) / 2; radius += 3) {
          const x1 = Math.round(centerX + Math.cos(angle) * radius);
          const y1 = Math.round(centerY + Math.sin(angle) * radius);
          const x2 = Math.round(centerX + Math.cos(angle + Math.PI) * radius);
          const y2 = Math.round(centerY + Math.sin(angle + Math.PI) * radius);
          
          if (x1 >= 0 && x1 < width && y1 >= 0 && y1 < height &&
              x2 >= 0 && x2 < width && y2 >= 0 && y2 < height &&
              RecognitionUtils.isInHexMask(x1, y1, width, height) &&
              RecognitionUtils.isInHexMask(x2, y2, width, height)) {
            
            const index1 = (y1 * width + x1) * 4;
            const index2 = (y2 * width + x2) * 4;
            
            const gray1 = RecognitionUtils.calculateLuminance(data[index1], data[index1 + 1], data[index1 + 2]);
            const gray2 = RecognitionUtils.calculateLuminance(data[index2], data[index2 + 1], data[index2 + 2]);
            
            totalDifference += Math.abs(gray1 - gray2);
            comparisons++;
          }
        }
      }
      
      const averageDifference = comparisons > 0 ? totalDifference / comparisons : 0;
      return Math.max(0, 1 - averageDifference);
    }

    /**
     * Analyze texture properties
     * @param {ImageData} imageData - Image to analyze
     * @returns {Object} Texture analysis
     */
    analyzeTexture(imageData) {
      const roughness = this.calculateRoughness(imageData);
      const granularity = this.calculateGranularity(imageData);
      const directionality = this.calculateDirectionality(imageData);
      
      return {
        roughness,
        granularity,
        directionality,
        textureType: this.classifyTexture(roughness, granularity, directionality)
      };
    }

    /**
     * Calculate texture roughness
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Roughness score (0-1)
     */
    calculateRoughness(imageData) {
      // Use local standard deviation as roughness measure
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      let totalRoughness = 0;
      let regions = 0;
      
      const windowSize = 5;
      for (let y = windowSize; y < height - windowSize; y += windowSize) {
        for (let x = windowSize; x < width - windowSize; x += windowSize) {
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) continue;
          
          const localValues = [];
          for (let dy = -windowSize; dy <= windowSize; dy++) {
            for (let dx = -windowSize; dx <= windowSize; dx++) {
              const index = ((y + dy) * width + (x + dx)) * 4;
              const gray = RecognitionUtils.calculateLuminance(data[index], data[index + 1], data[index + 2]);
              localValues.push(gray);
            }
          }
          
          const stdDev = Math.sqrt(this.calculateVariance(localValues));
          totalRoughness += stdDev;
          regions++;
        }
      }
      
      return regions > 0 ? totalRoughness / regions : 0;
    }

    /**
     * Calculate texture granularity
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Granularity score (0-1)
     */
    calculateGranularity(imageData) {
      // Use high-frequency content as granularity measure
      const edgeData = RecognitionUtils.applySobelEdgeDetection(imageData);
      const edgePixels = this.countEdgePixels(edgeData);
      const totalPixels = imageData.width * imageData.height;
      
      return edgePixels / totalPixels;
    }

    /**
     * Calculate texture directionality
     * @param {ImageData} imageData - Image to analyze
     * @returns {number} Directionality score (0-1)
     */
    calculateDirectionality(imageData) {
      // Analyze edge directions to determine directionality
      const edgeData = RecognitionUtils.applySobelEdgeDetection(imageData);
      const directions = [];
      
      const data = edgeData.data;
      for (let i = 0; i < data.length; i += 4) {
        const edgeStrength = data[i] / 255;
        if (edgeStrength > 0.3) {
          const direction = data[i + 3] / 255 * 2 * Math.PI - Math.PI; // Decode direction from alpha
          directions.push(direction);
        }
      }
      
      if (directions.length === 0) return 0;
      
      // Calculate directional variance
      const avgDirection = directions.reduce((a, b) => a + b) / directions.length;
      const variance = directions.reduce((sum, dir) => sum + Math.pow(dir - avgDirection, 2), 0) / directions.length;
      
      // Lower variance indicates higher directionality
      return Math.max(0, 1 - variance / (Math.PI * Math.PI));
    }

    /**
     * Classify texture type
     * @param {number} roughness - Roughness score
     * @param {number} granularity - Granularity score
     * @param {number} directionality - Directionality score
     * @returns {string} Texture classification
     */
    classifyTexture(roughness, granularity, directionality) {
      if (roughness > 0.5 && granularity > 0.5) return 'rough-granular';
      if (roughness > 0.5 && directionality > 0.5) return 'rough-directional';
      if (granularity > 0.5 && directionality > 0.5) return 'granular-directional';
      if (roughness > 0.5) return 'rough';
      if (granularity > 0.5) return 'granular';
      if (directionality > 0.5) return 'directional';
      return 'smooth';
    }

    /**
     * Predict selection based on template matching
     * @param {Object} selectionMatch - Best selection template match
     * @param {Object} unselectionMatch - Best unselection template match
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromTemplates(selectionMatch, unselectionMatch) {
      const selectionScore = selectionMatch ? selectionMatch.correlation : 0;
      const unselectionScore = unselectionMatch ? unselectionMatch.correlation : 0;
      
      const selected = selectionScore > unselectionScore;
      const confidence = Math.max(selectionScore, unselectionScore);
      
      return { selected, confidence, reason: 'template-matching' };
    }

    /**
     * Predict selection based on symmetry analysis
     * @param {Object} symmetryAnalysis - Symmetry analysis results
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromSymmetry(symmetryAnalysis) {
      // Selected mods might have higher symmetry (more organized appearance)
      const selected = symmetryAnalysis.overall > 0.6;
      const confidence = symmetryAnalysis.overall;
      
      return { selected, confidence, reason: 'symmetry-analysis' };
    }

    /**
     * Predict selection based on texture analysis
     * @param {Object} textureAnalysis - Texture analysis results
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromTexture(textureAnalysis) {
      // Selected mods might have smoother, more uniform texture
      const selected = textureAnalysis.roughness < 0.4 && textureAnalysis.granularity < 0.5;
      const confidence = 1 - (textureAnalysis.roughness + textureAnalysis.granularity) / 2;
      
      return { selected, confidence, reason: 'texture-analysis' };
    }

    /**
     * Predict selection based on pattern characteristics
     * @param {Object} characteristics - Pattern characteristics
     * @returns {Object} Prediction with confidence
     */
    predictSelectionFromCharacteristics(characteristics) {
      // Selected mods might have more uniform, less complex patterns
      const selected = characteristics.uniformity > 0.6 && characteristics.complexity < 0.5;
      const confidence = (characteristics.uniformity + (1 - characteristics.complexity)) / 2;
      
      return { selected, confidence, reason: 'pattern-characteristics' };
    }

    /**
     * Calculate overall confidence in the pattern analysis
     * @param {Object} analysisData - All analysis data
     * @returns {number} Overall confidence (0-1)
     */
    calculateConfidence(analysisData) {
      const {
        bestSelectionMatch,
        bestUnselectionMatch,
        rotationAdjustedSelection,
        rotationAdjustedUnselection,
        templatePrediction,
        symmetryPrediction,
        texturePrediction,
        characteristicsPrediction
      } = analysisData;
      
      // Base confidence from template matching
      let confidence = templatePrediction.confidence;
      
      // Boost confidence if rotation adjustment improved matching
      if (rotationAdjustedSelection && rotationAdjustedSelection.improved) {
        confidence = Math.min(1, confidence * 1.1);
      }
      
      // Weight predictions
      const predictions = [
        { pred: templatePrediction, weight: 0.4 },
        { pred: symmetryPrediction, weight: 0.2 },
        { pred: texturePrediction, weight: 0.2 },
        { pred: characteristicsPrediction, weight: 0.2 }
      ];
      
      const agreement = this.calculatePredictionAgreement(predictions);
      confidence = Math.min(1, confidence + agreement * 0.3);
      
      // Reduce confidence if no good template matches
      if (!bestSelectionMatch && !bestUnselectionMatch) {
        confidence *= 0.6;
      }
      
      // Reduce confidence for very low correlation scores
      const maxCorrelation = Math.max(
        rotationAdjustedSelection?.correlation || 0,
        rotationAdjustedUnselection?.correlation || 0
      );
      if (maxCorrelation < 0.3) {
        confidence *= 0.7;
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
     * Load selection templates (reference patterns)
     * @returns {Array} Array of selection template objects
     */
    loadSelectionTemplates() {
      // In a real implementation, these would be loaded from training data
      // For now, create synthetic templates
      const templates = [];
      
      // Create bright, uniform template
      templates.push(this.createSyntheticTemplate('selected-bright', 48, 48, {
        baseColor: [200, 180, 120],
        pattern: 'uniform-bright'
      }));
      
      // Create glowing template
      templates.push(this.createSyntheticTemplate('selected-glow', 48, 48, {
        baseColor: [180, 200, 140],
        pattern: 'radial-glow'
      }));
      
      // Create highlighted border template
      templates.push(this.createSyntheticTemplate('selected-border', 48, 48, {
        baseColor: [160, 140, 200],
        pattern: 'highlighted-border'
      }));
      
      return templates;
    }

    /**
     * Load unselection templates (reference patterns)
     * @returns {Array} Array of unselection template objects
     */
    loadUnselectionTemplates() {
      const templates = [];
      
      // Create dark, uniform template
      templates.push(this.createSyntheticTemplate('unselected-dark', 48, 48, {
        baseColor: [80, 90, 100],
        pattern: 'uniform-dark'
      }));
      
      // Create muted template
      templates.push(this.createSyntheticTemplate('unselected-muted', 48, 48, {
        baseColor: [70, 80, 90],
        pattern: 'muted'
      }));
      
      // Create shadowed template
      templates.push(this.createSyntheticTemplate('unselected-shadow', 48, 48, {
        baseColor: [90, 80, 70],
        pattern: 'shadowed'
      }));
      
      return templates;
    }

    /**
     * Create a synthetic template for testing
     * @param {string} id - Template ID
     * @param {number} width - Template width
     * @param {number} height - Template height
     * @param {Object} config - Template configuration
     * @returns {Object} Template object
     */
    createSyntheticTemplate(id, width, height, config) {
      const canvas = RecognitionUtils.createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.4;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          
          if (!RecognitionUtils.isInHexMask(x, y, width, height)) {
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 0;
            data[index + 3] = 0;
            continue;
          }
          
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
          const normalizedDistance = distance / maxRadius;
          
          let r = config.baseColor[0];
          let g = config.baseColor[1];
          let b = config.baseColor[2];
          
          // Apply pattern
          switch (config.pattern) {
            case 'uniform-bright':
              // Uniform bright color
              break;
              
            case 'radial-glow':
              // Radial glow effect
              const glowFactor = Math.max(0, 1 - normalizedDistance);
              r = Math.min(255, r + glowFactor * 50);
              g = Math.min(255, g + glowFactor * 50);
              b = Math.min(255, b + glowFactor * 50);
              break;
              
            case 'highlighted-border':
              // Bright border
              if (normalizedDistance > 0.8) {
                r = Math.min(255, r + 80);
                g = Math.min(255, g + 80);
                b = Math.min(255, b + 80);
              }
              break;
              
            case 'uniform-dark':
              // Uniform dark color
              break;
              
            case 'muted':
              // Slightly varied muted colors
              r += (Math.random() - 0.5) * 20;
              g += (Math.random() - 0.5) * 20;
              b += (Math.random() - 0.5) * 20;
              break;
              
            case 'shadowed':
              // Shadow effect
              const shadowFactor = Math.max(0, normalizedDistance - 0.3);
              r = Math.max(0, r - shadowFactor * 30);
              g = Math.max(0, g - shadowFactor * 30);
              b = Math.max(0, b - shadowFactor * 30);
              break;
          }
          
          data[index] = Math.max(0, Math.min(255, r));
          data[index + 1] = Math.max(0, Math.min(255, g));
          data[index + 2] = Math.max(0, Math.min(255, b));
          data[index + 3] = 255;
        }
      }
      
      return {
        id,
        name: id.replace('-', ' '),
        imageData,
        width,
        height,
        config
      };
    }

    /**
     * Add a new template from training data
     * @param {string} id - Template ID
     * @param {ImageData} imageData - Template image data
     * @param {boolean} isSelected - Whether this represents a selected state
     */
    addTemplate(id, imageData, isSelected) {
      const template = {
        id,
        name: id,
        imageData,
        width: imageData.width,
        height: imageData.height,
        config: { learned: true }
      };
      
      if (isSelected) {
        this.selectionTemplates.push(template);
      } else {
        this.unselectionTemplates.push(template);
      }
      
      console.log(`Added ${isSelected ? 'selection' : 'unselection'} template: ${id}`);
    }

    /**
     * Update templates based on calibration data
     * @param {Array} calibrationData - Array of calibration examples
     */
    calibrate(calibrationData) {
      if (!calibrationData || calibrationData.length < 5) {
        console.warn('Insufficient calibration data for pattern matcher');
        return;
      }
      
      // Extract high-confidence examples as new templates
      const highConfidenceExamples = calibrationData.filter(d => d.confidence > 0.8);
      
      let addedTemplates = 0;
      highConfidenceExamples.forEach((example, index) => {
        if (addedTemplates < 3 && example.imageData) { // Limit to 3 new templates
          const templateId = `learned-${example.actualSelection ? 'selected' : 'unselected'}-${index}`;
          this.addTemplate(templateId, example.imageData, example.actualSelection);
          addedTemplates++;
        }
      });
      
      console.log(`Pattern matcher calibrated with ${addedTemplates} new templates`);
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
        selectionTemplates: this.selectionTemplates.length,
        unselectionTemplates: this.unselectionTemplates.length
      };
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternMatcher;
  } else {
    global.PatternMatcher = PatternMatcher;
  }

})(typeof window !== 'undefined' ? window : global);
