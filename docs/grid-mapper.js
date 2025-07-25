/**
 * Nova Drift Screenshot Grid Mapping - Phase 2
 * Handles coordinate mapping from screenshot pixels to mod positions
 */

(function(global) {
  'use strict';

  // Reference coordinate system baseline (1920x1080, 100% UI scale)
  const REFERENCE_DATA = {
    metadata: {
      version: "1.0",
      baselineResolution: { width: 1920, height: 1080 },
      uiScale: 1.0,
      hexDiameter: 48,
      hexRadius: 24,
      gridCenter: { x: 960, y: 540 },
      generatedAt: new Date().toISOString()
    },
    // Baseline positions for key reference mods (center and edge positions)
    referencePositions: {
      // Center position
      "center": { axial: { q: 0, r: 0 }, pixel: { x: 960, y: 540 } },
      // Ring 1 positions for calibration
      "ring1_top": { axial: { q: 0, r: -1 }, pixel: { x: 960, y: 498 } },
      "ring1_right": { axial: { q: 1, r: -1 }, pixel: { x: 996, y: 519 } },
      "ring1_bottom": { axial: { q: 0, r: 1 }, pixel: { x: 960, y: 582 } },
      "ring1_left": { axial: { q: -1, r: 1 }, pixel: { x: 924, y: 561 } },
      // Ring 2 positions for scale detection
      "ring2_top": { axial: { q: 0, r: -2 }, pixel: { x: 960, y: 456 } },
      "ring2_bottom": { axial: { q: 0, r: 2 }, pixel: { x: 960, y: 624 } }
    }
  };

  // Common screenshot resolutions and their scaling factors
  const SUPPORTED_RESOLUTIONS = {
    '1920x1080': { baseScale: 1.0, commonScales: [1.0, 1.25, 1.5] },
    '2560x1440': { baseScale: 1.33, commonScales: [1.0, 1.25, 1.5] },
    '3840x2160': { baseScale: 2.0, commonScales: [1.0, 1.25, 1.5] }
  };

  /**
   * Coordinate data structure for each mod position
   */
  class CoordinateData {
    constructor(modName, centerPoint, hexBounds, gridPosition, confidence = 1.0) {
      this.modName = modName;
      this.centerPoint = centerPoint;
      this.hexBounds = hexBounds;
      this.gridPosition = gridPosition;
      this.confidence = confidence;
      this.neighbors = [];
    }
  }

  /**
   * Hexagonal grid mathematics calculator
   */
  class HexCalculator {
    constructor() {}

    /**
     * Convert axial coordinates to pixel coordinates
     */
    axialToPixel(q, r, hexRadius, gridCenter) {
      const x = hexRadius * (3/2 * q) + gridCenter.x;
      const y = hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) + gridCenter.y;
      return { x, y };
    }

    /**
     * Convert pixel coordinates to axial coordinates
     */
    pixelToAxial(x, y, hexRadius, gridCenter) {
      const relX = x - gridCenter.x;
      const relY = y - gridCenter.y;
      
      const q = (2/3 * relX) / hexRadius;
      const r = (-1/3 * relX + Math.sqrt(3)/3 * relY) / hexRadius;
      
      return this.roundHex({ q, r });
    }

    /**
     * Round fractional hex coordinates to nearest integer hex
     */
    roundHex(hex) {
      let q = Math.round(hex.q);
      let r = Math.round(hex.r);
      let s = Math.round(-hex.q - hex.r);

      const qDiff = Math.abs(q - hex.q);
      const rDiff = Math.abs(r - hex.r);
      const sDiff = Math.abs(s - (-hex.q - hex.r));

      if (qDiff > rDiff && qDiff > sDiff) {
        q = -r - s;
      } else if (rDiff > sDiff) {
        r = -q - s;
      }

      return { q, r };
    }

    /**
     * Calculate hex bounds for a given center point
     */
    getHexBounds(centerX, centerY, hexRadius) {
      const halfWidth = hexRadius * Math.sqrt(3) / 2;
      const halfHeight = hexRadius;
      
      return {
        left: centerX - halfWidth,
        top: centerY - halfHeight,
        right: centerX + halfWidth,
        bottom: centerY + halfHeight
      };
    }

    /**
     * Calculate distance between two hex coordinates
     */
    hexDistance(a, b) {
      return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    }

    /**
     * Generate all hex positions within a given radius
     */
    generateHexGrid(center, radius) {
      const positions = [];
      
      for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        
        for (let r = r1; r <= r2; r++) {
          positions.push({ q: center.q + q, r: center.r + r });
        }
      }
      
      return positions;
    }
  }

  /**
   * Enhanced scale factor detection for different screenshot resolutions and UI scales
   */
  class ScaleDetector {
    constructor(referenceData) {
      this.reference = referenceData;
      this.edgeThreshold = 50; // Minimum edge strength for detection
      this.confidenceThreshold = 0.9; // Minimum confidence for acceptance
    }

    /**
     * Detect scaling factor using multiple robust methods
     */
    async detectScale(imageElement) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      ctx.drawImage(imageElement, 0, 0);

      const results = [];

      // Try edge detection method (most accurate)
      try {
        const edgeResult = await this.detectByEdgeDetection(ctx, canvas);
        if (edgeResult.confidence > 0.7) {
          results.push(edgeResult);
        }
      } catch (error) {
        console.warn('Edge detection failed:', error);
      }

      // Try template matching with hex sprite
      try {
        const templateResult = await this.detectByTemplateMatching(ctx, canvas);
        if (templateResult.confidence > 0.6) {
          results.push(templateResult);
        }
      } catch (error) {
        console.warn('Template matching failed:', error);
      }

      // Try multi-point validation
      try {
        const multiPointResult = await this.detectByMultiPointValidation(ctx, canvas);
        if (multiPointResult.confidence > 0.8) {
          results.push(multiPointResult);
        }
      } catch (error) {
        console.warn('Multi-point validation failed:', error);
      }

      // Fallback to improved grid spacing
      try {
        const gridSpacingResult = await this.detectByImprovedGridSpacing(ctx, canvas);
        if (gridSpacingResult.confidence > 0.5) {
          results.push(gridSpacingResult);
        }
      } catch (error) {
        console.warn('Grid spacing detection failed:', error);
      }

      // Resolution-based fallback
      try {
        const resolutionResult = this.detectByResolution(canvas);
        if (resolutionResult.confidence > 0.4) {
          results.push(resolutionResult);
        }
      } catch (error) {
        console.warn('Resolution-based detection failed:', error);
      }

      return this.consolidateResults(results);
    }

    /**
     * Enhanced edge detection for hex boundaries
     */
    async detectByEdgeDetection(ctx, canvas) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const edges = this.sobelEdgeDetection(imageData);
      
      // Find hex-shaped edge patterns
      const hexPatterns = this.findHexagonalPatterns(edges, canvas.width, canvas.height);
      
      if (hexPatterns.length === 0) {
        throw new Error('No hexagonal patterns found in edge detection');
      }

      // Calculate average hex size from detected patterns
      const averageHexSize = hexPatterns.reduce((sum, pattern) => sum + pattern.size, 0) / hexPatterns.length;
      const scaleFactor = averageHexSize / this.reference.metadata.hexDiameter;

      // Calculate confidence based on pattern consistency
      const sizeVariance = this.calculateVariance(hexPatterns.map(p => p.size));
      const confidence = Math.max(0, 1.0 - (sizeVariance / (averageHexSize * 0.2)));

      return {
        scaleFactor,
        confidence: Math.min(0.95, confidence),
        method: 'edgeDetection',
        detectedHexSize: averageHexSize,
        patternsFound: hexPatterns.length,
        variance: sizeVariance
      };
    }

    /**
     * Sobel edge detection algorithm
     */
    sobelEdgeDetection(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      const edges = new Uint8ClampedArray(width * height);

      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gx = 0, gy = 0;

          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4;
              const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              
              gx += gray * sobelX[kernelIdx];
              gy += gray * sobelY[kernelIdx];
            }
          }

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          edges[y * width + x] = Math.min(255, magnitude);
        }
      }

      return edges;
    }

    /**
     * Find hexagonal patterns in edge data
     */
    findHexagonalPatterns(edges, width, height) {
      const patterns = [];
      const minHexSize = 20;
      const maxHexSize = 100;

      // Scan for circular/hexagonal edge patterns
      for (let y = minHexSize; y < height - minHexSize; y += 10) {
        for (let x = minHexSize; x < width - minHexSize; x += 10) {
          for (let radius = minHexSize; radius <= maxHexSize; radius += 5) {
            const hexagonality = this.measureHexagonality(edges, width, x, y, radius);
            
            if (hexagonality > 0.6) {
              patterns.push({
                x, y, size: radius * 2,
                hexagonality,
                edgeStrength: this.getEdgeStrength(edges, width, x, y, radius)
              });
            }
          }
        }
      }

      // Remove overlapping patterns, keep strongest
      return this.filterOverlappingPatterns(patterns);
    }

    /**
     * Measure how hexagonal a pattern is
     */
    measureHexagonality(edges, width, centerX, centerY, radius) {
      const hexAngles = [0, 60, 120, 180, 240, 300];
      let totalEdgeStrength = 0;
      let hexEdgeStrength = 0;

      // Sample edges at hex vertices
      for (const angle of hexAngles) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < edges.length / width) {
          const edgeStrength = edges[y * width + x];
          hexEdgeStrength += edgeStrength;
        }
      }

      // Sample total edge strength in circle
      const samples = 24;
      for (let i = 0; i < samples; i++) {
        const angle = (i * 360) / samples;
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < edges.length / width) {
          totalEdgeStrength += edges[y * width + x];
        }
      }

      return totalEdgeStrength > 0 ? hexEdgeStrength / totalEdgeStrength : 0;
    }

    /**
     * Template matching with hex sprite
     */
    async detectByTemplateMatching(ctx, canvas) {
      // Load hex template (would need to be provided as reference)
      const template = await this.loadHexTemplate();
      if (!template) {
        throw new Error('Hex template not available for matching');
      }

      const matches = this.performTemplateMatching(ctx, template, canvas);
      
      if (matches.length === 0) {
        throw new Error('No template matches found');
      }

      // Calculate scale from best matches
      const bestMatches = matches.filter(m => m.confidence > 0.7).slice(0, 5);
      const averageScale = bestMatches.reduce((sum, m) => sum + m.scale, 0) / bestMatches.length;

      return {
        scaleFactor: averageScale,
        confidence: Math.min(0.9, bestMatches.reduce((sum, m) => sum + m.confidence, 0) / bestMatches.length),
        method: 'templateMatching',
        matchesFound: matches.length,
        bestMatches: bestMatches.length
      };
    }

    /**
     * Multi-point validation across screenshot
     */
    async detectByMultiPointValidation(ctx, canvas) {
      const validationPoints = this.generateValidationPoints(canvas);
      const detectionResults = [];

      for (const point of validationPoints) {
        try {
          const localResult = await this.detectScaleAtPoint(ctx, point, canvas);
          if (localResult.confidence > 0.6) {
            detectionResults.push(localResult);
          }
        } catch (error) {
          // Skip failed points
        }
      }

      if (detectionResults.length < 3) {
        throw new Error('Insufficient validation points');
      }

      const averageScale = detectionResults.reduce((sum, r) => sum + r.scaleFactor, 0) / detectionResults.length;
      const scaleVariance = this.calculateVariance(detectionResults.map(r => r.scaleFactor));
      const confidence = Math.max(0, 1.0 - (scaleVariance * 2)); // Lower variance = higher confidence

      return {
        scaleFactor: averageScale,
        confidence: Math.min(0.95, confidence),
        method: 'multiPointValidation',
        validationPoints: detectionResults.length,
        variance: scaleVariance
      };
    }

    /**
     * Improved grid spacing detection with multiple sampling points
     */
    async detectByImprovedGridSpacing(ctx, canvas) {
      const samplingPoints = [
        { x: canvas.width * 0.5, y: canvas.height * 0.5 }, // Center
        { x: canvas.width * 0.3, y: canvas.height * 0.5 }, // Left
        { x: canvas.width * 0.7, y: canvas.height * 0.5 }, // Right
        { x: canvas.width * 0.5, y: canvas.height * 0.3 }, // Top
        { x: canvas.width * 0.5, y: canvas.height * 0.7 }  // Bottom
      ];

      const allSpacings = [];
      
      for (const point of samplingPoints) {
        const spacings = this.findHexSpacingsAtPoint(ctx, point.x, point.y, canvas);
        allSpacings.push(...spacings);
      }

      if (allSpacings.length === 0) {
        throw new Error('No hex spacing patterns found');
      }

      // Filter outliers and calculate average
      const filteredSpacings = this.filterOutliers(allSpacings);
      const averageSpacing = filteredSpacings.reduce((sum, s) => sum + s, 0) / filteredSpacings.length;
      const expectedSpacing = this.reference.metadata.hexDiameter * Math.sqrt(3);
      const scaleFactor = averageSpacing / expectedSpacing;

      // Calculate confidence based on consistency
      const variance = this.calculateVariance(filteredSpacings);
      const confidence = Math.max(0.3, Math.min(0.8, 1.0 - (variance / (averageSpacing * 0.3))));

      return {
        scaleFactor,
        confidence,
        method: 'improvedGridSpacing',
        detectedSpacing: averageSpacing,
        expectedSpacing: expectedSpacing,
        samplesUsed: filteredSpacings.length,
        variance: variance
      };
    }

    /**
     * Find hex spacings at a specific point
     */
    findHexSpacingsAtPoint(ctx, centerX, centerY, canvas) {
      const searchRadius = Math.min(canvas.width, canvas.height) * 0.15;
      const imageData = ctx.getImageData(
        Math.max(0, centerX - searchRadius),
        Math.max(0, centerY - searchRadius),
        Math.min(canvas.width, searchRadius * 2),
        Math.min(canvas.height, searchRadius * 2)
      );

      // Look for patterns in both vertical and horizontal directions
      const verticalSpacings = this.analyzeSpacingDirection(imageData, 'vertical');
      const horizontalSpacings = this.analyzeSpacingDirection(imageData, 'horizontal');
      
      return [...verticalSpacings, ...horizontalSpacings];
    }

    /**
     * Analyze spacing in a specific direction using edge detection
     */
    analyzeSpacingDirection(imageData, direction) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      
      const profile = [];
      const isVertical = direction === 'vertical';
      const primaryDim = isVertical ? height : width;
      const secondaryDim = isVertical ? width : height;
      const centerLine = Math.floor(secondaryDim / 2);

      // Extract intensity profile along the center line
      for (let i = 0; i < primaryDim; i++) {
        let sum = 0;
        let count = 0;
        
        // Average a few pixels around the center line for noise reduction
        for (let offset = -2; offset <= 2; offset++) {
          const pos = centerLine + offset;
          if (pos >= 0 && pos < secondaryDim) {
            const idx = isVertical ? (i * width + pos) * 4 : (pos * width + i) * 4;
            if (idx < data.length) {
              sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              count++;
            }
          }
        }
        
        profile.push(count > 0 ? sum / count : 0);
      }

      // Find peaks and calculate spacings
      const peaks = this.findPeaksInProfile(profile);
      const spacings = [];
      
      for (let i = 1; i < peaks.length; i++) {
        const spacing = peaks[i].position - peaks[i - 1].position;
        if (spacing > 15 && spacing < 150) { // Reasonable hex spacing range
          spacings.push(spacing);
        }
      }

      return spacings;
    }

    /**
     * Find peaks in intensity profile with improved algorithm
     */
    findPeaksInProfile(profile) {
      const peaks = [];
      const minProminence = 10; // Minimum peak prominence
      const windowSize = 5; // Window for local maxima detection

      for (let i = windowSize; i < profile.length - windowSize; i++) {
        let isLocalMax = true;
        let prominence = 0;
        
        // Check if this is a local maximum
        for (let j = i - windowSize; j <= i + windowSize; j++) {
          if (j !== i && profile[j] >= profile[i]) {
            isLocalMax = false;
            break;
          }
        }

        if (isLocalMax) {
          // Calculate prominence (how much it stands out from surroundings)
          const leftMin = Math.min(...profile.slice(Math.max(0, i - windowSize), i));
          const rightMin = Math.min(...profile.slice(i + 1, Math.min(profile.length, i + windowSize + 1)));
          prominence = profile[i] - Math.max(leftMin, rightMin);
          
          if (prominence > minProminence) {
            peaks.push({
              position: i,
              intensity: profile[i],
              prominence: prominence
            });
          }
        }
      }

      return peaks.sort((a, b) => b.prominence - a.prominence); // Sort by prominence
    }

    /**
     * Helper methods for statistical calculations
     */
    calculateVariance(values) {
      if (values.length === 0) return 0;
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / values.length;
    }

    filterOutliers(values) {
      if (values.length < 3) return values;
      
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      
      return values.filter(v => v >= lower && v <= upper);
    }

    filterOverlappingPatterns(patterns) {
      const filtered = [];
      const sortedPatterns = patterns.sort((a, b) => b.hexagonality - a.hexagonality);
      
      for (const pattern of sortedPatterns) {
        let overlaps = false;
        for (const existing of filtered) {
          const distance = Math.sqrt(Math.pow(pattern.x - existing.x, 2) + Math.pow(pattern.y - existing.y, 2));
          if (distance < Math.max(pattern.size, existing.size) * 0.7) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          filtered.push(pattern);
        }
      }
      
      return filtered;
    }

    getEdgeStrength(edges, width, centerX, centerY, radius) {
      let totalStrength = 0;
      let count = 0;
      
      for (let angle = 0; angle < 360; angle += 15) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerX + radius * Math.cos(rad));
        const y = Math.round(centerY + radius * Math.sin(rad));
        
        if (x >= 0 && x < width && y >= 0 && y < edges.length / width) {
          totalStrength += edges[y * width + x];
          count++;
        }
      }
      
      return count > 0 ? totalStrength / count : 0;
    }

    async loadHexTemplate() {
      try {
        // Load the hex template from the filesystem
        const img = new Image();
        return new Promise((resolve, reject) => {
          img.onload = () => {
            // Create canvas to extract image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            resolve({
              canvas: canvas,
              ctx: ctx,
              width: img.width,
              height: img.height,
              imageData: ctx.getImageData(0, 0, img.width, img.height)
            });
          };
          img.onerror = () => {
            // Fallback to synthetic template if loading fails
            console.warn('Could not load hex.png, creating synthetic template');
            resolve(this.createSyntheticHexTemplate(48));
          };
          img.src = 'docs/hex.png';
        });
      } catch (error) {
        console.warn('Template loading failed, using synthetic template:', error);
        return this.createSyntheticHexTemplate(48);
      }
    }

    createSyntheticHexTemplate(diameter) {
      // Create a synthetic hexagon template
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const radius = diameter / 2;
      
      canvas.width = diameter;
      canvas.height = diameter;
      
      // Clear to transparent
      ctx.clearRect(0, 0, diameter, diameter);
      
      // Draw hexagon outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = radius + (radius * 0.8) * Math.cos(angle);
        const y = radius + (radius * 0.8) * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
      
      return {
        canvas: canvas,
        ctx: ctx,
        width: diameter,
        height: diameter,
        imageData: ctx.getImageData(0, 0, diameter, diameter)
      };
    }

    performTemplateMatching(ctx, template, canvas) {
      if (!template || !template.imageData) {
        console.warn('Invalid template provided for matching');
        return [];
      }

      const sourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const templateData = template.imageData;
      const matches = [];
      
      const searchStep = Math.max(8, Math.floor(template.width / 4)); // Skip pixels for performance
      const minConfidence = 0.6; // Minimum correlation threshold
      
      // Scan across the image looking for template matches
      for (let y = 0; y <= canvas.height - template.height; y += searchStep) {
        for (let x = 0; x <= canvas.width - template.width; x += searchStep) {
          const confidence = this.calculateNormalizedCrossCorrelation(
            sourceImageData, 
            templateData,
            x, y,
            canvas.width,
            template.width,
            template.height
          );
          
          if (confidence > minConfidence) {
            // Calculate scale factor based on local edge density
            const localScale = this.estimateScaleAtPosition(ctx, x, y, template.width, template.height);
            
            matches.push({
              x: x + template.width / 2,
              y: y + template.height / 2,
              confidence: confidence,
              scaleFactor: localScale,
              templateSize: template.width
            });
          }
        }
      }
      
      // Filter overlapping matches, keeping highest confidence
      return this.filterOverlappingMatches(matches, template.width);
    }

    calculateNormalizedCrossCorrelation(sourceData, templateData, startX, startY, sourceWidth, templateWidth, templateHeight) {
      let numerator = 0;
      let sourceSumSquared = 0;
      let templateSumSquared = 0;
      let sourceSum = 0;
      let templateSum = 0;
      let count = 0;

      // Calculate correlation over template region
      for (let ty = 0; ty < templateHeight; ty++) {
        for (let tx = 0; tx < templateWidth; tx++) {
          const sourceIdx = ((startY + ty) * sourceWidth + (startX + tx)) * 4;
          const templateIdx = (ty * templateWidth + tx) * 4;
          
          if (sourceIdx < sourceData.data.length && templateIdx < templateData.data.length) {
            // Convert to grayscale
            const sourceGray = (sourceData.data[sourceIdx] + sourceData.data[sourceIdx + 1] + sourceData.data[sourceIdx + 2]) / 3;
            const templateGray = (templateData.data[templateIdx] + templateData.data[templateIdx + 1] + templateData.data[templateIdx + 2]) / 3;
            
            numerator += sourceGray * templateGray;
            sourceSumSquared += sourceGray * sourceGray;
            templateSumSquared += templateGray * templateGray;
            sourceSum += sourceGray;
            templateSum += templateGray;
            count++;
          }
        }
      }

      if (count === 0) return 0;

      // Normalized cross-correlation formula
      const sourceMean = sourceSum / count;
      const templateMean = templateSum / count;
      
      let numeratorCentered = 0;
      let sourceVariance = 0;
      let templateVariance = 0;

      // Recalculate with centered values
      for (let ty = 0; ty < templateHeight; ty++) {
        for (let tx = 0; tx < templateWidth; tx++) {
          const sourceIdx = ((startY + ty) * sourceWidth + (startX + tx)) * 4;
          const templateIdx = (ty * templateWidth + tx) * 4;
          
          if (sourceIdx < sourceData.data.length && templateIdx < templateData.data.length) {
            const sourceGray = (sourceData.data[sourceIdx] + sourceData.data[sourceIdx + 1] + sourceData.data[sourceIdx + 2]) / 3;
            const templateGray = (templateData.data[templateIdx] + templateData.data[templateIdx + 1] + templateData.data[templateIdx + 2]) / 3;
            
            const sourceCentered = sourceGray - sourceMean;
            const templateCentered = templateGray - templateMean;
            
            numeratorCentered += sourceCentered * templateCentered;
            sourceVariance += sourceCentered * sourceCentered;
            templateVariance += templateCentered * templateCentered;
          }
        }
      }

      const denominator = Math.sqrt(sourceVariance * templateVariance);
      return denominator > 0 ? numeratorCentered / denominator : 0;
    }

    estimateScaleAtPosition(ctx, x, y, templateWidth, templateHeight) {
      // Estimate local scale by analyzing edge density
      const imageData = ctx.getImageData(x, y, templateWidth, templateHeight);
      const edges = this.detectEdges(imageData);
      
      // Count edge pixels
      let edgeCount = 0;
      for (let i = 0; i < edges.length; i++) {
        if (edges[i] > 50) edgeCount++; // Threshold for edge detection
      }
      
      const edgeDensity = edgeCount / edges.length;
      
      // Scale factor estimation based on edge density
      // Higher edge density typically means smaller scale (more detail)
      const baseScale = 1.0;
      const scaleFactor = baseScale + (0.2 - edgeDensity) * 2; // Rough estimation
      
      return Math.max(0.5, Math.min(3.0, scaleFactor)); // Clamp to reasonable range
    }

    filterOverlappingMatches(matches, templateSize) {
      if (matches.length === 0) return matches;
      
      // Sort by confidence (highest first)
      matches.sort((a, b) => b.confidence - a.confidence);
      
      const filtered = [];
      const exclusionRadius = templateSize * 0.7; // Overlapping threshold
      
      for (const match of matches) {
        let isOverlapping = false;
        
        for (const existing of filtered) {
          const distance = Math.sqrt(
            Math.pow(match.x - existing.x, 2) + 
            Math.pow(match.y - existing.y, 2)
          );
          
          if (distance < exclusionRadius) {
            isOverlapping = true;
            break;
          }
        }
        
        if (!isOverlapping) {
          filtered.push(match);
        }
      }
      
      return filtered;
    }

    generateValidationPoints(canvas) {
      // Generate a grid of validation points across the image
      const points = [];
      const cols = 4;
      const rows = 3;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          points.push({
            x: (canvas.width * (col + 1)) / (cols + 1),
            y: (canvas.height * (row + 1)) / (rows + 1)
          });
        }
      }
      
      return points;
    }

    async detectScaleAtPoint(ctx, point, canvas) {
      // Simplified local scale detection at a specific point
      const spacings = this.findHexSpacingsAtPoint(ctx, point.x, point.y, canvas);
      
      if (spacings.length === 0) {
        throw new Error('No spacings found at point');
      }

      const averageSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
      const expectedSpacing = this.reference.metadata.hexDiameter * Math.sqrt(3);
      const scaleFactor = averageSpacing / expectedSpacing;

      return {
        scaleFactor,
        confidence: Math.min(0.8, spacings.length / 3), // More spacings = higher confidence
        point: point
      };
    }

    /**
     * Detect scale based on image resolution
     */
    detectByResolution(canvas) {
      const resolution = `${canvas.width}x${canvas.height}`;
      const resolutionData = SUPPORTED_RESOLUTIONS[resolution];
      
      if (resolutionData) {
        return {
          scaleFactor: resolutionData.baseScale,
          confidence: 0.8,
          method: 'resolution',
          resolution: resolution
        };
      }

      // Try to match closest resolution
      const aspectRatio = canvas.width / canvas.height;
      let closestMatch = null;
      let closestDiff = Infinity;

      for (const [res, data] of Object.entries(SUPPORTED_RESOLUTIONS)) {
        const [w, h] = res.split('x').map(Number);
        const resAspectRatio = w / h;
        const diff = Math.abs(aspectRatio - resAspectRatio);
        
        if (diff < closestDiff) {
          closestDiff = diff;
          closestMatch = { resolution: res, data, scaleFactor: data.baseScale };
        }
      }

      if (closestMatch && closestDiff < 0.1) {
        return {
          scaleFactor: closestMatch.scaleFactor,
          confidence: 0.6,
          method: 'resolutionApprox',
          matchedResolution: closestMatch.resolution
        };
      }

      throw new Error('No matching resolution found');
    }

    /**
     * Consolidate results from multiple detection methods
     */
    consolidateResults(results) {
      if (results.length === 0) {
        // Fallback to 1.0 scale factor
        return {
          scaleFactor: 1.0,
          confidence: 0.3,
          method: 'fallback',
          gridCenter: { x: 0, y: 0 }
        };
      }

      // Weight results by confidence and take average
      let totalWeight = 0;
      let weightedSum = 0;

      for (const result of results) {
        const weight = result.confidence;
        weightedSum += result.scaleFactor * weight;
        totalWeight += weight;
      }

      const scaleFactor = weightedSum / totalWeight;
      const confidence = Math.min(0.95, totalWeight / results.length);

      return {
        scaleFactor,
        confidence,
        method: 'consolidated',
        methods: results.map(r => r.method),
        gridCenter: { x: 0, y: 0 } // Will be refined by grid detection
      };
    }
  }

  /**
   * Main grid mapping orchestrator
   */
  class GridMapper {
    constructor(modData) {
      this.modData = modData || {};
      this.hexCalculator = new HexCalculator();
      this.scaleDetector = new ScaleDetector(REFERENCE_DATA);
      this.referenceData = REFERENCE_DATA;
    }

    /**
     * Map screenshot to mod coordinate system
     */
    async mapScreenshot(imageElement) {
      try {
        // Phase 1: Detect scaling and grid center
        const scaleResult = await this.scaleDetector.detectScale(imageElement);
        
        // Phase 2: Refine grid center detection
        const gridCenter = await this.detectGridCenter(imageElement, scaleResult);
        
        // Phase 3: Generate coordinate map
        const coordinateMap = this.generateCoordinateMap(
          imageElement, 
          scaleResult.scaleFactor, 
          gridCenter
        );

        // Phase 4: Calculate bounding box
        const boundingBox = this.calculateBoundingBox(coordinateMap);

        const result = {
          imageElement,
          coordinateMap,
          scalingFactor: scaleResult.scaleFactor,
          boundingBox,
          confidence: scaleResult.confidence,
          referencePoints: this.extractReferencePoints(scaleResult),
          gridMetadata: {
            hexRadius: this.referenceData.metadata.hexRadius * scaleResult.scaleFactor,
            gridCenter,
            totalDetectedHexes: coordinateMap.size,
            resolution: { 
              width: imageElement.naturalWidth, 
              height: imageElement.naturalHeight 
            }
          }
        };

        // Dispatch event for Phase 3
        document.dispatchEvent(new CustomEvent('grid-mapped', {
          detail: result
        }));

        return result;

      } catch (error) {
        console.error('Grid mapping failed:', error);
        throw new Error(`Grid mapping failed: ${error.message}`);
      }
    }

    /**
     * Enhanced grid center detection using UI elements and pattern recognition
     */
    async detectGridCenter(imageElement, scaleResult) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      ctx.drawImage(imageElement, 0, 0);

      // Try multiple detection methods
      const detectionMethods = [
        this.detectCenterByUIElements.bind(this),
        this.detectCenterByHexPattern.bind(this),
        this.detectCenterBySymmetry.bind(this),
        this.detectCenterByDefaultAssumption.bind(this)
      ];

      for (const method of detectionMethods) {
        try {
          const result = await method(ctx, canvas, scaleResult);
          if (result.confidence > 0.7) {
            console.log(`Grid center detected using ${result.method} with confidence ${result.confidence}`);
            return result.center;
          }
        } catch (error) {
          console.warn(`Grid center detection method failed:`, error);
        }
      }

      // Fallback to image center with offset correction
      console.warn('Using fallback grid center detection');
      const centerX = imageElement.naturalWidth / 2;
      const centerY = imageElement.naturalHeight / 2;
      const offsetCorrection = this.detectCenterOffset(imageElement, scaleResult);
      
      return {
        x: centerX + offsetCorrection.x,
        y: centerY + offsetCorrection.y
      };
    }

    /**
     * Detect grid center by identifying Nova Drift UI elements
     */
    async detectCenterByUIElements(ctx, canvas, scaleResult) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Look for distinctive UI elements that frame the mod grid
      const uiFeatures = this.findUIFeatures(imageData, canvas);
      
      if (uiFeatures.length < 2) {
        throw new Error('Insufficient UI features found');
      }

      // Calculate center based on UI bounding box
      const bounds = this.calculateUIBounds(uiFeatures);
      const center = {
        x: (bounds.left + bounds.right) / 2,
        y: (bounds.top + bounds.bottom) / 2
      };

      // Validate center makes sense
      const confidence = this.validateGridCenter(ctx, center, scaleResult);

      return {
        center,
        confidence,
        method: 'uiElements',
        featuresFound: uiFeatures.length
      };
    }

    /**
     * Detect center by finding the densest concentration of hexagonal patterns
     */
    async detectCenterByHexPattern(ctx, canvas, scaleResult) {
      const gridSize = 50; // Sample grid resolution
      const hexRadius = this.reference.metadata.hexRadius * scaleResult.scaleFactor;
      const bestCenter = { x: 0, y: 0, score: 0 };

      // Search for center position that maximizes hex pattern detection
      for (let y = hexRadius * 3; y < canvas.height - hexRadius * 3; y += gridSize) {
        for (let x = hexRadius * 3; x < canvas.width - hexRadius * 3; x += gridSize) {
          const score = this.scoreHexPatternDensity(ctx, x, y, hexRadius);
          if (score > bestCenter.score) {
            bestCenter.x = x;
            bestCenter.y = y;
            bestCenter.score = score;
          }
        }
      }

      if (bestCenter.score < 0.3) {
        throw new Error('No strong hex pattern center found');
      }

      return {
        center: { x: bestCenter.x, y: bestCenter.y },
        confidence: Math.min(0.9, bestCenter.score),
        method: 'hexPattern',
        patternScore: bestCenter.score
      };
    }

    /**
     * Detect center by analyzing image symmetry
     */
    async detectCenterBySymmetry(ctx, canvas, scaleResult) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Find center that maximizes symmetry in the mod grid area
      const symmetryMap = this.calculateSymmetryMap(imageData, canvas);
      const maxSymmetry = this.findMaxSymmetryPoint(symmetryMap);

      if (maxSymmetry.score < 0.5) {
        throw new Error('No strong symmetry center found');
      }

      return {
        center: { x: maxSymmetry.x, y: maxSymmetry.y },
        confidence: Math.min(0.8, maxSymmetry.score),
        method: 'symmetry',
        symmetryScore: maxSymmetry.score
      };
    }

    /**
     * Default assumption with improved offset detection
     */
    async detectCenterByDefaultAssumption(ctx, canvas, scaleResult) {
      const baseCenter = {
        x: canvas.width / 2,
        y: canvas.height / 2
      };

      // Apply intelligent offset correction
      const offsetCorrection = this.detectCenterOffset(canvas, scaleResult);
      const center = {
        x: baseCenter.x + offsetCorrection.x,
        y: baseCenter.y + offsetCorrection.y
      };

      return {
        center,
        confidence: 0.4, // Low confidence but reliable fallback
        method: 'defaultAssumption',
        offset: offsetCorrection
      };
    }

    /**
     * Enhanced offset detection for grid center
     */
    detectCenterOffset(canvas, scaleResult) {
      // Analyze image for common UI offset patterns
      let offsetX = 0;
      let offsetY = 0;

      // Check for letterboxing or pillarboxing
      const aspectRatio = canvas.width / canvas.height;
      const expectedAspectRatio = 16 / 9; // Common game aspect ratio
      
      if (Math.abs(aspectRatio - expectedAspectRatio) > 0.1) {
        // Image may be cropped or have bars
        if (aspectRatio > expectedAspectRatio) {
          // Likely pillarboxed, check for dark edges
          offsetX = this.detectHorizontalOffset(canvas);
        } else {
          // Likely letterboxed, check for dark edges
          offsetY = this.detectVerticalOffset(canvas);
        }
      }

      // Check for UI chrome offset (menus, HUD elements)
      const uiOffset = this.detectUIOffset(canvas, scaleResult);
      offsetX += uiOffset.x;
      offsetY += uiOffset.y;

      return { x: offsetX, y: offsetY };
    }

    /**
     * Helper methods for grid center detection
     */
    findUIFeatures(imageData, canvas) {
      const features = [];
      const width = canvas.width;
      const height = canvas.height;
      const data = imageData.data;

      // Look for UI elements with specific color patterns or geometric shapes
      // This is a simplified implementation - could be enhanced with ML
      
      // Scan for rectangular UI elements (borders, panels)
      for (let y = 0; y < height - 20; y += 10) {
        for (let x = 0; x < width - 20; x += 10) {
          const rect = this.analyzeRectangularRegion(data, width, x, y, 20, 20);
          if (rect.isUIElement) {
            features.push({
              type: 'ui_element',
              x: x + 10,
              y: y + 10,
              confidence: rect.confidence
            });
          }
        }
      }

      return features.filter(f => f.confidence > 0.6);
    }

    analyzeRectangularRegion(data, width, startX, startY, regionWidth, regionHeight) {
      let edgePixels = 0;
      let totalPixels = 0;
      let colorVariance = 0;
      const colors = [];

      for (let y = startY; y < startY + regionHeight; y++) {
        for (let x = startX; x < startX + regionWidth; x++) {
          if (x >= 0 && x < width && y >= 0) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            colors.push({ r, g, b });
            totalPixels++;

            // Check if this is an edge pixel (high contrast with neighbors)
            if (this.isEdgePixel(data, width, x, y)) {
              edgePixels++;
            }
          }
        }
      }

      // Calculate color variance to detect UI elements
      colorVariance = this.calculateColorVariance(colors);
      const edgeRatio = edgePixels / totalPixels;

      // UI elements typically have more edges and lower color variance
      const isUIElement = edgeRatio > 0.1 && colorVariance < 1000;
      const confidence = isUIElement ? Math.min(0.9, edgeRatio + (1 - colorVariance / 2000)) : 0;

      return { isUIElement, confidence };
    }

    isEdgePixel(data, width, x, y) {
      const centerIdx = (y * width + x) * 4;
      const centerBrightness = (data[centerIdx] + data[centerIdx + 1] + data[centerIdx + 2]) / 3;
      
      const neighbors = [
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
      ];

      for (const neighbor of neighbors) {
        const nx = x + neighbor.dx;
        const ny = y + neighbor.dy;
        const nIdx = (ny * width + nx) * 4;
        
        if (nIdx >= 0 && nIdx < data.length) {
          const nBrightness = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3;
          if (Math.abs(centerBrightness - nBrightness) > 30) {
            return true;
          }
        }
      }
      
      return false;
    }

    calculateColorVariance(colors) {
      if (colors.length === 0) return 0;
      
      const avgR = colors.reduce((sum, c) => sum + c.r, 0) / colors.length;
      const avgG = colors.reduce((sum, c) => sum + c.g, 0) / colors.length;
      const avgB = colors.reduce((sum, c) => sum + c.b, 0) / colors.length;
      
      const variance = colors.reduce((sum, c) => {
        return sum + Math.pow(c.r - avgR, 2) + Math.pow(c.g - avgG, 2) + Math.pow(c.b - avgB, 2);
      }, 0) / colors.length;
      
      return variance;
    }

    calculateUIBounds(uiFeatures) {
      if (uiFeatures.length === 0) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
      }

      const bounds = {
        left: Math.min(...uiFeatures.map(f => f.x)),
        top: Math.min(...uiFeatures.map(f => f.y)),
        right: Math.max(...uiFeatures.map(f => f.x)),
        bottom: Math.max(...uiFeatures.map(f => f.y))
      };

      return bounds;
    }

    scoreHexPatternDensity(ctx, centerX, centerY, hexRadius) {
      const testPositions = this.hexCalculator.generateHexGrid({ q: 0, r: 0 }, 2);
      let totalScore = 0;
      let validPositions = 0;

      for (const pos of testPositions) {
        const pixelPos = this.hexCalculator.axialToPixel(pos.q, pos.r, hexRadius, { x: centerX, y: centerY });
        
        if (pixelPos.x > 0 && pixelPos.x < ctx.canvas.width && pixelPos.y > 0 && pixelPos.y < ctx.canvas.height) {
          const hexScore = this.scoreHexAtPosition(ctx, pixelPos.x, pixelPos.y, hexRadius);
          totalScore += hexScore;
          validPositions++;
        }
      }

      return validPositions > 0 ? totalScore / validPositions : 0;
    }

    scoreHexAtPosition(ctx, x, y, radius) {
      // Sample pixels in hex pattern and check for game-like characteristics
      const imageData = ctx.getImageData(x - radius, y - radius, radius * 2, radius * 2);
      const data = imageData.data;
      const width = radius * 2;
      
      let hexScore = 0;
      let sampleCount = 0;

      // Sample at hex vertices
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const sampleX = Math.round(radius + radius * 0.8 * Math.cos(angle));
        const sampleY = Math.round(radius + radius * 0.8 * Math.sin(angle));
        
        if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < width) {
          const idx = (sampleY * width + sampleX) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          // Game elements tend to have moderate brightness (not pure black/white)
          if (brightness > 50 && brightness < 200) {
            hexScore += 1;
          }
          sampleCount++;
        }
      }

      return sampleCount > 0 ? hexScore / sampleCount : 0;
    }

    calculateSymmetryMap(imageData, canvas) {
      // Simplified symmetry calculation
      const symmetryMap = [];
      const step = 20;
      
      for (let y = step; y < canvas.height - step; y += step) {
        for (let x = step; x < canvas.width - step; x += step) {
          const symmetryScore = this.calculateSymmetryAtPoint(imageData, canvas, x, y);
          symmetryMap.push({ x, y, score: symmetryScore });
        }
      }
      
      return symmetryMap;
    }

    calculateSymmetryAtPoint(imageData, canvas, centerX, centerY) {
      // Check horizontal and vertical symmetry in a local region
      const radius = 30;
      const data = imageData.data;
      const width = canvas.width;
      
      let symmetryScore = 0;
      let comparisons = 0;

      for (let dy = -radius; dy <= radius; dy += 5) {
        for (let dx = -radius; dx <= radius; dx += 5) {
          const x1 = centerX + dx;
          const y1 = centerY + dy;
          const x2 = centerX - dx; // Mirror horizontally
          const y2 = centerY - dy; // Mirror vertically
          
          if (this.isValidPixel(x1, y1, width, canvas.height) && 
              this.isValidPixel(x2, y2, width, canvas.height)) {
            
            const idx1 = (y1 * width + x1) * 4;
            const idx2 = (y2 * width + x2) * 4;
            
            const brightness1 = (data[idx1] + data[idx1 + 1] + data[idx1 + 2]) / 3;
            const brightness2 = (data[idx2] + data[idx2 + 1] + data[idx2 + 2]) / 3;
            
            const similarity = 1 - Math.abs(brightness1 - brightness2) / 255;
            symmetryScore += similarity;
            comparisons++;
          }
        }
      }

      return comparisons > 0 ? symmetryScore / comparisons : 0;
    }

    findMaxSymmetryPoint(symmetryMap) {
      if (symmetryMap.length === 0) {
        return { x: 0, y: 0, score: 0 };
      }

      return symmetryMap.reduce((max, point) => 
        point.score > max.score ? point : max
      );
    }

    isValidPixel(x, y, width, height) {
      return x >= 0 && x < width && y >= 0 && y < height;
    }

    validateGridCenter(ctx, center, scaleResult) {
      // Validate the proposed center by checking for expected hex patterns
      const hexRadius = this.reference.metadata.hexRadius * scaleResult.scaleFactor;
      const testPositions = [
        { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
      ];

      let validPositions = 0;
      for (const pos of testPositions) {
        const pixelPos = this.hexCalculator.axialToPixel(pos.q, pos.r, hexRadius, center);
        const score = this.scoreHexAtPosition(ctx, pixelPos.x, pixelPos.y, hexRadius);
        if (score > 0.3) validPositions++;
      }

      return validPositions / testPositions.length;
    }

    detectHorizontalOffset(canvas) {
      // Detect horizontal offset by analyzing left/right edges for dark regions (pillarboxing)
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Sample vertical strips on left and right edges
      const stripWidth = Math.min(50, width * 0.05); // 5% of width or 50px max
      const sampleHeight = height;
      
      // Analyze left edge
      const leftImageData = ctx.getImageData(0, 0, stripWidth, sampleHeight);
      const leftDarkness = this.calculateAverageDarkness(leftImageData);
      
      // Analyze right edge
      const rightImageData = ctx.getImageData(width - stripWidth, 0, stripWidth, sampleHeight);
      const rightDarkness = this.calculateAverageDarkness(rightImageData);
      
      // If both edges are dark (below threshold), we likely have pillarboxing
      const darknessThreshold = 30; // RGB values below this are considered "dark"
      const leftIsDark = leftDarkness < darknessThreshold;
      const rightIsDark = rightDarkness < darknessThreshold;
      
      if (leftIsDark && rightIsDark) {
        // Find the actual content boundaries
        const leftBoundary = this.findContentBoundary(ctx, 'left', stripWidth * 2);
        const rightBoundary = this.findContentBoundary(ctx, 'right', stripWidth * 2);
        
        // Calculate offset from center
        const contentWidth = rightBoundary - leftBoundary;
        const contentCenter = leftBoundary + contentWidth / 2;
        const imageCenter = width / 2;
        
        return contentCenter - imageCenter;
      } else if (leftIsDark) {
        // Only left side is dark
        const leftBoundary = this.findContentBoundary(ctx, 'left', stripWidth * 2);
        const offset = leftBoundary - (width * 0.1); // Expected small margin
        return Math.max(0, offset);
      } else if (rightIsDark) {
        // Only right side is dark
        const rightBoundary = this.findContentBoundary(ctx, 'right', stripWidth * 2);
        const offset = (width * 0.9) - rightBoundary; // Expected small margin
        return Math.min(0, -offset);
      }
      
      // No significant dark edges detected
      return 0;
    }

    detectVerticalOffset(canvas) {
      // Detect vertical offset by analyzing top/bottom edges for dark regions (letterboxing)
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Sample horizontal strips on top and bottom edges
      const stripHeight = Math.min(50, height * 0.05); // 5% of height or 50px max
      const sampleWidth = width;
      
      // Analyze top edge
      const topImageData = ctx.getImageData(0, 0, sampleWidth, stripHeight);
      const topDarkness = this.calculateAverageDarkness(topImageData);
      
      // Analyze bottom edge
      const bottomImageData = ctx.getImageData(0, height - stripHeight, sampleWidth, stripHeight);
      const bottomDarkness = this.calculateAverageDarkness(bottomImageData);
      
      // Check for dark bars or UI elements
      const darknessThreshold = 30;
      const topIsDark = topDarkness < darknessThreshold;
      const bottomIsDark = bottomDarkness < darknessThreshold;
      
      if (topIsDark && bottomIsDark) {
        // Find the actual content boundaries
        const topBoundary = this.findContentBoundary(ctx, 'top', stripHeight * 2);
        const bottomBoundary = this.findContentBoundary(ctx, 'bottom', stripHeight * 2);
        
        // Calculate offset from center
        const contentHeight = bottomBoundary - topBoundary;
        const contentCenter = topBoundary + contentHeight / 2;
        const imageCenter = height / 2;
        
        return contentCenter - imageCenter;
      } else if (topIsDark) {
        // Only top is dark (top UI bar)
        const topBoundary = this.findContentBoundary(ctx, 'top', stripHeight * 2);
        const offset = topBoundary - (height * 0.1); // Expected small margin
        return Math.max(0, offset);
      } else if (bottomIsDark) {
        // Only bottom is dark (bottom UI bar)
        const bottomBoundary = this.findContentBoundary(ctx, 'bottom', stripHeight * 2);
        const offset = (height * 0.9) - bottomBoundary;
        return Math.min(0, -offset);
      }
      
      // No significant dark edges detected
      return 0;
    }

    detectUIOffset(canvas, scaleResult) {
      // Detect offset caused by Nova Drift UI elements
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Look for characteristic Nova Drift UI colors (blues, purples, UI chrome)
      const uiFeatures = this.detectUIFeatures(ctx, width, height);
      
      if (uiFeatures.length === 0) {
        return { x: 0, y: 0 };
      }
      
      // Calculate UI bounds
      const uiBounds = this.calculateUIBounds(uiFeatures);
      
      // Determine if UI elements create a consistent offset
      const uiCenterX = (uiBounds.left + uiBounds.right) / 2;
      const uiCenterY = (uiBounds.top + uiBounds.bottom) / 2;
      
      const imageCenterX = width / 2;
      const imageCenterY = height / 2;
      
      // Check if UI elements suggest the game area is offset
      let offsetX = 0;
      let offsetY = 0;
      
      // If UI elements are predominantly on one side, game area might be offset
      const uiWidth = uiBounds.right - uiBounds.left;
      const uiHeight = uiBounds.bottom - uiBounds.top;
      
      // Significant UI on left/right suggests horizontal offset
      if (uiWidth > width * 0.3) { // UI takes up significant horizontal space
        if (uiBounds.left < width * 0.3 && uiBounds.right < width * 0.7) {
          // UI primarily on left, game area offset right
          offsetX = (width - uiBounds.right) / 2 - imageCenterX;
        } else if (uiBounds.left > width * 0.3 && uiBounds.right > width * 0.7) {
          // UI primarily on right, game area offset left
          offsetX = uiBounds.left / 2 - imageCenterX;
        }
      }
      
      // Significant UI on top/bottom suggests vertical offset  
      if (uiHeight > height * 0.2) { // UI takes up significant vertical space
        if (uiBounds.top < height * 0.3 && uiBounds.bottom < height * 0.7) {
          // UI primarily on top, game area offset down
          offsetY = (height - uiBounds.bottom) / 2 - imageCenterY;
        } else if (uiBounds.top > height * 0.3 && uiBounds.bottom > height * 0.7) {
          // UI primarily on bottom, game area offset up
          offsetY = uiBounds.top / 2 - imageCenterY;
        }
      }
      
      // Apply scale factor to offsets
      const scaleFactor = scaleResult ? scaleResult.scaleFactor : 1.0;
      
      return { 
        x: offsetX / scaleFactor, 
        y: offsetY / scaleFactor 
      };
    }

    calculateAverageDarkness(imageData) {
      const data = imageData.data;
      let totalBrightness = 0;
      let pixelCount = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
      
      return pixelCount > 0 ? totalBrightness / pixelCount : 255;
    }

    findContentBoundary(ctx, direction, searchDistance) {
      const canvas = ctx.canvas;
      const width = canvas.width;
      const height = canvas.height;
      
      let boundary = 0;
      const brightnessThreshold = 50; // Threshold to distinguish content from dark areas
      
      switch (direction) {
        case 'left':
          for (let x = 0; x < Math.min(searchDistance, width); x++) {
            const columnData = ctx.getImageData(x, 0, 1, height);
            const avgBrightness = this.calculateAverageDarkness(columnData);
            
            if (avgBrightness > brightnessThreshold) {
              boundary = x;
              break;
            }
          }
          break;
          
        case 'right':
          for (let x = width - 1; x >= Math.max(0, width - searchDistance); x--) {
            const columnData = ctx.getImageData(x, 0, 1, height);
            const avgBrightness = this.calculateAverageDarkness(columnData);
            
            if (avgBrightness > brightnessThreshold) {
              boundary = x;
              break;
            }
          }
          if (boundary === 0) boundary = width - 1;
          break;
          
        case 'top':
          for (let y = 0; y < Math.min(searchDistance, height); y++) {
            const rowData = ctx.getImageData(0, y, width, 1);
            const avgBrightness = this.calculateAverageDarkness(rowData);
            
            if (avgBrightness > brightnessThreshold) {
              boundary = y;
              break;
            }
          }
          break;
          
        case 'bottom':
          for (let y = height - 1; y >= Math.max(0, height - searchDistance); y--) {
            const rowData = ctx.getImageData(0, y, width, 1);
            const avgBrightness = this.calculateAverageDarkness(rowData);
            
            if (avgBrightness > brightnessThreshold) {
              boundary = y;
              break;
            }
          }
          if (boundary === 0) boundary = height - 1;
          break;
      }
      
      return boundary;
    }

    detectUIFeatures(ctx, width, height) {
      // Detect Nova Drift UI elements by looking for characteristic colors and shapes
      const features = [];
      const sampleSize = 20; // Pixel step size for performance
      
      // Nova Drift UI typically uses blues (#4A90E2), purples, and dark backgrounds
      const uiColors = [
        { r: 74, g: 144, b: 226, tolerance: 50 },   // Blue UI elements
        { r: 128, g: 100, b: 162, tolerance: 50 },  // Purple elements
        { r: 45, g: 45, b: 55, tolerance: 30 },     // Dark UI panels
        { r: 200, g: 200, b: 255, tolerance: 40 }   // Light text/highlights
      ];
      
      for (let y = 0; y < height; y += sampleSize) {
        for (let x = 0; x < width; x += sampleSize) {
          const imageData = ctx.getImageData(x, y, Math.min(sampleSize, width - x), Math.min(sampleSize, height - y));
          const hasUIColor = this.containsUIColors(imageData, uiColors);
          
          if (hasUIColor) {
            features.push({ x, y, size: sampleSize });
          }
        }
      }
      
      return features;
    }

    containsUIColors(imageData, uiColors) {
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        for (const uiColor of uiColors) {
          const dr = Math.abs(r - uiColor.r);
          const dg = Math.abs(g - uiColor.g);
          const db = Math.abs(b - uiColor.b);
          
          if (dr <= uiColor.tolerance && dg <= uiColor.tolerance && db <= uiColor.tolerance) {
            return true;
          }
        }
      }
      
      return false;
    }

    detectEdges(imageData) {
      // Sobel edge detection algorithm
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      const edges = new Float32Array(width * height);
      
      // Sobel kernels
      const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
      const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
      
      // Convert to grayscale and apply Sobel operator
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let gx = 0;
          let gy = 0;
          
          // Apply 3x3 Sobel kernels
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixelIdx = ((y + ky) * width + (x + kx)) * 4;
              const gray = (data[pixelIdx] + data[pixelIdx + 1] + data[pixelIdx + 2]) / 3;
              
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              gx += gray * sobelX[kernelIdx];
              gy += gray * sobelY[kernelIdx];
            }
          }
          
          // Calculate gradient magnitude
          const magnitude = Math.sqrt(gx * gx + gy * gy);
          edges[y * width + x] = magnitude;
        }
      }
      
      return edges;
    }

    /**
     * Enhanced coordinate map generation with validation
     */
    generateCoordinateMap(imageElement, scaleFactor, gridCenter) {
      const coordinateMap = new Map();
      const scaledHexRadius = this.referenceData.metadata.hexRadius * scaleFactor;

      // Use actual mod positions if available
      if (global.NovaModPositions && global.NovaModPositions.MOD_POSITIONS) {
        const modPositions = global.NovaModPositions.MOD_POSITIONS;
        
        for (const [modName, modData] of Object.entries(modPositions)) {
          const pixelPos = this.hexCalculator.axialToPixel(
            modData.q, 
            modData.r, 
            scaledHexRadius, 
            gridCenter
          );

          // Enhanced position validation
          if (this.isPositionValid(pixelPos, imageElement)) {
            const hexBounds = this.hexCalculator.getHexBounds(
              pixelPos.x, 
              pixelPos.y, 
              scaledHexRadius
            );

            // Calculate confidence based on image analysis
            const confidence = this.calculatePositionConfidence(imageElement, pixelPos, scaledHexRadius);

            const coordData = new CoordinateData(
              modName,
              pixelPos,
              hexBounds,
              { q: modData.q, r: modData.r },
              confidence
            );

            // Add neighbor information for validation
            this.addNeighborInformation(coordData, modPositions, scaledHexRadius, gridCenter);

            coordinateMap.set(modName, coordData);
          }
        }
      } else {
        // Enhanced fallback: generate hex grid positions with validation
        console.warn('Mod position data not available, using validated generated grid');
        const gridRadius = 4;
        const hexPositions = this.hexCalculator.generateHexGrid({ q: 0, r: 0 }, gridRadius);

        for (const hexPos of hexPositions) {
          const pixelPos = this.hexCalculator.axialToPixel(
            hexPos.q, 
            hexPos.r, 
            scaledHexRadius, 
            gridCenter
          );

          if (this.isPositionValid(pixelPos, imageElement)) {
            const confidence = this.calculatePositionConfidence(imageElement, pixelPos, scaledHexRadius);
            
            // Only add positions with reasonable confidence
            if (confidence > 0.3) {
              const modName = this.getModNameForPosition(hexPos);
              if (modName) {
                const hexBounds = this.hexCalculator.getHexBounds(
                  pixelPos.x, 
                  pixelPos.y, 
                  scaledHexRadius
                );

                const coordData = new CoordinateData(
                  modName,
                  pixelPos,
                  hexBounds,
                  hexPos,
                  confidence
                );

                coordinateMap.set(modName, coordData);
              }
            }
          }
        }
      }

      // Validate the coordinate map
      this.validateCoordinateMap(coordinateMap, imageElement, scaleFactor);

      return coordinateMap;
    }

    /**
     * Calculate confidence for a position based on image analysis
     */
    calculatePositionConfidence(imageElement, pixelPos, hexRadius) {
      // Create a temporary canvas for analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const analysisSize = hexRadius * 3;
      
      canvas.width = analysisSize;
      canvas.height = analysisSize;
      
      // Extract the region around the position
      try {
        ctx.drawImage(
          imageElement,
          pixelPos.x - analysisSize / 2,
          pixelPos.y - analysisSize / 2,
          analysisSize,
          analysisSize,
          0,
          0,
          analysisSize,
          analysisSize
        );

        const imageData = ctx.getImageData(0, 0, analysisSize, analysisSize);
        
        // Analyze various factors
        const colorConsistency = this.analyzeColorConsistency(imageData);
        const edgeStrength = this.analyzeEdgeStrength(imageData);
        const gameElementLikelihood = this.analyzeGameElementLikelihood(imageData);
        
        // Combine factors for overall confidence
        const confidence = (colorConsistency * 0.3 + edgeStrength * 0.4 + gameElementLikelihood * 0.3);
        
        return Math.max(0, Math.min(1, confidence));
      } catch (error) {
        // If analysis fails, return moderate confidence
        return 0.6;
      }
    }

    /**
     * Add neighbor information for validation
     */
    addNeighborInformation(coordData, modPositions, scaledHexRadius, gridCenter) {
      const currentPos = coordData.gridPosition;
      const neighbors = [
        { q: currentPos.q + 1, r: currentPos.r },
        { q: currentPos.q - 1, r: currentPos.r },
        { q: currentPos.q, r: currentPos.r + 1 },
        { q: currentPos.q, r: currentPos.r - 1 },
        { q: currentPos.q + 1, r: currentPos.r - 1 },
        { q: currentPos.q - 1, r: currentPos.r + 1 }
      ];

      coordData.neighbors = neighbors.map(neighbor => {
        // Find mod at neighbor position
        const neighborMod = Object.entries(modPositions).find(([name, data]) => 
          data.q === neighbor.q && data.r === neighbor.r
        );

        if (neighborMod) {
          const [neighborName, neighborData] = neighborMod;
          const neighborPixel = this.hexCalculator.axialToPixel(
            neighbor.q, neighbor.r, scaledHexRadius, gridCenter
          );
          
          return {
            modName: neighborName,
            gridPosition: neighbor,
            pixelPosition: neighborPixel,
            distance: this.hexCalculator.hexDistance(currentPos, neighbor)
          };
        }
        
        return null;
      }).filter(n => n !== null);
    }

    /**
     * Validate the entire coordinate map for consistency
     */
    validateCoordinateMap(coordinateMap, imageElement, scaleFactor) {
      const validationResults = {
        totalPositions: coordinateMap.size,
        highConfidencePositions: 0,
        mediumConfidencePositions: 0,
        lowConfidencePositions: 0,
        averageConfidence: 0,
        positionAccuracy: 0
      };

      let totalConfidence = 0;
      let accuratePositions = 0;

      for (const [modName, coordData] of coordinateMap) {
        totalConfidence += coordData.confidence;
        
        if (coordData.confidence > 0.8) {
          validationResults.highConfidencePositions++;
        } else if (coordData.confidence > 0.5) {
          validationResults.mediumConfidencePositions++;
        } else {
          validationResults.lowConfidencePositions++;
        }

        // Validate position against neighbors
        if (this.validatePositionAgainstNeighbors(coordData, coordinateMap)) {
          accuratePositions++;
        }
      }

      validationResults.averageConfidence = totalConfidence / coordinateMap.size;
      validationResults.positionAccuracy = accuratePositions / coordinateMap.size;

      // Log validation results
      console.log('Coordinate Map Validation:', validationResults);

      // Warn if accuracy is below specification
      if (validationResults.positionAccuracy < 0.95) {
        console.warn(`Position accuracy ${(validationResults.positionAccuracy * 100).toFixed(1)}% is below required 95%`);
      }

      return validationResults;
    }

    /**
     * Validate position against its neighbors
     */
    validatePositionAgainstNeighbors(coordData, coordinateMap) {
      if (!coordData.neighbors || coordData.neighbors.length === 0) {
        return true; // Can't validate without neighbors
      }

      let validNeighbors = 0;
      
      for (const neighbor of coordData.neighbors) {
        const neighborCoord = coordinateMap.get(neighbor.modName);
        if (neighborCoord) {
          const expectedDistance = neighbor.distance * this.referenceData.metadata.hexDiameter;
          const actualDistance = Math.sqrt(
            Math.pow(coordData.centerPoint.x - neighborCoord.centerPoint.x, 2) +
            Math.pow(coordData.centerPoint.y - neighborCoord.centerPoint.y, 2)
          );
          
          const distanceError = Math.abs(actualDistance - expectedDistance) / expectedDistance;
          if (distanceError < 0.1) { // 10% tolerance
            validNeighbors++;
          }
        }
      }

      return coordData.neighbors.length > 0 ? (validNeighbors / coordData.neighbors.length) > 0.7 : true;
    }

    /**
     * Enhanced helper methods for image analysis
     */
    analyzeColorConsistency(imageData) {
      // Analyze if the region has consistent game-like colors
      const data = imageData.data;
      const colors = [];
      
      for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
        colors.push({
          r: data[i],
          g: data[i + 1],
          b: data[i + 2]
        });
      }
      
      if (colors.length === 0) return 0;
      
      const colorVariance = this.calculateColorVariance(colors);
      
      // Game elements typically have moderate color variance
      const idealVariance = 800;
      const varianceScore = 1 - Math.abs(colorVariance - idealVariance) / idealVariance;
      
      return Math.max(0, Math.min(1, varianceScore));
    }

    analyzeEdgeStrength(imageData) {
      // Use simplified edge detection
      const edges = this.sobelEdgeDetection(imageData);
      const totalEdgeStrength = edges.reduce((sum, edge) => sum + edge, 0);
      const averageEdgeStrength = totalEdgeStrength / edges.length;
      
      // Normalize edge strength (game elements should have moderate edges)
      return Math.min(1, averageEdgeStrength / 100);
    }

    analyzeGameElementLikelihood(imageData) {
      // Analyze if this looks like a Nova Drift game element
      const data = imageData.data;
      let gameFeatures = 0;
      let totalSamples = 0;
      
      // Check for typical game colors and patterns
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        // Nova Drift tends to have blues, purples, and bright accents
        if ((b > r && b > g) || // Blue-ish
            (r > 200 && g > 200 && b > 200) || // Bright highlights
            (brightness > 50 && brightness < 200)) { // Moderate brightness
          gameFeatures++;
        }
        totalSamples++;
      }
      
      return totalSamples > 0 ? gameFeatures / totalSamples : 0;
    }

    /**
     * Check if a pixel position is within image bounds
     */
    isPositionValid(pixelPos, imageElement) {
      return pixelPos.x >= 0 && 
             pixelPos.x < imageElement.naturalWidth &&
             pixelPos.y >= 0 && 
             pixelPos.y < imageElement.naturalHeight;
    }

    /**
     * Get mod name for a hex position using actual mod position data
     */
    getModNameForPosition(hexPos) {
      // Use the mod position reference data if available
      if (global.NovaModPositions && global.NovaModPositions.ModPositionHelper) {
        const modData = global.NovaModPositions.ModPositionHelper.getModAtPosition(hexPos.q, hexPos.r);
        return modData ? modData.name : null;
      }
      
      // Fallback for testing
      if (hexPos.q === 0 && hexPos.r === 0) return "DefaultWeapon";
      return null; // Return null for positions without mods
    }

    /**
     * Calculate bounding box containing all detected hex positions
     */
    calculateBoundingBox(coordinateMap) {
      if (coordinateMap.size === 0) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
      }

      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      for (const coordData of coordinateMap.values()) {
        const bounds = coordData.hexBounds;
        minX = Math.min(minX, bounds.left);
        minY = Math.min(minY, bounds.top);
        maxX = Math.max(maxX, bounds.right);
        maxY = Math.max(maxY, bounds.bottom);
      }

      return {
        left: minX,
        top: minY,
        right: maxX,
        bottom: maxY
      };
    }

    /**
     * Extract reference points for calibration
     */
    extractReferencePoints(scaleResult) {
      return [
        { x: 0, y: 0, type: 'gridCenter', confidence: scaleResult.confidence }
      ];
    }
  }

  // Initialize grid mapping when Phase 1 is complete
  document.addEventListener('screenshot-ready', async (event) => {
    console.log('Phase 2: Starting grid mapping...', event.detail);
    
    try {
      // Create image element from uploaded file
      const imageElement = new Image();
      
      await new Promise((resolve, reject) => {
        imageElement.onload = resolve;
        imageElement.onerror = reject;
        imageElement.src = event.detail.metadata.dataUrl;
      });

      // Create grid mapper and process the image
      const gridMapper = new GridMapper();
      const mappingResult = await gridMapper.mapScreenshot(imageElement);
      
      console.log('Phase 2: Grid mapping completed successfully', mappingResult);
      
      // Update UI with results
      updateGridMappingUI(mappingResult);
      
    } catch (error) {
      console.error('Phase 2: Grid mapping failed', error);
      
      // Dispatch error event
      document.dispatchEvent(new CustomEvent('grid-mapping-error', {
        detail: {
          error: error.message,
          phase: 2
        }
      }));
    }
  });

  /**
   * Update the UI with grid mapping results
   */
  function updateGridMappingUI(mappingResult) {
    const resultsPanel = document.getElementById('grid-mapping-results');
    if (!resultsPanel) return;

    // Show the results panel
    resultsPanel.style.display = 'block';

    // Update basic metrics
    document.getElementById('detected-scale').textContent = mappingResult.scalingFactor.toFixed(3);
    document.getElementById('mapping-confidence').textContent = (mappingResult.confidence * 100).toFixed(1) + '%';
    document.getElementById('grid-center').textContent = 
      `(${Math.round(mappingResult.gridMetadata.gridCenter.x)}, ${Math.round(mappingResult.gridMetadata.gridCenter.y)})`;
    document.getElementById('mods-detected-count').textContent = mappingResult.coordinateMap.size;
    document.getElementById('detected-resolution').textContent = 
      `${mappingResult.gridMetadata.resolution.width}x${mappingResult.gridMetadata.resolution.height}`;
    document.getElementById('hex-radius').textContent = mappingResult.gridMetadata.hexRadius.toFixed(1) + 'px';

    // Update detected mods list
    const modsList = document.getElementById('detected-mods');
    modsList.innerHTML = '';

    if (mappingResult.coordinateMap.size > 0) {
      const mods = Array.from(mappingResult.coordinateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b));

      mods.forEach(([modName, coordData]) => {
        const modItem = document.createElement('span');
        modItem.className = 'mod-item';
        modItem.textContent = modName;
        modItem.title = `Position: (${coordData.gridPosition.q}, ${coordData.gridPosition.r}), Confidence: ${(coordData.confidence * 100).toFixed(1)}%`;
        modsList.appendChild(modItem);
      });
    } else {
      modsList.innerHTML = '<em>No mods detected</em>';
    }

    // Set up event handlers for buttons
    const testButton = document.getElementById('test-grid-mapping');
    const hideButton = document.getElementById('hide-grid-results');

    testButton.onclick = () => {
      if (global.NovaGridMapperTests && global.NovaGridMapperTests.TestRunner) {
        global.NovaGridMapperTests.TestRunner.runQuickTests();
      } else {
        console.warn('Grid mapping tests not available');
      }
    };

    hideButton.onclick = () => {
      resultsPanel.style.display = 'none';
    };
  }

  // Export for testing and external access
  global.NovaGridMapper = {
    GridMapper,
    HexCalculator,
    ScaleDetector,
    CoordinateData,
    REFERENCE_DATA,
    SUPPORTED_RESOLUTIONS
  };

})(typeof window !== 'undefined' ? window : global);
