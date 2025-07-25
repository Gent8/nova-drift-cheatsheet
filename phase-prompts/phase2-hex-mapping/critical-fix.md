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
