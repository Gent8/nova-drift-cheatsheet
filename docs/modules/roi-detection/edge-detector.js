/**
 * Edge-based ROI Detection
 * Detects build area by finding rectangular contours using edge detection
 */

class EdgeROIDetector {
  constructor(config = {}) {
    this.config = {
      cannyLow: 50,
      cannyHigh: 150,
      minContourArea: 50000,
      maxContourArea: 2000000,
      aspectRatioMin: 1.2,
      aspectRatioMax: 2.5,
      approximationAccuracy: 0.02,
      debugMode: false,
      ...config
    };
  }

  /**
   * Detect ROI using edge detection
   */
  async detect(imageElement) {
    const startTime = performance.now();
    
    try {
      // Create working canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      
      // Register canvas for memory management
      const canvasId = window.registerCanvas(canvas, 'edge-roi-detection');
      
      // Draw image to canvas
      ctx.drawImage(imageElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert to grayscale
      const grayImageData = this.convertToGrayscale(imageData);
      
      // Apply Gaussian blur to reduce noise
      const blurredImageData = this.applyGaussianBlur(grayImageData, 1.0);
      
      // Apply Canny edge detection
      const edges = this.cannyEdgeDetection(blurredImageData);
      
      if (this.config.debugMode) {
        this.debugShowEdges(edges, canvas.width, canvas.height);
      }
      
      // Find contours
      const contours = this.findContours(edges, canvas.width, canvas.height);
      
      // Filter contours by size and shape
      const candidates = this.filterContours(contours, canvas.width, canvas.height);
      
      // Score candidates
      const scoredCandidates = this.scoreCandidates(candidates, imageData);
      
      // Select best candidate
      const bestCandidate = this.selectBestCandidate(scoredCandidates);
      
      const processingTime = performance.now() - startTime;
      
      if (bestCandidate) {
        console.log(`EdgeROIDetector: Found ROI with confidence ${bestCandidate.confidence} in ${processingTime.toFixed(2)}ms`);
        
        return {
          bounds: bestCandidate.bounds,
          confidence: bestCandidate.confidence,
          metadata: {
            processingTime,
            contoursFound: contours.length,
            candidatesFiltered: candidates.length,
            algorithm: 'edge-detection'
          }
        };
      } else {
        console.log(`EdgeROIDetector: No suitable ROI found in ${processingTime.toFixed(2)}ms`);
        return null;
      }
      
    } catch (error) {
      console.error('EdgeROIDetector: Detection failed:', error);
      throw error;
    }
  }

  /**
   * Convert ImageData to grayscale
   */
  convertToGrayscale(imageData) {
    const grayData = new ImageData(imageData.width, imageData.height);
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      // Use luminance formula
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      grayData.data[i] = gray;
      grayData.data[i + 1] = gray;
      grayData.data[i + 2] = gray;
      grayData.data[i + 3] = imageData.data[i + 3]; // Alpha
    }
    
    return grayData;
  }

  /**
   * Apply Gaussian blur to reduce noise
   */
  applyGaussianBlur(imageData, sigma) {
    const width = imageData.width;
    const height = imageData.height;
    const data = new Uint8ClampedArray(imageData.data);
    
    // Generate Gaussian kernel
    const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = this.generateGaussianKernel(kernelSize, sigma);
    const halfKernel = Math.floor(kernelSize / 2);
    
    // Apply horizontal blur
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const weight = kernel[kx + halfKernel];
          sum += data[(y * width + px) * 4] * weight;
          weightSum += weight;
        }
        
