# Product Requirements Document: Screenshot Build Import Assistant

| **Version** | **Status**      | **Author**      |
| :---------- | :-------------- | :-------------- |
| 1.0         | Draft for Review | User |         

---

### 1. Introduction & Vision

**1.1. Problem Statement**  
Nova Drift players frequently discover new and interesting builds by watching videos (e.g., on YouTube) or viewing shared images. Manually replicating these builds on the Nova Drift Cheatsheet is a tedious and error-prone process. It requires the user to toggle between the video/image and the cheatsheet, find each of the 30-60+ individual upgrades (hexagons) by eye, and click them one by one. This friction discourages experimentation and a core community activity.

**1.2. Feature Vision**  
Create a "Build Import Assistant" that lets users upload a screenshot of a Nova Drift build configuration and have it instantly replicated on the cheatsheet. The feature will automate the majority of the work while transparently flagging any uncertainties for a quick final “oversight” step. The primary goal is to make build discovery and replication nearly effortless.

**1.3. Guiding Principles**
* **Frictionless First:** The ideal user interaction is “upload and done.” User effort is only a fallback.
* **Trust Through Transparency:** The system must clearly flag any uncertainties.
* **Static-First:** All functionality must run 100% client-side, in line with GitHub Pages hosting.

---

### 2. Goals & Objectives

**2.1. User Goals**
* Replicate a build from a screenshot onto the cheatsheet in under 20 seconds.
* Eliminate manual side-by-side comparison of hexagons.
* High confidence in the accuracy of the imported build.

**2.2. Project Goals**
* Increase user engagement and session duration.
* Solidify the cheatsheet’s role as an indispensable community tool.
* Provide a robust pathway for ongoing tool improvement, with no backend.

---

#### Example User Stories
- As a Nova Drift player, I want to quickly import a build I see on YouTube so I can experiment with it myself.
- As a community contributor, I want the import tool to warn me if any upgrades are uncertain so I don’t accidentally share inaccurate builds.

---

### 3. Screenshot Requirements & Behaviour

**3.1. Expected Screenshot Types & Appearance**
- **Only expected screenshots:** The system only expects screenshots taken of the game’s *pause menu* or *upgrade pauses*. The specific type of pause is not relevant, as all have the same visual layout for upgrades.
- **Appearance:** The only possible variation in screenshot appearance is:
    1. **Perfectly cropped**: Screenshot contains only the upgrade (hexagon) area, no background or extra UI.
    2. **Fullscreen with upgrades on the left:** Screenshot of the full game window, with the upgrade area on the left-hand side.
- No other in-game or menu screens are supported. This greatly simplifies detection logic, as the upgrade area will *always* be present, in a known location.

**3.2. Intelligent Auto-Crop**
- **Simplified Cropping Logic:**  
    - If the screenshot is already perfectly cropped to the upgrade area, no auto-crop is required.
    - If the screenshot is fullscreen, auto-crop will focus on extracting the left-hand side of the image where the upgrade hexagons appear. This is the only relevant area for cropping, and all other cases are unsupported.
- **Manual Crop Fallback:**  
    - If auto-crop cannot confidently detect the upgrade area, the user will be prompted to quickly adjust a selection box. This is expected to be rare.

**3.3. Recognition Area: Core Upgrades vs. Mod Group**

- **Dual Section Structure:**  
  The recognition engine must account for two visually and functionally distinct sections within the upgrade display:
  
  1. **Core Upgrades Section:**  
      - Located at the very top of the build interface.
      - Always contains exactly **three hexagons**, corresponding to the player’s selected **Weapon**, **Body**, and **Shield** upgrades.
      - These are grouped together and visually separated from the main mod group below.
      - The order from top to bottom is always: **Weapon**, **Body**, **Shield**.

  2. **Mod Group Section:**  
      - Positioned directly below the core upgrades.
      - Contains all other upgrades: **regular mods**, **super mods**, and **wild mods**.
      - **Wild mods** are the only type that can appear more than once in this group.

- **Functional Notes:**
    - The recognition algorithm design must explicitly consider whether to:
        - **(A) Detect and segment the two upgrade sections (core and mods) as separate areas** within the screenshot prior to recognizing individual hexagons,
        - **or (B) Treat the entire recognition region as a single area and detect/classify all hexagons in one pass**, subsequently assigning their type (core vs. mod) based on positional analysis (e.g., y-coordinates or relative layout).
    - In either case, the system must accurately assign the three topmost hexagons to **Weapon**, **Body**, and **Shield** respectively, and all remaining detected hexagons to their appropriate mod type (regular, super, or wild).
    - The algorithm must support the possibility of duplicate wild mods in the mod group and handle all assignments deterministically based on the strict layout constraints.

---

### 4. User Journey & Flow

1. **Initiation:** User clicks “📷 Upload Screenshot” on the cheatsheet.
2. **File Selection:** User selects a screenshot file.
3. **Smart Ingestion:**
    * If the screenshot is perfectly sized, proceed immediately (no crop).
    * If fullscreen, auto-crop will extract the left-side upgrade area.
    * If detection fails, manual crop is prompted.
