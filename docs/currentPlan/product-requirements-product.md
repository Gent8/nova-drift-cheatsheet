# Product Requirements Document: Screenshot Build Import Assistant

| **Version** | **Status**      | **Author**      | **Date**       |
| :---------- | :-------------- | :-------------- | :------------- |
| 1.0         | Draft for Review | User | July 27, 2025 |

---

### 1. Introduction & Vision

**1.1. Problem Statement**
Nova Drift players frequently discover new and interesting builds by watching videos (e.g., on YouTube) or viewing shared images. Manually replicating these builds on the Nova Drift Cheatsheet is a tedious and error-prone process. It requires the user to toggle between the video/image and the cheatsheet, find each of the 30-60+ individual upgrades (hexagons) by eye, and click them one by one. This friction discourages experimentation and a core community activity.

**1.2. Feature Vision**
To create a "Build Import Assistant" that allows users to upload a screenshot of a Nova Drift build configuration and have it instantly replicated on the cheatsheet. The feature will function as an intelligent assistant, automating the vast majority of the work while transparently flagging any uncertainties for the user's quick final "oversight." The primary goal is to make build discovery and replication nearly effortless.

**1.3. Guiding Principles**
*   **Frictionless First:** The ideal user interaction is "upload and done." User effort should only be required as a fallback, not a prerequisite.
*   **Trust Through Transparency:** The system must be honest about its confidence. It is better to ask for help than to be silently wrong.
*   **Static-First:** The entire feature must operate purely on the client-side, with no backend, to align with the GitHub Pages hosting constraint.

---

### 2. Goals & Objectives

**2.1. User Goals**
*   To replicate a build from a screenshot onto the cheatsheet in under 20 seconds.
*   To eliminate the need for manual, side-by-side comparison of hexagons.
*   To have high confidence in the accuracy of the imported build.

**2.2. Project Goals**
*   Increase user engagement and session duration on the cheatsheet.
*   Solidify the cheatsheet's position as an indispensable community tool.
*   Create a robust, community-driven pathway for improving the tool's accuracy over time without a server.


---

### 3. User Journey & Flow

The user's interaction with the feature will follow this primary flow:

1.  **Initiation:** The user clicks the "📷 Upload Screenshot" button on the cheatsheet.
2.  **File Selection:** The user selects a screenshot file from their device.
3.  **Smart Ingestion:**
    *   **Happy Path (High-Confidence):** The system's "Intelligent Auto-Crop" algorithm identifies the build configuration rectangle within the screenshot and crops it internally. The user sees a brief "Locating build..." message, and the process continues automatically.
    *   **Fallback Path (Low-Confidence):** If the tool cannot confidently locate the build, a simple cropping interface appears, prompting the user to manually adjust the selection box to fit the build configuration area.
4.  **Analysis:** The tool runs the multi-algorithm Recognition Engine on the clean, cropped image. The user sees an "Analyzing build..." progress indicator.
5.  **State Display:** The cheatsheet's main interface updates instantly. Hexagons corresponding to the recognized mods are visually selected (`checked` state).
6.  **Review & Confirm:**
    *   The cheatsheet enters a temporary "Review Mode."
    *   A header banner appears: "Assistant Mode: **X mods** require your confirmation."
    *   Hexagons with low recognition confidence (e.g., <90%) are flagged with a subtle pulsing glow.
7.  **User Oversight (Correction):**
    *   The user hovers a flagged hex and sees a tooltip: "Low Confidence (e.g., 75%). Please confirm."
    *   They click the hex. A "Visual Correction Interface" appears, showing the cropped hexagon from their screenshot and the top 2-3 likely mod candidates.
    *   The user clicks the correct mod. The hexagon is confirmed, the pulsing stops, and the count in the header banner decrements.
8.  **Completion:** Once the last flagged mod is confirmed, the header banner shows a "Build Confirmed!" message and fades out. The cheatsheet is now in a standard user-selected state, ready for review.
9.  **Optional Feedback:** A low-key "Help Improve Recognition" link in the page footer gains a small notification dot, indicating that corrections were made. If the user chooses to click it, a pre-filled GitHub issue link is generated for them to easily submit their anonymous feedback.

---

### 4. Feature Requirements

