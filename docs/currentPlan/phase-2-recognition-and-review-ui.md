# Phase 2: Recognition & Review UI

**Objective:** To process the extracted hexagons through the recognition engine and display the results on the cheatsheet, establishing the full "Review & Confirm" user experience with a preliminary feedback mechanism.

---

## 2.1. Recognition Engine Integration

### 2.1.1. Worker-Based Recognition Pipeline
**Modify:** `docs/workers/grid-processing-worker.js`
```javascript
// Add to existing worker script:

// Import recognition engine for worker use
importScripts('../recognition-engine/recognition-engine.js');

let recognitionEngine = null;

// Add new message handlers
case 'initialize-recognition-engine':
  recognitionEngine = new RecognitionEngine(data.config);
  result = { initialized: true };
  break;

case 'process-recognition':
  if (!recognitionEngine) {
    throw new Error('Recognition engine not initialized');
  }
  result = await processRecognition(data);
  break;

// Recognition processing function
async function processRecognition(data) {
  const { regionData, processingMetadata } = data;
  
  // Validate input data contract
  if (!regionData || !(regionData instanceof Map)) {
    throw new Error('Invalid region data for recognition');
  }
  
  console.log(`Worker: Starting recognition of ${regionData.size} regions`);
  
  // Process regions through recognition engine
  const recognitionResults = await recognitionEngine.analyzeRegions(
    regionData, 
    processingMetadata
  );
  
  // Transform results to match data contract
  const transformedResults = {
    detectedMods: transformDetectedMods(recognitionResults.detectedMods),
    overallStats: recognitionResults.overallStats,
    processingMetadata: {
      ...recognitionResults.processingMetadata,
      workerProcessed: true,
      workerTimestamp: Date.now()
    }
  };
  
  return transformedResults;
}

function transformDetectedMods(detectedMods) {
  return detectedMods.map(mod => ({
    modName: mod.modName,
    position: mod.position,
    confidence: mod.confidence,
    candidateMatches: mod.candidateMatches || [],
    needsReview: mod.confidence < 0.85, // Configurable threshold
    gridPosition: mod.gridPosition,
    boundingBox: mod.boundingBox
  }));
}
```

### 2.1.2. Import Coordinator Recognition Flow
**Modify:** `docs/modules/import-coordinator.js`
```javascript
// Add to ImportCoordinator class:

async processRecognition(gridMappingResult) {
  console.log('ImportCoordinator: Starting recognition phase');
  
  try {
    await this.transitionTo('processing-recognition', {
      gridMappingResult: gridMappingResult
    });
    
    // Initialize recognition engine in worker if needed
    if (!this.workerPool) {
      this.workerPool = new WebWorkerPool('workers/grid-processing-worker.js', 2);
    }
    
    // Start performance monitoring
    window.budgetMonitor.startTimer('recognition-process');
    
    // Initialize recognition engine in worker
    await this.workerPool.executeTask('initialize-recognition-engine', {
      config: this.getRecognitionConfig()
    });
    
    // Process recognition
    const recognitionResult = await this.workerPool.executeTask('process-recognition', {
      regionData: gridMappingResult.coordinateMap,
      processingMetadata: gridMappingResult.gridMetadata
    });
    
    // Check performance budget
    window.budgetMonitor.endTimer('recognition-process');
    window.budgetMonitor.checkPhaseBudget('RECOGNITION', 'recognition-process');
    
    // Validate result against contract
    const validatedResult = window.dataContractManager.validate('recognition-result', recognitionResult);
    
    // Transition to review state
    await this.transitionTo('reviewing', {
      recognitionResults: validatedResult.data,
      gridMappingResult: gridMappingResult
    });
    
    // Trigger UI updates
    this.displayRecognitionResults(validatedResult.data);
    
    return validatedResult.data;
    
  } catch (error) {
    console.error('Recognition processing failed:', error);
    await window.errorRecoveryManager.handleError(error, {
      phase: 'recognition',
      gridMappingResult: gridMappingResult
    });
    throw error;
  }
}

getRecognitionConfig() {
  return {
    algorithms: ['brightness', 'color', 'edge', 'pattern'],
    consensusThreshold: 0.6,
    confidenceThreshold: this.getABTestThreshold(),
    batchProcessing: true,
    maxConcurrentAnalyses: 4
  };
}

getABTestThreshold() {
  // A/B testing for confidence threshold
  const userId = this.getUserId();
  const thresholds = [0.80, 0.85, 0.90];
  const index = userId % thresholds.length;
  
  // Log A/B test assignment
  this.logABTestAssignment('confidence-threshold', thresholds[index]);
  
  return thresholds[index];
}

getUserId() {
  // Generate stable user ID for A/B testing
  let userId = localStorage.getItem('nova-drift-user-id');
  if (!userId) {
    userId = Math.floor(Math.random() * 1000000);
    localStorage.setItem('nova-drift-user-id', userId);
  }
  return parseInt(userId);
}

logABTestAssignment(testName, value) {
  const assignment = {
    testName: testName,
    value: value,
    userId: this.getUserId(),
    timestamp: Date.now()
  };
  
  // Store for analytics
  const assignments = JSON.parse(localStorage.getItem('ab-test-assignments') || '[]');
  assignments.push(assignment);
  localStorage.setItem('ab-test-assignments', JSON.stringify(assignments));
  
  console.log(`A/B Test Assignment: ${testName} = ${value}`);
}
```

---

## 2.2. Cheatsheet Display Integration

