/**
 * Nova Drift Two-Zone Grid Mapping System
 * Handles the dual-layout architecture of Nova Drift builds
 * 
 * Zone 1: Core Upgrades (Body, Shield, Weapon) - Fixed triangular positions
 * Zone 2: Regular Mods - 4-wide hexagonal honeycomb grid
 */

(function(global) {
  'use strict';

  // Core upgrade types and their fixed relative positions
  const CORE_UPGRADES = {
    BODY: { 
      type: 'body', 
      relativePos: { x: -60, y: -40 }, // Top-left
      displayName: 'Body'
    },
    SHIELD: { 
      type: 'shield', 
      relativePos: { x: 60, y: -40 },  // Top-right
      displayName: 'Shield'
    },
    WEAPON: { 
      type: 'weapon', 
      relativePos: { x: 0, y: 20 },    // Center, offset down
      displayName: 'Weapon'
    }
  };

  // Zone configuration
  const ZONE_CONFIG = {
    coreZone: {
      // Relative to grid center, these define the core upgrade area
      topBoundary: -80,
      bottomBoundary: 50,
      upgrades: ['body', 'shield', 'weapon']
    },
    zoneSeparation: {
      // Gap between core and regular zones
      minGapHeight: 30,
      typicalGapHeight: 50,
      maxGapHeight: 80
    },
    regularZone: {
      // 4-wide hexagonal grid configuration
      gridWidth: 4,
      hexRadius: 24,
      hexDiameter: 48,
      rowSpacing: 42, // Vertical spacing between hex rows
      columnSpacing: 36, // Horizontal spacing between hex columns
      startOffsetY: 100 // Offset from grid center to first regular row
    }
  };

  /**
   * Two-Zone Coordinate Data Structure
   */
  class TwoZoneCoordinateData {
    constructor(modName, zone, centerPoint, bounds, gridPosition, confidence = 1.0) {
      this.modName = modName;
      this.zone = zone; // 'core' or 'regular'
      this.centerPoint = centerPoint;
      this.bounds = bounds;
      this.gridPosition = gridPosition; // null for core, {q,r} for regular
      this.confidence = confidence;
      this.neighbors = [];
    }
  }

  /**
   * Zone Detection Algorithm
   */
  class ZoneDetector {
    constructor(config) {
      this.config = config;
    }

    /**
     * Detect the boundary between core and regular zones
     */
    async detectZoneBoundary(canvas, gridCenter, scaleFactor) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Expected positions for zone separation
      const coreBottom = gridCenter.y + (this.config.coreZone.bottomBoundary * scaleFactor);
      const regularTop = gridCenter.y + (this.config.regularZone.startOffsetY * scaleFactor);
      
      // Scan for horizontal gap between expected positions
      let maxGapStart = 0;
      let maxGapSize = 0;
      let currentGapStart = 0;
      let inGap = false;
      
      for (let y = Math.max(0, coreBottom - 20); y < Math.min(canvas.height, regularTop + 20); y++) {
        const isEmptyRow = this.isRowEmpty(imageData, y, canvas.width);
        
        if (isEmptyRow && !inGap) {
          currentGapStart = y;
          inGap = true;
        } else if (!isEmptyRow && inGap) {
          const gapSize = y - currentGapStart;
          if (gapSize > maxGapSize) {
            maxGapSize = gapSize;
            maxGapStart = currentGapStart;
          }
          inGap = false;
        }
      }
      
      // Handle case where gap extends to edge
      if (inGap) {
        const gapSize = regularTop - currentGapStart;
        if (gapSize > maxGapSize) {
          maxGapSize = gapSize;
          maxGapStart = currentGapStart;
        }
      }
      
      // Validate the detected gap
      const expectedGapHeight = this.config.zoneSeparation.typicalGapHeight * scaleFactor;
      const gapConfidence = this.calculateGapConfidence(maxGapSize, expectedGapHeight);
      
      return {
        boundaryY: maxGapStart + (maxGapSize / 2),
        gapSize: maxGapSize,
        confidence: gapConfidence,
        coreZoneBottom: maxGapStart,
        regularZoneTop: maxGapStart + maxGapSize
      };
    }

    /**
     * Check if a row is empty (no significant content)
     */
    isRowEmpty(imageData, y, width) {
      const data = imageData.data;
      const rowStart = y * width * 4;
      const rowEnd = rowStart + (width * 4);
      
      let totalBrightness = 0;
      let pixelCount = 0;
      const threshold = 20; // Brightness threshold for "empty"
      
      for (let i = rowStart; i < rowEnd && i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > threshold) {
          totalBrightness += brightness;
          pixelCount++;
        }
      }
      
      // Row is considered empty if less than 5% of pixels are above threshold
      return pixelCount < (width * 0.05);
    }

    /**
     * Calculate confidence in detected gap
     */
    calculateGapConfidence(detectedGapSize, expectedGapSize) {
      if (detectedGapSize === 0) return 0;
      
      const ratio = detectedGapSize / expectedGapSize;
      const minRatio = this.config.zoneSeparation.minGapHeight / this.config.zoneSeparation.typicalGapHeight;
      const maxRatio = this.config.zoneSeparation.maxGapHeight / this.config.zoneSeparation.typicalGapHeight;
      
      if (ratio >= minRatio && ratio <= maxRatio) {
        // Within expected range, calculate confidence based on closeness to typical
        const deviation = Math.abs(1 - ratio);
        return Math.max(0, 1 - deviation);
      }
      
      return 0; // Outside expected range
    }

    /**
     * Identify which zone a pixel position belongs to
     */
    identifyZone(pixelY, zoneBoundary, gridCenter, scaleFactor) {
      const coreTop = gridCenter.y + (this.config.coreZone.topBoundary * scaleFactor);
      const coreBottom = zoneBoundary.coreZoneBottom;
      const regularTop = zoneBoundary.regularZoneTop;
      
      if (pixelY >= coreTop && pixelY <= coreBottom) {
        return { zone: 'core', confidence: 1.0 };
      } else if (pixelY >= regularTop) {
        return { zone: 'regular', confidence: 1.0 };
      } else {
        // In the gap or above core zone
        return { zone: 'unknown', confidence: 0.0 };
      }
    }
  }

  /**
   * Core Zone Mapper - Handles the 3 fixed core upgrades
   */
  class CoreZoneMapper {
    constructor(config) {
      this.config = config;
      this.corePositions = CORE_UPGRADES;
    }

    /**
     * Map core upgrade positions
     */
    mapCoreUpgrades(gridCenter, scaleFactor, canvas) {
      const coordinateMap = new Map();
      
      for (const [key, upgrade] of Object.entries(this.corePositions)) {
        const pixelPos = {
          x: gridCenter.x + (upgrade.relativePos.x * scaleFactor),
          y: gridCenter.y + (upgrade.relativePos.y * scaleFactor)
        };
        
        // Validate position is within canvas
        if (this.isValidPosition(pixelPos, canvas)) {
          const bounds = this.calculateBounds(pixelPos, scaleFactor);
          const confidence = this.calculateCoreConfidence(pixelPos, canvas, scaleFactor);
          
          const coordData = new TwoZoneCoordinateData(
            upgrade.displayName,
            'core',
            pixelPos,
            bounds,
            null, // Core upgrades don't use grid coordinates
            confidence
          );
          
          coordinateMap.set(upgrade.type, coordData);
        }
      }
      
      return coordinateMap;
    }

    /**
     * Calculate bounds for a core upgrade
     */
    calculateBounds(center, scaleFactor) {
      const radius = this.config.regularZone.hexRadius * scaleFactor;
      return {
        left: center.x - radius,
        right: center.x + radius,
        top: center.y - radius,
        bottom: center.y + radius
      };
    }

    /**
     * Calculate confidence for core position detection
     */
    calculateCoreConfidence(position, canvas, scaleFactor) {
      const ctx = canvas.getContext('2d');
      const radius = this.config.regularZone.hexRadius * scaleFactor;
      
      try {
        // Sample the area around the expected position
        const sampleSize = Math.floor(radius * 2);
        const imageData = ctx.getImageData(
          Math.max(0, position.x - radius),
          Math.max(0, position.y - radius),
          Math.min(sampleSize, canvas.width - position.x + radius),
          Math.min(sampleSize, canvas.height - position.y + radius)
        );
        
        // Analyze for mod-like characteristics
        const hasContent = this.analyzeModContent(imageData);
        const hasHexShape = this.analyzeHexShape(imageData);
        
        return (hasContent * 0.6 + hasHexShape * 0.4);
      } catch (error) {
        console.warn('Failed to calculate core confidence:', error);
        return 0.5; // Default moderate confidence
      }
    }

    /**
     * Check if position is valid
     */
    isValidPosition(pos, canvas) {
      return pos.x >= 0 && pos.x < canvas.width && 
             pos.y >= 0 && pos.y < canvas.height;
    }

    /**
     * Analyze if region contains mod-like content
     */
    analyzeModContent(imageData) {
      const data = imageData.data;
      let contentPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > 30 && brightness < 230) { // Not pure black or white
          contentPixels++;
        }
        totalPixels++;
      }
      
      const contentRatio = contentPixels / totalPixels;
      return Math.min(1, contentRatio * 2); // Scale up to 1.0
    }

    /**
     * Analyze if region has hexagonal shape characteristics
     */
    analyzeHexShape(imageData) {
      // Simplified hex detection - check for edge patterns
      const edges = this.detectEdges(imageData);
      const hexPattern = this.detectHexPattern(edges, imageData.width, imageData.height);
      return hexPattern;
    }

    /**
     * Simple edge detection
     */
    detectEdges(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      const edges = new Float32Array(width * height);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          // Check horizontal and vertical gradients
          const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
          const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
          const top = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
          const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
          
          const gradient = Math.abs(center - left) + Math.abs(center - right) + 
                          Math.abs(center - top) + Math.abs(center - bottom);
          
          edges[y * width + x] = gradient / 4;
        }
      }
      
      return edges;
    }

    /**
     * Detect hexagonal pattern in edges
     */
    detectHexPattern(edges, width, height) {
      // Look for characteristic hex angles (60-degree patterns)
      let hexScore = 0;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;
      
      // Sample at hex vertices
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const edgeStrength = edges[y * width + x];
          if (edgeStrength > 20) {
            hexScore += 1 / 6;
          }
        }
      }
      
      return hexScore;
    }
  }

  /**
   * Regular Zone Mapper - Handles the 4-wide hexagonal grid
   */
  class RegularZoneMapper {
    constructor(config) {
      this.config = config;
      this.hexCalculator = new HexCalculator();
    }

    /**
     * Map regular mod positions in the 4-wide grid
     */
    mapRegularMods(gridCenter, scaleFactor, zoneBoundary, canvas, modPositions) {
      const coordinateMap = new Map();
      const regularZoneStart = zoneBoundary.regularZoneTop;
      
      // Calculate the starting position for the regular grid
      const gridStartY = regularZoneStart + (this.config.rowSpacing * scaleFactor);
      
      // Generate positions for a 4-wide hexagonal grid
      const maxRows = 10; // Reasonable maximum for Nova Drift
      
      for (let row = 0; row < maxRows; row++) {
        const rowY = gridStartY + (row * this.config.rowSpacing * scaleFactor);
        
        // Check if we're still within the canvas
        if (rowY > canvas.height - (this.config.hexRadius * scaleFactor)) {
          break;
        }
        
        // 4 columns per row in the regular grid
        for (let col = 0; col < this.config.gridWidth; col++) {
          const position = this.calculateRegularPosition(gridCenter, row, col, scaleFactor, gridStartY);
          
          if (this.isValidPosition(position, canvas)) {
            // Convert to axial coordinates for consistency
            const axialCoords = this.calculateAxialCoordinates(row, col);
            
            // Find mod at this position if we have mod data
            const modName = this.findModAtPosition(axialCoords, modPositions);
            
            if (modName || this.shouldIncludeEmptyPosition(position, canvas, scaleFactor)) {
              const bounds = this.calculateBounds(position, scaleFactor);
              const confidence = this.calculateRegularConfidence(position, canvas, scaleFactor);
              
              const coordData = new TwoZoneCoordinateData(
                modName || `empty_${row}_${col}`,
                'regular',
                position,
                bounds,
                axialCoords,
                confidence
              );
              
              coordinateMap.set(modName || `pos_${row}_${col}`, coordData);
            }
          }
        }
      }
      
      return coordinateMap;
    }

    /**
     * Calculate position for a regular grid mod
     */
    calculateRegularPosition(gridCenter, row, col, scaleFactor, gridStartY) {
      const hexWidth = this.config.hexDiameter * scaleFactor * 0.866; // Width of hexagon
      const columnSpacing = this.config.columnSpacing * scaleFactor;
      
      // Calculate horizontal position (4 columns centered)
      const totalWidth = (this.config.gridWidth - 1) * columnSpacing;
      const startX = gridCenter.x - (totalWidth / 2);
      const x = startX + (col * columnSpacing);
      
      // Calculate vertical position
      const y = gridStartY + (row * this.config.rowSpacing * scaleFactor);
      
      // Apply hex offset for odd rows
      const offsetX = (row % 2 === 1) ? (columnSpacing / 2) : 0;
      
      return { x: x + offsetX, y: y };
    }

    /**
     * Convert row/col to axial coordinates
     */
    calculateAxialCoordinates(row, col) {
      // Convert offset coordinates to axial
      const q = col - Math.floor(row / 2);
      const r = row;
      return { q, r };
    }

    /**
     * Find mod at given position from mod data
     */
    findModAtPosition(axialCoords, modPositions) {
      if (!modPositions) return null;
      
      for (const [modName, modData] of Object.entries(modPositions)) {
        if (modData.q === axialCoords.q && modData.r === axialCoords.r) {
          return modName;
        }
      }
      
      return null;
    }

    /**
     * Determine if an empty position should be included
     */
    shouldIncludeEmptyPosition(position, canvas, scaleFactor) {
      // Include positions that show evidence of being valid hex slots
      const ctx = canvas.getContext('2d');
      const radius = this.config.hexRadius * scaleFactor;
      
      try {
        const imageData = ctx.getImageData(
          Math.max(0, position.x - radius),
          Math.max(0, position.y - radius),
          Math.min(radius * 2, canvas.width - position.x + radius),
          Math.min(radius * 2, canvas.height - position.y + radius)
        );
        
        // Check if there's any content suggesting a hex slot
        const hasHexOutline = this.detectHexOutline(imageData);
        return hasHexOutline > 0.3; // 30% confidence threshold
      } catch (error) {
        return false;
      }
    }

    /**
     * Calculate bounds for a regular mod
     */
    calculateBounds(center, scaleFactor) {
      const radius = this.config.hexRadius * scaleFactor;
      return {
        left: center.x - radius,
        right: center.x + radius,
        top: center.y - radius,
        bottom: center.y + radius
      };
    }

    /**
     * Calculate confidence for regular position
     */
    calculateRegularConfidence(position, canvas, scaleFactor) {
      // Similar to core confidence but adjusted for regular grid expectations
      const ctx = canvas.getContext('2d');
      const radius = this.config.hexRadius * scaleFactor;
      
      try {
        const imageData = ctx.getImageData(
          Math.max(0, position.x - radius),
          Math.max(0, position.y - radius),
          Math.min(radius * 2, canvas.width - position.x + radius),
          Math.min(radius * 2, canvas.height - position.y + radius)
        );
        
        const hasContent = this.analyzeModContent(imageData);
        const gridAlignment = this.checkGridAlignment(position, scaleFactor);
        
        return (hasContent * 0.7 + gridAlignment * 0.3);
      } catch (error) {
        return 0.5;
      }
    }

    /**
     * Check if position is valid
     */
    isValidPosition(pos, canvas) {
      return pos.x >= 0 && pos.x < canvas.width && 
             pos.y >= 0 && pos.y < canvas.height;
    }

    /**
     * Analyze mod content (reuse from core mapper)
     */
    analyzeModContent(imageData) {
      const data = imageData.data;
      let contentPixels = 0;
      let totalPixels = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > 30 && brightness < 230) {
          contentPixels++;
        }
        totalPixels++;
      }
      
      return contentPixels / totalPixels;
    }

    /**
     * Check grid alignment quality
     */
    checkGridAlignment(position, scaleFactor) {
      // Positions that align well with expected grid points get higher confidence
      const columnSpacing = this.config.columnSpacing * scaleFactor;
      const rowSpacing = this.config.rowSpacing * scaleFactor;
      
      const xMod = position.x % columnSpacing;
      const yMod = position.y % rowSpacing;
      
      const xAlignment = 1 - (Math.min(xMod, columnSpacing - xMod) / (columnSpacing / 2));
      const yAlignment = 1 - (Math.min(yMod, rowSpacing - yMod) / (rowSpacing / 2));
      
      return (xAlignment + yAlignment) / 2;
    }

    /**
     * Detect hexagonal outline
     */
    detectHexOutline(imageData) {
      // Simplified hex outline detection
      const edges = this.detectEdges(imageData);
      const width = imageData.width;
      const height = imageData.height;
      
      let outlineScore = 0;
      const samples = 12;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 3;
      
      for (let i = 0; i < samples; i++) {
        const angle = (i * 2 * Math.PI) / samples;
        const x = Math.round(centerX + radius * Math.cos(angle));
        const y = Math.round(centerY + radius * Math.sin(angle));
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          if (edges[y * width + x] > 15) {
            outlineScore += 1 / samples;
          }
        }
      }
      
      return outlineScore;
    }

    /**
     * Simple edge detection (reused from core mapper)
     */
    detectEdges(imageData) {
      const width = imageData.width;
      const height = imageData.height;
      const data = imageData.data;
      const edges = new Float32Array(width * height);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
          const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
          const top = (data[idx - width * 4] + data[idx - width * 4 + 1] + data[idx - width * 4 + 2]) / 3;
          const bottom = (data[idx + width * 4] + data[idx + width * 4 + 1] + data[idx + width * 4 + 2]) / 3;
          
          const gradient = Math.abs(center - left) + Math.abs(center - right) + 
                          Math.abs(center - top) + Math.abs(center - bottom);
          
          edges[y * width + x] = gradient / 4;
        }
      }
      
      return edges;
    }
  }

  /**
   * Hexagonal grid calculator (simplified from original)
   */
  class HexCalculator {
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
  }

  /**
   * Main Two-Zone Grid Mapper
   */
  class TwoZoneGridMapper {
    constructor(modData) {
      this.modData = modData || {};
      this.config = ZONE_CONFIG;
      this.zoneDetector = new ZoneDetector(this.config);
      this.coreMapper = new CoreZoneMapper(this.config);
      this.regularMapper = new RegularZoneMapper(this.config);
    }

    /**
     * Map screenshot using two-zone system
     */
    async mapScreenshot(imageElement, scaleFactor, gridCenter) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      ctx.drawImage(imageElement, 0, 0);

      try {
        // Step 1: Detect zone boundary
        console.log('Detecting zone boundary...');
        const zoneBoundary = await this.zoneDetector.detectZoneBoundary(
          canvas, 
          gridCenter, 
          scaleFactor
        );
        
        if (zoneBoundary.confidence < 0.3) {
          console.warn('Low confidence in zone boundary detection:', zoneBoundary.confidence);
        }

        // Step 2: Map core upgrades
        console.log('Mapping core upgrades...');
        const coreCoordinates = this.coreMapper.mapCoreUpgrades(
          gridCenter, 
          scaleFactor, 
          canvas
        );

        // Step 3: Map regular mods
        console.log('Mapping regular mods...');
        const regularCoordinates = this.regularMapper.mapRegularMods(
          gridCenter, 
          scaleFactor, 
          zoneBoundary, 
          canvas,
          this.modData
        );

        // Step 4: Combine results
        const coordinateMap = new Map([...coreCoordinates, ...regularCoordinates]);

        // Step 5: Calculate overall metrics
        const metrics = this.calculateMetrics(coordinateMap, zoneBoundary);

        const result = {
          coordinateMap,
          zoneBoundary,
          metrics,
          gridMetadata: {
            gridCenter,
            scaleFactor,
            coreZone: {
              count: coreCoordinates.size,
              confidence: this.calculateZoneConfidence(coreCoordinates)
            },
            regularZone: {
              count: regularCoordinates.size,
              confidence: this.calculateZoneConfidence(regularCoordinates)
            },
            resolution: {
              width: canvas.width,
              height: canvas.height
            }
          }
        };

        console.log('Two-zone mapping complete:', result);
        return result;

      } catch (error) {
        console.error('Two-zone mapping failed:', error);
        throw new Error(`Two-zone mapping failed: ${error.message}`);
      }
    }

    /**
     * Calculate overall metrics
     */
    calculateMetrics(coordinateMap, zoneBoundary) {
      const metrics = {
        totalMods: coordinateMap.size,
        coreUpgrades: 0,
        regularMods: 0,
        averageConfidence: 0,
        zoneDetectionConfidence: zoneBoundary.confidence
      };

      let totalConfidence = 0;

      for (const coordData of coordinateMap.values()) {
        if (coordData.zone === 'core') {
          metrics.coreUpgrades++;
        } else if (coordData.zone === 'regular') {
          metrics.regularMods++;
        }
        totalConfidence += coordData.confidence;
      }

      metrics.averageConfidence = coordinateMap.size > 0 ? 
        totalConfidence / coordinateMap.size : 0;

      return metrics;
    }

    /**
     * Calculate average confidence for a zone
     */
    calculateZoneConfidence(zoneMap) {
      if (zoneMap.size === 0) return 0;
      
      let total = 0;
      for (const coordData of zoneMap.values()) {
        total += coordData.confidence;
      }
      
      return total / zoneMap.size;
    }

    /**
     * Get coordinate data for a specific mod
     */
    getModCoordinates(modName) {
      // This would be implemented when integrated with the full system
      return null;
    }

    /**
     * Validate the mapping result
     */
    validateMapping(mappingResult) {
      const validation = {
        hasCore: mappingResult.metrics.coreUpgrades > 0,
        hasRegular: mappingResult.metrics.regularMods > 0,
        coreComplete: mappingResult.metrics.coreUpgrades === 3,
        confidenceAcceptable: mappingResult.metrics.averageConfidence > 0.6,
        zoneDetectionGood: mappingResult.metrics.zoneDetectionConfidence > 0.5
      };

      validation.isValid = validation.hasCore && validation.hasRegular && 
                          validation.confidenceAcceptable && validation.zoneDetectionGood;

      return validation;
    }
  }

  // Export for use
  global.TwoZoneGridMapper = {
    TwoZoneGridMapper,
    TwoZoneCoordinateData,
    ZoneDetector,
    CoreZoneMapper,
    RegularZoneMapper,
    ZONE_CONFIG,
    CORE_UPGRADES
  };

})(typeof window !== 'undefined' ? window : global);