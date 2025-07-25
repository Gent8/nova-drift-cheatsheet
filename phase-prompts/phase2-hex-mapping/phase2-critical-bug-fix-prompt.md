# Phase 2 Critical Bug Fix Prompt

## 🎯 Mission
You are tasked with completing the Phase 2 implementation of the Nova Drift screenshot recognition system. While significant progress has been made, critical functionality gaps remain that prevent the system from achieving its stated goals. Your job is to identify and fix these issues to make Phase 2 fully functional.

## 📋 Pre-Work Analysis Required

**BEFORE writing any code, you must:**

1. **Read the Original Phase 2 Plan**: 
   - Read `prompts/02-phase2-hex-mapping.md` to understand the original requirements
   - Understand the success criteria and technical specifications

2. **Analyze Current Implementation**:
   - Review `docs/grid-mapper.js` - the main implementation file (1746 lines)
   - Review `docs/real-world-validation.js` - validation framework (416 lines)  
   - Review `docs/enhanced-grid-mapping-tests.js` - test suite (640 lines)
   - Review `docs/phase2-demo.js` - demo system (307 lines)

3. **Study the Completion Report**:
   - Read `docs/phase2-completion-report.md` to understand what was claimed to be fixed
   - Compare claims against actual code implementation

## 🚨 Known Critical Issues to Fix

Based on code analysis, these specific issues need to be addressed:

### 1. **Template Matching Scale Detection (CRITICAL)**

**Location**: `docs/grid-mapper.js`, lines ~631-637

**Problem**: Template matching is claimed as implemented but contains only placeholders:

```javascript
async loadHexTemplate() {
  // Placeholder for hex template loading
  return null;
}

performTemplateMatching(ctx, template, canvas) {
  // Placeholder for template matching algorithm
  return [];
}
```

**Required Fix**: 
- Implement actual hex template loading from `docs/hex.png` 
- Implement template matching algorithm using cross-correlation
- Ensure it properly detects hex sprites and calculates scale factors
- Return proper confidence scores

### 2. **Grid Center Offset Detection (CRITICAL)**

**Location**: `docs/grid-mapper.js`, lines ~1253-1267

**Problem**: Offset detection methods return hardcoded values:

```javascript
detectHorizontalOffset(canvas) {
  // Detect horizontal offset by looking for dark regions on left/right
  // This is a simplified implementation
  return 0;
}

detectVerticalOffset(canvas) {
  // Detect vertical offset by looking for dark regions on top/bottom
  // This is a simplified implementation
  return 0;
}

detectUIOffset(canvas, scaleResult) {
  // Detect offset caused by UI elements
  // This is a simplified implementation
  return { x: 0, y: 0 };
}
```

**Required Fix**:
- Implement actual horizontal offset detection by analyzing edge pixels
- Implement actual vertical offset detection by analyzing letterboxing
- Implement UI offset detection by finding Nova Drift UI chrome
- Use actual image analysis, not hardcoded returns

### 3. **Missing Helper Methods (HIGH PRIORITY)**

**Problem**: Several methods are referenced but not implemented:

- `calculateUIBounds(uiFeatures)` - referenced in `detectCenterByUIElements()`
- `scoreHexPatternDensity(ctx, x, y, hexRadius)` - referenced in `detectCenterByHexPattern()`
- `calculateSymmetryMap(imageData, canvas)` - referenced in `detectCenterBySymmetry()`
- `findMaxSymmetryPoint(symmetryMap)` - referenced in `detectCenterBySymmetry()`

**Required Fix**: Implement these missing methods with proper algorithms.

## 🎯 Success Criteria

Your implementation is complete when:

✅ **Template Matching Works**: 
- Loads actual hex template from filesystem/embedded data
- Performs actual template matching with proper confidence scores
- Integrates properly with scale detection pipeline

✅ **Grid Center Offset Detection Works**:
- Detects actual horizontal offsets (pillarboxing, UI chrome)
- Detects actual vertical offsets (letterboxing, UI bars)
- Returns meaningful offset values based on image analysis

