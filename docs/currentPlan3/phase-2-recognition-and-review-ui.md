# Phase 2: Recognition & Review UI (Refactored)

**Objective:** To process the extracted hexagons through the recognition engine and display the results on the cheatsheet, establishing the full "Review & Confirm" user experience with a preliminary feedback mechanism.

---

### 2.1. Bridge Grid Mapping to Recognition via Data Contract

-   **Action:** Implement the data transformation logic within the `import-coordinator.js` Web Worker.
-   **Data Flow:**
    -   The coordinator receives the map of extracted `ImageData` objects from `grid-mapper.js`.
    -   It formats this data into the **defined data contract** to decouple the modules.
    -   The coordinator calls the `recognition-engine.js`'s `analyzeRegions` method, still within the worker.
-   **Error Handling:** Implement robust error handling within the worker to catch failures during the recognition stage and report them back to the main thread's `ImportCoordinator`.

### 2.2. Implement Direct Cheatsheet Display & Review State

-   **Action:** Upon receiving results from the worker, the coordinator on the main thread will update the UI and enter the "reviewing" state.
-   **Logic:**
    -   Apply the `checked` attribute to high-confidence mods (>85%) and a `.needs-review` class to low-confidence mods.
    -   Set a global `data-import-state="reviewing"` attribute on the `<body>` to allow for global style changes.
    -   Display a clear header: "Review Mode: **X mods** require your confirmation."

### 2.3. Build the Visual Correction Interface & State Management

-   **Action:** Implement the "Review Mode" logic and UI.
-   **State Management:**
    -   While in `reviewing` state, the normal hex click handlers in `main.js` will be temporarily disabled.
    -   The state of partially corrected builds will be saved to **`IndexedDB`** to accommodate larger data and survive page refreshes.
-   **UI/UX Improvements:**
    -   The correction modal will pre-select the most likely candidate.
    -   **Accessibility:** Use `aria-describedby` to inform screen reader users which mods require review.
    -   Implement batch operations, such as a "Confirm all remaining" button if the remaining mods have medium-high confidence (e.g., >80%).
-   **A/B Testing:** During this phase, implement the infrastructure to A/B test the confidence threshold for flagging mods (e.g., trying 80% vs. 85% vs. 90%) to gather data on the optimal balance between accuracy and user effort.

### 2.4. Implement Preliminary User Feedback Loop (Moved from Phase 3)

-   **Action:** Add a simple, accessible "Report an error" button visible during the review phase.
-   **Functionality:**
    -   Clicking the button generates a pre-filled GitHub Issue link.
    -   The link will include metadata about the build (e.g., list of mods identified, number of corrections) but will **not** include image data at this stage to avoid complexity.

---

**Exit Criteria for Phase 2:** The full recognition pipeline runs in a non-blocking worker. A user can see their imported build, correct flagged mods using an accessible interface, and have their progress saved to IndexedDB. A basic, image-free feedback mechanism is in place, and the framework for A/B testing confidence thresholds is built.