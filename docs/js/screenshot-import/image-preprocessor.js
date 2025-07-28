// Image Preprocessor for Screenshot Import Assistant
// Handles noise reduction, brightness/contrast adjustment, and sharpening

import { cleanupOpenCVObjects } from '../lib/opencv-loader.js';

export class ImagePreprocessor {
  constructor(options = {}) {
    this.targetBrightness = options.targetBrightness || 128;
    this.contrastFactor = options.contrastFactor || 1.2;
    this.enableDenoising = options.enableDenoising !== false;
    this.enableSharpening = options.enableSharpening !== false;
  }

  // Main preprocessing pipeline
  async preprocess(canvas, cv, options = {}) {
    const src = cv.imread(canvas);
    let processed = new cv.Mat();
    
    try {
      // Step 1: Initial copy
      src.copyTo(processed);
      
      // Step 2: Denoise if enabled
      if (this.enableDenoising && !options.skipDenoising) {
        await this.denoise(processed, cv);
      }
      
      // Step 3: Adjust brightness and contrast
      if (!options.skipBrightnessContrast) {
        await this.adjustBrightnessContrast(processed, cv, options);
      }
      
      // Step 4: Sharpen if enabled
      if (this.enableSharpening && !options.skipSharpening) {
        await this.sharpen(processed, cv);
      }
      
      // Step 5: Convert back to canvas
      const result = this.matToCanvas(processed, cv);
      
      return {
        canvas: result,
        metadata: {
          originalSize: { width: canvas.width, height: canvas.height },
          processedSize: { width: result.width, height: result.height },
          appliedFilters: this.getAppliedFilters(options),
          processingTime: performance.now()
        }
      };
      
    } finally {
      cleanupOpenCVObjects(src, processed);
    }
  }

  // Denoise the image
  async denoise(mat, cv) {
    const denoised = new cv.Mat();
    
    try {
      // Use non-local means denoising for color images
      if (mat.channels() >= 3) {
        // Non-local means denoising for colored images
        cv.fastNlMeansDenoisingColored(mat, denoised, 10, 10, 7, 21);
      } else {
        // Non-local means denoising for grayscale
        cv.fastNlMeansDenoising(mat, denoised, 10, 7, 21);
      }
      
      // Copy result back
      denoised.copyTo(mat);
      
    } catch (error) {
      console.warn('Denoising failed, skipping:', error);
      // Continue without denoising
    } finally {
      cleanupOpenCVObjects(denoised);
    }
  }

  // Adjust brightness and contrast
  async adjustBrightnessContrast(mat, cv, options = {}) {
    try {
      // Calculate current brightness
      const currentBrightness = this.calculateAverageBrightness(mat, cv);
      
      // Determine adjustments
      const targetBrightness = options.targetBrightness || this.targetBrightness;
      const contrastFactor = options.contrastFactor || this.contrastFactor;
      
      const alpha = contrastFactor; // Contrast multiplier
      const beta = targetBrightness - currentBrightness; // Brightness adjustment
      
      // Apply adjustment: new_pixel = alpha * old_pixel + beta
      mat.convertTo(mat, -1, alpha, beta);
      
      console.log(`Applied brightness/contrast: alpha=${alpha.toFixed(2)}, beta=${beta.toFixed(2)}`);
      
    } catch (error) {
      console.warn('Brightness/contrast adjustment failed:', error);
    }
  }

  // Calculate average brightness of the image
  calculateAverageBrightness(mat, cv) {
    const gray = new cv.Mat();
    
    try {
      if (mat.channels() >= 3) {
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      } else {
        mat.copyTo(gray);
      }
      
      const mean = cv.mean(gray);
      return mean[0];
      
    } finally {
      cleanupOpenCVObjects(gray);
    }
  }

  // Sharpen the image
  async sharpen(mat, cv) {
    const sharpened = new cv.Mat();
    const kernel = cv.matFromArray(3, 3, cv.CV_32FC1, [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ]);
    
    try {
      // Apply sharpening kernel
      cv.filter2D(mat, sharpened, cv.CV_8U, kernel);
      
      // Copy result back
      sharpened.copyTo(mat);
      
    } catch (error) {
      console.warn('Sharpening failed:', error);
    } finally {
      cleanupOpenCVObjects(sharpened, kernel);
    }
  }

