# Nova Drift Screenshot Recognition - Phase Implementation Template

This file provides a standardized template for implementing each phase of the screenshot-based preset recognition system. Copy and paste the template below, updating the phase number and file name for each implementation phase.

---

## Phase Template (Copy & Paste for Each Phase)

```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase [PHASE_NUMBER] according to prompts/[PHASE_FILE].md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase [NEXT_PHASE_NUMBER] after confirming all tests pass.
```

---

## Phase-Specific Copy-Paste Commands

### Phase 1: Image Upload & UX
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 1 according to prompts/01-phase1-image-upload.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase 2 after confirming all tests pass.
```

#### Phase 1 Architectural Fix
```
I need you to analyze and fix critical architectural issues in Phase 1 of my Nova Drift screenshot recognition system.

STEP 1 - UNDERSTAND THE SPECIFICATION:
First, read implementation/Phase1-ImageUpload.md to understand the detailed architectural requirements, including:
- Required modular structure (separate files for upload-handler, validator, progress-indicator)
- Expected OOP design with specific classes (ScreenshotUploadHandler, UploadValidator, ProgressIndicator)
- Structured error handling system with error codes and user action guidance
- Performance requirements and memory management

STEP 2 - ANALYZE THE CURRENT IMPLEMENTATION:
Examine the actual implementation in the codebase:
- docs/upload-feature.js (monolithic 424-line file)
- docs/index.html (upload UI integration)
- docs/style.css (upload styling)
- docs/upload-tests.js (testing implementation)

STEP 3 - IDENTIFY THE ARCHITECTURAL PROBLEMS:
Compare what was implemented vs what was specified. Key issues:
- Monolithic structure instead of modular design
- Functional programming approach instead of required OOP classes
- Simple string error messages instead of structured error objects
- Missing proper module separation and interfaces
- Potential memory leaks from canvas cleanup

STEP 4 - IMPLEMENT THE ARCHITECTURAL FIX:
Refactor Phase 1 to match the specification:
- Create docs/modules/ directory structure
- Split upload-feature.js into separate modular files:
  - docs/modules/upload-handler.js (ScreenshotUploadHandler class)
  - docs/modules/upload-validator.js (UploadValidator class) 
  - docs/modules/progress-indicator.js (ProgressIndicator class)
- Implement structured error handling with codes and actions
- Add proper memory management and canvas cleanup
- Maintain all existing functionality and UI integration
- Ensure Phase 2 integration points remain intact

STEP 5 - PRESERVE FUNCTIONALITY:
Critical requirements:
- Keep existing event system (screenshot-ready event with same data structure)
- Maintain UI integration and accessibility features
- Preserve all testing capabilities
- Ensure no regression in user experience
- Keep performance characteristics

STEP 6 - UPDATE INTEGRATION:
- Update docs/index.html to load modular files instead of monolithic file
- Ensure proper initialization order
- Maintain public API for testing and future phases
- Update tests to work with new modular structure

STEP 7 - VALIDATE THE FIX:
- Run existing tests to ensure no functional regression
- Test upload functionality manually
- Verify event system still works for Phase 2 integration
- Check memory usage improvements
- Validate accessibility and responsive design

REQUIREMENTS:
- Follow the exact specification in implementation/Phase1-ImageUpload.md
- Maintain backward compatibility for Phase 2 integration
- Improve code maintainability and extensibility
- Fix memory management issues
- Preserve all user-facing functionality

The goal is to transform the working but architecturally problematic implementation into a clean, modular, specification-compliant foundation for the remaining phases.
```

### Phase 2: Hex Grid Mapping
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 2 according to prompts/02-phase2-hex-mapping.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase 3 after confirming all tests pass.
```

