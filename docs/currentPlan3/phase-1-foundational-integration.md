# Phase 1: Foundational Integration (Refactored)

**Objective:** To create the core, end-to-end workflow with a manual-first approach. This phase builds the state management and data pipeline, prioritizing robustness, clear error handling, and a non-blocking user experience.

---

### 1.1. Create the Import Coordinator and Define Data Contracts

-   **Action:** Create a new central state machine, `modules/import-coordinator.js`.
-   **Responsibilities:**
    -   Manage the overall import state: `idle`, `processing-roi`, `awaiting-crop`, `processing-grid`, `processing-recognition`, `reviewing`, `complete`, `error`.
    -   Orchestrate the flow of data between all modules.
    -   **Error Handling:** Implement a hard **20-second timeout** for the entire import process using an `AbortController`.
-   **Action (New):** Define clear, versioned API contracts and data models for the information passed between modules using **JSON Schema or TypeScript interfaces**. This ensures consistency and simplifies testing.

### 1.2. Implement the Manual Crop Flow with Web Worker Integration

-   **Action:** Implement the manual cropping interface and workflow as the initial, default path. All complex image processing must be offloaded to Web Workers.
-   **Logic:**
    -   The user uploads an image.
    -   The `ImportCoordinator` immediately transitions to `awaiting-crop`, presenting the manual cropping UI.
    -   Once the user confirms the crop, the cropped `ImageData` is passed to a Web Worker for subsequent grid mapping and recognition steps to prevent freezing the UI.
-   **UI:**
    -   Build the modal and cropping UI components in `index.html` and `style.css`.
    -   Include a crop preview area.
    -   Ensure full accessibility (WCAG 2.1).
    -   Add UI text to manage user expectations, e.g., "Processing your build... this may take a moment."

### 1.3. Integrate Grid Mapping with Cropped Input

-   **Action:** Refactor `grid-mapper.js` to be entirely worker-compatible, accepting a cropped `ImageData` object.
-   **Logic:**
    -   A dedicated, **unit-tested coordinate space normalization function** must be created to robustly handle arbitrary crop sizes and resolutions.

### 1.4. Progressive Error Recovery and Browser Compatibility (New Section)

-   **Action:** Implement browser feature detection and design for graceful degradation.
-   **Browser Compatibility:** The system must check for the availability of **Web Workers** and **IndexedDB**. If either is unsupported, the import feature should be gracefully disabled with an informative message to the user.
-   **Error Recovery:** Design the `ImportCoordinator` to handle partial failures. For example, if the recognition step fails within the worker, the system should still be able to present the user with the mapped grid and allow for a fully manual selection process, rather than having the entire feature fail.

---

**Exit Criteria for Phase 1:** A user can upload a screenshot, manually crop it, and the system successfully maps the grid within a non-blocking Web Worker. The `ImportCoordinator` is functional, with defined data contracts and a strategy for error recovery. Browser compatibility for core technologies (Web Workers, IndexedDB) has been verified.