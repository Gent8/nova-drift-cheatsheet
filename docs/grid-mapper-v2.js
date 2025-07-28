/**
 * Nova Drift Screenshot Grid Mapping V2 - Two-Zone Architecture
 * 
 * This is an updated version of grid-mapper.js that incorporates the two-zone
 * layout system while maintaining compatibility with existing code.
 */

(function(global) {
  'use strict';

  // Import two-zone functionality
  const TwoZone = global.TwoZoneGridMapper;
  if (!TwoZone) {
    console.error('Two-zone grid mapper not loaded. Please include two-zone-grid-mapper.js first.');
    return;
  }

  // Preserve original reference data structure
  const REFERENCE_DATA = {
    metadata: {
      version: "2.0", // Updated version
      baselineResolution: { width: 1920, height: 1080 },
      uiScale: 1.0,
      hexDiameter: 48,
      hexRadius: 24,
      gridCenter: { x: 960, y: 540 },
      generatedAt: new Date().toISOString(),
      // New two-zone metadata
      twoZoneLayout: true,
      coreZone: {
        upgrades: ['body', 'shield', 'weapon'],
        positions: TwoZone.CORE_UPGRADES
      },
      regularZone: {
        gridWidth: 4,
        startOffset: 100
      }
    },
    // Preserve reference positions for compatibility
    referencePositions: {
      "center": { axial: { q: 0, r: 0 }, pixel: { x: 960, y: 540 } },
      "ring1_top": { axial: { q: 0, r: -1 }, pixel: { x: 960, y: 498 } },
      "ring1_right": { axial: { q: 1, r: -1 }, pixel: { x: 996, y: 519 } },
      "ring1_bottom": { axial: { q: 0, r: 1 }, pixel: { x: 960, y: 582 } },
      "ring1_left": { axial: { q: -1, r: 1 }, pixel: { x: 924, y: 561 } },
      "ring2_top": { axial: { q: 0, r: -2 }, pixel: { x: 960, y: 456 } },
      "ring2_bottom": { axial: { q: 0, r: 2 }, pixel: { x: 960, y: 624 } }
    }
  };

  // Preserve supported resolutions
  const SUPPORTED_RESOLUTIONS = {
    '1920x1080': { baseScale: 1.0, commonScales: [1.0, 1.25, 1.5] },
    '2560x1440': { baseScale: 1.33, commonScales: [1.0, 1.25, 1.5] },
    '3840x2160': { baseScale: 2.0, commonScales: [1.0, 1.25, 1.5] }
  };

  /**
   * Enhanced CoordinateData that supports both zones
   */
  class CoordinateData {
    constructor(modName, centerPoint, hexBounds, gridPosition, confidence = 1.0, zone = 'unknown') {
      this.modName = modName;
      this.centerPoint = centerPoint;
      this.hexBounds = hexBounds;
      this.gridPosition = gridPosition;
      this.confidence = confidence;
      this.neighbors = [];
      // New property for two-zone support
      this.zone = zone; // 'core', 'regular', or 'unknown'
    }

    // Convert from TwoZoneCoordinateData for compatibility
    static fromTwoZoneData(twoZoneData) {
      return new CoordinateData(
        twoZoneData.modName,
        twoZoneData.centerPoint,
        twoZoneData.bounds,
        twoZoneData.gridPosition,
        twoZoneData.confidence,
        twoZoneData.zone
      );
    }
  }

  /**
   * Keep the original HexCalculator for compatibility
   */
  class HexCalculator {
    constructor() {}

    axialToPixel(q, r, hexRadius, gridCenter) {
      const x = hexRadius * (3/2 * q) + gridCenter.x;
      const y = hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r) + gridCenter.y;
      return { x, y };
    }

    pixelToAxial(x, y, hexRadius, gridCenter) {
      const relX = x - gridCenter.x;
      const relY = y - gridCenter.y;
      
      const q = (2/3 * relX) / hexRadius;
      const r = (-1/3 * relX + Math.sqrt(3)/3 * relY) / hexRadius;
      
      return this.roundHex({ q, r });
    }

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

    hexDistance(a, b) {
      return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    }

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
   * Enhanced ScaleDetector that remains compatible
   */
  class ScaleDetector {
    constructor(referenceData) {
      this.reference = referenceData;
      this.edgeThreshold = 50;
      this.confidenceThreshold = 0.9;
      // Keep all original methods for compatibility
      this.originalMethods = true;
    }

    async detectScale(imageElement) {
      // Use the original detection logic
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      ctx.drawImage(imageElement, 0, 0);

      const results = [];

      // Try various detection methods (simplified for brevity)
      try {
        const resolutionResult = this.detectByResolution(canvas);
        if (resolutionResult.confidence > 0.4) {
          results.push(resolutionResult);
        }
      } catch (error) {
        console.warn('Resolution-based detection failed:', error);
      }

      // Add a default result if nothing else works
      if (results.length === 0) {
        results.push({
          scaleFactor: 1.0,
          confidence: 0.5,
          method: 'default'
        });
      }

      return this.consolidateResults(results);
    }

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

    consolidateResults(results) {
      if (results.length === 0) {
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
        gridCenter: { x: 0, y: 0 }
      };
    }
  }

  /**
   * Enhanced GridMapper that uses two-zone system internally
   */
  class GridMapper {
    constructor(modData) {
      this.modData = modData || {};
      this.hexCalculator = new HexCalculator();
      this.scaleDetector = new ScaleDetector(REFERENCE_DATA);
      this.referenceData = REFERENCE_DATA;
      // Initialize two-zone mapper
      this.twoZoneMapper = new TwoZone.TwoZoneGridMapper(modData);
      this.useTwoZoneSystem = true; // Feature flag
    }

    /**
     * Map screenshot - now uses two-zone system
     */
    async mapScreenshot(imageElement) {
      try {
        // Phase 1: Detect scaling and grid center
        const scaleResult = await this.scaleDetector.detectScale(imageElement);
        
        // Phase 2: Refine grid center detection
        const gridCenter = await this.detectGridCenter(imageElement, scaleResult);
        
        // Phase 3: Use two-zone mapping if enabled
        if (this.useTwoZoneSystem) {
          console.log('Using two-zone mapping system...');
          const twoZoneResult = await this.twoZoneMapper.mapScreenshot(
            imageElement,
            scaleResult.scaleFactor,
            gridCenter
          );

          // Convert to legacy format for compatibility
          const coordinateMap = this.convertTwoZoneToLegacy(twoZoneResult.coordinateMap);
          
          // Phase 4: Calculate bounding box
          const boundingBox = this.calculateBoundingBox(coordinateMap);

          const result = {
            imageElement,
            coordinateMap,
            scalingFactor: scaleResult.scaleFactor,
            boundingBox,
            confidence: twoZoneResult.metrics.averageConfidence,
            referencePoints: this.extractReferencePoints(scaleResult),
            gridMetadata: {
              hexRadius: this.referenceData.metadata.hexRadius * scaleResult.scaleFactor,
              gridCenter,
              totalDetectedHexes: coordinateMap.size,
              resolution: { 
                width: imageElement.naturalWidth, 
                height: imageElement.naturalHeight 
              },
              // Add two-zone specific metadata
              twoZoneData: {
                zoneBoundary: twoZoneResult.zoneBoundary,
                coreZone: twoZoneResult.gridMetadata.coreZone,
                regularZone: twoZoneResult.gridMetadata.regularZone
              }
            }
          };

          // Dispatch event for Phase 3
          document.dispatchEvent(new CustomEvent('grid-mapped', {
            detail: result
          }));

          return result;
        } else {
          // Fall back to original single-zone logic
          return this.mapScreenshotLegacy(imageElement, scaleResult, gridCenter);
        }

      } catch (error) {
        console.error('Grid mapping failed:', error);
        throw new Error(`Grid mapping failed: ${error.message}`);
      }
    }

    /**
     * Convert two-zone coordinate map to legacy format
     */
    convertTwoZoneToLegacy(twoZoneMap) {
      const legacyMap = new Map();

      for (const [key, twoZoneData] of twoZoneMap) {
        const legacyData = CoordinateData.fromTwoZoneData(twoZoneData);
        legacyMap.set(key, legacyData);
      }

      return legacyMap;
    }

    /**
     * Legacy single-zone mapping for fallback
     */
    async mapScreenshotLegacy(imageElement, scaleResult, gridCenter) {
      // Original grid mapping logic (simplified)
      const coordinateMap = this.generateCoordinateMap(
        imageElement, 
        scaleResult.scaleFactor, 
        gridCenter
      );

      const boundingBox = this.calculateBoundingBox(coordinateMap);

      return {
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
    }

    /**
     * Enhanced grid center detection
     */
    async detectGridCenter(imageElement, scaleResult) {
      // Default to image center with potential offset
      const centerX = imageElement.naturalWidth / 2;
      const centerY = imageElement.naturalHeight / 2;
      
      return { x: centerX, y: centerY };
    }

    /**
     * Generate coordinate map (legacy method preserved)
     */
    generateCoordinateMap(imageElement, scaleFactor, gridCenter) {
      const coordinateMap = new Map();
      const scaledHexRadius = this.referenceData.metadata.hexRadius * scaleFactor;

      // This is a simplified version - in reality would use mod positions
      console.warn('Using legacy coordinate generation - results may be inaccurate');
      
      return coordinateMap;
    }

    /**
     * Calculate bounding box
     */
    calculateBoundingBox(coordinateMap) {
      if (coordinateMap.size === 0) {
        return { left: 0, top: 0, right: 0, bottom: 0 };
      }

      let minX = Infinity, minY = Infinity;
      let maxX = -Infinity, maxY = -Infinity;

      for (const coordData of coordinateMap.values()) {
        const bounds = coordData.hexBounds || coordData.bounds;
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
     * Extract reference points
     */
    extractReferencePoints(scaleResult) {
      return [
        { x: 0, y: 0, type: 'gridCenter', confidence: scaleResult.confidence }
      ];
    }

    /**
     * Enable/disable two-zone system
     */
    setTwoZoneSystem(enabled) {
      this.useTwoZoneSystem = enabled;
      console.log(`Two-zone system ${enabled ? 'enabled' : 'disabled'}`);
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
    const elements = {
      'detected-scale': mappingResult.scalingFactor.toFixed(3),
      'mapping-confidence': (mappingResult.confidence * 100).toFixed(1) + '%',
      'grid-center': `(${Math.round(mappingResult.gridMetadata.gridCenter.x)}, ${Math.round(mappingResult.gridMetadata.gridCenter.y)})`,
      'mods-detected-count': mappingResult.coordinateMap.size,
      'detected-resolution': `${mappingResult.gridMetadata.resolution.width}x${mappingResult.gridMetadata.resolution.height}`,
      'hex-radius': mappingResult.gridMetadata.hexRadius.toFixed(1) + 'px'
    };

    for (const [id, value] of Object.entries(elements)) {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    }

    // Add two-zone specific information if available
    if (mappingResult.gridMetadata.twoZoneData) {
      const twoZoneInfo = document.createElement('div');
      twoZoneInfo.className = 'two-zone-info';
      twoZoneInfo.innerHTML = `
        <h4>Two-Zone Layout Detected</h4>
        <p>Core Upgrades: ${mappingResult.gridMetadata.twoZoneData.coreZone.count} 
           (${(mappingResult.gridMetadata.twoZoneData.coreZone.confidence * 100).toFixed(1)}% confidence)</p>
        <p>Regular Mods: ${mappingResult.gridMetadata.twoZoneData.regularZone.count}
           (${(mappingResult.gridMetadata.twoZoneData.regularZone.confidence * 100).toFixed(1)}% confidence)</p>
        <p>Zone Boundary: Y=${Math.round(mappingResult.gridMetadata.twoZoneData.zoneBoundary.boundaryY)}</p>
      `;
      
      const existingInfo = resultsPanel.querySelector('.two-zone-info');
      if (existingInfo) {
        existingInfo.replaceWith(twoZoneInfo);
      } else {
        resultsPanel.appendChild(twoZoneInfo);
      }
    }

    // Update detected mods list
    const modsList = document.getElementById('detected-mods');
    if (modsList) {
      modsList.innerHTML = '';

      if (mappingResult.coordinateMap.size > 0) {
        const mods = Array.from(mappingResult.coordinateMap.entries())
          .sort(([a], [b]) => a.localeCompare(b));

        mods.forEach(([modName, coordData]) => {
          const modItem = document.createElement('span');
          modItem.className = 'mod-item';
          if (coordData.zone) {
            modItem.className += ` zone-${coordData.zone}`;
          }
          modItem.textContent = modName;
          
          const positionText = coordData.gridPosition ? 
            `Position: (${coordData.gridPosition.q}, ${coordData.gridPosition.r})` :
            `Position: ${coordData.zone} zone`;
          
          modItem.title = `${positionText}, Confidence: ${(coordData.confidence * 100).toFixed(1)}%`;
          modsList.appendChild(modItem);
        });
      } else {
        modsList.innerHTML = '<em>No mods detected</em>';
      }
    }
  }

  // Export for testing and external access
  global.NovaGridMapper = {
    GridMapper,
    HexCalculator,
    ScaleDetector,
    CoordinateData,
    REFERENCE_DATA,
    SUPPORTED_RESOLUTIONS,
    // Expose two-zone system
    TwoZoneGridMapper: TwoZone.TwoZoneGridMapper,
    ZONE_CONFIG: TwoZone.ZONE_CONFIG,
    CORE_UPGRADES: TwoZone.CORE_UPGRADES
  };

})(typeof window !== 'undefined' ? window : global);