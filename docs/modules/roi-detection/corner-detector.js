/**
 * Corner Detection ROI Algorithm
 * Uses Harris corner detection to find rectangular build areas
 */

class CornerROIDetector {
  constructor(config = {}) {
    this.config = {
      harrisK: 0.04,
      harrisThreshold: 0.01,
      windowSize: 3,
      minRectangleSize: 300,
      maxRectangles: 10,
      aspectRatioMin: 1.2,
      aspectRatioMax: 2.5,
      debugMode: false,
      ...config
    };
  }

  /**
   * Detect ROI using Harris corner detection
   */
  async detect(imageElement) {
    console.log('CornerROIDetector: Starting corner-based detection');
    
    try {
      // Create canvas and get image data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      ctx.drawImage(imageElement, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert to grayscale
      const grayData = this.convertToGrayscale(imageData);
      
      // Apply Harris corner detection
      const corners = this.harrisCornerDetection(grayData, canvas.width, canvas.height);
      
      // Filter corners by strength
      const strongCorners = this.filterCornersByStrength(corners);
      
      // Find rectangular patterns
      const rectangles = this.findRectanglesFromCorners(strongCorners, canvas.width, canvas.height);
      
      // Score rectangles based on Nova Drift characteristics
      const candidates = await this.scoreRectangles(rectangles, imageElement);
      
      if (candidates.length === 0) {
        return null;
      }
      
      // Return best candidate
      const best = candidates[0];
      
      console.log(`CornerROIDetector: Found ROI with confidence ${best.confidence}`);
      
      return {
        bounds: best.bounds,
        confidence: best.confidence,
        method: 'corner-detection',
        metadata: {
          cornerCount: strongCorners.length,
          rectangleCount: rectangles.length,
          candidateCount: candidates.length,
          processingSteps: {
            grayscaleConversion: true,
            harrisDetection: true,
            cornerFiltering: true,
            rectangleDetection: true,
            scoring: true
          }
        }
      };
      
    } catch (error) {
      console.error('CornerROIDetector: Detection failed:', error);
      throw error;
    }
  }

  /**
   * Convert image data to grayscale
   */
  convertToGrayscale(imageData) {
    const data = imageData.data;
    const grayData = new Uint8Array(data.length / 4);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Use luminance formula
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      grayData[i / 4] = gray;
    }
    