        const index = (y * width + x) * 4;
        const blurred = Math.round(sum / weightSum);
        imageData.data[index] = blurred;
        imageData.data[index + 1] = blurred;
        imageData.data[index + 2] = blurred;
      }
    }
    
    // Apply vertical blur
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const weight = kernel[ky + halfKernel];
          sum += imageData.data[(py * width + x) * 4] * weight;
          weightSum += weight;
        }
        
        const index = (y * width + x) * 4;
        const blurred = Math.round(sum / weightSum);
        imageData.data[index] = blurred;
        imageData.data[index + 1] = blurred;
        imageData.data[index + 2] = blurred;
      }
    }
    
    return imageData;
  }

  /**
   * Generate Gaussian kernel
   */
  generateGaussianKernel(size, sigma) {
    const kernel = new Array(size);
    const center = Math.floor(size / 2);
    const factor = 1 / (Math.sqrt(2 * Math.PI) * sigma);
    
    for (let i = 0; i < size; i++) {
      const x = i - center;
      kernel[i] = factor * Math.exp(-(x * x) / (2 * sigma * sigma));
    }
    
    return kernel;
  }

  /**
   * Simple Canny edge detection implementation
   */
  cannyEdgeDetection(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Sobel operators
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    const gradient = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    
    // Calculate gradients
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const pixel = data[idx]; // Grayscale value
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            gx += pixel * sobelX[kernelIdx];
            gy += pixel * sobelY[kernelIdx];
          }
        }
        
        const idx = y * width + x;
        gradient[idx] = Math.sqrt(gx * gx + gy * gy);
        direction[idx] = Math.atan2(gy, gx);
      }
    }
    
    // Non-maximum suppression
    const suppressed = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const angle = direction[idx];
        const mag = gradient[idx];
        
        // Determine neighboring pixels based on gradient direction
        let neighbor1, neighbor2;
        
        if ((angle >= -Math.PI/8 && angle < Math.PI/8) || (angle >= 7*Math.PI/8 || angle < -7*Math.PI/8)) {
          // Horizontal
          neighbor1 = gradient[y * width + (x - 1)];
          neighbor2 = gradient[y * width + (x + 1)];
        } else if ((angle >= Math.PI/8 && angle < 3*Math.PI/8) || (angle >= -7*Math.PI/8 && angle < -5*Math.PI/8)) {
          // Diagonal /
          neighbor1 = gradient[(y - 1) * width + (x + 1)];
          neighbor2 = gradient[(y + 1) * width + (x - 1)];
        } else if ((angle >= 3*Math.PI/8 && angle < 5*Math.PI/8) || (angle >= -5*Math.PI/8 && angle < -3*Math.PI/8)) {
          // Vertical
          neighbor1 = gradient[(y - 1) * width + x];
          neighbor2 = gradient[(y + 1) * width + x];
        } else {
          // Diagonal \
          neighbor1 = gradient[(y - 1) * width + (x - 1)];
          neighbor2 = gradient[(y + 1) * width + (x + 1)];
        }
        
        if (mag >= neighbor1 && mag >= neighbor2) {
          suppressed[idx] = mag;
        }
      }
    }
    
    // Double thresholding
    const edges = new Uint8Array(width * height);
    
    for (let i = 0; i < suppressed.length; i++) {
      if (suppressed[i] >= this.config.cannyHigh) {
        edges[i] = 255; // Strong edge
      } else if (suppressed[i] >= this.config.cannyLow) {
        edges[i] = 128; // Weak edge
      }
    }
    
    // Edge tracking by hysteresis (simplified)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === 128) { // Weak edge
          // Check if connected to strong edge
          let hasStrongNeighbor = false;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const nIdx = (y + dy) * width + (x + dx);
              if (edges[nIdx] === 255) {
                hasStrongNeighbor = true;
                break;
              }
            }
            if (hasStrongNeighbor) break;
          }
          
          edges[idx] = hasStrongNeighbor ? 255 : 0;
        }
      }
    }
    
    return edges;
  }

  /**
   * Find contours in edge image
   */
  findContours(edges, width, height) {
    const visited = new Uint8Array(width * height);
    const contours = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === 255 && !visited[idx]) {
          const contour = this.traceContour(edges, visited, x, y, width, height);
          if (contour.length > 10) { // Minimum contour size
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  }

  /**
   * Trace contour using 8-connectivity
   */
  traceContour(edges, visited, startX, startY, width, height) {
    const contour = [];
    const stack = [{ x: startX, y: startY }];
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[idx] || edges[idx] !== 255) {
        continue;
      }
      
      visited[idx] = 1;
      contour.push({ x, y });
      
      // Add 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          stack.push({ x: x + dx, y: y + dy });
        }
      }
    }
    
    return contour;
  }

  /**
   * Filter contours by size and shape criteria
   */
  filterContours(contours, imageWidth, imageHeight) {
    const candidates = [];
    
    for (const contour of contours) {
      // Calculate bounding rectangle
      const bounds = this.calculateBoundingRect(contour);
      
      // Filter by size
      const area = bounds.width * bounds.height;
      if (area < this.config.minContourArea || area > this.config.maxContourArea) {
        continue;
      }
      
      // Filter by aspect ratio
      const aspectRatio = bounds.width / bounds.height;
      if (aspectRatio < this.config.aspectRatioMin || aspectRatio > this.config.aspectRatioMax) {
        continue;
      }
      
      // Filter by relative size (should be significant portion of image)
      const imageArea = imageWidth * imageHeight;
      const relativeArea = area / imageArea;
      if (relativeArea < 0.1 || relativeArea > 0.8) {
        continue;
      }
      
      candidates.push({
        contour,
        bounds,
        area,
        aspectRatio,
        relativeArea
      });
    }
    
    return candidates;
  }

  /**
   * Calculate bounding rectangle for contour
   */
  calculateBoundingRect(contour) {
    if (contour.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = contour[0].x;
    let maxX = contour[0].x;
    let minY = contour[0].y;
    let maxY = contour[0].y;
    
    for (const point of contour) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Score candidates based on content analysis
   */
  scoreCandidates(candidates, imageData) {
    const scoredCandidates = [];
    
    for (const candidate of candidates) {
      let score = 0;
      
      // Score based on size (prefer medium-sized regions)
      const sizeScore = this.calculateSizeScore(candidate.relativeArea);
      score += sizeScore * 0.3;
      
      // Score based on aspect ratio (prefer Nova Drift-like ratios)
      const aspectScore = this.calculateAspectScore(candidate.aspectRatio);
      score += aspectScore * 0.2;
      
      // Score based on position (prefer center regions)
      const positionScore = this.calculatePositionScore(candidate.bounds, imageData.width, imageData.height);
      score += positionScore * 0.2;
      
      // Score based on content (look for dark space-like areas)
      const contentScore = this.calculateContentScore(candidate.bounds, imageData);
      score += contentScore * 0.3;
      
      // Normalize score to 0-1 range
      score = Math.max(0, Math.min(1, score));
      
      scoredCandidates.push({
        ...candidate,
        confidence: score
      });
    }
    
    return scoredCandidates;
  }

  /**
   * Calculate size-based score
   */
  calculateSizeScore(relativeArea) {
    // Prefer areas that are 20-50% of total image
    const optimal = 0.35;
    const distance = Math.abs(relativeArea - optimal);
    return Math.max(0, 1 - distance * 3);
  }

  /**
   * Calculate aspect ratio score
   */
  calculateAspectScore(aspectRatio) {
    // Prefer ratios around 1.6 (typical for Nova Drift UI)
    const optimal = 1.6;
    const distance = Math.abs(aspectRatio - optimal);
    return Math.max(0, 1 - distance);
  }

  /**
   * Calculate position-based score
   */
  calculatePositionScore(bounds, imageWidth, imageHeight) {
    // Prefer regions that are reasonably centered
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const rectCenterX = bounds.x + bounds.width / 2;
    const rectCenterY = bounds.y + bounds.height / 2;
    
    const distanceX = Math.abs(rectCenterX - centerX) / (imageWidth / 2);
    const distanceY = Math.abs(rectCenterY - centerY) / (imageHeight / 2);
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return Math.max(0, 1 - distance);
  }

  /**
   * Calculate content-based score by analyzing pixel content
   */
  calculateContentScore(bounds, imageData) {
    const width = imageData.width;
    const data = imageData.data;
    
    let darkPixels = 0;
    let totalPixels = 0;
    let averageBrightness = 0;
    
    // Sample pixels within bounds
    const sampleStep = Math.max(1, Math.floor(Math.min(bounds.width, bounds.height) / 20));
    
    for (let y = bounds.y; y < bounds.y + bounds.height; y += sampleStep) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += sampleStep) {
        if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          const brightness = (r + g + b) / 3;
          averageBrightness += brightness;
          
          // Count dark pixels (space background in Nova Drift)
          if (brightness < 80) {
            darkPixels++;
          }
          
          totalPixels++;
        }
      }
    }
    
    if (totalPixels === 0) return 0;
    
    averageBrightness /= totalPixels;
    const darkRatio = darkPixels / totalPixels;
    
    // Prefer regions with moderate darkness (space background but with UI elements)
    const optimalDarkRatio = 0.4;
    const darkScore = 1 - Math.abs(darkRatio - optimalDarkRatio) * 2;
    
    return Math.max(0, darkScore);
  }

  /**
   * Select the best candidate
   */
  selectBestCandidate(candidates) {
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    return candidates[0];
  }

  /**
   * Debug: Show edge detection result
   */
  debugShowEdges(edges, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < edges.length; i++) {
      const value = edges[i];
      imageData.data[i * 4] = value;
      imageData.data[i * 4 + 1] = value;
      imageData.data[i * 4 + 2] = value;
      imageData.data[i * 4 + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Add to page for debugging
    canvas.style.border = '2px solid red';
    canvas.style.maxWidth = '400px';
    document.body.appendChild(canvas);
    
    setTimeout(() => canvas.remove(), 5000); // Remove after 5 seconds
  }
}

// Export for global use
window.EdgeROIDetector = EdgeROIDetector;

console.log('EdgeROIDetector: Edge-based detection algorithm loaded');