✅ **All Helper Methods Implemented**:
- UI bounds calculation works with actual geometric analysis
- Hex pattern density scoring uses actual pattern recognition
- Symmetry analysis uses actual image symmetry calculations

✅ **Integration Testing Passes**:
- Template matching integrates with scale detection
- Offset detection integrates with grid center detection
- All methods work together in the complete pipeline

✅ **Real-World Validation**:
- Run the existing validation framework to verify >90% accuracy
- Ensure processing time stays under 2 seconds
- Validate against the existing test suite

## 🔧 Implementation Guidelines

### Template Matching Implementation
```javascript
// Example approach for template matching
async loadHexTemplate() {
  // Option 1: Load from hex.png file
  const template = await this.loadImageFromPath('docs/hex.png');
  return template;
  
  // Option 2: Create synthetic hex template
  const template = this.createSyntheticHexTemplate(48); // 48px diameter
  return template;
}

performTemplateMatching(ctx, template, canvas) {
  // Implement normalized cross-correlation
  // Find all template matches above threshold
  // Calculate scale factors from match sizes
  // Return matches with confidence scores
}
```

### Offset Detection Implementation
```javascript
detectHorizontalOffset(canvas) {
  // Analyze left/right edges for dark regions (pillarboxing)
  // Scan vertical strips on edges
  // Look for consistent dark pixels indicating letterboxing
  // Return actual pixel offset from center
}

detectVerticalOffset(canvas) {
  // Analyze top/bottom edges for dark regions (letterboxing)  
  // Scan horizontal strips on edges
  // Look for UI elements or bars
  // Return actual pixel offset from center
}

detectUIOffset(canvas, scaleResult) {
  // Analyze for Nova Drift UI elements
  // Look for characteristic colors (blues, purples)
  // Find rectangular UI panels
  // Calculate offset from detected UI boundaries
}
```

### Pattern Recognition Implementation
```javascript
scoreHexPatternDensity(ctx, x, y, hexRadius) {
  // Extract region around potential center
  // Count hexagonal edge patterns in area
  // Weight by distance from center
  // Return density score 0-1
}

calculateSymmetryMap(imageData, canvas) {
  // For each potential center point
  // Measure symmetry by comparing pixels across axes
  // Create 2D map of symmetry scores
  // Return symmetry map for analysis
}
```

## 📝 Testing Requirements

After implementing fixes:

1. **Unit Testing**: Ensure each fixed method works in isolation
2. **Integration Testing**: Verify methods work together in the complete pipeline  
3. **Real-World Testing**: Run existing validation framework
4. **Performance Testing**: Ensure processing times meet requirements
5. **Demo Testing**: Verify the demo system works with fixes

## ⚠️ Important Constraints

- **Maintain API Compatibility**: Don't break existing method signatures
- **Preserve Integration**: Keep working with Phase 1 and Phase 3 interfaces
- **Performance**: Don't degrade processing speed significantly
- **Error Handling**: Maintain existing error handling patterns
- **Code Style**: Follow existing code patterns and documentation style

## 🚀 Completion Validation

Your work is complete when:

1. All placeholder methods are replaced with functional implementations
2. Template matching successfully detects hex sprites and scale factors
3. Grid center offset detection returns meaningful values based on image analysis
4. All helper methods are implemented and functional
5. The existing test suite passes
6. Real-world validation shows >90% accuracy
7. Processing times remain under 2 seconds
8. The demo system works without errors

## 📋 Step-by-Step Approach

1. **First**: Fix template matching (highest impact)
2. **Second**: Fix grid center offset detection methods
3. **Third**: Implement missing helper methods  
4. **Fourth**: Test integration and fix any issues
5. **Fifth**: Run validation framework and optimize
6. **Finally**: Update documentation if needed

Remember: The framework is mostly solid - you're filling in critical gaps to make it fully functional. Focus on making the placeholder methods actually work rather than rewriting the entire system.

**Good luck! The Nova Drift community is counting on accurate screenshot recognition!** 🎯