4. **Analysis:** Multi-algorithm recognition engine analyzes the cropped image.
5. **State Display:** Cheatsheet updates; recognized hexagons are selected (leveraging the existing selection mechanism).
6. **Review & Confirm:**
    * Cheatsheet enters a “Review Mode” with a header: “Assistant Mode: X mods require your confirmation.”
    * Hexagons with <90% confidence are flagged with a subtle pulsing glow.
7. **User Oversight (Correction):**
    * Hovering a flagged hex shows a tooltip with confidence and asks for confirmation.
    * Clicking opens a “Visual Correction Interface” showing the cropped hexagon and top candidate mods.
    * User confirms or corrects.
8. **Completion:** When all are confirmed, banner fades out; cheatsheet returns to standard state.
9. **Optional Feedback:** Subtle link allows users to submit corrections via a pre-filled GitHub issue.

- **Error Handling & User Experience:**  
    - If recognition fails completely, the user sees a clear, non-technical error message and tips for retaking a screenshot.
    - If auto-crop or detection is inconsistent, the user can re-upload or go back a step without losing their session state.

---

### 5. Feature Requirements

#### 5.1. Functional Requirements

| ID | Requirement Description | Priority |
|----|------------------------|----------|
| **REQ-F-01** | **Screenshot Handling:** System only accepts screenshots of pause menus or upgrade pauses, as described. Only cropped or fullscreen-with-left-upgrade-area are supported. | High |
| **REQ-F-02** | **Intelligent Auto-Crop:** Auto-crop operates only on the left-hand side for fullscreen screenshots, or skips cropping for perfectly-sized images. | High |
| **REQ-F-03** | **Manual Crop Fallback:** Simple user crop adjustment is prompted only if auto-detection fails. | High |
| **REQ-F-04** | **Multi-Algorithm Recognition:** Recognition engine may use multiple image analysis techniques (Brightness, Color, Edge, Pattern, etc). Technical approaches are still in consideration and not set in stone. | High |
| **REQ-F-05** | **Direct Cheatsheet Update:** Results directly update the main cheatsheet via the checked state. | High |
| **REQ-F-06** | **Confidence Flagging:** UI visually marks hexagons with low recognition confidence (<90%) using animation. | High |
| **REQ-F-07** | **Visual Correction Interface:** Flagged hexagons open a UI for correction, showing the cropped image and top mod candidates. | High |
| **REQ-F-08** | **Review Mode State:** Clear “Review Mode” with dynamic header, number of mods awaiting confirmation. | Medium |
| **REQ-F-09** | **Passive Feedback Storage:** User corrections are stored locally in IndexedDB. | Medium |
| **REQ-F-10** | **Client-Side Personalization:** Previously corrected images are checked before running recognition to improve speed and accuracy for that user. | Medium |
| **REQ-F-11** | **Opt-In Feedback Submission:** Users can generate a pre-filled GitHub Issue URL containing all corrections for the session. | Medium |

#### 5.2. Non-Functional Requirements

| ID | Requirement Description | Priority |
|----|------------------------|----------|
| **REQ-NF-01** | **Static Site Only:** All processing is 100% client-side, no backend/server calls. | High |
| **REQ-NF-02** | **Performance:** Upload-to-confirmed state must be <20s on typical 2018 desktop hardware. | High |
| **REQ-NF-03** | **Accuracy:** >75% raw recognition accuracy with >95% user-verified accuracy via review. | High |
| **REQ-NF-04** | **Browser Compatibility:** Fully functional on latest versions of Chrome, Firefox, Safari, Edge. | High |
| **REQ-NF-05** | **Responsive UI:** All new UI is usable on mobile devices. | Medium |
| **REQ-NF-06** | **Privacy:** All processing is local; no screenshots or correction data leave the user's device without explicit opt-in. | High |
| **REQ-NF-07** | **Accessibility:** UI should be navigable by keyboard and screen reader-friendly for essential actions (upload, review, confirm). | Medium |

---

### 6. Success Metrics

* **Adoption Rate:** % of users who try the upload feature.
* **Completion Rate:** % of uploads resulting in a fully confirmed build.
* **Average Correction Count:** Fewer corrections per import indicates improving accuracy.
* **Feedback Submission Rate:** Number of GitHub feedbacks per 1,000 uses.
* **Time-to-Value:** Average time from upload to confirmed build.

---

### Out of Scope
- Screenshots not taken from Nova Drift's pause/upgrade menus
- Screenshots with UI overlays (e.g., damage numbers, notifications)
- Mobile or non-standard aspect ratios
- Multi-player or modded UI variants

---

**Note:**  
Technical approaches (multi-algorithm recognition, auto-cropping details, etc.) are still being considered and will be finalized during prototyping. This document only specifies the requirements and user experience expectations.

---

**Feedback Usage:**  
Passive feedback data (corrections) are stored locally and may be submitted via GitHub issues. These reports will be used to iteratively improve the recognition model and template matching accuracy over time.
