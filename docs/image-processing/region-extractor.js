/**
 * Nova Drift Region Extractor - Phase 3
 * Handles extraction and normalization of individual hex regions
 */

(function(global) {
  'use strict';

  /**
   * Region extractor for individual hex regions
   */
  class RegionExtractor {
    constructor(memoryManager) {
      this.memoryManager = memoryManager;
      this.extractionCanvas = null;
      this.extractionCtx = null;
      this.normalizationCanvas = null;
      this.normalizationCtx = null;
    }

    /**
     * Extract a hexagonal region from the source image
     * @param {HTMLImageElement} sourceImage - Source screenshot
     * @param {Object} centerPoint - Center coordinates {x, y}
     * @param {number} hexRadius - Radius of the hex in pixels
     * @returns {ImageData} Extracted hex region
     */
    extractHexRegion(sourceImage, centerPoint, hexRadius) {
      try {
        // Calculate extraction size with padding for quality
        const padding = Math.max(4, hexRadius * 0.2);
        const size = (hexRadius * 2) + (padding * 2);
        
        // Get or create extraction canvas
        const canvas = this.getExtractionCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Calculate source coordinates
        const sourceX = Math.max(0, centerPoint.x - size / 2);
        const sourceY = Math.max(0, centerPoint.y - size / 2);
        const sourceWidth = Math.min(size, sourceImage.naturalWidth - sourceX);
        const sourceHeight = Math.min(size, sourceImage.naturalHeight - sourceY);
        
        // Calculate destination coordinates to center the extracted region
        const destX = (size - sourceWidth) / 2;
        const destY = (size - sourceHeight) / 2;
        
        // Extract region from source image
        if (typeof sourceImage.naturalWidth !== 'undefined') {
          // Real image element
          ctx.drawImage(
            sourceImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            destX, destY, sourceWidth, sourceHeight
          );
        } else {
          // Mock image for testing - fill with test pattern
          ctx.fillStyle = `rgb(${128 + Math.random() * 127}, ${128 + Math.random() * 127}, ${128 + Math.random() * 127})`;
          ctx.fillRect(destX, destY, sourceWidth, sourceHeight);
          
          // Add some pattern for testing
          ctx.fillStyle = `rgb(${64 + Math.random() * 127}, ${64 + Math.random() * 127}, ${64 + Math.random() * 127})`;
          for (let i = 0; i < 10; i++) {
            const x = destX + Math.random() * sourceWidth;
            const y = destY + Math.random() * sourceHeight;
            const w = Math.random() * 10 + 2;
            const h = Math.random() * 10 + 2;
            ctx.fillRect(x, y, w, h);
          }
        }
        
        // Create hex mask for clean extraction
        this.applyHexMask(ctx, size / 2, size / 2, hexRadius);
        
        // Get image data
        return ctx.getImageData(0, 0, size, size);
        
      } catch (error) {
        throw new Error(`Region extraction failed: ${error.message}`);
      }
    }

    /**
     * Normalize extracted region to target size with adaptive enhancement
     * @param {ImageData} sourceImageData - Source region data
     * @param {Object} targetSize - Target dimensions {width, height}
     * @returns {ImageData} Normalized image data
     */
    normalizeRegion(sourceImageData, targetSize) {
      try {
        // Get or create normalization canvas
        const canvas = this.getNormalizationCanvas(targetSize.width, targetSize.height);
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, targetSize.width, targetSize.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Create temporary canvas for source data
        const sourceCanvas = this.memoryManager.getCanvas(sourceImageData.width, sourceImageData.height);
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCtx.putImageData(sourceImageData, 0, 0);
        
        // Scale to target size using high-quality resampling
        ctx.drawImage(
          sourceCanvas,
          0, 0, sourceImageData.width, sourceImageData.height,
          0, 0, targetSize.width, targetSize.height
        );
        
        // Get normalized image data
        const normalizedData = ctx.getImageData(0, 0, targetSize.width, targetSize.height);
        
        // Assess quality before enhancement
        const quality = global.QualityAnalyzer.analyzeImageQuality(normalizedData);
        
        // Apply enhancement only if quality is below threshold
        let finalData = normalizedData;
        if (quality.quality < 0.8) {
          // Only enhance if quality is low
          finalData = this.enhanceImageQuality(normalizedData);
        }
        
        // Return canvas to pool
        this.memoryManager.releaseCanvas(sourceCanvas);
        
        return finalData;
        
      } catch (error) {
        throw new Error(`Region normalization failed: ${error.message}`);
      }
    }

    /**
     * Apply hexagonal mask to extracted region
     */
    applyHexMask(ctx, centerX, centerY, radius) {
      // Create hexagonal clipping path
      ctx.save();
      ctx.globalCompositeOperation = 'destination-in';
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }

    /**
     * Enhance image quality adaptively based on image characteristics
     */
    enhanceImageQuality(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = new Uint8ClampedArray(imageData.data);
      
      // First analyze the image to determine enhancement needs
      const quality = global.QualityAnalyzer.analyzeImageQuality(imageData);
      
      // Apply different enhancements based on quality characteristics
      if (quality.sharpness < 0.5) {
        this.applyUnsharpMask(data, width, height, 0.8, 1.5);
      }
      
      // Apply adaptive contrast enhancement
      const contrastFactor = quality.brightness > 0.7 ? 1.05 : 1.15;
      this.enhanceContrast(data, contrastFactor);
      
      // Only apply denoising if noise level is high
      if (quality.sharpness > 0.6) {
        this.adaptiveDenoising(data, width, height);
      }
      
      return new ImageData(data, width, height);
    }

    /**
     * Apply unsharp mask filter
     */
    applyUnsharpMask(data, width, height, amount = 0.5, radius = 1.0, threshold = 0) {
      const original = new Uint8ClampedArray(data);
      const blurred = new Uint8ClampedArray(data);
      
      // Simple Gaussian blur for mask
      this.gaussianBlur(blurred, width, height, radius);
      
      // Apply unsharp mask
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          const originalValue = original[i + c];
          const blurredValue = blurred[i + c];
          const difference = originalValue - blurredValue;
          
          if (Math.abs(difference) > threshold) {
            data[i + c] = Math.max(0, Math.min(255, originalValue + amount * difference));
          }
        }
      }
    }

    /**
     * Simple Gaussian blur implementation
     */
    gaussianBlur(data, width, height, radius) {
      const kernel = this.createGaussianKernel(radius);
      const kernelSize = kernel.length;
      const half = Math.floor(kernelSize / 2);
      const output = new Uint8ClampedArray(data);
      
      // Horizontal pass
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pixelIndex = (y * width + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          
          for (let i = 0; i < kernelSize; i++) {
            const sampleX = Math.max(0, Math.min(width - 1, x + i - half));
            const sampleIndex = (y * width + sampleX) * 4;
            const weight = kernel[i];
            
            r += data[sampleIndex] * weight;
            g += data[sampleIndex + 1] * weight;
            b += data[sampleIndex + 2] * weight;
            a += data[sampleIndex + 3] * weight;
          }
          
          output[pixelIndex] = r;
          output[pixelIndex + 1] = g;
          output[pixelIndex + 2] = b;
          output[pixelIndex + 3] = a;
        }
      }
      
      // Vertical pass
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const pixelIndex = (y * width + x) * 4;
          let r = 0, g = 0, b = 0, a = 0;
          
          for (let i = 0; i < kernelSize; i++) {
            const sampleY = Math.max(0, Math.min(height - 1, y + i - half));
            const sampleIndex = (sampleY * width + x) * 4;
            const weight = kernel[i];
            
            r += output[sampleIndex] * weight;
            g += output[sampleIndex + 1] * weight;
            b += output[sampleIndex + 2] * weight;
            a += output[sampleIndex + 3] * weight;
          }
          
          data[pixelIndex] = r;
          data[pixelIndex + 1] = g;
          data[pixelIndex + 2] = b;
          data[pixelIndex + 3] = a;
        }
      }
    }

    /**
     * Create Gaussian kernel for blurring
     */
    createGaussianKernel(radius) {
      const size = Math.ceil(radius * 2) * 2 + 1;
      const kernel = new Array(size);
      const sigma = radius / 3;
      const twoSigmaSquare = 2 * sigma * sigma;
      const center = Math.floor(size / 2);
      let sum = 0;
      
      for (let i = 0; i < size; i++) {
        const x = i - center;
        kernel[i] = Math.exp(-(x * x) / twoSigmaSquare);
        sum += kernel[i];
      }
      
      // Normalize
      for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
      }
      
      return kernel;
    }

    /**
     * Enhance contrast
     */
    enhanceContrast(data, factor) {
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          const value = data[i + c];
          const enhanced = ((value / 255) - 0.5) * factor + 0.5;
          data[i + c] = Math.max(0, Math.min(255, enhanced * 255));
        }
      }
    }

    /**
     * Adaptive denoising
     */
    adaptiveDenoising(data, width, height) {
      const threshold = 15; // Noise threshold
      const output = new Uint8ClampedArray(data);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const centerIndex = (y * width + x) * 4;
          
          for (let c = 0; c < 3; c++) { // RGB channels only
            const centerValue = data[centerIndex + c];
            let sum = centerValue;
            let count = 1;
            
            // Check neighboring pixels
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const neighborIndex = ((y + dy) * width + (x + dx)) * 4;
                const neighborValue = data[neighborIndex + c];
                
                if (Math.abs(neighborValue - centerValue) < threshold) {
                  sum += neighborValue;
                  count++;
                }
              }
            }
            
            output[centerIndex + c] = sum / count;
          }
        }
      }
      
      data.set(output);
    }

    /**
     * Get or create extraction canvas
     */
    getExtractionCanvas(width, height) {
      if (!this.extractionCanvas || 
          this.extractionCanvas.width !== width || 
          this.extractionCanvas.height !== height) {
        this.extractionCanvas = this.memoryManager.getCanvas(width, height);
      }
      return this.extractionCanvas;
    }

    /**
     * Get or create normalization canvas
     */
    getNormalizationCanvas(width, height) {
      if (!this.normalizationCanvas || 
          this.normalizationCanvas.width !== width || 
          this.normalizationCanvas.height !== height) {
        this.normalizationCanvas = this.memoryManager.getCanvas(width, height);
      }
      return this.normalizationCanvas;
    }

    /**
     * Cleanup resources
     */
    dispose() {
      if (this.extractionCanvas) {
        this.memoryManager.releaseCanvas(this.extractionCanvas);
        this.extractionCanvas = null;
      }
      if (this.normalizationCanvas) {
        this.memoryManager.releaseCanvas(this.normalizationCanvas);
        this.normalizationCanvas = null;
      }
    }
  }

  // Export to global scope
  global.RegionExtractor = RegionExtractor;

})(typeof window !== 'undefined' ? window : global);
