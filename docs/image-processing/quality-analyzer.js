/**
 * Nova Drift Quality Analyzer - Phase 3
 * Analyzes image quality and completeness for recognition suitability
 */

(function(global) {
  'use strict';

  /**
   * Quality analyzer for extracted hex regions
   */
  class QualityAnalyzer {
    constructor() {
      this.sharpnessThreshold = 0.3;
      this.contrastThreshold = 0.4;
      this.noiseThreshold = 0.8;
      this.completenessThreshold = 0.7;
    }

    /**
     * Analyze overall image quality
     * @param {ImageData} imageData - Image data to analyze
     * @returns {number} Quality score from 0 to 1
     */
    analyzeImageQuality(imageData) {
      try {
        const sharpness = this.calculateSharpness(imageData);
        const contrast = this.calculateContrast(imageData);
        const noise = this.calculateNoiseLevel(imageData);
        const artifacts = this.detectArtifacts(imageData);
        
        // Weighted quality score
        const sharpnessScore = Math.min(1, sharpness / this.sharpnessThreshold);
        const contrastScore = Math.min(1, contrast / this.contrastThreshold);
        const noiseScore = Math.min(1, this.noiseThreshold / noise);
        const artifactScore = 1 - artifacts;
        
        // Combined quality score with weights
        const quality = (
          sharpnessScore * 0.35 +
          contrastScore * 0.25 +
          noiseScore * 0.25 +
          artifactScore * 0.15
        );
        
        return Math.max(0, Math.min(1, quality));
        
      } catch (error) {
        console.warn('Quality analysis failed:', error);
        return 0.5; // Default moderate quality
      }
    }

    /**
     * Calculate completeness of hex region
     * @param {ImageData} imageData - Image data to analyze
     * @param {Object} expectedShape - Expected shape parameters
     * @returns {number} Completeness score from 0 to 1
     */
    calculateCompleteness(imageData, expectedShape) {
      try {
        const centerX = imageData.width / 2;
        const centerY = imageData.height / 2;
        const radius = expectedShape.radius || Math.min(imageData.width, imageData.height) / 2;
        
        // Check coverage within expected hex shape
        let totalPixels = 0;
        let coveredPixels = 0;
        const data = imageData.data;
        
        for (let y = 0; y < imageData.height; y++) {
          for (let x = 0; x < imageData.width; x++) {
            // Check if pixel is within hex bounds
            if (this.isWithinHex(x, y, centerX, centerY, radius)) {
              totalPixels++;
              
              const pixelIndex = (y * imageData.width + x) * 4;
              const alpha = data[pixelIndex + 3];
              
              // Consider pixel covered if it has content (non-transparent)
              if (alpha > 50) {
                coveredPixels++;
              }
            }
          }
        }
        
        const completeness = totalPixels > 0 ? coveredPixels / totalPixels : 0;
        return Math.max(0, Math.min(1, completeness));
        
      } catch (error) {
        console.warn('Completeness calculation failed:', error);
        return 0.8; // Default good completeness
      }
    }

    /**
     * Calculate image sharpness using gradient magnitude
     */
    calculateSharpness(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      let totalGradient = 0;
      let pixelCount = 0;
      
      // Calculate gradients using Sobel operator
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const centerIndex = (y * width + x) * 4;
          
          // Calculate gradient for each RGB channel
          let gradientMagnitude = 0;
          for (let c = 0; c < 3; c++) {
            // Sobel X gradient
            const gx = (
              -data[((y - 1) * width + (x - 1)) * 4 + c] +
              data[((y - 1) * width + (x + 1)) * 4 + c] +
              -2 * data[(y * width + (x - 1)) * 4 + c] +
              2 * data[(y * width + (x + 1)) * 4 + c] +
              -data[((y + 1) * width + (x - 1)) * 4 + c] +
              data[((y + 1) * width + (x + 1)) * 4 + c]
            );
            
            // Sobel Y gradient
            const gy = (
              -data[((y - 1) * width + (x - 1)) * 4 + c] +
              -2 * data[((y - 1) * width + x) * 4 + c] +
              -data[((y - 1) * width + (x + 1)) * 4 + c] +
              data[((y + 1) * width + (x - 1)) * 4 + c] +
              2 * data[((y + 1) * width + x) * 4 + c] +
              data[((y + 1) * width + (x + 1)) * 4 + c]
            );
            
            gradientMagnitude += Math.sqrt(gx * gx + gy * gy);
          }
          
          totalGradient += gradientMagnitude / 3; // Average across RGB
          pixelCount++;
        }
      }
      
      return pixelCount > 0 ? totalGradient / pixelCount / 255 : 0;
    }

    /**
     * Calculate image contrast using standard deviation
     */
    calculateContrast(imageData) {
      const data = imageData.data;
      let sum = 0;
      let sumSquares = 0;
      let pixelCount = 0;
      
      // Calculate luminance for each pixel
      for (let i = 0; i < data.length; i += 4) {
        // Convert RGB to luminance
        const luminance = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        
        sum += luminance;
        sumSquares += luminance * luminance;
        pixelCount++;
      }
      
      if (pixelCount === 0) return 0;
      
      const mean = sum / pixelCount;
      const variance = (sumSquares / pixelCount) - (mean * mean);
      const standardDeviation = Math.sqrt(Math.max(0, variance));
      
      return standardDeviation;
    }

    /**
     * Calculate noise level using local variance
     */
    calculateNoiseLevel(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      let totalVariance = 0;
      let windowCount = 0;
      
      const windowSize = 5;
      const halfWindow = Math.floor(windowSize / 2);
      
      // Calculate local variance in small windows
      for (let y = halfWindow; y < height - halfWindow; y += windowSize) {
        for (let x = halfWindow; x < width - halfWindow; x += windowSize) {
          let windowSum = 0;
          let windowSumSquares = 0;
          let windowPixels = 0;
          
          // Calculate variance within window
          for (let wy = y - halfWindow; wy <= y + halfWindow; wy++) {
            for (let wx = x - halfWindow; wx <= x + halfWindow; wx++) {
              const pixelIndex = (wy * width + wx) * 4;
              const luminance = (0.299 * data[pixelIndex] + 0.587 * data[pixelIndex + 1] + 0.114 * data[pixelIndex + 2]) / 255;
              
              windowSum += luminance;
              windowSumSquares += luminance * luminance;
              windowPixels++;
            }
          }
          
          if (windowPixels > 0) {
            const windowMean = windowSum / windowPixels;
            const windowVariance = (windowSumSquares / windowPixels) - (windowMean * windowMean);
            totalVariance += Math.sqrt(Math.max(0, windowVariance));
            windowCount++;
          }
        }
      }
      
      return windowCount > 0 ? totalVariance / windowCount : 0;
    }

    /**
     * Detect compression artifacts and other issues
     */
    detectArtifacts(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      
      // Check for JPEG block artifacts (8x8 grid patterns)
      let blockArtifacts = this.detectBlockArtifacts(data, width, height);
      
      // Check for color banding
      let colorBanding = this.detectColorBanding(data, width, height);
      
      // Check for excessive uniform areas (might indicate heavy compression)
      let uniformAreas = this.detectUniformAreas(data, width, height);
      
      // Combine artifact scores
      const totalArtifacts = (blockArtifacts * 0.4 + colorBanding * 0.3 + uniformAreas * 0.3);
      
      return Math.max(0, Math.min(1, totalArtifacts));
    }

    /**
     * Detect JPEG block artifacts
     */
    detectBlockArtifacts(data, width, height) {
      let artifactScore = 0;
      let blockCount = 0;
      
      // Check 8x8 blocks for discontinuities
      for (let by = 0; by < height - 8; by += 8) {
        for (let bx = 0; bx < width - 8; bx += 8) {
          // Check block boundaries for sudden changes
          let boundaryDiscontinuity = 0;
          
          // Check right boundary
          for (let y = by; y < by + 8; y++) {
            const leftIndex = (y * width + (bx + 7)) * 4;
            const rightIndex = (y * width + (bx + 8)) * 4;
            
            for (let c = 0; c < 3; c++) {
              boundaryDiscontinuity += Math.abs(data[leftIndex + c] - data[rightIndex + c]);
            }
          }
          
          // Check bottom boundary
          for (let x = bx; x < bx + 8; x++) {
            const topIndex = ((by + 7) * width + x) * 4;
            const bottomIndex = ((by + 8) * width + x) * 4;
            
            for (let c = 0; c < 3; c++) {
              boundaryDiscontinuity += Math.abs(data[topIndex + c] - data[bottomIndex + c]);
            }
          }
          
          artifactScore += boundaryDiscontinuity / (16 * 3 * 255); // Normalize
          blockCount++;
        }
      }
      
      return blockCount > 0 ? artifactScore / blockCount : 0;
    }

    /**
     * Detect color banding
     */
    detectColorBanding(data, width, height) {
      let bandingScore = 0;
      let gradientCount = 0;
      
      // Check for sudden color transitions in gradients
      for (let y = 0; y < height; y++) {
        for (let x = 1; x < width - 1; x++) {
          const prevIndex = (y * width + (x - 1)) * 4;
          const currIndex = (y * width + x) * 4;
          const nextIndex = (y * width + (x + 1)) * 4;
          
          for (let c = 0; c < 3; c++) {
            const prevValue = data[prevIndex + c];
            const currValue = data[currIndex + c];
            const nextValue = data[nextIndex + c];
            
            // Check for plateau in what should be a gradient
            const leftGradient = Math.abs(currValue - prevValue);
            const rightGradient = Math.abs(nextValue - currValue);
            
            if (leftGradient < 2 && rightGradient < 2 && Math.abs(nextValue - prevValue) > 10) {
              bandingScore += 1;
            }
          }
          
          gradientCount++;
        }
      }
      
      return gradientCount > 0 ? bandingScore / (gradientCount * 3) : 0;
    }

    /**
     * Detect excessive uniform areas
     */
    detectUniformAreas(data, width, height) {
      let uniformPixels = 0;
      let totalPixels = 0;
      
      const uniformThreshold = 5; // Pixels must be within this difference to be considered uniform
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const centerIndex = (y * width + x) * 4;
          let isUniform = true;
          
          // Check 3x3 neighborhood
          for (let dy = -1; dy <= 1 && isUniform; dy++) {
            for (let dx = -1; dx <= 1 && isUniform; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const neighborIndex = ((y + dy) * width + (x + dx)) * 4;
              
              for (let c = 0; c < 3; c++) {
                if (Math.abs(data[centerIndex + c] - data[neighborIndex + c]) > uniformThreshold) {
                  isUniform = false;
                  break;
                }
              }
            }
          }
          
          if (isUniform) uniformPixels++;
          totalPixels++;
        }
      }
      
      return totalPixels > 0 ? uniformPixels / totalPixels : 0;
    }

    /**
     * Check if point is within hexagonal bounds
     */
    isWithinHex(x, y, centerX, centerY, radius) {
      const dx = x - centerX;
      const dy = y - centerY;
      
      // Use hexagonal distance formula
      const q = (2/3 * dx) / radius;
      const r = (-1/3 * dx + Math.sqrt(3)/3 * dy) / radius;
      const s = -q - r;
      
      return Math.abs(q) <= 1 && Math.abs(r) <= 1 && Math.abs(s) <= 1;
    }
  }

  // Export to global scope
  global.QualityAnalyzer = QualityAnalyzer;

})(typeof window !== 'undefined' ? window : global);