### 2.2.1. Review Mode UI State Management
**File:** `docs/modules/review-mode-manager.js`
```javascript
class ReviewModeManager {
  constructor() {
    this.isActive = false;
    this.pendingReviews = new Map();
    this.reviewStats = {
      totalMods: 0,
      confirmedMods: 0,
      pendingMods: 0
    };
    
    this.init();
  }

  init() {
    this.createReviewHeader();
    this.setupEventListeners();
    this.initializeIndexedDB();
  }

  async activateReviewMode(recognitionResults) {
    console.log('Activating review mode with', recognitionResults.detectedMods.length, 'mods');
    
    this.isActive = true;
    this.pendingReviews.clear();
    
    // Set global state
    document.body.setAttribute('data-import-state', 'reviewing');
    
    // Process each detected mod
    for (const mod of recognitionResults.detectedMods) {
      await this.processMod(mod);
    }
    
    // Update UI
    this.updateReviewHeader();
    this.showReviewControls();
    this.disableNormalHexHandlers();
    
    // Auto-save state
    await this.saveReviewState();
    
    console.log('Review mode activated');
  }

  async processMod(mod) {
    if (mod.needsReview) {
      // Add to pending reviews
      this.pendingReviews.set(mod.modName, mod);
      this.reviewStats.pendingMods++;
      
      // Apply visual indicator
      this.applyReviewIndicator(mod);
    } else {
      // High confidence - apply directly
      this.applyModSelection(mod, true);
      this.reviewStats.confirmedMods++;
    }
    
    this.reviewStats.totalMods++;
  }

  applyModSelection(mod, isConfirmed = false) {
    const hexElements = document.querySelectorAll(`.hex.${mod.modName}`);
    
    for (const hexElement of hexElements) {
      hexElement.setAttribute('checked', '');
      
      if (isConfirmed) {
        hexElement.classList.add('auto-confirmed');
      }
      
      // Handle recursive mods
      if (hexElement.classList.contains('rc') && mod.recursiveCount) {
        const rcDisplay = hexElement.parentElement.querySelector('.rcNum');
        if (rcDisplay) {
          rcDisplay.textContent = mod.recursiveCount > 9 ? '9+' : mod.recursiveCount.toString();
        }
      }
    }
  }

  applyReviewIndicator(mod) {
    const hexElements = document.querySelectorAll(`.hex.${mod.modName}`);
    
    for (const hexElement of hexElements) {
      hexElement.classList.add('needs-review');
      hexElement.setAttribute('data-confidence', mod.confidence.toFixed(2));
      hexElement.setAttribute('aria-describedby', 'review-tooltip');
      
      // Add click handler for review
      hexElement.addEventListener('click', (e) => this.handleReviewClick(e, mod));
    }
  }

  async handleReviewClick(event, mod) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const correction = await this.showCorrectionModal(mod);
      await this.applyCorrection(mod.modName, correction);
    } catch (error) {
      if (error.message !== 'cancelled') {
        console.error('Review correction failed:', error);
      }
    }
  }

  createReviewHeader() {
    const header = document.createElement('div');
    header.id = 'review-mode-header';
    header.className = 'review-mode-header';
    header.style.display = 'none';
    
    header.innerHTML = `
      <div class="review-header-content">
        <div class="review-status">
          <h3>Review Mode</h3>
          <span id="review-progress">0 of 0 mods require confirmation</span>
        </div>
        <div class="review-actions">
          <button id="confirm-all-btn" class="btn btn-secondary" disabled>
            Confirm All Medium Confidence
          </button>
          <button id="finish-review-btn" class="btn btn-primary" disabled>
            Finish Review
          </button>
          <button id="cancel-review-btn" class="btn btn-outline">
            Cancel
          </button>
        </div>
      </div>
      <div class="review-help">
        <span class="help-text">
          Click on <span class="needs-review-example">highlighted mods</span> to review and confirm.
          Confidence scores are shown on hover.
        </span>
      </div>
    `;
    
    // Insert at top of page
    document.body.insertBefore(header, document.body.firstChild);
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'confirm-all-btn') {
        this.confirmAllMediumConfidence();
      } else if (e.target.id === 'finish-review-btn') {
        this.finishReview();
      } else if (e.target.id === 'cancel-review-btn') {
        this.cancelReview();
      }
    });
  }

  showReviewControls() {
    const header = document.getElementById('review-mode-header');
    header.style.display = 'block';
    
    // Scroll to header
    header.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  updateReviewHeader() {
    const progressEl = document.getElementById('review-progress');
    const confirmAllBtn = document.getElementById('confirm-all-btn');
    const finishBtn = document.getElementById('finish-review-btn');
    
    progressEl.textContent = `${this.reviewStats.pendingMods} of ${this.reviewStats.totalMods} mods require confirmation`;
    
    // Enable/disable buttons based on state
    const mediumConfidenceMods = Array.from(this.pendingReviews.values())
      .filter(mod => mod.confidence >= 0.8).length;
    
    confirmAllBtn.disabled = mediumConfidenceMods === 0;
    confirmAllBtn.textContent = `Confirm All Medium Confidence (${mediumConfidenceMods})`;
    
    finishBtn.disabled = this.reviewStats.pendingMods > 0;
  }

  disableNormalHexHandlers() {
    // Temporarily disable normal hex click handlers
    const hexes = document.querySelectorAll('.hex:not(.needs-review)');
    hexes.forEach(hex => {
      hex.style.pointerEvents = 'none';
      hex.classList.add('review-mode-disabled');
    });
  }

  enableNormalHexHandlers() {
    // Re-enable normal hex click handlers
    const hexes = document.querySelectorAll('.hex');
    hexes.forEach(hex => {
      hex.style.pointerEvents = '';
      hex.classList.remove('review-mode-disabled');
      hex.classList.remove('needs-review');
      hex.removeAttribute('data-confidence');
    });
  }

  async confirmAllMediumConfidence() {
    const mediumConfidenceMods = Array.from(this.pendingReviews.entries())
      .filter(([_, mod]) => mod.confidence >= 0.8);
    
    for (const [modName, mod] of mediumConfidenceMods) {
      await this.applyCorrection(modName, {
        selectedMod: mod.modName,
        confidence: mod.confidence,
        source: 'batch-confirm'
      });
    }
    
    this.updateReviewHeader();
  }

  async applyCorrection(modName, correction) {
    // Remove from pending reviews
    this.pendingReviews.delete(modName);
    this.reviewStats.pendingMods--;
    this.reviewStats.confirmedMods++;
    
    // Update visual state
    const hexElements = document.querySelectorAll(`.hex.${modName}`);
    hexElements.forEach(hex => {
      hex.classList.remove('needs-review');
      hex.classList.add('user-confirmed');
      hex.removeAttribute('data-confidence');
    });
    
    // Apply selection if confirmed
    if (correction.selectedMod === modName) {
      this.applyModSelection({ modName: correction.selectedMod }, true);
    }
    
    // Log correction for analytics/feedback
    this.logUserCorrection(modName, correction);
    
    // Update UI
    this.updateReviewHeader();
    
    // Auto-save state
    await this.saveReviewState();
  }

  logUserCorrection(originalMod, correction) {
    const correctionData = {
      originalMod: originalMod,
      selectedMod: correction.selectedMod,
      confidence: correction.confidence,
      timestamp: Date.now(),
      source: correction.source || 'manual',
      sessionId: this.getSessionId()
    };
    
    // Store for feedback system
    const corrections = JSON.parse(localStorage.getItem('user-corrections') || '[]');
    corrections.push(correctionData);
    localStorage.setItem('user-corrections', JSON.stringify(corrections));
    
    // Dispatch event for other systems
    document.dispatchEvent(new CustomEvent('user-correction', {
      detail: correctionData
    }));
  }

  async finishReview() {
    if (this.reviewStats.pendingMods > 0) {
      const confirmExit = confirm(`You have ${this.reviewStats.pendingMods} mods still pending review. Finish anyway?`);
      if (!confirmExit) return;
    }
    
    await this.deactivateReviewMode();
    
    // Dispatch completion event
    document.dispatchEvent(new CustomEvent('review-completed', {
      detail: {
        totalMods: this.reviewStats.totalMods,
        confirmedMods: this.reviewStats.confirmedMods,
        pendingMods: this.reviewStats.pendingMods
      }
    }));
  }

  async cancelReview() {
    const confirmCancel = confirm('Cancel review and reset all changes?');
    if (!confirmCancel) return;
    
    // Reset all mod selections
    const checkedHexes = document.querySelectorAll('.hex[checked]');
    checkedHexes.forEach(hex => {
      hex.removeAttribute('checked');
      hex.classList.remove('auto-confirmed', 'user-confirmed');
    });
    
    await this.deactivateReviewMode();
    
    // Dispatch cancellation event
    document.dispatchEvent(new CustomEvent('review-cancelled'));
  }

  async deactivateReviewMode() {
    this.isActive = false;
    
    // Reset UI state
    document.body.removeAttribute('data-import-state');
    document.getElementById('review-mode-header').style.display = 'none';
    
    // Re-enable normal handlers
    this.enableNormalHexHandlers();
    
    // Clear review state
    this.pendingReviews.clear();
    this.reviewStats = { totalMods: 0, confirmedMods: 0, pendingMods: 0 };
    
    // Clear saved state
    await this.clearReviewState();
    
    console.log('Review mode deactivated');
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('review-session-id');
    if (!sessionId) {
      sessionId = Date.now().toString();
      sessionStorage.setItem('review-session-id', sessionId);
    }
    return sessionId;
  }

  // IndexedDB integration for state persistence
  async initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NovaCheatsheetReview', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('reviewStates')) {
          const store = db.createObjectStore('reviewStates', { keyPath: 'sessionId' });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async saveReviewState() {
    if (!this.db) return;
    
    const state = {
      sessionId: this.getSessionId(),
      pendingReviews: Object.fromEntries(this.pendingReviews),
      reviewStats: this.reviewStats,
      timestamp: Date.now()
    };
    
    const transaction = this.db.transaction(['reviewStates'], 'readwrite');
    const store = transaction.objectStore('reviewStates');
    await store.put(state);
  }

  async clearReviewState() {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['reviewStates'], 'readwrite');
    const store = transaction.objectStore('reviewStates');
    await store.delete(this.getSessionId());
  }
}

// Global instance
window.reviewModeManager = new ReviewModeManager();
```