#### Phase 2 Critical Implementation Fix
```
I need you to analyze and fix critical implementation issues in Phase 2 of my Nova Drift screenshot recognition system.

STEP 1 - UNDERSTAND THE SPECIFICATION:
First, read implementation/Phase2-HexMapping.md to understand what Phase 2 was supposed to accomplish according to the original specification, including:
- Robust coordinate mapping system translating screenshot pixels to mod positions
- Accurate scaling detection for various screenshot resolutions (>95% accuracy requirement)
- Support for common resolutions with automatic scaling compensation
- Sophisticated pattern detection using hex grid mathematics
- Calibration system for layout changes and validation against reference screenshots

STEP 2 - ANALYZE THE CURRENT IMPLEMENTATION:
Examine the actual implementation in the codebase:
- docs/grid-mapper.js (main implementation - 686 lines)
- docs/mod-positions.js (reference coordinate data - 85 mod positions)
- docs/grid-mapper-tests.js (comprehensive test suite - 473 lines)
- docs/test-phase2.js (Node.js validation runner)
- Integration in docs/index.html (UI components and script loading)

STEP 3 - IDENTIFY THE CRITICAL PROBLEMS:
Based on code analysis, the main issues are:
- **Oversimplified Scale Detection**: Current brightness-based detection in `findVerticalSpacings` is too naive for real screenshots
- **Missing Real-World Validation**: All coordinate data appears theoretical, no validation against actual Nova Drift screenshots
- **Placeholder Grid Center Detection**: `detectCenterOffset` just returns {x:0, y:0} instead of sophisticated UI element detection
- **Unproven Reference Data**: The 85 mod positions in mod-positions.js need validation against real game screenshots
- **Limited Pattern Recognition**: Current detection methods may fail with different themes, backgrounds, or UI variations

STEP 4 - IMPLEMENT ROBUST SCALE DETECTION:
Fix the scale detection by:
- Implementing proper edge detection for hex boundaries instead of simple brightness analysis
- Adding multiple validation points across the screenshot, not just a single column
- Creating template matching for known hex shapes from the existing hex.png sprite sheet
- Adding confidence validation that rejects results below 90% accuracy threshold
- Implementing fallback detection methods for edge cases

STEP 5 - ADD REAL-WORLD VALIDATION:
Create a validation system that:
- Uses actual Nova Drift screenshot samples for testing coordinate accuracy
- Implements benchmark testing with known-good reference screenshots
- Adds manual calibration override when automatic detection fails
- Creates a feedback mechanism to improve coordinate accuracy over time
- Validates the 85 mod positions against real game layout

STEP 6 - ENHANCE GRID CENTER DETECTION:
Replace the placeholder with:
- UI element detection to locate actual game interface boundaries
- Multiple reference point validation (not just center assumption)
- Handling for cropped screenshots and non-standard aspect ratios
- Detection of Nova Drift's distinctive UI elements for accurate grid positioning
- Adaptive algorithms that work with different UI themes and scaling

STEP 7 - IMPROVE ERROR HANDLING AND FALLBACKS:
Add sophisticated error recovery:
- Better confidence thresholds that reject unreliable detections
- User feedback integration for manual correction when automatic detection fails
- Graceful degradation with clear error messages and suggested actions
- Memory management improvements for large screenshot processing
- Performance optimization for real-time feedback

STEP 8 - VALIDATE THE FIXES:
- Test against actual Nova Drift screenshots at different resolutions
- Verify >95% coordinate accuracy requirement is met
- Ensure Phase 3 integration points remain functional
- Run comprehensive tests including edge cases and error conditions
- Benchmark performance to meet <2s processing time requirement

REQUIREMENTS:
- Maintain the existing event-driven architecture (grid-mapped event)
- Keep all existing test coverage and add real-world validation tests
- Preserve UI integration and accessibility features
- Fix coordinate accuracy to meet the >95% specification requirement
- Ensure robust handling of various screenshot qualities and formats
- Maintain backward compatibility with Phase 1 and forward compatibility with Phase 3

The goal is to transform the theoretically sound but practically unproven implementation into a robust, accurate coordinate mapping system that works reliably with real Nova Drift screenshots.
```

### Phase 3: Image Processing
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 3 according to prompts/03-phase3-image-processing.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Proceed to Phase 4 after confirming all tests pass.
```

#### Phase 3 Critical Implementation Fix
```
I need you to analyze and fix critical implementation issues in Phase 3 of my Nova Drift screenshot recognition system.

STEP 1 - UNDERSTAND THE SPECIFICATION:
First, read implementation/Phase3-ImageProcessing.md to understand what Phase 3 was supposed to accomplish according to the original specification, including:
- True Web Worker implementation for parallel processing
- Adaptive image enhancement that doesn't over-process
- Accurate memory usage tracking
- Proper hexagonal masking with pixel-perfect accuracy
- Quality thresholds that adapt to screenshot characteristics

STEP 2 - ANALYZE THE CURRENT IMPLEMENTATION:
Examine the actual implementation in the codebase:
- docs/image-processing/image-processor.js (main orchestrator - 253 lines)
- docs/image-processing/region-extractor.js (region extraction logic - 379 lines)
- docs/image-processing/quality-analyzer.js (quality assessment - 375 lines)
- docs/image-processing/memory-manager.js (resource management - 282 lines)
- docs/image-processing/worker-pool.js (parallel processing - 280 lines)
- docs/image-processing/processing-utils.js (utilities - 433 lines)
- docs/image-processing-integration.js (Phase 2 integration)
- docs/test-phase3.js (comprehensive test suite - 557 lines)

