/**
 * Nova Drift Recognition Utilities - Phase 4
 * Common utility functions for image recognition algorithms
 */

(function(global) {
  'use strict';

  /**
   * Utility functions for recognition algorithms
   */
  class RecognitionUtils {
    
    /**
     * Calculate the luminance (brightness) of an RGB color
     * Uses the standard luminance formula
     */
    static calculateLuminance(r, g, b) {
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    /**
     * Calculate average brightness of an image region
     * @param {ImageData} imageData - The image data to analyze
     * @param {Object} mask - Optional hex mask for focused analysis
     * @returns {number} Average brightness (0-1)
     */
    static calculateAverageBrightness(imageData, mask = null) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      
      let totalBrightness = 0;
      let pixelCount = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          
          // Skip if mask is provided and pixel is not included
          if (mask && !this.isInHexMask(x, y, width, height)) {
            continue;
          }
          
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          
          // Skip transparent pixels
          if (a === 0) continue;
          
          totalBrightness += this.calculateLuminance(r, g, b);
          pixelCount++;
        }
      }
      
      return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }

    /**
     * Analyze brightness distribution of an image
     * @param {ImageData} imageData - The image data to analyze
     * @returns {Object} Distribution statistics
     */
    static analyzeBrightnessDistribution(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const histogram = new Array(256).fill(0);
      
      let pixelCount = 0;
      let brightnessSum = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!this.isInHexMask(x, y, width, height)) continue;
          
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          
          if (a === 0) continue;
          
          const brightness = Math.round(this.calculateLuminance(r, g, b) * 255);
          histogram[brightness]++;
          brightnessSum += brightness;
          pixelCount++;
        }
      }
      
      const mean = pixelCount > 0 ? brightnessSum / pixelCount : 0;
      
      // Calculate standard deviation
      let varianceSum = 0;
      let count = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!this.isInHexMask(x, y, width, height)) continue;
          
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          
          if (a === 0) continue;
          
          const brightness = this.calculateLuminance(r, g, b) * 255;
          varianceSum += Math.pow(brightness - mean, 2);
          count++;
        }
      }
      
      const stdDev = count > 0 ? Math.sqrt(varianceSum / count) : 0;
      
      return {
        mean: mean / 255,
        stdDev: stdDev / 255,
        histogram: histogram,
        pixelCount: pixelCount,
        range: {
          min: this.findFirstNonZero(histogram) / 255,
          max: this.findLastNonZero(histogram) / 255
        }
      };
    }

    /**
     * Check if a pixel is within the hexagonal mask
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @returns {boolean} True if pixel is in hex
     */
    static isInHexMask(x, y, width, height) {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.4; // 80% of half the smallest dimension
      
      // Approximate hex shape with distance check
      const dx = Math.abs(x - centerX);
      const dy = Math.abs(y - centerY);
      
      // Hex shape approximation
      if (dx > radius * 0.866) return false; // 0.866 ≈ sqrt(3)/2
      if (dy > radius) return false;
      if (dx * 0.577 + dy > radius) return false; // 0.577 ≈ 1/sqrt(3)
      
      return true;
    }

    /**
     * Extract dominant colors using simple clustering
     * @param {ImageData} imageData - The image data to analyze
     * @param {number} numColors - Number of dominant colors to extract
     * @returns {Array} Array of dominant color objects
     */
    static extractDominantColors(imageData, numColors = 5) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const colors = [];
      
      // Sample pixels (every 4th pixel for performance)
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          if (!this.isInHexMask(x, y, width, height)) continue;
          
          const index = (y * width + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          
          if (a === 0) continue;
          
          colors.push({ r, g, b, count: 1 });
        }
      }
      
      // Simple clustering by grouping similar colors
      const clusters = [];
      const threshold = 30; // Color similarity threshold
      
      for (const color of colors) {
        let merged = false;
        
        for (const cluster of clusters) {
          const dr = Math.abs(cluster.r - color.r);
          const dg = Math.abs(cluster.g - color.g);
          const db = Math.abs(cluster.b - color.b);
          
          if (dr + dg + db < threshold) {
            // Merge into existing cluster
            cluster.r = (cluster.r * cluster.count + color.r) / (cluster.count + 1);
            cluster.g = (cluster.g * cluster.count + color.g) / (cluster.count + 1);
            cluster.b = (cluster.b * cluster.count + color.b) / (cluster.count + 1);
            cluster.count++;
            merged = true;
            break;
          }
        }
        
        if (!merged) {
          clusters.push(color);
        }
      }
      
      // Sort by frequency and return top colors
      clusters.sort((a, b) => b.count - a.count);
      return clusters.slice(0, numColors);
    }

    /**
     * Calculate color distance using Delta E approximation
     * @param {Object} color1 - First color {r, g, b}
     * @param {Object} color2 - Second color {r, g, b}
     * @returns {number} Color distance
     */
    static calculateColorDistance(color1, color2) {
      const dr = color1.r - color2.r;
      const dg = color1.g - color2.g;
      const db = color1.b - color2.b;
      
      // Simple Euclidean distance in RGB space
      return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    /**
     * Apply Sobel edge detection
     * @param {ImageData} imageData - The image data to process
     * @returns {ImageData} Edge detected image data
     */
    static applySobelEdgeDetection(imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const output = new Uint8ClampedArray(data.length);
      
      // Sobel kernels
      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (!this.isInHexMask(x, y, width, height)) {
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
              const gray = this.calculateLuminance(
                data[pixelIndex],
                data[pixelIndex + 1],
                data[pixelIndex + 2]
              ) * 255;
              
              const kernelIndex = (ky + 1) * 3 + (kx + 1);
              gx += gray * sobelX[kernelIndex];
              gy += gray * sobelY[kernelIndex];
            }
          }
          
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          const outputIndex = (y * width + x) * 4;
          
          output[outputIndex] = magnitude;
          output[outputIndex + 1] = magnitude;
          output[outputIndex + 2] = magnitude;
          output[outputIndex + 3] = 255;
        }
      }
      
      return new ImageData(output, width, height);
    }

    /**
     * Calculate normalized cross-correlation between two images
     * @param {ImageData} image1 - First image
     * @param {ImageData} image2 - Second image
     * @returns {number} Correlation coefficient (-1 to 1)
     */
    static calculateNormalizedCrossCorrelation(image1, image2) {
      if (image1.width !== image2.width || image1.height !== image2.height) {
        throw new Error('Images must be the same size for correlation');
      }
      
      const data1 = image1.data;
      const data2 = image2.data;
      const width = image1.width;
      const height = image1.height;
      
      let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
      let n = 0;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (!this.isInHexMask(x, y, width, height)) continue;
          
          const index = (y * width + x) * 4;
          const gray1 = this.calculateLuminance(data1[index], data1[index + 1], data1[index + 2]);
          const gray2 = this.calculateLuminance(data2[index], data2[index + 1], data2[index + 2]);
          
          sum1 += gray1;
          sum2 += gray2;
          sum1Sq += gray1 * gray1;
          sum2Sq += gray2 * gray2;
          pSum += gray1 * gray2;
          n++;
        }
      }
      
      if (n === 0) return 0;
      
      const numerator = pSum - (sum1 * sum2 / n);
      const denominator = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
      
      return denominator !== 0 ? numerator / denominator : 0;
    }

    /**
     * Find first non-zero element in array
     */
    static findFirstNonZero(array) {
      for (let i = 0; i < array.length; i++) {
        if (array[i] > 0) return i;
      }
      return 0;
    }

    /**
     * Find last non-zero element in array
     */
    static findLastNonZero(array) {
      for (let i = array.length - 1; i >= 0; i--) {
        if (array[i] > 0) return i;
      }
      return array.length - 1;
    }

    /**
     * Create a canvas element for processing
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {HTMLCanvasElement} Canvas element
     */
    static createCanvas(width, height) {
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
      } else {
        // Mock canvas for testing environment
        return {
          width: width,
          height: height,
          getContext: () => ({
            clearRect: () => {},
            drawImage: () => {},
            getImageData: (x, y, w, h) => {
              const data = new Uint8ClampedArray(w * h * 4);
              for (let i = 0; i < data.length; i += 4) {
                data[i] = 128;     // R
                data[i + 1] = 128; // G
                data[i + 2] = 128; // B
                data[i + 3] = 255; // A
              }
              return { data, width: w, height: h };
            },
            putImageData: () => {}
          })
        };
      }
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecognitionUtils;
  } else {
    global.RecognitionUtils = RecognitionUtils;
  }

})(typeof window !== 'undefined' ? window : global);
