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
   * Scale factor detection for different screenshot resolutions and UI scales
   */
  class ScaleDetector {
    constructor(referenceData) {
      this.reference = referenceData;
    }

    /**
     * Detect scaling factor by analyzing hex spacing
     */
    async detectScale(imageElement) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      ctx.drawImage(imageElement, 0, 0);

      const results = [];

      // Try multiple detection methods
      try {
        const gridSpacingResult = await this.detectByGridSpacing(ctx, canvas);
        if (gridSpacingResult.confidence > 0.7) {
          results.push(gridSpacingResult);
        }
      } catch (error) {
        console.warn('Grid spacing detection failed:', error);
      }

      try {
        const resolutionResult = this.detectByResolution(canvas);
        if (resolutionResult.confidence > 0.5) {
          results.push(resolutionResult);
        }
      } catch (error) {
        console.warn('Resolution-based detection failed:', error);
      }

      return this.consolidateResults(results);
    }

    /**
     * Detect scale by analyzing grid spacing patterns
     */
    async detectByGridSpacing(ctx, canvas) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const searchRadius = Math.min(canvas.width, canvas.height) * 0.2;

      // Look for vertical spacing patterns (easier to detect)
      const spacings = this.findVerticalSpacings(ctx, centerX, centerY, searchRadius);
      
      if (spacings.length === 0) {
        throw new Error('No hex spacing patterns found');
      }

      const averageSpacing = spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
      const expectedSpacing = this.reference.metadata.hexDiameter * Math.sqrt(3);
      const scaleFactor = averageSpacing / expectedSpacing;

      return {
        scaleFactor,
        confidence: Math.min(0.9, 1.0 - (spacings.length < 3 ? 0.3 : 0.1)),
        method: 'gridSpacing',
        detectedSpacing: averageSpacing,
        expectedSpacing: expectedSpacing
      };
    }

    /**
     * Find vertical spacing patterns in the image
     */
    findVerticalSpacings(ctx, centerX, centerY, searchRadius) {
      const spacings = [];
      const imageData = ctx.getImageData(
        centerX - searchRadius,
        centerY - searchRadius,
        searchRadius * 2,
        searchRadius * 2
      );

      // Simplified pattern detection - look for regular intervals in brightness
      const columnData = this.extractColumn(imageData, searchRadius, searchRadius * 2);
      const peaks = this.findPeaks(columnData);
      
      for (let i = 1; i < peaks.length; i++) {
        spacings.push(peaks[i] - peaks[i - 1]);
      }

      return spacings.filter(s => s > 20 && s < 200); // Filter reasonable hex spacings
    }

    /**
     * Extract brightness data from a vertical column
     */
    extractColumn(imageData, x, height) {
      const column = [];
      const width = imageData.width;
      
      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const brightness = (imageData.data[index] + imageData.data[index + 1] + imageData.data[index + 2]) / 3;
        column.push(brightness);
      }
      
      return column;
    }

    /**
     * Find peaks in brightness data
     */
    findPeaks(data) {
      const peaks = [];
      const threshold = Math.max(...data) * 0.7; // 70% of max brightness
      
      for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
          peaks.push(i);
        }
      }
      
      return peaks;
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
     * Detect the center of the hex grid in the screenshot
     */
    async detectGridCenter(imageElement, scaleResult) {
      // For now, assume center of image is grid center
      // This can be enhanced with more sophisticated detection
      const centerX = imageElement.naturalWidth / 2;
      const centerY = imageElement.naturalHeight / 2;

      // Apply any offset correction based on detected UI elements
      const offsetCorrection = this.detectCenterOffset(imageElement, scaleResult);
      
      return {
        x: centerX + offsetCorrection.x,
        y: centerY + offsetCorrection.y
      };
    }

    /**
     * Detect offset corrections for grid center
     */
    detectCenterOffset(imageElement, scaleResult) {
      // Placeholder for more sophisticated center detection
      // Could analyze UI elements, borders, etc.
      return { x: 0, y: 0 };
    }

    /**
     * Generate complete coordinate map for all mod positions
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

          // Check if position is within image bounds
          if (this.isPositionValid(pixelPos, imageElement)) {
            const hexBounds = this.hexCalculator.getHexBounds(
              pixelPos.x, 
              pixelPos.y, 
              scaledHexRadius
            );

            const coordData = new CoordinateData(
              modName,
              pixelPos,
              hexBounds,
              { q: modData.q, r: modData.r },
              0.95 // High confidence for known mod positions
            );

            coordinateMap.set(modName, coordData);
          }
        }
      } else {
        // Fallback: generate hex grid positions
        console.warn('Mod position data not available, using generated grid');
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
            const modName = this.getModNameForPosition(hexPos);
            if (modName) { // Only add positions that have actual mods
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
                0.8 // Lower confidence for generated positions
              );

              coordinateMap.set(modName, coordData);
            }
          }
        }
      }

      return coordinateMap;
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