STEP 3 - IDENTIFY THE CRITICAL PROBLEMS:
Based on the code review analysis, the main issues are:

**PROBLEM 1 - Fake Worker Pool Implementation:**
- WorkerPool class is currently a synchronous fallback instead of true Web Worker usage
- No actual Web Worker scripts are created or loaded
- Processing still happens on main thread, could block UI during heavy processing
- Workers are "initialized" but never actually spawn background threads

**PROBLEM 2 - Over-Aggressive Image Enhancement:**
- Multiple enhancement steps applied sequentially without quality assessment
- Enhancement pipeline may introduce artifacts that hurt recognition accuracy
- No toggle for enhancement intensity based on original image quality
- Fixed contrast enhancement (1.1x) may not be appropriate for all screenshots

**PROBLEM 3 - Inaccurate Memory Usage Tracking:**
- Memory calculation only accounts for canvas pooling, not actual browser memory
- ImageData objects and temporary processing buffers not tracked
- performance.memory API not properly integrated for real usage monitoring
- May give false confidence about memory usage in production

**PROBLEM 4 - Rigid Quality Thresholding:**
- Fixed quality threshold (0.7) may be too restrictive for varying screenshot quality
- No adaptive thresholding based on overall image characteristics
- Hard failure rather than graceful degradation for low-quality regions
- May reject too many valid regions in poor lighting or compression scenarios

**PROBLEM 5 - Hexagonal Mask Mathematical Issues:**
- Hexagonal distance formula appears incorrect for pixel-space detection
- May not match actual hex shapes in Nova Drift screenshots
- Could exclude valid pixels or include unwanted background pixels
- Needs proper pixel-based polygon intersection testing

STEP 4 - IMPLEMENT TRUE WEB WORKER SUPPORT:
Fix the worker pool by:
- Creating actual Web Worker script files in docs/workers/ directory
- Implementing proper worker task distribution for CPU-intensive operations
- Adding worker communication protocols with error handling
- Maintaining fallback to synchronous processing when workers unavailable
- Moving image filtering, quality analysis, and enhancement to background threads

STEP 5 - FIX IMAGE ENHANCEMENT PIPELINE:
Improve the enhancement system by:
- Making enhancement optional and adaptive based on input quality assessment
- Implementing quality-aware enhancement that only processes when beneficial
- Adding configurable enhancement intensity levels
- Creating bypass mechanisms for already high-quality images
- Separating enhancement from core extraction functionality

STEP 6 - IMPLEMENT ACCURATE MEMORY MONITORING:
Enhance memory management by:
- Integrating performance.memory API for real browser memory tracking
- Adding memory usage tracking for ImageData objects and processing buffers
- Implementing memory pressure detection and response mechanisms
- Creating accurate memory reporting for debugging and optimization
- Adding memory leak detection for long-running processing sessions

STEP 7 - ADD ADAPTIVE QUALITY THRESHOLDS:
Improve quality assessment by:
- Implementing dynamic quality thresholds based on overall screenshot quality
- Adding confidence-based processing that gracefully degrades with poor quality
- Creating quality distribution analysis across all extracted regions
- Implementing quality-aware batch processing strategies
- Adding user feedback integration for threshold calibration

STEP 8 - FIX HEXAGONAL MASKING:
Correct the geometric calculations by:
- Implementing proper pixel-based polygon intersection testing
- Using accurate hexagon vertex calculations for masking
- Adding visual debugging tools to verify mask accuracy
- Creating test cases with known hex shapes to validate masking
- Ensuring masks match actual Nova Drift hex boundaries

STEP 9 - PRESERVE EXISTING FUNCTIONALITY:
Critical requirements:
- Keep existing event system (regions-extracted event with same data structure)
- Maintain all test coverage and ensure 100% pass rate continues
- Preserve performance characteristics (processing time must stay under targets)
- Keep UI integration and Phase 4 compatibility intact
- Maintain memory efficiency while improving accuracy

STEP 10 - VALIDATE THE FIXES:
- Run existing test suite to ensure no functional regression
- Add new tests for worker functionality, adaptive enhancement, and accurate memory tracking
- Verify processing performance still meets requirements (<3s for 4K screenshots)
- Test with various quality screenshots to validate adaptive thresholds
- Check memory usage accuracy with performance.memory API integration

REQUIREMENTS:
- Follow the exact architectural patterns from implementation/Phase3-ImageProcessing.md
- Maintain backward compatibility with Phase 2 integration
- Ensure forward compatibility with Phase 4 recognition system
- Fix identified issues without breaking existing functionality
- Improve real-world robustness and production readiness
- Keep comprehensive test coverage and documentation