  // Enhanced preprocessing for difficult images
  async enhancedPreprocess(canvas, cv, options = {}) {
    const src = cv.imread(canvas);
    let processed = new cv.Mat();
    
    try {
      src.copyTo(processed);
      
      // Step 1: Adaptive histogram equalization
      if (options.useAdaptiveHistogram) {
        await this.adaptiveHistogramEqualization(processed, cv);
      }
      
      // Step 2: Gamma correction
      if (options.gamma && options.gamma !== 1.0) {
        await this.gammaCorrection(processed, cv, options.gamma);
      }
      
      // Step 3: Edge enhancement
      if (options.enhanceEdges) {
        await this.enhanceEdges(processed, cv);
      }
      
      // Step 4: Regular preprocessing
      const regularOptions = { ...options, skipBrightnessContrast: options.useAdaptiveHistogram };
      const regularPreprocessed = await this.preprocess(this.matToCanvas(processed, cv), cv, regularOptions);
      
      return regularPreprocessed;
      
    } finally {
      cleanupOpenCVObjects(src, processed);
    }
  }

  // Adaptive histogram equalization
  async adaptiveHistogramEqualization(mat, cv) {
    const lab = new cv.Mat();
    const channels = new cv.MatVector();
    
    try {
      // Convert to LAB color space
      if (mat.channels() >= 3) {
        cv.cvtColor(mat, lab, cv.COLOR_RGBA2RGB);
        cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);
        
        // Split channels
        cv.split(lab, channels);
        
        // Apply CLAHE to L channel
        const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        const L = channels.get(0);
        clahe.apply(L, L);
        
        // Merge channels back
        cv.merge(channels, lab);
        
        // Convert back to RGBA
        cv.cvtColor(lab, mat, cv.COLOR_Lab2RGB);
        cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);
        
        clahe.delete();
      } else {
        // For grayscale, apply CLAHE directly
        const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
        clahe.apply(mat, mat);
        clahe.delete();
      }
      
    } catch (error) {
      console.warn('Adaptive histogram equalization failed:', error);
    } finally {
      cleanupOpenCVObjects(lab);
      if (channels) {
        for (let i = 0; i < channels.size(); i++) {
          channels.get(i).delete();
        }
        channels.delete();
      }
    }
  }

  // Gamma correction
  async gammaCorrection(mat, cv, gamma) {
    try {
      // Create lookup table for gamma correction
      const lookupTable = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        lookupTable[i] = Math.pow(i / 255.0, 1.0 / gamma) * 255;
      }
      
      // Apply lookup table
      const lut = cv.matFromArray(1, 256, cv.CV_8UC1, Array.from(lookupTable));
      cv.LUT(mat, lut, mat);
      
      lut.delete();
      
    } catch (error) {
      console.warn('Gamma correction failed:', error);
    }
  }

  // Edge enhancement
  async enhanceEdges(mat, cv) {
    const edges = new cv.Mat();
    const enhanced = new cv.Mat();
    const gray = new cv.Mat();
    
    try {
      // Convert to grayscale for edge detection
      if (mat.channels() >= 3) {
        cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
      } else {
        mat.copyTo(gray);
      }
      
      // Detect edges
      cv.Canny(gray, edges, 50, 150, 3, false);
      
      // Convert edges back to color if needed
      if (mat.channels() >= 3) {
        cv.cvtColor(edges, edges, cv.COLOR_GRAY2RGBA);
      }
      
      // Add edges to original image
      cv.addWeighted(mat, 0.8, edges, 0.2, 0, enhanced);
      enhanced.copyTo(mat);
      
    } catch (error) {
      console.warn('Edge enhancement failed:', error);
    } finally {
      cleanupOpenCVObjects(edges, enhanced, gray);
    }
  }

  // Convert OpenCV Mat to Canvas
  matToCanvas(mat, cv) {
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, mat);
    return canvas;
  }

  // Get list of applied filters
  getAppliedFilters(options) {
    const filters = [];
    
    if (this.enableDenoising && !options.skipDenoising) {
      filters.push('denoising');
    }
    
    if (!options.skipBrightnessContrast) {
      filters.push('brightness_contrast');
    }
    
    if (this.enableSharpening && !options.skipSharpening) {
      filters.push('sharpening');
    }
    
    if (options.useAdaptiveHistogram) {
      filters.push('adaptive_histogram');
    }
    
    if (options.gamma && options.gamma !== 1.0) {
      filters.push(`gamma_${options.gamma}`);
    }
    
    if (options.enhanceEdges) {
      filters.push('edge_enhancement');
    }
    
    return filters;
  }

  // Analyze image properties for optimal preprocessing
  analyzeImageForPreprocessing(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let brightness = 0;
    let contrast = 0;
    let pixelCount = 0;
    const histogram = new Array(256).fill(0);
    
    // Calculate brightness and build histogram
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      brightness += gray;
      histogram[gray]++;
      pixelCount++;
    }
    
    brightness /= pixelCount;
    
    // Calculate contrast (standard deviation of brightness)
    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      variance += Math.pow(gray - brightness, 2);
    }
    contrast = Math.sqrt(variance / pixelCount);
    
    // Analyze histogram distribution
    const histogramPeaks = this.findHistogramPeaks(histogram);
    
    return {
      brightness,
      contrast,
      histogram,
      histogramPeaks,
      recommendations: this.getPreprocessingRecommendations(brightness, contrast, histogramPeaks)
    };
  }

  // Find peaks in histogram
  findHistogramPeaks(histogram) {
    const peaks = [];
    const threshold = Math.max(...histogram) * 0.1; // 10% of max value
    
    for (let i = 1; i < histogram.length - 1; i++) {
      if (histogram[i] > threshold && 
          histogram[i] > histogram[i - 1] && 
          histogram[i] > histogram[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  // Get preprocessing recommendations based on analysis
  getPreprocessingRecommendations(brightness, contrast, peaks) {
    const recommendations = [];
    
    // Brightness recommendations
    if (brightness < 80) {
      recommendations.push({
        type: 'brightness',
        message: 'Image is quite dark, consider increasing brightness',
        targetBrightness: 120
      });
    } else if (brightness > 180) {
      recommendations.push({
        type: 'brightness',
        message: 'Image is quite bright, consider decreasing brightness',
        targetBrightness: 140
      });
    }
    
    // Contrast recommendations
    if (contrast < 30) {
      recommendations.push({
        type: 'contrast',
        message: 'Low contrast detected, consider enhancement',
        useAdaptiveHistogram: true,
        contrastFactor: 1.4
      });
    }
    
    // Histogram-based recommendations
    if (peaks.length < 2) {
      recommendations.push({
        type: 'histogram',
        message: 'Poor tonal distribution, adaptive histogram may help',
        useAdaptiveHistogram: true
      });
    }
    
    // Gamma correction recommendations
    if (brightness < 100 && contrast > 40) {
      recommendations.push({
        type: 'gamma',
        message: 'Dark image with good contrast, gamma correction may help',
        gamma: 0.8
      });
    }
    
    return recommendations;
  }

  // Apply recommended preprocessing
  async applyRecommendations(canvas, cv, recommendations) {
    const options = {
      skipDenoising: false,
      skipBrightnessContrast: false,
      skipSharpening: false
    };
    
    recommendations.forEach(rec => {
      switch (rec.type) {
        case 'brightness':
          options.targetBrightness = rec.targetBrightness;
          break;
        case 'contrast':
          options.contrastFactor = rec.contrastFactor;
          options.useAdaptiveHistogram = rec.useAdaptiveHistogram;
          break;
        case 'histogram':
          options.useAdaptiveHistogram = rec.useAdaptiveHistogram;
          break;
        case 'gamma':
          options.gamma = rec.gamma;
          break;
      }
    });
    
    return await this.enhancedPreprocess(canvas, cv, options);
  }
}