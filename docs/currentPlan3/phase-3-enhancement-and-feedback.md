# Phase 3: Enhancement & Feedback (Refactored)

**Objective:** To implement the "happy path" automation with the proven ROI detector, build a robust and secure feedback loop, and finalize the feature for production with comprehensive testing and error handling.

---

### 3.1. Integrate the Intelligent Auto-Crop

-   **Action:** Replace the manual-first crop flow in `import-coordinator.js` with the fully benchmarked and selected ROI detection algorithm from Phase 0.
-   **Logic:** The coordinator now executes the full bifurcated workflow:
    1.  Attempt auto-detection in a Web Worker.
    2.  If confidence is high (>70%), proceed automatically.
    3.  If confidence is low or detection fails, transition to the `awaiting-crop` state and show the manual tool.

### 3.2. Implement the Advanced Feedback Loop

-   **Action:** Enhance the "Report an error" feature into a full "Help Improve Recognition" system.
-   **Storage:**
    -   User corrections (image snippet + correct ID + initial prediction) will be saved to **`IndexedDB`**.
    -   Implement a strict size limit (e.g., 10MB) and an automatic 30-day expiration policy, with graceful error handling if the storage quota is exceeded.
-   **Functionality:**
    -   Add a "Help Improve Recognition" link with a notification dot for un-submitted feedback.
    -   **CRITICAL SECURITY & ROBUSTNESS:** The function that generates the GitHub Issue URL must:
        1.  **Aggressively compress** image snippets (e.g., to low-quality JPEG) before Base64 encoding.
        2.  **Sanitize all user-derived data** (mod names, confidence scores) before insertion into the URL.
        3.  **Validate URL length** against a safe maximum (e.g., 4000 characters) and truncate the body with a notice if it exceeds the limit.

### 3.3. Implement Client-Side Personalization

-   **Action:** Implement an `IndexedDB` check to improve performance and accuracy for repeat users.
-   **Logic:**
    -   A robust hashing function (e.g., **SHA-256**) will be used to create keys for image snippets to minimize collisions.
    -   Before sending a hexagon to the full recognition engine, the `import-coordinator.js` will check `IndexedDB` for a user-corrected hash. If a match is found, it will use the user's previous correction.

### 3.4. Finalizing for Production (New Section)

-   **Action:** Implement project-wide improvements based on findings from all previous phases.
-   **Unified Error Handling:** Create a centralized error handling module that logs errors and presents consistent, user-friendly messages for failures in any part of the import pipeline. This includes a reusable **input sanitization module** for all user-provided data.
-   **Testing Strategy:**
    -   **Unit Tests:** Write unit tests for all critical, standalone functions (e.g., coordinate normalization, data contract validation, hashing).
    -   **Integration Tests:** Create an automated testing suite that runs the entire pipeline on the standardized test dataset from Phase 0.
    -   **User Acceptance Testing (UAT):** Conduct UAT with community members using a wide range of devices and browsers.
    -   **Graceful Degradation Testing:** Ensure the core cheatsheet application remains fully usable even if the import feature fails or is blocked by browser settings (e.g., JavaScript partially disabled).
-   **Deployment Strategy:** Develop a plan for updating recognition templates and algorithm weights without disrupting the user experience.

---

**Exit Criteria for Phase 3:** The feature is complete and production-ready. The automated "happy path" is the default, a secure and robust community feedback loop is in place, and the entire system is supported by a comprehensive testing and error-handling strategy.