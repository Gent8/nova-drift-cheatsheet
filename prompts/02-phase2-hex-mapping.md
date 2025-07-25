# Phase 2: Hex Grid Mapping & Coordinate System Implementation

## 🎯 Mission
Create a robust coordinate mapping system that translates pixel coordinates in uploaded screenshots to specific mod positions in the Nova Drift cheatsheet. The system must handle various screenshot resolutions, UI scaling factors, and potential layout variations.

## 📚 Required Reading
**Before starting, read these files to understand the context:**
1. `../implementation/Phase2-HexMapping.md` - Detailed Phase 2 specifications
2. Review Phase 1 implementation for input data structure
3. `../src/` directory - Understand existing mod data structure
4. Study Nova Drift UI screenshots for hex grid patterns

## 🎯 Success Criteria
You must achieve ALL of these before Phase 2 is considered complete:

- ✅ Accurate mapping of screenshot coordinates to mod positions (>95% accuracy)
- ✅ Support for common screenshot resolutions (1920x1080, 2560x1440, 3840x2160)
- ✅ Automatic scaling detection and compensation
- ✅ Robust calibration system for layout changes
- ✅ Integration with existing mod data structure
- ✅ Reference point detection for alignment
- ✅ Error handling for unmappable screenshots

## 🔧 Technical Requirements

### Input from Phase 1
```javascript
// Event received from Phase 1
{
  type: 'screenshot-ready',
  detail: {
    file: File,              // Validated image file
    dimensions: { width: number, height: number },
    metadata: { size: number, type: string, lastModified: number, dataUrl: string }
  }
}
```

### Output for Phase 3
```javascript
// Data structure for Phase 3
{
  type: 'grid-mapped',
  detail: {
    imageElement: HTMLImageElement,    // Loaded image
    coordinateMap: Map<string, CoordinateData>,  // Mod name to pixel coordinates
    scalingFactor: number,             // Detected UI scale
    boundingBox: Rectangle,            // Grid area bounds
    confidence: number,                // Mapping confidence score
    referencePoints: Array<Point>,     // Detected alignment points
    gridMetadata: {
      hexRadius: number,               // Calculated hex size
      gridCenter: Point,               // Center of hex grid
      totalDetectedHexes: number,      // Number of hexes found
      resolution: { width: number, height: number }
    }
  }
}
```

## 🔢 Mathematical Foundation

### Hex Grid Coordinate System
```javascript
// Coordinate data structure for each mod position
interface CoordinateData {
  modName: string;           // From existing mod data
  centerPoint: { x: number, y: number };    // Pixel coordinates
  hexBounds: {               // Bounding box for the hex
    left: number, top: number, 
    right: number, bottom: number
  };
  gridPosition: { q: number, r: number };    // Hex grid coordinates
  confidence: number;        // Detection confidence (0-1)
  neighbors: string[];       // Adjacent mod names
}
```

### Scaling Detection Algorithm
- Detect reference UI elements (buttons, text, icons)
- Calculate scaling factor relative to known baseline
- Apply scaling compensation to all coordinates
- Validate with multiple reference points

## 🎨 Implementation Components

### Core Classes to Implement

#### 1. GridMapper
```javascript
class GridMapper {
  constructor(modData, referenceScreenshots) {
    this.modData = modData;           // From existing cheatsheet
    this.baselineCoordinates = {};    // Reference coordinates
    this.scalingDetector = new ScalingDetector();
    this.hexCalculator = new HexCalculator();
  }
  
  async mapScreenshot(imageElement) {
    // Main mapping logic
  }
}
```

#### 2. ScalingDetector
```javascript
class ScalingDetector {
  detectScaling(imageElement) {
    // Analyze UI elements to determine scale factor
  }
  
  findReferencePoints(imageElement) {
    // Locate known UI elements for alignment
  }
}
```

#### 3. HexCalculator
```javascript
class HexCalculator {
  calculateHexPositions(centerPoint, hexRadius, gridLayout) {
    // Generate hex grid coordinates
  }
  
  pixelToHex(point, hexRadius, gridCenter) {
    // Convert pixel coordinates to hex grid coordinates
  }
}
```

## 🔗 Integration Specifications

### Existing Data Integration
- **Mod Names**: Use existing mod name data from `../src/` files
- **Grid Layout**: Map to existing cheatsheet hex grid structure
- **Categories**: Maintain existing mod categorization
- **Dependencies**: Respect existing mod relationships

