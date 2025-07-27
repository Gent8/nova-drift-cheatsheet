# Phase 0: Risk Reduction & Prototyping (Refactored)

**Objective:** To de-risk the most critical and technically uncertain components of the feature *before* full implementation. This phase is focused on validating core assumptions about performance, accuracy, and failure modes.

---

### 0.1. Prototype and Benchmark the ROI Detector (Highest Priority)

-   **Action:** Create a new, standalone module `modules/roi-detector.js`. Prototype and benchmark four distinct technical approaches for detecting the build configuration rectangle.
    -   **Approach A:** Edge-based detection to find major rectangular contours.
    -   **Approach B:** Color-based segmentation to isolate the dark, uniform background of the build area.
    -   **Approach C:** Template matching against a down-scaled template of the build screen's UI frame.
    -   **Approach D:** Corner detection using Harris corners or similar algorithms to identify rectangular UI elements.
-   **Prerequisite:** The **Validation Set** must be created *before* algorithm development begins to ensure unbiased testing. It must be a diverse, standardized test dataset of at least 30-40 real-world screenshots, specifically including:
    -   Multiple resolutions (e.g., 1080p, 1440p, 4K).
    -   Different in-game UI scaling factors (100%, 125%, 150%).
    -   Both windowed and fullscreen captures.
    -   Screenshots with common visual artifacts (e.g., YouTube overlays, compression artifacts, different screenshot tool watermarks).
    -   Edge cases like partial screenshots or captures with unusual aspect ratios.
-   **Algorithm Selection Criteria:** The final algorithm will be chosen based on a weighted scoring matrix:
    -   **Accuracy (50%):** Score on the validation set.
    -   **Performance (30%):** Average execution time and resource usage.
    -   **Reliability (20%):** Consistency and graceful failure handling across edge cases.
-   **Success Criteria:**
    -   The selected algorithm must consistently identify the correct region with **>70% accuracy** on the validation set.
    -   **Performance Budget:** Average execution time must be **under 4 seconds** on a standard machine (baseline: 2018 mid-range laptop, 8GB RAM, Intel i5-8250U, Chrome browser).
    -   **Memory Benchmark:** Prototypes must include memory usage monitoring. Average memory usage must not exceed a predefined budget of **150MB** during processing.
-   **Failure Mode Testing:** The prototype must gracefully handle cases where *none* of the algorithms can find the ROI with sufficient confidence. The system must be designed to fall back to the "user-guided ROI" (manual crop tool from Phase 1) as the ultimate failsafe.

### 0.2. Validate Recognition Engine Accuracy

-   **Action:** Manually crop 30-40 individual hexagon mod icons from the same validation set of screenshots.
-   **Testing:** Feed these real-world icons directly into the existing `RecognitionEngine`.
-   **Success Criteria:**
    -   The engine must achieve a raw accuracy rate of **at least 75%**.
    -   **Decision:** The initial confidence threshold for flagging a mod for user review will be set to **85%**.
    -   **Future Planning:** An A/B test will be planned for Phase 2 to evaluate the optimal confidence threshold in the 80-90% range based on real user feedback.

### 0.3. Define and Implement Performance Budgeting and Monitoring

-   **Action:** Formalize and implement performance monitoring for the end-to-end process from the beginning.
-   **Budget Allocation (Revised):**
    -   **ROI Detection & Crop:** 4 seconds
    -   **Grid Mapping & Extraction:** 5 seconds (to account for Web Worker overhead)
    -   **Recognition & Consensus:** 8 seconds (revised for realism)
    -   **UI Updates & Rendering:** 3 seconds
    -   **Total Budget:** 20 seconds
-   **Implementation:** Add `performance.now()` timers and memory usage tracking to all major functions. All heavy image processing tasks must be designed to run in Web Workers. Add user-facing messages to manage expectations (e.g., "This may take up to 30 seconds for high-resolution images").

---

**Exit Criteria for Phase 0:** A proven ROI detection algorithm is selected using a defined scoring matrix, the recognition engine's baseline accuracy is confirmed, performance budgets are integrated, and a clear fallback path for automation failure is established.