#### 4.1. Functional Requirements

| ID        | Requirement Description                                                                                                                                                             | Priority |
| :-------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **REQ-F-01**  | **Intelligent Auto-Crop:** The system MUST automatically detect and crop the build configuration rectangle from an uploaded screenshot. It MUST only fall back to a manual crop tool if detection confidence is low. | High     |
| **REQ-F-02**  | **Multi-Algorithm Recognition:** The system MUST use the four-phase recognition engine (Brightness, Color, Edge, Pattern) and a Consensus Engine to identify mods from the cropped image. | High     |
| **REQ-F-03**  | **Direct Cheatsheet Update:** The recognition results MUST be used to directly manipulate the DOM, applying the `checked` state to the corresponding hexagons on the main cheatsheet. | High     |
| **REQ-F-04**  | **Confidence Flagging:** The UI MUST visually distinguish hexagons recognized with a confidence score below a configurable threshold (e.g., 90%) using a non-intrusive animation (pulsing glow). | High     |
| **REQ-F-05**  | **Visual Correction Interface:** Clicking a flagged hexagon MUST open a UI that displays the source image snippet, the top 2-3 candidate mods, and a manual search option for easy correction. | High     |
| **REQ-F-06**  | **Review Mode State:** The UI MUST have a clear "Review Mode," including a header that dynamically tracks the number of mods awaiting confirmation.                                    | Medium   |
| **REQ-F-07**  | **Passive Feedback Collection:** The system MUST silently store user corrections (image snippet + correct ID) in the browser's `IndexedDB`.                                     | Medium   |
| **REQ-F-08**  | **Client-Side Personalization:** The system SHOULD check `IndexedDB` for previously user-corrected images to bypass the recognition engine for known patterns, improving speed and accuracy for that user. | Medium   |
| **REQ-F-09**  | **Opt-In Feedback Submission:** A UI element (e.g., footer link) MUST allow users to generate a pre-filled GitHub Issue URL containing all of their session's correction data for submission. | Medium   |

#### 4.2. Non-Functional Requirements

| ID        | Requirement Description                                                                                                                                                              | Priority |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------- |
| **REQ-NF-01** | **Static Site Constraint:** The entire feature, including all processing and feedback generation, MUST run exclusively on the client-side. No backend server calls are permitted.             | High     |
| **REQ-NF-02** | **Performance:** The end-to-end process from file upload to final display on the cheatsheet SHOULD take less than 20 seconds for a typical screenshot on an average desktop machine (baseline: 2018 mid-range laptop, 8GB RAM, Intel i5-8250U, Chrome browser).      | High     |
| **REQ-NF-03** | **Accuracy:** The system MUST achieve >75% raw accuracy in identifying mods from real-world screenshots, with a confidence flagging system to ensure >95% user-verified accuracy.                               | High     |
| **REQ-NF-04** | **Browser Compatibility:** The feature MUST be fully functional on the latest versions of major desktop browsers (Chrome, Firefox, Safari, Edge).                                        | High     |
| **REQ-NF-05** | **Responsiveness:** All new UI components (cropping tool, correction interface, header) MUST be responsive and usable on mobile devices.                                               | Medium   |

---

### 5. Success Metrics

The success of the Build Import Assistant will be measured by:

*   **Adoption Rate:** Percentage of unique users who engage with the upload feature.
*   **Completion Rate:** Percentage of uploads that result in a fully confirmed build (i.e., the user resolves all low-confidence flags).
*   **Average Correction Count:** The average number of mods per import that require user correction. A decreasing trend over time indicates improving accuracy.
*   **Feedback Submission Rate:** The number of community feedback submissions generated per 1,000 uses of the feature. This measures the effectiveness of the optional feedback loop.
*   **Time-to-Value:** The average time from initial upload to a fully confirmed build state.

---

### 6. Future Considerations (Post-v1.0)

*   **Advanced Template Management:** Developing a small, local tool for the developer to more easily ingest community feedback and generate new templates.
*   **Localization:** Ensuring all new UI text is compatible with the existing English/Japanese language switcher.
*   **Performance Optimization:** Further investigation into WebAssembly (WASM) for the more computationally intensive parts of the recognition engine to improve speed on lower-end devices.