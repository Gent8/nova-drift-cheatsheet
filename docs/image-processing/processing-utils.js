/**
 * Nova Drift Processing Utilities - Phase 3
 * Common utility functions for image processing
 */

(function(global) {
  'use strict';

  /**
   * Processing utilities
   */
  const ProcessingUtils = {
    
    /**
     * Convert degrees to radians
     */
    degToRad(degrees) {
      return degrees * Math.PI / 180;
    },

    /**
     * Convert radians to degrees
     */
    radToDeg(radians) {
      return radians * 180 / Math.PI;
    },

    /**
     * Clamp value between min and max
     */
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
      return a + (b - a) * this.clamp(t, 0, 1);
    },

    /**
     * Calculate distance between two points
     */
    distance(p1, p2) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * Calculate angle between two points
     */
    angle(p1, p2) {
      return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    },

    /**
     * Rotate point around center
     */
    rotatePoint(point, center, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      
      return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
      };
    },

    /**
     * Calculate hexagon vertices
     */
    getHexVertices(center, radius) {
      const vertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        vertices.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle)
        });
      }
      return vertices;
    },

    /**
     * Check if point is inside polygon
     */
    pointInPolygon(point, vertices) {
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        if (((vertices[i].y > point.y) !== (vertices[j].y > point.y)) &&
            (point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x)) {
          inside = !inside;
        }
      }
      return inside;
    },

    /**
     * Get bounding box of points
     */
    getBoundingBox(points) {
      if (!points || points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
      }
      
      let minX = points[0].x;
      let minY = points[0].y;
      let maxX = points[0].x;
      let maxY = points[0].y;
      
      for (let i = 1; i < points.length; i++) {
        minX = Math.min(minX, points[i].x);
        minY = Math.min(minY, points[i].y);
        maxX = Math.max(maxX, points[i].x);
        maxY = Math.max(maxY, points[i].y);
      }
      
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    },

    /**
     * Convert RGB to HSV
     */
    rgbToHsv(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      
      let h = 0;
      let s = max === 0 ? 0 : diff / max;
      let v = max;
      
      if (diff !== 0) {
        switch (max) {
          case r:
            h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / diff + 2) / 6;
            break;
          case b:
            h = ((r - g) / diff + 4) / 6;
            break;
        }
      }
      
      return { h: h * 360, s: s * 100, v: v * 100 };
    },

    /**
     * Convert HSV to RGB
     */
    hsvToRgb(h, s, v) {
      h /= 360;
      s /= 100;
      v /= 100;
      
      const c = v * s;
      const x = c * (1 - Math.abs((h * 6) % 2 - 1));
      const m = v - c;
      
      let r = 0, g = 0, b = 0;
      
      if (h < 1/6) {
        r = c; g = x; b = 0;
      } else if (h < 2/6) {
        r = x; g = c; b = 0;
      } else if (h < 3/6) {
        r = 0; g = c; b = x;
      } else if (h < 4/6) {
        r = 0; g = x; b = c;
      } else if (h < 5/6) {
        r = x; g = 0; b = c;
      } else {
        r = c; g = 0; b = x;
      }
      
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
      };
    },

    /**
     * Calculate luminance of RGB color
     */
    getLuminance(r, g, b) {
      // Use relative luminance formula
      return 0.299 * r + 0.587 * g + 0.114 * b;
    },

    /**
     * Create Gaussian kernel
     */
    createGaussianKernel(radius, sigma = null) {
      if (sigma === null) {
        sigma = radius / 3;
      }
      
      const size = Math.ceil(radius * 2) * 2 + 1;
      const kernel = new Array(size);
      const center = Math.floor(size / 2);
      const twoSigmaSquare = 2 * sigma * sigma;
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
    },

    /**
     * Apply convolution filter
     */
    applyConvolution(imageData, kernel) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      const output = new Uint8ClampedArray(data);
      const kernelSize = Math.sqrt(kernel.length);
      const half = Math.floor(kernelSize / 2);
      
      for (let y = half; y < height - half; y++) {
        for (let x = half; x < width - half; x++) {
          const pixelIndex = (y * width + x) * 4;
          
          for (let c = 0; c < 3; c++) { // RGB channels
            let sum = 0;
            for (let ky = 0; ky < kernelSize; ky++) {
              for (let kx = 0; kx < kernelSize; kx++) {
                const sampleX = x + kx - half;
                const sampleY = y + ky - half;
                const sampleIndex = (sampleY * width + sampleX) * 4;
                const kernelIndex = ky * kernelSize + kx;
                
                sum += data[sampleIndex + c] * kernel[kernelIndex];
              }
            }
            output[pixelIndex + c] = this.clamp(sum, 0, 255);
          }
        }
      }
      
      return new ImageData(output, width, height);
    },

    /**
     * Resize image data using bilinear interpolation
     */
    resizeImageData(imageData, newWidth, newHeight) {
      const oldWidth = imageData.width;
      const oldHeight = imageData.height;
      const oldData = imageData.data;
      const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
      
      const xRatio = oldWidth / newWidth;
      const yRatio = oldHeight / newHeight;
      
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          const oldX = x * xRatio;
          const oldY = y * yRatio;
          
          const x1 = Math.floor(oldX);
          const y1 = Math.floor(oldY);
          const x2 = Math.min(x1 + 1, oldWidth - 1);
          const y2 = Math.min(y1 + 1, oldHeight - 1);
          
          const fx = oldX - x1;
          const fy = oldY - y1;
          
          const newIndex = (y * newWidth + x) * 4;
          
          for (let c = 0; c < 4; c++) {
            const p1 = oldData[(y1 * oldWidth + x1) * 4 + c];
            const p2 = oldData[(y1 * oldWidth + x2) * 4 + c];
            const p3 = oldData[(y2 * oldWidth + x1) * 4 + c];
            const p4 = oldData[(y2 * oldWidth + x2) * 4 + c];
            
            const i1 = this.lerp(p1, p2, fx);
            const i2 = this.lerp(p3, p4, fx);
            const interpolated = this.lerp(i1, i2, fy);
            
            newData[newIndex + c] = Math.round(interpolated);
          }
        }
      }
      
      return new ImageData(newData, newWidth, newHeight);
    },

    /**
     * Calculate image histogram
     */
    calculateHistogram(imageData) {
      const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0),
        luminance: new Array(256).fill(0)
      };
      
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = Math.round(this.getLuminance(r, g, b));
        
        histogram.r[r]++;
        histogram.g[g]++;
        histogram.b[b]++;
        histogram.luminance[luminance]++;
      }
      
      return histogram;
    },

    /**
     * Format time duration
     */
    formatTime(milliseconds) {
      if (milliseconds < 1000) {
        return `${milliseconds.toFixed(1)}ms`;
      } else if (milliseconds < 60000) {
        return `${(milliseconds / 1000).toFixed(2)}s`;
      } else {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = ((milliseconds % 60000) / 1000).toFixed(1);
        return `${minutes}m ${seconds}s`;
      }
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      if (obj instanceof Date) {
        return new Date(obj.getTime());
      }
      
      if (obj instanceof Array) {
        return obj.map(item => this.deepClone(item));
      }
      
      if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            cloned[key] = this.deepClone(obj[key]);
          }
        }
        return cloned;
      }
      
      return obj;
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }
  };

  // Export to global scope
  global.ProcessingUtils = ProcessingUtils;

})(typeof window !== 'undefined' ? window : global);
