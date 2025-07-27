/**
 * Color-based ROI Detection
 * Detects build area by analyzing color patterns and UI elements
 */

class ColorROIDetector {
  constructor(config = {}) {
    this.config = {
      // Nova Drift color signatures
      spaceBg: { r: 20, g: 25, b: 35, tolerance: 40 },
      uiElements: { r: 60, g: 80, b: 120, tolerance: 50 },
      hexBorder: { r: 150, g: 180, b: 220, tolerance: 60 },
      
      minRegionSize: 30000,
      maxRegionSize: 1500000,
      aspectRatioMin: 1.0,
      aspectRatioMax: 3.0,
      
      // Sampling and performance
      sampleStep: 3,
      clusterThreshold: 20,
      debugMode: false,
      
      ...config
    };
  }

  /**
   * Detect ROI using color analysis
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
      const canvasId = window.registerCanvas(canvas, 'color-roi-detection');
      
      // Draw image to canvas
      ctx.drawImage(imageElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Analyze color distribution
      const colorAnalysis = this.analyzeColorDistribution(imageData);
      
      // Segment by color regions
      const colorRegions = this.segmentByColor(imageData, colorAnalysis);
      
      // Find potential UI areas
      const uiCandidates = this.findUIAreas(colorRegions, imageData);
      
      // Score candidates
      const scoredCandidates = this.scoreColorCandidates(uiCandidates, imageData);
      
      // Select best candidate
      const bestCandidate = this.selectBestCandidate(scoredCandidates);
      
      const processingTime = performance.now() - startTime;
      
      if (bestCandidate) {
        console.log(`ColorROIDetector: Found ROI with confidence ${bestCandidate.confidence} in ${processingTime.toFixed(2)}ms`);
        
        return {
          bounds: bestCandidate.bounds,
          confidence: bestCandidate.confidence,
          metadata: {
            processingTime,
            colorRegions: colorRegions.length,
            uiCandidates: uiCandidates.length,
            dominantColors: colorAnalysis.dominantColors,
            algorithm: 'color-segmentation'
          }
        };
      } else {
        console.log(`ColorROIDetector: No suitable ROI found in ${processingTime.toFixed(2)}ms`);
        return null;
      }
      
    } catch (error) {
      console.error('ColorROIDetector: Detection failed:', error);
      throw error;
    }
  }

  /**
   * Analyze overall color distribution in the image
   */
  analyzeColorDistribution(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    const colorMap = new Map();
    const sampleStep = this.config.sampleStep;
    
    // Sample pixels to build color histogram
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Quantize colors for clustering
        const quantR = Math.floor(r / 16) * 16;
        const quantG = Math.floor(g / 16) * 16;
        const quantB = Math.floor(b / 16) * 16;
        const colorKey = `${quantR},${quantG},${quantB}`;
        
        colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
      }
    }
    
    // Find dominant colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const dominantColors = sortedColors.map(([colorKey, count]) => {
      const [r, g, b] = colorKey.split(',').map(Number);
      return { r, g, b, count };
    });
    
    // Analyze color characteristics
    const totalPixels = (width * height) / (sampleStep * sampleStep);
    const darkPixelRatio = this.calculateDarkPixelRatio(dominantColors, totalPixels);
    const blueUIRatio = this.calculateBlueUIRatio(dominantColors, totalPixels);
    
    return {
      dominantColors,
      darkPixelRatio,
      blueUIRatio,
      totalSamplePixels: totalPixels
    };
  }

  /**
   * Calculate ratio of dark pixels (space background)
   */
  calculateDarkPixelRatio(dominantColors, totalPixels) {
    let darkPixels = 0;
    
    for (const color of dominantColors) {
      const brightness = (color.r + color.g + color.b) / 3;
      if (brightness < 60) {
        darkPixels += color.count;
      }
    }
    
    return darkPixels / totalPixels;
  }

  /**
   * Calculate ratio of blue UI elements
   */
  calculateBlueUIRatio(dominantColors, totalPixels) {
    let bluePixels = 0;
    
    for (const color of dominantColors) {
      // Look for bluish UI colors
      if (color.b > color.r && color.b > color.g && color.b > 80) {
        bluePixels += color.count;
      }
    }
    
    return bluePixels / totalPixels;
  }

  /**
   * Segment image by color regions
   */
  segmentByColor(imageData, colorAnalysis) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    const segmentMask = new Uint8Array(width * height);
    const regions = [];
    
    // Create segments based on Nova Drift color signatures
    const segments = [
      { id: 1, name: 'space', color: this.config.spaceBg },
      { id: 2, name: 'ui', color: this.config.uiElements },
      { id: 3, name: 'hex', color: this.config.hexBorder }
    ];
    
    // Classify pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        let bestSegment = 0;
        let bestDistance = Infinity;
        
        for (const segment of segments) {
          const distance = this.colorDistance(
            { r, g, b },
            segment.color
          );
          
          if (distance < segment.color.tolerance && distance < bestDistance) {
            bestDistance = distance;
            bestSegment = segment.id;
          }
        }
        
        segmentMask[y * width + x] = bestSegment;
      }
    }
    
    // Find connected regions for each segment
    for (const segment of segments) {
      const segmentRegions = this.findConnectedRegions(segmentMask, width, height, segment.id);
      
      for (const region of segmentRegions) {
        regions.push({
          ...region,
          segmentName: segment.name,
          segmentId: segment.id
        });
      }
    }
    
    return regions;
  }

  /**
   * Calculate color distance
   */
  colorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    
    // Weighted Euclidean distance (emphasize green channel)
    return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
  }

  /**
   * Find connected regions for a specific segment value
   */
  findConnectedRegions(segmentMask, width, height, targetValue) {
    const visited = new Uint8Array(width * height);
    const regions = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (segmentMask[idx] === targetValue && !visited[idx]) {
          const region = this.floodFill(segmentMask, visited, x, y, width, height, targetValue);
          
          if (region.pixels.length >= this.config.minRegionSize / (this.config.sampleStep * this.config.sampleStep)) {
            regions.push(region);
          }
        }
      }
    }
    
    return regions;
  }

  /**
   * Flood fill to find connected region
   */
  floodFill(segmentMask, visited, startX, startY, width, height, targetValue) {
    const pixels = [];
    const stack = [{ x: startX, y: startY }];
    
    let minX = startX, maxX = startX;
    let minY = startY, maxY = startY;
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || 
          visited[idx] || segmentMask[idx] !== targetValue) {
        continue;
      }
      
      visited[idx] = 1;
      pixels.push({ x, y });
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // Add 4-connected neighbors
      stack.push({ x: x + 1, y });
      stack.push({ x: x - 1, y });
      stack.push({ x, y: y + 1 });
      stack.push({ x, y: y - 1 });
    }
    
    return {
      pixels,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      size: pixels.length
    };
  }

  /**
   * Find potential UI areas that could contain the build grid
   */
  findUIAreas(colorRegions, imageData) {
    const candidates = [];
    
    // Look for large space regions that could contain the build area
    const spaceRegions = colorRegions.filter(region => 
      region.segmentName === 'space' && 
      region.size > this.config.minRegionSize / (this.config.sampleStep * this.config.sampleStep)
    );
    
    // Look for UI regions that might frame the build area
    const uiRegions = colorRegions.filter(region => 
      region.segmentName === 'ui' || region.segmentName === 'hex'
    );
    
    // Analyze space regions
    for (const spaceRegion of spaceRegions) {
      const bounds = spaceRegion.bounds;
      const area = bounds.width * bounds.height;
      const aspectRatio = bounds.width / bounds.height;
      
      // Filter by size and aspect ratio
      if (area >= this.config.minRegionSize && 
          area <= this.config.maxRegionSize &&
          aspectRatio >= this.config.aspectRatioMin && 
          aspectRatio <= this.config.aspectRatioMax) {
        
        candidates.push({
          bounds,
          type: 'space-region',
          sourceRegion: spaceRegion,
          area,
          aspectRatio
        });
      }
    }
    
    // Try to find UI-framed areas
    if (uiRegions.length > 0) {
      const framedCandidates = this.findUIFramedAreas(uiRegions, imageData);
      candidates.push(...framedCandidates);
    }
    
    return candidates;
  }

  /**
   * Find areas that are framed by UI elements
   */
  findUIFramedAreas(uiRegions, imageData) {
    const candidates = [];
    const width = imageData.width;
    const height = imageData.height;
    
    // Group UI regions by approximate position
    const leftRegions = uiRegions.filter(r => r.bounds.x < width * 0.3);
    const rightRegions = uiRegions.filter(r => r.bounds.x > width * 0.7);
    const topRegions = uiRegions.filter(r => r.bounds.y < height * 0.3);
    const bottomRegions = uiRegions.filter(r => r.bounds.y > height * 0.7);
    
    // Look for potential framed areas
    if (leftRegions.length > 0 && rightRegions.length > 0) {
      // Find area between left and right UI elements
      const leftBound = Math.max(...leftRegions.map(r => r.bounds.x + r.bounds.width));
      const rightBound = Math.min(...rightRegions.map(r => r.bounds.x));
      
      if (rightBound > leftBound) {
        let topBound = 0;
        let bottomBound = height;
        
        if (topRegions.length > 0) {
          topBound = Math.max(...topRegions.map(r => r.bounds.y + r.bounds.height));
        }
        
        if (bottomRegions.length > 0) {
          bottomBound = Math.min(...bottomRegions.map(r => r.bounds.y));
        }
        
        const bounds = {
          x: leftBound,
          y: topBound,
          width: rightBound - leftBound,
          height: bottomBound - topBound
        };
        
        const area = bounds.width * bounds.height;
        const aspectRatio = bounds.width / bounds.height;
        
        if (area >= this.config.minRegionSize && 
            area <= this.config.maxRegionSize &&
            aspectRatio >= this.config.aspectRatioMin && 
            aspectRatio <= this.config.aspectRatioMax) {
          
          candidates.push({
            bounds,
            type: 'ui-framed',
            area,
            aspectRatio,
            framingElements: {
              left: leftRegions.length,
              right: rightRegions.length,
              top: topRegions.length,
              bottom: bottomRegions.length
            }
          });
        }
      }
    }
    
    return candidates;
  }

  /**
   * Score color-based candidates
   */
  scoreColorCandidates(candidates, imageData) {
    const scoredCandidates = [];
    
    for (const candidate of candidates) {
      let score = 0;
      
      // Score based on type
      if (candidate.type === 'ui-framed') {
        score += 0.4; // Prefer UI-framed areas
      } else if (candidate.type === 'space-region') {
        score += 0.2;
      }
      
      // Score based on size
      const relativeArea = candidate.area / (imageData.width * imageData.height);
      const sizeScore = this.calculateSizeScore(relativeArea);
      score += sizeScore * 0.2;
      
      // Score based on aspect ratio
      const aspectScore = this.calculateAspectScore(candidate.aspectRatio);
      score += aspectScore * 0.15;
      
      // Score based on position
      const positionScore = this.calculatePositionScore(candidate.bounds, imageData.width, imageData.height);
      score += positionScore * 0.15;
      
      // Score based on content analysis
      const contentScore = this.analyzeRegionContent(candidate.bounds, imageData);
      score += contentScore * 0.1;
      
      // Normalize score
      score = Math.max(0, Math.min(1, score));
      
      scoredCandidates.push({
        ...candidate,
        confidence: score
      });
    }
    
    return scoredCandidates;
  }

  /**
   * Calculate size-based score (reused from edge detector)
   */
  calculateSizeScore(relativeArea) {
    const optimal = 0.35;
    const distance = Math.abs(relativeArea - optimal);
    return Math.max(0, 1 - distance * 3);
  }

  /**
   * Calculate aspect ratio score (reused from edge detector)
   */
  calculateAspectScore(aspectRatio) {
    const optimal = 1.6;
    const distance = Math.abs(aspectRatio - optimal);
    return Math.max(0, 1 - distance);
  }

  /**
   * Calculate position-based score (reused from edge detector)
   */
  calculatePositionScore(bounds, imageWidth, imageHeight) {
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
   * Analyze content within a region for Nova Drift characteristics
   */
  analyzeRegionContent(bounds, imageData) {
    const width = imageData.width;
    const data = imageData.data;
    
    let spacePixels = 0;
    let uiPixels = 0;
    let brightPixels = 0;
    let totalPixels = 0;
    
    const sampleStep = Math.max(2, Math.floor(Math.min(bounds.width, bounds.height) / 30));
    
    for (let y = bounds.y; y < bounds.y + bounds.height; y += sampleStep) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x += sampleStep) {
        if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          const brightness = (r + g + b) / 3;
          
          // Classify pixel
          if (this.colorDistance({ r, g, b }, this.config.spaceBg) < this.config.spaceBg.tolerance) {
            spacePixels++;
          } else if (this.colorDistance({ r, g, b }, this.config.uiElements) < this.config.uiElements.tolerance ||
                     this.colorDistance({ r, g, b }, this.config.hexBorder) < this.config.hexBorder.tolerance) {
            uiPixels++;
          }
          
          if (brightness > 150) {
            brightPixels++;
          }
          
          totalPixels++;
        }
      }
    }
    
    if (totalPixels === 0) return 0;
    
    const spaceRatio = spacePixels / totalPixels;
    const uiRatio = uiPixels / totalPixels;
    const brightRatio = brightPixels / totalPixels;
    
    // Nova Drift build areas should have a good mix of space and UI elements
    let contentScore = 0;
    
    // Prefer regions with significant space background
    if (spaceRatio > 0.3 && spaceRatio < 0.8) {
      contentScore += 0.4;
    }
    
    // Prefer regions with some UI elements (hex borders, etc.)
    if (uiRatio > 0.05 && uiRatio < 0.5) {
      contentScore += 0.3;
    }
    
    // Prefer regions with some bright elements (selected hexes, text)
    if (brightRatio > 0.02 && brightRatio < 0.3) {
      contentScore += 0.3;
    }
    
    return Math.max(0, Math.min(1, contentScore));
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
}

// Export for global use
window.ColorROIDetector = ColorROIDetector;

console.log('ColorROIDetector: Color-based detection algorithm loaded');