### 2.2.2. Correction Modal Interface
**File:** `docs/modules/correction-modal.js`
```javascript
class CorrectionModal {
  constructor() {
    this.modal = null;
    this.currentMod = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    
    this.createModal();
    this.setupEventListeners();
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'correction-modal';
    modal.className = 'correction-modal';
    modal.style.display = 'none';
    
    modal.innerHTML = `
      <div class="correction-modal-backdrop"></div>
      <div class="correction-modal-container" role="dialog" aria-labelledby="correction-title" aria-modal="true">
        <div class="correction-modal-header">
          <h3 id="correction-title">Confirm Mod Selection</h3>
          <button class="correction-modal-close" aria-label="Close">&times;</button>
        </div>
        
        <div class="correction-modal-body">
          <div class="original-detection">
            <h4>Detected:</h4>
            <div class="detected-mod-info">
              <div class="mod-icon-container">
                <img id="detected-mod-icon" src="" alt="Detected mod">
              </div>
              <div class="mod-details">
                <span id="detected-mod-name">Loading...</span>
                <span id="detected-confidence" class="confidence-badge">0%</span>
              </div>
            </div>
          </div>
          
          <div class="correction-options">
            <h4>Select Correct Mod:</h4>
            <div class="candidate-list" id="candidate-list">
              <!-- Populated dynamically -->
            </div>
            
            <div class="manual-search-section">
              <label for="manual-search">Or search manually:</label>
              <input type="text" id="manual-search" placeholder="Type mod name..." autocomplete="off">
              <div class="search-results" id="search-results"></div>
            </div>
          </div>
          
          <div class="confidence-explanation">
            <details>
              <summary>Why does this need review?</summary>
              <div id="confidence-explanation-text">
                This mod was detected with medium confidence. Please verify the selection is correct.
              </div>
            </details>
          </div>
        </div>
        
        <div class="correction-modal-footer">
          <button class="btn btn-secondary" id="correction-cancel">Cancel</button>
          <button class="btn btn-danger" id="correction-skip">No Mod Here</button>
          <button class="btn btn-primary" id="correction-confirm" disabled>Confirm Selection</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.modal = modal;
  }

  setupEventListeners() {
    // Button handlers
    this.modal.querySelector('#correction-confirm').addEventListener('click', this.confirmSelection.bind(this));
    this.modal.querySelector('#correction-cancel').addEventListener('click', this.cancelCorrection.bind(this));
    this.modal.querySelector('#correction-skip').addEventListener('click', this.skipMod.bind(this));
    this.modal.querySelector('.correction-modal-close').addEventListener('click', this.cancelCorrection.bind(this));
    
    // Backdrop click
    this.modal.querySelector('.correction-modal-backdrop').addEventListener('click', this.cancelCorrection.bind(this));
    
    // Manual search
    this.modal.querySelector('#manual-search').addEventListener('input', this.handleManualSearch.bind(this));
    
    // Keyboard navigation
    this.modal.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  async show(mod) {
    this.currentMod = mod;
    
    // Populate modal with mod data
    await this.populateModalData(mod);
    
    // Show modal
    this.modal.style.display = 'flex';
    
    // Focus first candidate
    const firstCandidate = this.modal.querySelector('.candidate-option');
    if (firstCandidate) {
      firstCandidate.focus();
    }
    
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });
  }

  hide() {
    this.modal.style.display = 'none';
    this.currentMod = null;
  }

  async populateModalData(mod) {
    // Set detected mod info
    document.getElementById('detected-mod-name').textContent = mod.modName;
    document.getElementById('detected-confidence').textContent = `${(mod.confidence * 100).toFixed(0)}% confidence`;
    
    // Load mod icon
    const iconUrl = `docs/assets/${mod.modName}.png`;
    const iconImg = document.getElementById('detected-mod-icon');
    iconImg.src = iconUrl;
    iconImg.onerror = () => {
      iconImg.src = 'docs/hex.png'; // Fallback
    };
    
    // Populate candidates
    await this.populateCandidates(mod);
    
    // Set confidence explanation
    this.setConfidenceExplanation(mod);
  }

  async populateCandidates(mod) {
    const candidateList = document.getElementById('candidate-list');
    candidateList.innerHTML = '';
    
    // Always include the detected mod as first option
    const candidates = [
      { modName: mod.modName, confidence: mod.confidence, isDetected: true },
      ...(mod.candidateMatches || []).slice(0, 3) // Top 3 alternatives
    ];
    
    // Remove duplicates
    const uniqueCandidates = candidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.modName === candidate.modName)
    );
    
    for (const candidate of uniqueCandidates) {
      const candidateEl = await this.createCandidateElement(candidate);
      candidateList.appendChild(candidateEl);
    }
  }

  async createCandidateElement(candidate) {
    const candidateEl = document.createElement('div');
    candidateEl.className = 'candidate-option';
    candidateEl.setAttribute('data-mod-name', candidate.modName);
    candidateEl.setAttribute('tabindex', '0');
    candidateEl.setAttribute('role', 'radio');
    
    if (candidate.isDetected) {
      candidateEl.classList.add('detected-option');
    }
    
    candidateEl.innerHTML = `
      <div class="candidate-icon">
        <img src="docs/assets/${candidate.modName}.png" 
             alt="${candidate.modName}" 
             onerror="this.src='docs/hex.png'">
      </div>
      <div class="candidate-info">
        <span class="candidate-name">${candidate.modName}</span>
        <span class="candidate-confidence">${(candidate.confidence * 100).toFixed(0)}%</span>
        ${candidate.isDetected ? '<span class="detected-badge">Detected</span>' : ''}
      </div>
    `;
    
    // Click handler
    candidateEl.addEventListener('click', () => this.selectCandidate(candidate.modName));
    candidateEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectCandidate(candidate.modName);
      }
    });
    
    return candidateEl;
  }

  selectCandidate(modName) {
    // Update visual selection
    this.modal.querySelectorAll('.candidate-option').forEach(el => {
      el.classList.remove('selected');
      el.setAttribute('aria-checked', 'false');
    });
    
    const selectedEl = this.modal.querySelector(`[data-mod-name="${modName}"]`);
    if (selectedEl) {
      selectedEl.classList.add('selected');
      selectedEl.setAttribute('aria-checked', 'true');
    }
    
    // Clear manual search
    document.getElementById('manual-search').value = '';
    document.getElementById('search-results').innerHTML = '';
    
    // Enable confirm button
    document.getElementById('correction-confirm').disabled = false;
    
    this.selectedMod = modName;
  }

  handleManualSearch(event) {
    const query = event.target.value.toLowerCase();
    const resultsContainer = document.getElementById('search-results');
    
    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      return;
    }
    
    // Search through available mods
    const allMods = this.getAllAvailableMods();
    const matches = allMods.filter(mod => 
      mod.toLowerCase().includes(query)
    ).slice(0, 5);
    
    resultsContainer.innerHTML = '';
    
    for (const mod of matches) {
      const resultEl = document.createElement('div');
      resultEl.className = 'search-result';
      resultEl.setAttribute('tabindex', '0');
      
      resultEl.innerHTML = `
        <img src="docs/assets/${mod}.png" alt="${mod}" onerror="this.src='docs/hex.png'">
        <span>${mod}</span>
      `;
      
      resultEl.addEventListener('click', () => {
        this.selectCandidate(mod);
        resultsContainer.innerHTML = '';
        document.getElementById('manual-search').value = mod;
      });
      
      resultsContainer.appendChild(resultEl);
    }
  }

  getAllAvailableMods() {
    // Extract from existing mod data or DOM
    const hexElements = document.querySelectorAll('.hex[data-hex-name]');
    const mods = new Set();
    
    hexElements.forEach(hex => {
      const modName = hex.getAttribute('data-hex-name');
      if (modName) {
        mods.add(modName);
      }
    });
    
    return Array.from(mods).sort();
  }

  setConfidenceExplanation(mod) {
    const explanationEl = document.getElementById('confidence-explanation-text');
    
    let explanation = '';
    if (mod.confidence < 0.6) {
      explanation = 'Low confidence detection. The recognition algorithm was uncertain about this mod identification.';
    } else if (mod.confidence < 0.8) {
      explanation = 'Medium confidence detection. Please verify this is the correct mod.';
    } else {
      explanation = 'High confidence detection flagged for review due to user preferences.';
    }
    
    explanationEl.textContent = explanation;
  }

  confirmSelection() {
    if (!this.selectedMod) {
      alert('Please select a mod option');
      return;
    }
    
    const correction = {
      selectedMod: this.selectedMod,
      confidence: this.currentMod.confidence,
      source: 'user-correction',
      originalDetection: this.currentMod.modName,
      timestamp: Date.now()
    };
    
    this.hide();
    this.resolvePromise(correction);
  }

  skipMod() {
    const correction = {
      selectedMod: null,
      confidence: 0,
      source: 'user-skip',
      originalDetection: this.currentMod.modName,
      timestamp: Date.now()
    };
    
    this.hide();
    this.resolvePromise(correction);
  }

  cancelCorrection() {
    this.hide();
    this.rejectPromise(new Error('cancelled'));
  }

  handleKeydown(event) {
    switch (event.key) {
      case 'Escape':
        this.cancelCorrection();
        break;
      case 'Enter':
        if (event.target.classList.contains('candidate-option')) {
          const modName = event.target.getAttribute('data-mod-name');
          this.selectCandidate(modName);
        } else if (event.target.id === 'correction-confirm') {
          this.confirmSelection();
        }
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        this.handleArrowNavigation(event);
        break;
    }
  }

  handleArrowNavigation(event) {
    const candidates = Array.from(this.modal.querySelectorAll('.candidate-option'));
    const current = document.activeElement;
    const currentIndex = candidates.indexOf(current);
    
    if (currentIndex === -1) return;
    
    event.preventDefault();
    
    let nextIndex;
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % candidates.length;
    } else {
      nextIndex = (currentIndex - 1 + candidates.length) % candidates.length;
    }
    
    candidates[nextIndex].focus();
  }
}