The goal is to transform the working but architecturally flawed implementation into a truly robust, production-ready image processing system that handles real-world screenshot variations effectively while maintaining excellent performance.
```

### Phase 4: Recognition Logic
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 4 according to prompts/04-phase4-recognition.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase 5 after confirming all tests pass.
```

#### Phase 4 Critical Issue Fix
```
I need you to analyze and fix a critical architectural issue in Phase 4 of my Nova Drift screenshot recognition system.

STEP 1 - UNDERSTAND THE PLAN:
First, read implementation/Phase4-Recognition.md to understand what Phase 4 was supposed to accomplish according to the original specification.

STEP 2 - ANALYZE THE CURRENT IMPLEMENTATION:
Then examine the actual implementation in the codebase:
- docs/recognition-engine/ (all files)
- docs/recognition-integration.js
- docs/test-phase4.js and docs/test-phase4-validation.js

STEP 3 - UNDERSTAND THE EXISTING SYSTEM:
Critically important - examine how the current Nova Drift cheatsheet actually works:
- docs/main.js (selection system using 'checked' attributes)
- docs/hex.css (sprite sheet references)
- docs/hex.png (actual game mod sprites)
- docs/style.css (brightness filter system for selected/unselected states)

STEP 4 - IDENTIFY THE CRITICAL ISSUE:
Compare what Phase 4 currently does vs what it should do based on the existing system architecture. The issue involves a fundamental misunderstanding of the problem domain.

STEP 5 - EXPLAIN THE PROBLEM:
Clearly articulate:
- What Phase 4 currently tries to detect
- What it should actually detect
- Why the current approach won't work with the existing system
- How the existing selection system already works

STEP 6 - IMPLEMENT THE FIX:
Refactor Phase 4 to:
- Focus on MOD IDENTIFICATION instead of selection state detection
- Use the actual hex.png sprite sheet as reference templates
- Output mod identifications that can integrate with the existing DOM-based selection system
- Maintain the solid architectural foundation (multi-algorithm approach, consensus engine, etc.)

REQUIREMENTS:
- Keep the existing event-driven architecture
- Maintain performance monitoring and error handling
- Ensure Phase 5 can receive proper mod identification data
- Run tests to verify the fix works
- Document the changes made

Focus on fixing the core problem: Phase 4 should identify WHICH MODS are in the screenshot, not whether they appear selected or unselected in the screenshot.
```

### Phase 5: System Integration
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 5 according to prompts/05-phase5-integration.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase 6 after confirming all tests pass.
```

### Phase 6: User Feedback
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 6 according to prompts/06-phase6-user-feedback.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase 7 after confirming all tests pass.
```

### Phase 7: Testing & Calibration
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 7 according to prompts/07-phase7-testing.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. Only proceed to Phase 8 after confirming all tests pass.
```

### Phase 8: Documentation
```
I need to implement a screenshot-based preset recognition system for my Nova Drift cheatsheet.

Please read prompts/README.md to understand the overall approach, then implement Phase 8 according to prompts/08-phase8-documentation.md.

Focus on the success criteria and ensure all testing requirements are met. IMPORTANT: You must verify that all success criteria are actually achieved by running unit tests in the terminal - do not assume success without terminal-based verification. This is the final phase.
```

---

## Usage Instructions

1. **Copy the appropriate phase command** from the section above
2. **Paste it into your AI conversation** to start that phase
3. **Ensure the agent runs unit tests** to verify all success criteria are met
4. **Check terminal output** to confirm tests pass before proceeding
5. **Wait for completion** of all success criteria before moving to next phase
6. **Test thoroughly** after each phase implementation

⚠️ **Critical**: Do not proceed to the next phase unless the agent has run terminal-based unit tests that verify all success criteria. Agents can easily read terminal output but may miss issues in HTML modules or other non-terminal outputs.

## Phase Sequence

Execute in this order:
1. Phase 1: Image Upload & UX
2. Phase 2: Hex Grid Mapping  
3. Phase 3: Image Processing
4. Phase 4: Recognition Logic
5. Phase 5: System Integration
6. Phase 6: User Feedback
7. Phase 7: Testing & Calibration
8. Phase 8: Documentation

## Quick Reference

- **Project Type:** Haxe-based web application with JavaScript output
- **Architecture:** Client-side only, no external dependencies
- **Integration:** Must work with existing Nova Drift cheatsheet UI
- **Success Metrics:** >90% accuracy, <2s processing, <50KB payload, <100MB memory

---

*Generated for Nova Drift cheatsheet screenshot recognition system implementation*
