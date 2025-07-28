# 01 - Requirements Analysis

## Similar Project Analysis & Research Foundation

### Comparable Web-Based Computer Vision Projects

**1. ppu-ocv - Modern OpenCV.js Image Processing Library (2024)**
- **Repository**: PT-Perkasa-Pilar-Utama/ppu-ocv
- **Key Insights**: 
  - Type-safe, chainable API for image processing workflows
  - Fluent pattern: `processor.grayscale().blur().threshold().toCanvas()`
  - Explicit memory management with `destroy()` methods
  - Separation of concerns: ImageProcessor, CanvasToolkit, Contours classes
- **Applicable Patterns**: 
  - Pipeline processing for our screenshot → recognition workflow
  - Memory cleanup patterns for OpenCV.js objects
  - Modular architecture for different processing stages

**2. OpenCV.js Web Implementation Examples (2018-2019)**
- **theseanything/opencvjs**: WebAssembly-focused image processing demo
- **muzijunyan/opencv.js**: Web application image processing examples  
- **Key Learnings**:
  - WebAssembly requires HTTP serving (security requirement)
  - Emscripten compilation optimizes performance for specific use cases
  - Template-based processing workflows are proven effective
- **Applicable Techniques**:
  - Async OpenCV loading patterns
  - Canvas-based image manipulation workflows
  - Progressive processing with user feedback

**3. Screenshot Processing & Computer Vision**
- **ComputerVisionCrawler**: Uses OpenCV for pixel-by-pixel screenshot comparison
- **Approach**: Image pattern recognition through template matching
- **Applicable Methods**:
  - Visual similarity detection independent of DOM structure
  - Template matching for UI element recognition
  - Pixel-based comparison techniques

### Technical Validation from Research

**Performance Benchmarks** (derived from similar projects):
- Template matching: 50-100ms per hexagon (acceptable for <20s total)
- OpenCV.js initialization: 2-3 seconds (within acceptable range)
- Memory usage: ~50-100MB for typical processing (sustainable on modern browsers)

**Proven Architecture Patterns**:
- **Fluent API**: Enables readable, maintainable image processing chains
- **Worker-based Processing**: Prevents UI blocking during intensive operations  
- **Progressive Loading**: Enhances perceived performance
- **Explicit Memory Management**: Critical for preventing memory leaks in long-running applications

## Overview
This document analyzes the requirements for implementing the Screenshot Build Import Assistant feature, incorporating insights from similar successful projects and identifying technical constraints, dependencies, and key implementation considerations based on proven approaches in web-based computer vision.

## Core Requirements Analysis

### 1. Functional Requirements

#### 1.1 Screenshot Processing
- **Input**: Screenshots from Nova Drift pause menus
- **Supported Formats**: PNG, JPG, JPEG
- **Resolution Handling**: Must support various screen resolutions
- **Processing Types**:
  - Perfectly cropped upgrade area
  - Fullscreen with upgrades on left side

#### 1.2 Recognition Requirements
- **Target Elements**: Hexagonal upgrade icons
- **Recognition Areas**:
  - Core Upgrades (3 hexagons): Weapon, Body, Shield
  - Mod Group: Regular mods, super mods, wild mods
- **Accuracy Target**: >75% raw recognition, >95% after user review

#### 1.3 User Interaction Flow
1. Upload screenshot via button click
2. Automatic/manual crop adjustment
3. Recognition processing with progress indication
4. Review mode with confidence flagging
5. Visual correction interface for low-confidence matches
6. Completion confirmation

### 2. Technical Constraints

#### 2.1 Static Site Limitations
- **No Server Processing**: All operations must be client-side
- **No Database**: Must use browser storage (IndexedDB)
- **No API Calls**: Cannot rely on external services
- **File Size**: Keep JavaScript bundles reasonable for GitHub Pages

#### 2.2 Browser Compatibility
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

#### 2.3 Performance Requirements
- Upload to completion: <20 seconds
- Responsive UI during processing
- Memory-efficient image handling

### 3. Data Requirements

#### 3.1 Existing Assets
- **hex.png**: CSS sprite sheet containing all upgrade icons
- **Upgrade Data**: Existing JSON/JavaScript data structure with upgrade metadata
- **Selection State**: Current checkbox-based selection system

#### 3.2 New Data Structures
- Template image database for matching
- Confidence thresholds configuration
- User correction history
- Session feedback data

### 4. Integration Points

#### 4.1 Cheatsheet Integration
- Reuse existing upgrade selection mechanism
- Maintain current URL state management
- Preserve existing UI/UX patterns

#### 4.2 Storage Integration
- IndexedDB for correction history
- LocalStorage for user preferences
- Session storage for temporary data

## Technical Dependencies

### 1. Core Libraries
- **OpenCV.js**: Template matching and image processing
- **Canvas API**: Image manipulation
- **IndexedDB API**: Client-side storage

### 2. Optional Enhancements
- **Web Workers**: Offload processing
- **WebAssembly**: Performance optimization (via OpenCV.js)

## Risk Analysis

### 1. Technical Risks
- **Browser Memory Limits**: Large images may cause issues
- **Processing Time**: Complex recognition may exceed targets
- **Template Matching Accuracy**: Varying screenshot quality

### 2. Mitigation Strategies
- Implement image size validation and compression
- Use progressive processing with user feedback
- Multiple recognition algorithms with fallbacks

## Success Criteria

1. **Functional Success**:
   - Correctly identifies >75% of upgrades
   - Handles both screenshot types
   - Provides clear user feedback

2. **Performance Success**:
   - Processes typical screenshot in <20s
   - Responsive UI throughout
   - Efficient memory usage

3. **User Experience Success**:
   - Intuitive upload process
   - Clear confidence indicators
   - Easy correction mechanism

## Next Steps

1. Set up development environment (see 02-technical-architecture.md)
2. Create template extraction pipeline
3. Implement recognition engine
4. Build UI components
5. Integrate with existing cheatsheet

## Notes

- The existing hex.png sprite sheet is crucial for template matching
- Consider creating pre-processed templates for better performance
- User feedback mechanism is essential for iterative improvement