// Global instance
window.correctionModal = new CorrectionModal();

// Integration with ReviewModeManager
ReviewModeManager.prototype.showCorrectionModal = function(mod) {
  return window.correctionModal.show(mod);
};
```

---

## 2.3. Review Mode Styling

### 2.3.1. Review Mode CSS
**Add to:** `docs/style.css`
```css
/* Review Mode Styles */
.review-mode-header {
  position: sticky;
  top: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.review-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.review-status h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.review-status span {
  font-size: 14px;
  opacity: 0.9;
}

.review-actions {
  display: flex;
  gap: 10px;
}

.review-help {
  margin-top: 10px;
  font-size: 13px;
  opacity: 0.9;
}

.needs-review-example {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  animation: reviewPulse 2s infinite;
}

@keyframes reviewPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* Hex states during review */
[data-import-state="reviewing"] .hex.needs-review {
  position: relative;
  animation: needsReviewPulse 2s infinite;
  cursor: pointer;
}

@keyframes needsReviewPulse {
  0%, 100% { 
    box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.4);
    filter: brightness(1.1);
  }
  50% { 
    box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.7);
    filter: brightness(1.3);
  }
}

[data-import-state="reviewing"] .hex.needs-review::after {
  content: attr(data-confidence);
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffc107;
  color: #000;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 8px;
  font-weight: bold;
  line-height: 1;
}

