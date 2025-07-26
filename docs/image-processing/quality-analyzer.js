/**
 * Nova Drift Quality Analyzer - Phase 3
 * Analyzes image quality and completeness for recognition suitability
 */

(function(global) {
  'use strict';

  /**
   * Quality analyzer for extracted hex regions.
   * This class provides methods to assess image quality based on metrics like
   * sharpness, contrast, and brightness distribution.
   */
  class QualityAnalyzer {
    constructor() {
      // These thresholds can be used by other modules but are not directly used
      // within the quality analysis itself, which returns raw metrics.
      this.sharpnessThreshold = 0.3;
      this.contrastThreshold = 0.4;
      this.noiseThreshold = 0.8;
      this.completenessThreshold = 0.7;
      this.adaptiveThresholdFactor = 1.2; // Factor for dynamic threshold calculation
    }

    /**
     * Calculate an adaptive quality threshold based on image characteristics.
     * This can be used to dynamically decide if a region is good enough.
     * @param {ImageData} imageData - Image data to analyze.
     * @returns {number} Adaptive quality threshold (0-1).
     */
    calculateAdaptiveThreshold(imageData) {
      const qualityMetrics = this.analyzeImageQuality(imageData);

      // Base threshold + adjustments based on image characteristics
      let threshold = 0.5;

      // Lower threshold for darker images, as they naturally have less contrast
      if (qualityMetrics.brightness < 0.4) {
        threshold -= 0.1;
      }
      // Higher threshold for potentially noisy images (high sharpness)
      if (qualityMetrics.sharpness > 0.6) {
        threshold += 0.1;
      }

      // Adjust based on overall quality score
      threshold = threshold + (0.5 - qualityMetrics.quality) * 0.2;

      return Math.max(0.3, Math.min(0.9, threshold));
    }

    /**
     * Analyzes overall image quality and returns a set of metrics.
     * @param {ImageData} imageData - The image data of the hex region to analyze.
     * @returns {{sharpness: number, brightness: number, contrast: number, quality: number}} An object containing quality metrics.
     */
    analyzeImageQuality(imageData) {
      const { width, height, data } = imageData;
      const totalPixels = width * height;

      if (totalPixels === 0) {
        return { sharpness: 0, brightness: 0, contrast: 0, quality: 0 };
      }

      let totalVariance = 0;
      let brightPixels = 0;
      let maxBrightness = 0;
      let minBrightness = 255;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;

        if (brightness > 128) brightPixels++;
        if (brightness > maxBrightness) maxBrightness = brightness;
        if (brightness < minBrightness) minBrightness = brightness; // Corrected typo

        // Calculate local variance for sharpness assessment (vertical)
        const nextRowIndex = i + (width * 4);
        if (nextRowIndex < data.length) {
          const nextRowBrightness = (data[nextRowIndex] +
                                    data[nextRowIndex + 1] +
                                    data[nextRowIndex + 2]) / 3;
          totalVariance += Math.abs(brightness - nextRowBrightness);
        }
      }

      const contrast = (maxBrightness - minBrightness) / 255;
      const sharpness = totalVariance / totalPixels;
      const brightnessPercentage = brightPixels / totalPixels; // Corrected calculation

      // A normalized quality score combining sharpness and contrast.
      // The constants (e.g., 50) are heuristic and may need tuning.
      const quality = Math.min(1.0, (sharpness / 50) + (contrast * 0.3));

      return {
        sharpness: sharpness,
        brightness: brightnessPercentage,
        contrast: contrast,
        quality: quality
      };
    }

    /**
     * Calculates the completeness of a hex region by checking how many pixels
     * within a hexagonal mask are non-transparent.
     * @param {ImageData} imageData - The image data of the hex region.
     * @param {{radius: number}} options - Options including the hex radius.
     * @returns {number} A completeness score from 0 to 1.
     */
    calculateCompleteness(imageData, options) {
        const { width, height, data } = imageData;
        const radius = options.radius || width / 2;
        const centerX = width / 2;
        const centerY = height / 2;

        if (width === 0 || height === 0) return 0;

        let pixelsInHex = 0;
        let totalPixelsInHex = 0;

        const hexVertices = [];
        for (let i = 0; i < 6; i++) {
            const angle = i * Math.PI / 3;
            hexVertices.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            });
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.isPointInPolygon({ x, y }, hexVertices)) {
                    totalPixelsInHex++;
                    const index = (y * width + x) * 4;
                    if (data[index + 3] > 128) { // Check alpha channel
                        pixelsInHex++;
                    }
                }
            }
        }

        return totalPixelsInHex > 0 ? pixelsInHex / totalPixelsInHex : 0;
    }

    /**
     * Helper to check if a point is inside a polygon.
     * @param {{x: number, y: number}} point - The point to check.
     * @param {Array<{x: number, y: number}>} vertices - The polygon vertices.
     * @returns {boolean} True if the point is inside.
     */
    isPointInPolygon(point, vertices) {
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
  }

  // Export to global scope
  global.QualityAnalyzer = QualityAnalyzer;

})(typeof window !== 'undefined' ? window : global);
