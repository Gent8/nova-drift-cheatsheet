# 🚀 Phase 0 Validation Instructions

## Quick Steps to Complete ROI Algorithm Testing

Your 17 annotations are ready to use! Follow these steps to complete Phase 0 validation:

### Step 1: Check LocalStorage (2 minutes)
1. Open `docs/validation-dataset/check-localstorage.html` in your browser
2. Click "Check LocalStorage" to see if you have image data
3. If images are found, export them directly
4. If not, proceed to Step 2

### Step 2: Add Images to Annotations (5-10 minutes)
1. Open `docs/validation-dataset/annotation-image-injector.html`
2. **Load JSON**: Select your `docs/test-results/nova-drift-ground-truth-2025-07-27.json`
3. **Load Images**: Select all the Nova Drift screenshots you originally annotated
4. **Match Results**: Tool will auto-match filenames, manually match any that don't auto-match
5. **Export**: Click "Export Enhanced JSON" to get annotations with embedded images

### Step 3: Run ROI Algorithm Benchmark (10-15 minutes)
1. Open `docs/validation-dataset/phase0-test-runner.html`
2. **Load Dataset**: Upload your enhanced JSON file from Step 2
3. **Run Tests**: Click "Run Full Benchmark" to test all 4 ROI algorithms
4. **View Results**: Check which algorithms meet the 70% accuracy threshold

### Step 4: Complete Phase 0 (5 minutes)
1. **Review Results**: Determine best performing algorithm
2. **Export Configuration**: Save algorithm settings for Phase 1
3. **Document Findings**: Note which approach works best (automated vs manual crop)

## Expected Outcomes

### ✅ **Success Case** (ROI ≥70% accurate)
- Proceed to Phase 1 with automated ROI detection
- Use the best-performing algorithm as primary method
- Manual crop as fallback option

### ⚠️ **Partial Success** (ROI 40-69% accurate)  
- Manual crop as primary workflow
- Automated ROI as optional "quick try" feature
- Still proceed to Phase 1

### ❌ **Low Accuracy** (ROI <40% accurate)
- Manual crop only
- Focus Phase 1 on excellent manual crop UX
- Consider ROI algorithm improvements in Phase 3

## Files You'll Work With

- **Input**: `docs/test-results/nova-drift-ground-truth-2025-07-27.json` (your 17 annotations)
- **Tools**: 
  - `check-localstorage.html` (check for existing images)
  - `annotation-image-injector.html` (add images to annotations)  
  - `phase0-test-runner.html` (run ROI algorithm tests)
- **Output**: Enhanced JSON + benchmark results + Phase 0 completion status

## Next Phase: Recognition Engine Redesign

After Phase 0 completion, the **critical priority** is addressing the two-zone layout discovery:
- Current recognition engine assumes uniform grid
- Reality: Nova Drift has core upgrades (triangular) + regular grid (4-wide honeycomb)
- This architectural fix is required before Phase 1 implementation

## Support

If you encounter any issues:
1. Check browser console for error messages
2. Ensure all files are in the correct directory structure
3. Try with a smaller subset (5-10 annotations) first if processing is slow

Your 17 diverse annotations represent excellent validation data - they cover multiple resolutions, UI scales, and capture types exactly as needed for comprehensive ROI algorithm testing.