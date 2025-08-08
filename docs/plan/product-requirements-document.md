# Product Requirements Document: Screenshot Build Importer

| **Version** | **Status**      | **Author**      |
| :---------- | :-------------- | :-------------- |
| 1.0         | Draft for Review | User |         

---

### 1. Introduction & Vision

**1.1. Problem Statement**  
Nova Drift players frequently discover new and interesting builds by watching videos (e.g., on YouTube) or viewing shared images. Manually replicating these builds on the Nova Drift Cheatsheet is a tedious and error-prone process. It requires the user to toggle between the video/image and the cheatsheet, find each of the 30-60+ individual upgrades (hexagons) by eye, and click them one by one. This friction discourages experimentation and a core community activity.

**1.2. Feature Vision**  
Create a "Build Copier" that lets users upload a screenshot of a Nova Drift build configuration and have it instantly replicated on the cheatsheet. The feature will automate the work. The primary goal is to make build discovery and replication nearly effortless.

**1.3. Guiding Principles**
* **Frictionless First:** The ideal user interaction is “upload and done.” 
* **Trust Through Transparency:** The system must clearly flag any upgrades for which recognition is uncertain.
* **Static-First:** All functionality must run 100% client-side, in line with GitHub Pages hosting.

---

### 2. Goals & Objectives

**2.1. User Goals**
* Eliminate manual side-by-side comparison of hexagons.

**2.2. Project Goals**
* Solidify the cheatsheet’s role as an indispensable community tool.
---

#### User Stories
- As a Nova Drift player, I want to quickly import a build I see on YouTube so I can experiment with it myself.
---

### 3. Screenshot Requirements & Behaviour

**3.1. Expected Screenshot Types & Appearance**
- **Only expected screenshots:** The system only expects screenshots taken of the game’s *pause menu* or *upgrade pauses*. The specific type of pause is not relevant, as all have the same visual layout for upgrades.
- **Appearance:** The only possible variation in screenshot appearance is:
    1. **Perfectly cropped**: Screenshot contains only the upgrade (hexagon) area, no background or extra UI.
    2. **Fullscreen with upgrades on the left:** Screenshot of the full game window, with the upgrade area on the left-hand side.
- No other in-game or menu screens are supported. This greatly simplifies detection logic, as the upgrade area will *always* be present, in a known location.

**3.2. Hexagon Detection: No Recognition Area**

- **Unified Detection:**  
  The recognition engine will detect all hexagons present on the screen, with no distinction or segmentation between core upgrades and mod groups.
  
  - There is no separate recognition area or sectioning; all visible hexagons are treated equally for detection and recognition purposes.
  - The system will not attempt to assign special meaning or grouping (such as Weapon, Body, Shield, or mod types) based on position or layout.
  - All detected hexagons will be processed in a single pass, and their identities will be determined solely by their visual features.
  - The algorithm must support the possibility of duplicate upgrades and handle all assignments deterministically based on the detected hexagons.

---

### 4. User Journey & Flow

1. **Initiation:** User clicks “📷 Upload Screenshot” on the cheatsheet.
2. **File Selection:** User selects a screenshot file.
3. **Ingestion:**
  proceed immediately.
4. **Analysis:** analyze the image.
5. **State Display:** Cheatsheet updates; recognized hexagons are selected (leveraging the existing selection mechanism).
6. **after:**
    * Hexagons with less confidence are added to a uncertain list container above all hexagons and under the search bar and buttons, the hexagon images are put here.

- **Error Handling & User Experience:**  
    - If recognition fails completely, the user sees a clear, non-technical error message and tips for reuploading a screenshot.
    - If detection is inconsistent, the user can re-upload or go back a step without losing their session state.

---

### 5. Feature Requirements

#### 5.1. Functional Requirements

| ID | Requirement Description | Priority |
|----|------------------------|----------|
| **REQ-F-01** | **Screenshot Handling:**  Cropped screenshots (containing only the upgrade area) are recommended to the user for best results, but fullscreen is also supported, accurate results are not garaunteed to the user, and that';s ok. 
| **REQ-F-05** | **Direct Cheatsheet Update:** Results directly update the main cheatsheet via the checked state. 

#### 5.2. Non-Functional Requirements

| ID | Requirement Description | Priority |
|----|------------------------|----------|
| **REQ-NF-01** | **Static Site Only:** All processing is 100% client-side, no backend/server calls. 
| **REQ-NF-06** | **Privacy:** All processing is local; no screenshots or correction data leave the user's device without explicit opt-in.
| **REQ-NF-07** | **Accessibility:** UI should be screen reader-friendly for essential actions (upload, review, confirm). 

---


**Implementation Note:**
Hexagon recognition and template matching leverage a CSS sprite sheet (`hex.png`) for all upgrade icons. This enables efficient client-side image matching and template generation, fully compatible with static site constraints and the cheatsheet's rendering system.
