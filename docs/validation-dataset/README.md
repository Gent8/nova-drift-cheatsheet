# Phase 0 Validation System

This directory contains the complete validation system for Phase 0 of the Nova Drift Screenshot Build Import Assistant.

## Quick Start

1. **Open the Test Runner**: `phase0-test-runner.html`
2. **Check Components**: Verify all algorithms are loaded
3. **Run Quick Test**: Test basic functionality
4. **Create Dataset**: Use `ground-truth-annotator.html` to create test data
5. **Run Full Benchmark**: Comprehensive algorithm validation
6. **Validate Phase 0**: Complete validation for Phase 1 readiness

## Files Overview

### Core Validation Tools
- `phase0-test-runner.html` - Main testing interface
- `phase0-validator.js` - Phase 0 completion validator
- `benchmark-runner.js` - Algorithm benchmarking system
- `ground-truth-annotator.html` - Manual annotation tool

### Dataset Structure
- `screenshots/` - Test screenshots 
- `ground-truth/` - Manually annotated build areas
- `results/` - Validation results and reports
- `metadata.json` - Dataset metadata

## Phase 0 Exit Criteria

### 1. ROI Detection Accuracy ≥ 70%
- Test all 4 algorithms (edge, color, template, corner)
- Select best performing algorithm
- Validate on diverse screenshot dataset

### 2. Performance Budgets Met
- ROI Detection: ≤ 4 seconds
- Total Processing: ≤ 20 seconds  
- Memory Usage: ≤ 150MB

### 3. Fallback Mechanisms Working
- Graceful degradation when detection fails
- Timeout handling (4-second budget)
- Error recovery with user-friendly fallbacks

### 4. Component Availability
- All ROI detection algorithms loaded
- Benchmark runner functional
- Validation framework complete

## Usage Instructions

### Creating a Validation Dataset

1. Open `ground-truth-annotator.html`
2. Upload Nova Drift screenshots 
3. Mark build configuration areas
4. Aim for 35-40 diverse screenshots:
   - Different resolutions (1920x1080, 2560x1440, 4K)
   - Different UI scales (100%, 125%, 150%)
   - Various capture types (fullscreen, windowed)
   - Edge cases (overlays, compression, crops)

### Running Validation

1. Open `phase0-test-runner.html`
2. Check that all components load successfully
3. Load your annotated dataset (or use mock data)
4. Run full benchmark to test all algorithms
5. Review algorithm comparison table
6. Run Phase 0 validation for final assessment

### Algorithm Selection

The benchmark runner will rank algorithms by:
- **Accuracy (50%)**: Intersection over Union (IoU) with ground truth
- **Speed (20%)**: Processing time vs 4-second budget  
- **Memory (15%)**: Memory usage vs 150MB budget
- **Reliability (15%)**: Success rate across test cases

### Export and Documentation

- Export benchmark results as JSON
- Generate algorithm configuration for Phase 1
- Save validation reports for documentation

## Expected Outcomes

### Phase 0 Success Criteria
- ✅ Best algorithm achieves ≥70% accuracy
- ✅ Processing time within performance budgets
- ✅ Fallback mechanisms handle edge cases
- ✅ Validation dataset of sufficient quality
- ✅ Clear algorithm recommendation for Phase 1

### Phase 1 Readiness
Upon successful Phase 0 completion:
- Selected algorithm configuration exported
- Performance baselines established  
- Risk mitigation strategies validated
- Foundation ready for upload integration

## Troubleshooting

### Common Issues

**"Components missing"**
- Ensure all ROI detector scripts are loaded
- Check browser console for script loading errors
- Verify file paths in test runner HTML

**"No validation dataset"**  
- Create test data using ground truth annotator
- Or use "Quick Test" mode with mock data
- Load existing dataset JSON file

**"Algorithm accuracy too low"**
- Check test image quality and annotations
- Adjust algorithm parameters
- Consider ensemble/hybrid approaches

**"Performance budget exceeded"**
- Test on target hardware (2018 mid-range laptop)
- Consider algorithm optimizations
- Adjust timeout/budget parameters if needed

### Performance Optimization

If algorithms don't meet performance targets:
1. Reduce image resolution for initial detection
2. Implement progressive processing
3. Cache intermediate results
4. Consider WebAssembly for compute-intensive operations

## Next Steps (Phase 1)

After Phase 0 validation passes:
1. Integrate selected algorithm with upload handler
2. Implement manual crop interface as fallback
3. Create web worker for non-blocking processing  
4. Build simple review UI for low-confidence results
5. Add error recovery and browser compatibility handling

## Architecture Notes

This validation system is designed to:
- **De-risk** the most technically uncertain components
- **Validate** core assumptions about performance/accuracy
- **Select** the best algorithm before full implementation  
- **Establish** clear baselines and fallback strategies
- **Provide** evidence-based recommendations for Phase 1

The approach prioritizes thorough validation over speed to ensure Phase 1 implementation is built on a solid foundation.