    return grayData;
  }

  /**
   * Harris corner detection implementation
   */
  harrisCornerDetection(grayData, width, height) {
    const corners = [];
    const windowSize = this.config.windowSize;
    const k = this.config.harrisK;
    const threshold = this.config.harrisThreshold;
    
    // Calculate gradients
    const gradients = this.calculateGradients(grayData, width, height);
    
    // For each pixel (excluding border)
    for (let y = windowSize; y < height - windowSize; y++) {
      for (let x = windowSize; x < width - windowSize; x++) {
        // Calculate Harris response for this window
        const response = this.calculateHarrisResponse(
          gradients, x, y, width, windowSize, k
        );
        
        if (response > threshold) {
          corners.push({
            x: x,
            y: y,
            strength: response
          });
        }
      }
    }
    
    console.log(`CornerROIDetector: Found ${corners.length} raw corners`);
    return corners;
  }

  /**
   * Calculate image gradients using Sobel operator
   */
  calculateGradients(grayData, width, height) {
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    const gradX = new Float32Array(width * height);
    const gradY = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = grayData[(y + ky) * width + (x + kx)];
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            
            gx += pixel * sobelX[kernelIndex];
            gy += pixel * sobelY[kernelIndex];
          }
        }
        
        const index = y * width + x;
        gradX[index] = gx;
        gradY[index] = gy;
      }
    }
    
    return { gradX, gradY };
  }

  /**
   * Calculate Harris corner response for a window
   */
  calculateHarrisResponse(gradients, centerX, centerY, width, windowSize, k) {
    let a = 0, b = 0, c = 0; // Elements of structure tensor
    
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let y = centerY - halfWindow; y <= centerY + halfWindow; y++) {
      for (let x = centerX - halfWindow; x <= centerX + halfWindow; x++) {
        const index = y * width + x;
        const gx = gradients.gradX[index];
        const gy = gradients.gradY[index];
        
        a += gx * gx;
        b += gx * gy;
        c += gy * gy;
      }
    }
    
    // Harris corner response: det(M) - k * trace(M)^2
    const det = a * c - b * b;
    const trace = a + c;
    const response = det - k * trace * trace;
    
    return response;
  }

  /**
   * Filter corners by strength and apply non-maxima suppression
   */
  filterCornersByStrength(corners) {
    // Sort by strength
    corners.sort((a, b) => b.strength - a.strength);
    
    // Apply non-maxima suppression
    const filtered = [];
    const suppressionRadius = 10;
    
    for (const corner of corners) {
      let suppress = false;
      
      for (const existingCorner of filtered) {
        const distance = Math.sqrt(
          Math.pow(corner.x - existingCorner.x, 2) + 
          Math.pow(corner.y - existingCorner.y, 2)
        );
        
        if (distance < suppressionRadius) {
          suppress = true;
          break;
        }
      }
      
      if (!suppress) {
        filtered.push(corner);
      }
    }
    
    console.log(`CornerROIDetector: Filtered to ${filtered.length} strong corners`);
    return filtered.slice(0, 50); // Limit to top 50 corners
  }

  /**
   * Find rectangular patterns from corner points
   */
  findRectanglesFromCorners(corners, width, height) {
    const rectangles = [];
    const minSize = this.config.minRectangleSize;
    const maxRectangles = this.config.maxRectangles;
    
    // Try to form rectangles from corner combinations
    for (let i = 0; i < corners.length && rectangles.length < maxRectangles; i++) {
      for (let j = i + 1; j < corners.length && rectangles.length < maxRectangles; j++) {
        for (let k = j + 1; k < corners.length && rectangles.length < maxRectangles; k++) {
          for (let l = k + 1; l < corners.length && rectangles.length < maxRectangles; l++) {
            const fourCorners = [corners[i], corners[j], corners[k], corners[l]];
            const rectangle = this.formRectangleFromFourPoints(fourCorners);
            
            if (rectangle && this.isValidRectangle(rectangle, width, height)) {
              rectangles.push({
                bounds: rectangle,
                corners: fourCorners,
                cornerStrength: fourCorners.reduce((sum, c) => sum + c.strength, 0) / 4
              });
            }
          }
        }
      }
    }
    
    // Also try to form rectangles from pairs of corners
    for (let i = 0; i < corners.length && rectangles.length < maxRectangles; i++) {
      for (let j = i + 1; j < corners.length && rectangles.length < maxRectangles; j++) {
        const rect = this.formRectangleFromTwoPoints(corners[i], corners[j], width, height);
        
        if (rect && this.isValidRectangle(rect, width, height)) {
          rectangles.push({
            bounds: rect,
            corners: [corners[i], corners[j]],
            cornerStrength: (corners[i].strength + corners[j].strength) / 2
          });
        }
      }
    }
    
    console.log(`CornerROIDetector: Found ${rectangles.length} potential rectangles`);
    return rectangles;
  }

  /**
   * Form rectangle from four corner points
   */
  formRectangleFromFourPoints(corners) {
    // Sort corners to form rectangle
    corners.sort((a, b) => a.x - b.x);
    
    const left = corners[0].x;
    const right = corners[3].x;
    
    // Sort by y for top/bottom
    corners.sort((a, b) => a.y - b.y);
    
    const top = corners[0].y;
    const bottom = corners[3].y;
    
    const width = right - left;
    const height = bottom - top;
    
    if (width > 0 && height > 0) {
      return {
        x: left,
        y: top,
        width: width,
        height: height
      };
    }
    
    return null;
  }

  /**
   * Form rectangle from two diagonal corner points
   */
  formRectangleFromTwoPoints(corner1, corner2, imageWidth, imageHeight) {
    const left = Math.min(corner1.x, corner2.x);
    const right = Math.max(corner1.x, corner2.x);
    const top = Math.min(corner1.y, corner2.y);
    const bottom = Math.max(corner1.y, corner2.y);
    
    const width = right - left;
    const height = bottom - top;
    
    if (width > 0 && height > 0) {
      return {
        x: left,
        y: top,
        width: width,
        height: height
      };
    }
    
    return null;
  }

  /**
   * Validate if rectangle meets Nova Drift build area criteria
   */
  isValidRectangle(rect, imageWidth, imageHeight) {
    // Size checks
    if (rect.width < this.config.minRectangleSize || rect.height < this.config.minRectangleSize) {
      return false;
    }
    
    // Bounds checks
    if (rect.x < 0 || rect.y < 0 || 
        rect.x + rect.width > imageWidth || 
        rect.y + rect.height > imageHeight) {
      return false;
    }
    
    // Aspect ratio checks
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio < this.config.aspectRatioMin || aspectRatio > this.config.aspectRatioMax) {
      return false;
    }
    
    // Size relative to image checks
    const imageArea = imageWidth * imageHeight;
    const rectArea = rect.width * rect.height;
    const areaRatio = rectArea / imageArea;
    
    // Should be reasonably sized relative to image (10%-80%)
    if (areaRatio < 0.1 || areaRatio > 0.8) {
      return false;
    }
    
    return true;
  }

  /**
   * Score rectangles based on Nova Drift UI characteristics
   */
  async scoreRectangles(rectangles, imageElement) {
    const candidates = [];
    
    for (const rectangle of rectangles) {
      const score = await this.scoreRectangle(rectangle, imageElement);
      
      if (score > 0.3) {
        candidates.push({
          bounds: rectangle.bounds,
          confidence: score,
          metadata: {
            cornerStrength: rectangle.cornerStrength,
            corners: rectangle.corners
          }
        });
      }
    }
    
    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`CornerROIDetector: ${candidates.length} candidates passed scoring`);
    return candidates;
  }

  /**
   * Score individual rectangle based on UI characteristics
   */
  async scoreRectangle(rectangle, imageElement) {
    try {
      // Extract rectangle region
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = rectangle.bounds.width;
      canvas.height = rectangle.bounds.height;
      
      ctx.drawImage(
        imageElement,
        rectangle.bounds.x, rectangle.bounds.y, rectangle.bounds.width, rectangle.bounds.height,
        0, 0, rectangle.bounds.width, rectangle.bounds.height
      );
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Analyze content for Nova Drift characteristics
      const colorAnalysis = this.analyzeColorDistribution(imageData);
      const structureAnalysis = this.analyzeStructuralPatterns(imageData);
      const geometryScore = this.scoreGeometry(rectangle.bounds);
      
      // Combine scores
      const finalScore = (
        colorAnalysis * 0.4 +
        structureAnalysis * 0.4 +
        geometryScore * 0.2
      );
      
      return Math.max(0, Math.min(1, finalScore));
      
    } catch (error) {
      console.warn('CornerROIDetector: Failed to score rectangle:', error);
      return 0;
    }
  }

  /**
   * Analyze color distribution for Nova Drift characteristics
   */
  analyzeColorDistribution(imageData) {
    const data = imageData.data;
    let darkPixels = 0;
    let coloredPixels = 0;
    let totalPixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check for dark space background (Nova Drift characteristic)
      if (r < 50 && g < 50 && b < 80) {
        darkPixels++;
      }
      
      // Check for colorful mod hexagons
      const intensity = Math.max(r, g, b);
      const saturation = intensity > 0 ? (intensity - Math.min(r, g, b)) / intensity : 0;
      
      if (intensity > 100 && saturation > 0.3) {
        coloredPixels++;
      }
    }
    
    const darkRatio = darkPixels / totalPixels;
    const colorRatio = coloredPixels / totalPixels;
    
    // Nova Drift builds have significant dark space with colorful elements
    let score = 0;
    
    if (darkRatio > 0.4 && darkRatio < 0.8) {
      score += 0.5; // Good dark background ratio
    }
    
    if (colorRatio > 0.1 && colorRatio < 0.4) {
      score += 0.5; // Good colored element ratio
    }
    
    return score;
  }

  /**
   * Analyze structural patterns (hexagonal arrangements, etc.)
   */
  analyzeStructuralPatterns(imageData) {
    // Simplified structural analysis
    // Look for regular patterns that might indicate hexagonal grid
    
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Convert to grayscale for edge detection
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }
    
    // Simple edge detection to find structure
    let edgeCount = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = grayData[y * width + x];
        const neighbors = [
          grayData[(y - 1) * width + x],
          grayData[(y + 1) * width + x],
          grayData[y * width + (x - 1)],
          grayData[y * width + (x + 1)]
        ];
        
        const maxDiff = Math.max(...neighbors.map(n => Math.abs(n - center)));
        if (maxDiff > 30) {
          edgeCount++;
        }
      }
    }
    
    const edgeRatio = edgeCount / (width * height);
    
    // Moderate edge ratio suggests structured content
    if (edgeRatio > 0.05 && edgeRatio < 0.3) {
      return 0.7;
    } else if (edgeRatio > 0.03 && edgeRatio < 0.5) {
      return 0.4;
    }
    
    return 0.1;
  }

  /**
   * Score rectangle geometry based on Nova Drift build area expectations
   */
  scoreGeometry(bounds) {
    const aspectRatio = bounds.width / bounds.height;
    
    // Nova Drift build areas typically have aspect ratios between 1.3-2.2
    let aspectScore = 0;
    if (aspectRatio >= 1.3 && aspectRatio <= 2.2) {
      aspectScore = 1.0;
    } else if (aspectRatio >= 1.1 && aspectRatio <= 2.5) {
      aspectScore = 0.7;
    } else {
      aspectScore = 0.3;
    }
    
    // Size score - prefer reasonably large areas
    const area = bounds.width * bounds.height;
    let sizeScore = 0;
    if (area > 200000) { // Large enough for typical build area
      sizeScore = 1.0;
    } else if (area > 100000) {
      sizeScore = 0.7;
    } else if (area > 50000) {
      sizeScore = 0.4;
    } else {
      sizeScore = 0.1;
    }
    
    return (aspectScore + sizeScore) / 2;
  }
}

// Export for global use
window.CornerROIDetector = CornerROIDetector;

console.log('CornerROIDetector: Corner detection algorithm loaded');