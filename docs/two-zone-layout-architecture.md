# Two-Zone Layout Architecture - Critical Issue

## Problem Statement

The current grid mapping system (`grid-mapper.js`) assumes Nova Drift uses a uniform hexagonal grid for all modifications. However, analysis of actual game screenshots reveals Nova Drift uses a **two-zone layout system** with fundamentally different positioning rules for core upgrades versus regular modifications.

## Current (Incorrect) Assumption

```javascript
// Current grid-mapper.js assumes all mods follow same hexagonal grid pattern
const modPosition = hexCalculator.axialToPixel(q, r, hexRadius, gridCenter);
```

## Actual Nova Drift Layout

### Visual Representation
```
Zone 1: Core Upgrades (3 mods)
┌─────────────────────────┐
│  ⬡   ⬡                 │  <- Body (left), Shield (right)
│     ⬡                  │  <- Weapon (center, offset down)
│                        │
├─────────────────────────┤  <- Clear separation gap
│                        │
│  Zone 2: Regular Mods  │
│  ⬡ ⬡ ⬡ ⬡              │  <- 4-wide honeycomb grid
│  ⬡ ⬡ ⬡ ⬡              │  <- Mathematical hex pattern
│  ⬡ ⬡ ⬡ ⬡              │  <- All non-core modifications
│  ⬡ ⬡ ⬡ ⬡              │
└─────────────────────────┘
```

### Zone 1: Core Upgrades
- **Count**: Exactly 3 modifications
- **Types**: Body, Shield, Weapon
- **Layout**: Triangular arrangement, NOT on hex grid
- **Positioning**: Custom offsets, not mathematically calculable
- **Characteristics**:
  - Body: Top-left position
  - Shield: Top-right position  
  - Weapon: Center position with downward offset
  - Forms a triangle pattern
  - Cannot use axial coordinates

### Zone 2: Regular Modifications
- **Count**: All other mods (dozens)
- **Layout**: Perfect 4-wide hexagonal honeycomb
- **Positioning**: Mathematical hex grid with axial coordinates
- **Characteristics**:
  - Consistent spacing
  - Regular pattern
  - Can use (q,r) axial coordinate system
  - 4 hexagons per row maximum

### Zone Separation
- **Gap**: Clear vertical space between zones
- **Purpose**: Visual hierarchy in game UI
- **Detection**: Can identify by scanning for empty horizontal band

## Impact on Current Implementation

### Files Affected
1. **`grid-mapper.js`** - Complete redesign needed
2. **`recognition-engine.js`** - Must handle dual zones
3. **`pattern-matcher.js`** - Different algorithms per zone
4. Any coordinate calculation code

### Current Bugs This Causes
1. Core upgrades mapped to wrong positions
2. Regular mods near top miscalculated
3. Recognition confidence scores incorrect
4. Failed matches for core upgrades

## Proposed Solution

### 1. Dual Coordinate System

```javascript
class DualZoneMapper {
  constructor() {
    this.corePositions = {
      'body': { x: -100, y: -50 },    // Relative to center
      'shield': { x: 100, y: -50 },   // Relative to center
      'weapon': { x: 0, y: 0 }         // Relative to center
    };
    
    this.regularGridConfig = {
      hexRadius: 24,
      gridWidth: 4,
      startOffset: { x: 0, y: 150 }  // Below core zone
    };
  }
  
  getModPosition(modType, modIndex) {
    if (this.isCoreUpgrade(modType)) {
      return this.getCorePosition(modType);
    } else {
      return this.getRegularPosition(modIndex);
    }
  }
}
```

### 2. Zone Detection Algorithm

```javascript
function detectZoneBoundary(canvas) {
  // Scan for horizontal gap between zones
  const gapThreshold = 50; // pixels
  let maxGap = 0;
  let boundaryY = 0;
  
  for (let y = 100; y < canvas.height / 2; y++) {
    const rowEmpty = isRowEmpty(canvas, y);
    if (rowEmpty) {
      // Track continuous empty rows
      let gapSize = 1;
      while (isRowEmpty(canvas, y + gapSize)) {
        gapSize++;
      }
      if (gapSize > maxGap) {
        maxGap = gapSize;
        boundaryY = y + gapSize / 2;
      }
    }
  }
  
  return boundaryY;
}
```

### 3. Updated Recognition Flow

```javascript
class ZoneAwareRecognitionEngine {
  async recognizeMods(screenshot) {
    // Step 1: Detect zone boundary
    const boundary = detectZoneBoundary(screenshot);
    
    // Step 2: Process core zone with template matching
    const coreMods = await this.recognizeCoreZone(screenshot, boundary);
    
    // Step 3: Process regular zone with grid mapping
    const regularMods = await this.recognizeRegularZone(screenshot, boundary);
    
    // Step 4: Combine results
    return [...coreMods, ...regularMods];
  }
}
```

## Implementation Priority

This is a **CRITICAL BLOCKER** for Phase 1 because:
1. Recognition accuracy will be near 0% without this fix
2. Core upgrades are the most important mods to identify
3. All subsequent features depend on accurate position mapping
4. Cannot proceed with manual crop → recognition pipeline

## Testing Requirements

### Unit Tests Needed
1. Core position template accuracy
2. Zone boundary detection with various screenshots
3. Regular grid calculations with 4-wide constraint
4. Scaling behavior for different resolutions

### Integration Tests
1. Full screenshot → dual zone mapping
2. Recognition accuracy per zone
3. Edge cases (missing mods, partial builds)

## Timeline Impact

- **Original estimate**: Assumed uniform grid (2-3 days)
- **Revised estimate**: Dual zone system (3-4 days)
- **Additional time**: +1-2 days for complexity
- **Risk**: High - fundamental architecture change

## Success Criteria

1. Core upgrades detected at correct positions (>95% accuracy)
2. Regular mods mapped to correct grid positions (>90% accuracy)
3. Zone boundary detection works across all resolutions
4. Performance remains under 2 seconds total processing

## Next Steps

1. Create test dataset with labeled core/regular zones
2. Implement core position templates
3. Build zone boundary detection
4. Refactor grid mapper for dual system
5. Update recognition engine
6. Comprehensive testing with Phase 0 dataset