### Event Handling
```javascript
// Listen for Phase 1 completion
document.addEventListener('screenshot-ready', async (event) => {
  const gridMapper = new GridMapper(modData);
  const mappingResult = await gridMapper.mapScreenshot(event.detail);
  
  // Dispatch for Phase 3
  document.dispatchEvent(new CustomEvent('grid-mapped', {
    detail: mappingResult
  }));
});
```

## 🔍 Calibration System

### Reference Point Detection
- Detect UI elements: buttons, panels, text labels
- Use multiple reference points for robust alignment
- Handle partial screenshots and cropped images
- Provide confidence scoring for mapping quality

### Multi-Resolution Support
```javascript
const SUPPORTED_RESOLUTIONS = {
  '1920x1080': { baseScale: 1.0, commonScales: [1.0, 1.25, 1.5] },
  '2560x1440': { baseScale: 1.33, commonScales: [1.0, 1.25, 1.5] },
  '3840x2160': { baseScale: 2.0, commonScales: [1.0, 1.25, 1.5] }
};
```

### Adaptive Mapping
- Start with baseline coordinates for known resolutions
- Adjust for detected scaling factors
- Use machine learning principles for pattern recognition
- Fall back to manual calibration if automatic fails

## 🧪 Testing Requirements

### Automated Testing
```javascript
// Test cases to implement
const testCases = [
  {
    name: 'Standard 1920x1080 screenshot',
    input: 'test-screenshots/standard-1080p.png',
    expectedAccuracy: 0.95
  },
  {
    name: '4K screenshot with 150% scaling',
    input: 'test-screenshots/4k-scaled.png',
    expectedAccuracy: 0.90
  },
  {
    name: 'Partial screenshot',
    input: 'test-screenshots/partial-crop.png',
    expectedAccuracy: 0.85
  }
];
```

### Manual Testing Checklist
- [ ] Test with 1920x1080 screenshots at 100% scaling
- [ ] Test with 2560x1440 screenshots at 125% scaling
- [ ] Test with 4K screenshots at various scaling levels
- [ ] Test with cropped/partial screenshots
- [ ] Test with different Nova Drift UI themes (if any)
- [ ] Verify coordinate accuracy against known mod positions
- [ ] Test reference point detection reliability
- [ ] Validate scaling compensation algorithms

## 💡 Implementation Guidance

### Recommended Development Approach
1. **Create baseline coordinate data** for one reference resolution
2. **Implement basic pixel-to-hex mapping** for that resolution
3. **Add scaling detection** using reference UI elements
4. **Test with multiple resolutions** and refine algorithms
5. **Add robustness features** (error handling, confidence scoring)
6. **Optimize performance** for real-time processing

### Libraries to Use
- **Honeycomb.js** (^4.1.5) for hex grid mathematics
- **Native Canvas API** for image analysis
- **Custom algorithms** for UI element detection

### Performance Targets
- **Processing Time**: <1 second for coordinate mapping
- **Memory Usage**: <50MB during mapping process
- **Accuracy**: >95% for standard screenshots, >85% for challenging cases

## 🔧 Code Organization
```
docs/
├── mapping-system/
│   ├── grid-mapper.js         # Main mapping orchestrator
│   ├── scaling-detector.js    # Scale factor detection
│   ├── hex-calculator.js      # Hex grid mathematics
│   ├── reference-data.js      # Baseline coordinates
│   └── mapping-utils.js       # Helper functions
```

## ⚠️ Important Considerations

### Error Handling
- **Invalid screenshots**: Clear error messages for unmappable images
- **Partial coverage**: Handle screenshots that don't show full grid
- **UI changes**: Graceful degradation if Nova Drift UI changes
- **Performance**: Timeout protection for long-running operations

### Accuracy Validation
- **Confidence scoring**: Provide mapping confidence for each hex
- **Visual feedback**: Allow users to verify mapping accuracy
- **Fallback options**: Manual calibration for edge cases
- **Quality metrics**: Track and report mapping success rates

## 🚀 Integration Points for Phase 3

### Prepare for Image Processing
- Ensure coordinate data is properly formatted for region extraction
- Validate hex bounds are accurate for cropping operations
- Provide metadata needed for performance optimization
- Include error states and confidence levels

## 📝 Completion Checklist

Before moving to Phase 3, ensure:
- [ ] All success criteria are met
- [ ] Coordinate mapping accuracy tested and validated
- [ ] Multiple resolution support working
- [ ] Scaling detection functioning properly
- [ ] Integration with existing mod data complete
- [ ] Error handling comprehensive
- [ ] Performance within target ranges
- [ ] Code well-documented and commented
- [ ] Event system properly implemented for Phase 3

**When complete, you're ready for Phase 3: Image Processing & Region Extraction!** 🎉