[data-import-state="reviewing"] .hex.auto-confirmed {
  border: 2px solid #28a745;
  filter: brightness(1.2);
}

[data-import-state="reviewing"] .hex.user-confirmed {
  border: 2px solid #007bff;
  filter: brightness(1.2);
}

[data-import-state="reviewing"] .hex.review-mode-disabled {
  opacity: 0.6;
  filter: grayscale(0.5);
}

/* Correction Modal Styles */
.correction-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.correction-modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
}

.correction-modal-container {
  position: relative;
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from { transform: scale(0.9) translateY(-20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.correction-modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.correction-modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  color: #666;
}

.correction-modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.original-detection {
  margin-bottom: 25px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.detected-mod-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.mod-icon-container img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}

.mod-details {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.confidence-badge {
  background: #ffc107;
  color: #000;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  align-self: flex-start;
}

.correction-options h4 {
  margin: 0 0 15px 0;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.candidate-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.candidate-option:hover,
.candidate-option:focus {
  border-color: #007bff;
  background: #f8f9ff;
  outline: none;
}

.candidate-option.selected {
  border-color: #007bff;
  background: #e7f3ff;
}

.candidate-option.detected-option {
  border-color: #ffc107;
  background: #fffbf0;
}

.candidate-icon img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

.candidate-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.candidate-name {
  font-weight: 500;
}

.candidate-confidence {
  font-size: 12px;
  color: #666;
}

.detected-badge {
  background: #28a745;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 8px;
  align-self: flex-start;
}

.manual-search-section {
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.manual-search-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.manual-search-section input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.search-results {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 6px;
  margin-top: 8px;
  display: none;
}

.search-results:not(:empty) {
  display: block;
}

.search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.search-result:hover {
  background: #f8f9fa;
}

.search-result img {
  width: 24px;
  height: 24px;
  border-radius: 3px;
}

.confidence-explanation {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.confidence-explanation details {
  font-size: 14px;
}

.confidence-explanation summary {
  cursor: pointer;
  color: #007bff;
  margin-bottom: 8px;
}

.correction-modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .review-header-content {
    flex-direction: column;
    gap: 15px;
  }
  
  .review-actions {
    width: 100%;
    justify-content: center;
  }
  
  .correction-modal-container {
    width: 95vw;
    max-height: 90vh;
  }
  
  .candidate-option {
    padding: 10px;
  }
  
  .candidate-icon img {
    width: 28px;
    height: 28px;
  }
}

/* Button styles for review mode */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-outline {
  background: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}
```

---

## 2.4. A/B Testing and Analytics Framework

### 2.4.1. A/B Testing Manager
**File:** `docs/modules/ab-testing.js`
```javascript
class ABTestManager {
  constructor() {
    this.activeTests = new Map();
    this.userAssignments = new Map();
    this.testResults = new Map();
    
    this.loadActiveTests();
    this.loadUserAssignments();
  }

  loadActiveTests() {
    // Define active A/B tests
    this.activeTests.set('confidence-threshold', {
      name: 'confidence-threshold',
      variants: [
        { id: 'low', value: 0.80, weight: 0.33 },
        { id: 'medium', value: 0.85, weight: 0.34 },
        { id: 'high', value: 0.90, weight: 0.33 }
      ],
      active: true,
      startDate: '2025-01-01',
      endDate: '2025-03-01'
    });

    this.activeTests.set('review-ui-style', {
      name: 'review-ui-style',
      variants: [
        { id: 'pulsing', value: 'pulse', weight: 0.5 },
        { id: 'static', value: 'static', weight: 0.5 }
      ],
      active: true,
      startDate: '2025-01-01',
      endDate: '2025-02-15'
    });
  }

  loadUserAssignments() {
    const stored = localStorage.getItem('ab-test-assignments');
    if (stored) {
      const assignments = JSON.parse(stored);
      assignments.forEach(assignment => {
        this.userAssignments.set(assignment.testName, assignment);
      });
    }
  }

  getUserId() {
    let userId = localStorage.getItem('nova-drift-user-id');
    if (!userId) {
      userId = Math.floor(Math.random() * 1000000);
      localStorage.setItem('nova-drift-user-id', userId);
    }
    return parseInt(userId);
  }

  assignUserToTest(testName) {
    // Check if user is already assigned
    if (this.userAssignments.has(testName)) {
      return this.userAssignments.get(testName);
    }

    const test = this.activeTests.get(testName);
    if (!test || !test.active) {
      return null;
    }

    // Determine variant based on user ID for consistency
    const userId = this.getUserId();
    const hash = this.hashUserId(userId, testName);
    const variant = this.selectVariantByWeight(test.variants, hash);

    const assignment = {
      testName: testName,
      variant: variant.id,
      value: variant.value,
      userId: userId,
      assignedAt: Date.now(),
      hash: hash
    };

    this.userAssignments.set(testName, assignment);
    this.saveUserAssignments();

    console.log(`A/B Test Assignment: ${testName} = ${variant.id} (${variant.value})`);
    return assignment;
  }

  hashUserId(userId, testName) {
    // Simple hash function for consistent variant assignment
    const str = `${userId}-${testName}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  selectVariantByWeight(variants, hash) {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const randomValue = (hash % 1000) / 1000; // Normalize to 0-1
    
    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight / totalWeight;
      if (randomValue <= cumulativeWeight) {
        return variant;
      }
    }
    
    return variants[variants.length - 1]; // Fallback
  }

  getTestValue(testName) {
    const assignment = this.assignUserToTest(testName);
    return assignment ? assignment.value : null;
  }

  recordTestResult(testName, metric, value) {
    const assignment = this.userAssignments.get(testName);
    if (!assignment) return;

    const resultKey = `${testName}-${assignment.variant}`;
    if (!this.testResults.has(resultKey)) {
      this.testResults.set(resultKey, {
        testName: testName,
        variant: assignment.variant,
        metrics: new Map()
      });
    }

    const result = this.testResults.get(resultKey);
    if (!result.metrics.has(metric)) {
      result.metrics.set(metric, []);
    }

    result.metrics.get(metric).push({
      value: value,
      timestamp: Date.now(),
      userId: assignment.userId
    });

    this.saveTestResults();
  }

  saveUserAssignments() {
    const assignments = Array.from(this.userAssignments.values());
    localStorage.setItem('ab-test-assignments', JSON.stringify(assignments));
  }

  saveTestResults() {
    const results = Array.from(this.testResults.values()).map(result => ({
      testName: result.testName,
      variant: result.variant,
      metrics: Object.fromEntries(
        Array.from(result.metrics.entries()).map(([metric, values]) => [
          metric,
          values
        ])
      )
    }));
    
    localStorage.setItem('ab-test-results', JSON.stringify(results));
  }

  getTestReport(testName) {
    const results = Array.from(this.testResults.values())
      .filter(result => result.testName === testName);

    const report = {
      testName: testName,
      variants: {},
      summary: {}
    };

    for (const result of results) {
      report.variants[result.variant] = {};
      
      for (const [metric, values] of result.metrics) {
        const numericValues = values.map(v => v.value).filter(v => typeof v === 'number');
        
        report.variants[result.variant][metric] = {
          count: values.length,
          average: numericValues.length > 0 ? 
            numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length : 0,
          values: values
        };
      }
    }

    return report;
  }

  exportTestData() {
    return {
      assignments: Object.fromEntries(this.userAssignments),
      results: Object.fromEntries(this.testResults),
      timestamp: Date.now()
    };
  }
}

// Global instance
window.abTestManager = new ABTestManager();
```

### 2.4.2. Integration with Import Coordinator
**Add to:** `docs/modules/import-coordinator.js`
```javascript
// Add method to ImportCoordinator class:
getRecognitionConfig() {
  // Get A/B test value for confidence threshold
  const confidenceThreshold = window.abTestManager.getTestValue('confidence-threshold') || 0.85;
  
  return {
    algorithms: ['brightness', 'color', 'edge', 'pattern'],
    consensusThreshold: 0.6,
    confidenceThreshold: confidenceThreshold,
    batchProcessing: true,
    maxConcurrentAnalyses: 4
  };
}

// Record A/B test metrics
recordTestMetrics(recognitionResults) {
  const stats = recognitionResults.overallStats;
  
  // Record key metrics for A/B testing
  window.abTestManager.recordTestResult('confidence-threshold', 'accuracy', stats.averageConfidence);
  window.abTestManager.recordTestResult('confidence-threshold', 'mods-flagged-for-review', stats.totalAnalyzed - stats.highConfidence);
  window.abTestManager.recordTestResult('confidence-threshold', 'total-mods-detected', stats.totalAnalyzed);
}
```

---

## 2.5. Preliminary Feedback System

### 2.5.1. Basic Feedback Collection
**File:** `docs/modules/feedback-system.js`
```javascript
class FeedbackSystem {
  constructor() {
    this.feedbackData = new Map();
    this.sessionData = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      corrections: [],
      stats: {
        totalMods: 0,
        correctionsNeeded: 0,
        userCancellations: 0
      }
    };
    
    this.setupEventListeners();
    this.createFeedbackButton();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setupEventListeners() {
    // Listen for user corrections
    document.addEventListener('user-correction', (event) => {
      this.recordCorrection(event.detail);
    });

    // Listen for review completion
    document.addEventListener('review-completed', (event) => {
      this.recordSessionCompletion(event.detail);
    });

    // Listen for review cancellation
    document.addEventListener('review-cancelled', () => {
      this.sessionData.stats.userCancellations++;
    });
  }

  recordCorrection(correctionData) {
    this.sessionData.corrections.push({
      ...correctionData,
      sessionId: this.sessionData.sessionId
    });
    
    this.sessionData.stats.correctionsNeeded++;
    
    console.log('Feedback: Recorded user correction');
  }

  recordSessionCompletion(completionData) {
    this.sessionData.stats = {
      ...this.sessionData.stats,
      ...completionData,
      completedAt: Date.now(),
      sessionDuration: Date.now() - this.sessionData.startTime
    };
    
    console.log('Feedback: Session completed', this.sessionData.stats);
    
    // Show feedback option if user made corrections
    if (this.sessionData.stats.correctionsNeeded > 0) {
      this.showFeedbackPrompt();
    }
  }

  createFeedbackButton() {
    const button = document.createElement('button');
    button.id = 'feedback-button';
    button.className = 'feedback-button';
    button.innerHTML = `
      <span>📝</span>
      <span>Help Improve Recognition</span>
      <span class="feedback-dot" style="display: none;"></span>
    `;
    button.style.display = 'none';
    
    button.addEventListener('click', this.showFeedbackDialog.bind(this));
    
    // Add to page (e.g., in footer)
    const footer = document.querySelector('footer') || document.body;
    footer.appendChild(button);
    
    this.feedbackButton = button;
  }

  showFeedbackPrompt() {
    // Show notification dot
    const dot = this.feedbackButton.querySelector('.feedback-dot');
    dot.style.display = 'block';
    
    // Show button
    this.feedbackButton.style.display = 'flex';
    
    // Optional: Show brief notification
    this.showNotification('Your feedback can help improve recognition accuracy!', 5000);
  }

  showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'feedback-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, duration);
  }

  showFeedbackDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'feedback-dialog';
    dialog.innerHTML = `
      <div class="feedback-dialog-backdrop"></div>
      <div class="feedback-dialog-container">
        <div class="feedback-dialog-header">
          <h3>Help Improve Recognition</h3>
          <button class="feedback-dialog-close">&times;</button>
        </div>
        
        <div class="feedback-dialog-body">
          <p>Thank you for using the screenshot recognition feature! Your corrections help improve the system.</p>
          
          <div class="feedback-stats">
            <div class="stat">
              <span class="stat-value">${this.sessionData.stats.totalMods}</span>
              <span class="stat-label">Total Mods</span>
            </div>
            <div class="stat">
              <span class="stat-value">${this.sessionData.stats.correctionsNeeded}</span>
              <span class="stat-label">Corrections Made</span>
            </div>
            <div class="stat">
              <span class="stat-value">${this.sessionData.stats.confirmedMods}</span>
              <span class="stat-label">Confirmed</span>
            </div>
          </div>
          
          <div class="feedback-options">
            <label>
              <input type="checkbox" id="feedback-include-stats" checked>
              Include session statistics
            </label>
            <label>
              <input type="checkbox" id="feedback-include-corrections">
              Include correction details (helps improve accuracy)
            </label>
          </div>
          
          <div class="feedback-note">
            <p><strong>Privacy:</strong> No screenshot data is included. Only correction statistics and mod names are shared.</p>
          </div>
        </div>
        
        <div class="feedback-dialog-footer">
          <button class="btn btn-secondary" id="feedback-cancel">Cancel</button>
          <button class="btn btn-primary" id="feedback-submit">Submit Feedback</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Event handlers
    dialog.querySelector('#feedback-cancel').addEventListener('click', () => dialog.remove());
    dialog.querySelector('.feedback-dialog-close').addEventListener('click', () => dialog.remove());
    dialog.querySelector('.feedback-dialog-backdrop').addEventListener('click', () => dialog.remove());
    dialog.querySelector('#feedback-submit').addEventListener('click', () => {
      this.submitFeedback(dialog);
    });
  }

  async submitFeedback(dialog) {
    const includeStats = dialog.querySelector('#feedback-include-stats').checked;
    const includeCorrections = dialog.querySelector('#feedback-include-corrections').checked;
    
    try {
      const githubUrl = await this.generateGitHubIssueURL(includeStats, includeCorrections);
      
      // Open GitHub issue in new tab
      window.open(githubUrl, '_blank');
      
      // Hide feedback button
      this.feedbackButton.style.display = 'none';
      
      // Show thank you message
      this.showNotification('Thank you for your feedback!', 3000);
      
      dialog.remove();
      
    } catch (error) {
      console.error('Failed to generate feedback URL:', error);
      alert('Failed to generate feedback link. Please try again.');
    }
  }

  async generateGitHubIssueURL(includeStats, includeCorrections) {
    const baseUrl = 'https://github.com/Gent8/nova-drift-cheatsheet/issues/new';
    
    let title = 'Recognition Feedback';
    if (this.sessionData.stats.correctionsNeeded > 0) {
      title += ` - ${this.sessionData.stats.correctionsNeeded} Corrections`;
    }
    
    let body = '## Recognition Feedback\n\n';
    body += 'Thank you for submitting feedback to help improve screenshot recognition!\n\n';
    
    if (includeStats) {
      body += '### Session Statistics\n';
      body += `- **Total Mods Detected:** ${this.sessionData.stats.totalMods}\n`;
      body += `- **Corrections Needed:** ${this.sessionData.stats.correctionsNeeded}\n`;
      body += `- **Confirmed Mods:** ${this.sessionData.stats.confirmedMods}\n`;
      body += `- **Session Duration:** ${Math.round(this.sessionData.stats.sessionDuration / 1000)}s\n`;
      body += `- **Date:** ${new Date().toISOString().split('T')[0]}\n\n`;
    }
    
    if (includeCorrections && this.sessionData.corrections.length > 0) {
      body += '### Correction Details\n';
      const corrections = this.sessionData.corrections.slice(0, 10); // Limit to prevent URL length issues
      
      corrections.forEach((correction, index) => {
        body += `${index + 1}. **${correction.originalDetection}** → **${correction.selectedMod || 'No Mod'}**\n`;
        if (correction.confidence) {
          body += `   - Original Confidence: ${(correction.confidence * 100).toFixed(0)}%\n`;
        }
      });
      
      if (this.sessionData.corrections.length > 10) {
        body += `\n*... and ${this.sessionData.corrections.length - 10} more corrections*\n`;
      }
      body += '\n';
    }
    
    body += '### Additional Comments\n';
    body += '<!-- Feel free to add any additional feedback or context -->\n\n';
    
    body += '---\n';
    body += '*This feedback was automatically generated by the Nova Drift Cheatsheet recognition system.*';
    
    // Encode URL components
    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);
    
    const url = `${baseUrl}?title=${encodedTitle}&body=${encodedBody}&labels=feedback,recognition`;
    
    // Check URL length limit (GitHub has ~8000 char limit)
    if (url.length > 8000) {
      // Trim body if too long
      const maxBodyLength = 8000 - baseUrl.length - encodedTitle.length - 100; // Buffer
      const trimmedBody = body.substring(0, maxBodyLength) + '\n\n*[Content trimmed due to length]*';
      return `${baseUrl}?title=${encodedTitle}&body=${encodeURIComponent(trimmedBody)}&labels=feedback,recognition`;
    }
    
    return url;
  }
}

// Initialize feedback system
window.feedbackSystem = new FeedbackSystem();
```

### 2.5.2. Feedback System Styling
**Add to:** `docs/style.css`
```css
/* Feedback System Styles */
.feedback-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  z-index: 1000;
}

.feedback-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.feedback-dot {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 12px;
  height: 12px;
  background: #ff4444;
  border: 2px solid white;
  border-radius: 50%;
  animation: feedbackPulse 2s infinite;
}

@keyframes feedbackPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.feedback-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #28a745;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  animation: slideInFromRight 0.3s ease-out;
}

@keyframes slideInFromRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Feedback Dialog Styles */
.feedback-dialog {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10002;
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-dialog-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
}

.feedback-dialog-container {
  position: relative;
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

.feedback-dialog-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feedback-dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  color: #666;
}

.feedback-dialog-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.feedback-stats {
  display: flex;
  gap: 20px;
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat {
  text-align: center;
  flex: 1;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.feedback-options {
  margin: 20px 0;
}

.feedback-options label {
  display: block;
  margin-bottom: 10px;
  cursor: pointer;
}

.feedback-options input[type="checkbox"] {
  margin-right: 8px;
}

.feedback-note {
  background: #e3f2fd;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.feedback-note p {
  margin: 0;
  font-size: 14px;
  color: #1565c0;
}

.feedback-dialog-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .feedback-button {
    bottom: 15px;
    right: 15px;
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .feedback-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .stat-value {
    font-size: 18px;
  }
}
```

---

**Exit Criteria for Phase 2:** The full recognition pipeline runs in a non-blocking worker. A user can see their imported build, correct flagged mods using an accessible interface, and have their progress saved to IndexedDB. A basic, image-free feedback mechanism is in place, and the framework for A/B testing confidence thresholds is built.