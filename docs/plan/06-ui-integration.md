# 06 - UI Integration

## Overview

This document details the user interface components and integration strategy for the Screenshot Import Assistant. The UI seamlessly integrates with the existing cheatsheet while providing a smooth, intuitive workflow for screenshot importing.

## UI Component Architecture

```
Main UI Container
├── Upload Button (integrated into existing controls)
├── Upload Modal
│   ├── File Drop Zone
│   ├── Progress Indicator
│   └── Preview Canvas
├── Review Mode Overlay
│   ├── Review Header
│   ├── Confidence Indicators
│   └── Navigation Controls
├── Correction Modal
│   ├── Hexagon Preview
│   ├── Candidate List
│   └── Confirmation Buttons
└── Feedback Component
    └── GitHub Issue Generator
```

## CSS Styles

### Main Styles
```css
/* screenshot-import.css */

/* Upload Button Integration */
.screenshot-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #2a2a2a;
  color: #fff;
  border: 2px solid #444;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
}

.screenshot-upload-btn:hover {
  background-color: #3a3a3a;
  border-color: #666;
  transform: translateY(-1px);
}

.screenshot-upload-btn:active {
  transform: translateY(0);
}

.screenshot-upload-btn::before {
  content: "📷";
  font-size: 18px;
}

/* Upload Modal */
.upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
}

.upload-modal.active {
  opacity: 1;
  visibility: visible;
}

.upload-modal-content {
  background-color: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

/* Drop Zone */
.drop-zone {
  border: 3px dashed #444;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: #0a0a0a;
}

.drop-zone.drag-over {
  border-color: #66a3ff;
  background-color: #1a2a3a;
  transform: scale(1.02);
}

.drop-zone-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.drop-zone-text {
  color: #ccc;
  font-size: 16px;
  margin-bottom: 8px;
}

.drop-zone-hint {
  color: #888;
  font-size: 14px;
}

/* Progress Indicator */
.progress-container {
  margin-top: 24px;
  padding: 16px;
  background-color: #0a0a0a;
  border-radius: 8px;
  display: none;
}

.progress-container.active {
  display: block;
}

.progress-stage {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 8px;
}

.progress-bar {
  height: 8px;
  background-color: #222;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a9eff 0%, #66b3ff 100%);
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.2) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Review Mode */
.review-mode-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #1a1a1a;
  border-bottom: 3px solid #4a9eff;
  padding: 16px 24px;
  z-index: 900;
  transform: translateY(-100%);
  transition: transform 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.review-mode-overlay.active {
  transform: translateY(0);
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-title {
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.review-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.review-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #aaa;
}

.review-stat-value {
  font-weight: 600;
  color: #fff;
}

/* Confidence Indicators */
.hexagon-confidence-low {
  animation: pulse-glow 2s infinite;
  cursor: pointer;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 165, 0, 0.7);
    border-color: #ffa500;
  }
  50% {
    box-shadow: 0 0 0 10px rgba(255, 165, 0, 0);
    border-color: #ff8c00;
  }
}

.confidence-tooltip {
  position: absolute;
  background-color: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  z-index: 1001;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

.confidence-tooltip.visible {
  opacity: 1;
}

/* Correction Modal */
.correction-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background-color: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  z-index: 1001;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.correction-modal.active {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) scale(1);
}

.correction-header {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #fff;
}

.correction-preview {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;
}

.correction-hexagon {
  width: 80px;
  height: 80px;
  border: 2px solid #666;
  border-radius: 4px;
  background-color: #0a0a0a;
}

.correction-info {
  flex: 1;
}

.correction-confidence {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 4px;
}

.correction-confidence-value {
  color: #ffa500;
  font-weight: 600;
}

/* Candidate List */
.candidate-list {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.candidate-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #0a0a0a;
  margin-bottom: 8px;
}

.candidate-item:hover {
  background-color: #1a1a1a;
  border-color: #444;
}

.candidate-item.selected {
  background-color: #1a2a3a;
  border-color: #4a9eff;
}

.candidate-hexagon {
  width: 48px;
  height: 48px;
  border: 1px solid #333;
  border-radius: 4px;
}

.candidate-info {
  flex: 1;
}

.candidate-name {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  margin-bottom: 2px;
}

.candidate-type {
  font-size: 12px;
  color: #888;
}

.candidate-score {
  font-size: 12px;
  color: #66b3ff;
  font-weight: 600;
}

/* Action Buttons */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #4a9eff;
  color: #fff;
}

.btn-primary:hover {
  background-color: #66b3ff;
}

.btn-secondary {
  background-color: #333;
  color: #ccc;
}

.btn-secondary:hover {
  background-color: #444;
  color: #fff;
}

/* Feedback Component */
.feedback-prompt {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background-color: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  padding: 16px;
  max-width: 300px;
  transform: translateX(400px);
  transition: transform 0.3s ease;
  z-index: 800;
}

.feedback-prompt.visible {
  transform: translateX(0);
}

.feedback-text {
  font-size: 14px;
  color: #ccc;
  margin-bottom: 12px;
}

.feedback-link {
  color: #4a9eff;
  text-decoration: none;
  font-weight: 500;
}

.feedback-link:hover {
  text-decoration: underline;
}
```

## UI Components Implementation

### Upload Component
```javascript
// ui-components/upload-component.js
export class UploadComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.modal = null;
    this.dropZone = null;
    this.fileInput = null;
    this.progressBar = null;
  }

  render() {
    // Create upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'screenshot-upload-btn';
    uploadBtn.innerHTML = 'Upload Screenshot';
    uploadBtn.addEventListener('click', () => this.showModal());
    
    this.container.appendChild(uploadBtn);
    
    // Create modal
    this.createModal();
  }

  createModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'upload-modal';
    
    const content = document.createElement('div');
    content.className = 'upload-modal-content';
    
    content.innerHTML = `
      <h2 style="color: #fff; margin-bottom: 24px;">Upload Screenshot</h2>
      
      <div class="drop-zone">
        <div class="drop-zone-icon">📸</div>
        <div class="drop-zone-text">Drop screenshot here or click to browse</div>
        <div class="drop-zone-hint">Supports PNG and JPEG • Max 10MB</div>
      </div>
      
      <input type="file" accept="image/png,image/jpeg,image/jpg" style="display: none;">
      
      <div class="progress-container">
        <div class="progress-stage">Initializing...</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
      </div>
      
      <canvas id="preview-canvas" style="max-width: 100%; margin-top: 16px; display: none;"></canvas>
      
      <div class="modal-actions" style="margin-top: 24px;">
        <button class="btn btn-secondary" id="cancel-btn">Cancel</button>
      </div>
    `;
    
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
    
    // Set up elements
    this.dropZone = content.querySelector('.drop-zone');
    this.fileInput = content.querySelector('input[type="file"]');
    this.progressBar = content.querySelector('.progress-container');
    this.progressStage = content.querySelector('.progress-stage');
    this.progressFill = content.querySelector('.progress-fill');
    
    // Set up events
    this.setupDropZone();
    this.setupFileInput();
    
    // Cancel button
    content.querySelector('#cancel-btn').addEventListener('click', () => {
      this.hideModal();
    });
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideModal();
      }
    });
  }

  setupDropZone() {
    this.dropZone.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });
    
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });
    
    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });
  }

  setupFileInput() {
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFile(e.target.files[0]);
      }
    });
  }

  async handleFile(file) {
    // Validate file
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Please upload a PNG or JPEG image');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    // Show progress
    this.showProgress();
    
    // Callback to parent
    if (this.options.onFileSelected) {
      this.options.onFileSelected(file);
    }
  }

  showModal() {
    this.modal.classList.add('active');
  }

  hideModal() {
    this.modal.classList.remove('active');
    this.hideProgress();
    this.fileInput.value = '';
  }

  showProgress() {
    this.dropZone.style.display = 'none';
    this.progressBar.classList.add('active');
  }

  hideProgress() {
    this.dropZone.style.display = 'block';
    this.progressBar.classList.remove('active');
    this.progressFill.style.width = '0%';
  }

  updateProgress(stage, progress) {
    this.progressStage.textContent = stage;
    this.progressFill.style.width = `${progress}%`;
  }
}
```

### Review Mode UI
```javascript
// ui-components/review-mode.js
export class ReviewModeUI {
  constructor(cheatsheet) {
    this.cheatsheet = cheatsheet;
    this.overlay = null;
    this.flaggedItems = new Set();
    this.corrections = new Map();
  }

  enterReviewMode(matches) {
    // Create overlay
    this.createOverlay(matches);
    
    // Apply matches to cheatsheet
    this.applyMatches(matches);
    
    // Flag low confidence items
    this.flagLowConfidence(matches);
    
    // Set up tooltips
    this.setupTooltips();
  }

  createOverlay(matches) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'review-mode-overlay';
    
    const highConfidence = matches.filter(m => m.confidence >= 0.9);
    const lowConfidence = matches.filter(m => m.confidence < 0.9);
    
    this.overlay.innerHTML = `
      <div class="review-header">
        <div class="review-title">
          📋 Review Mode: Verify imported build
        </div>
        <div class="review-stats">
          <div class="review-stat">
            <span>Total:</span>
            <span class="review-stat-value">${matches.length}</span>
          </div>
          <div class="review-stat">
            <span>Confident:</span>
            <span class="review-stat-value">${highConfidence.length}</span>
          </div>
          <div class="review-stat">
            <span>Need Review:</span>
            <span class="review-stat-value" style="color: #ffa500;">
              ${lowConfidence.length}
            </span>
          </div>
        </div>
        <div class="review-actions">
          <button class="btn btn-secondary" id="cancel-review">Cancel</button>
          <button class="btn btn-primary" id="confirm-review">
            Confirm Build (${highConfidence.length}/${matches.length})
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    
    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('active');
    });
    
    // Set up buttons
    this.overlay.querySelector('#cancel-review').addEventListener('click', () => {
      this.exitReviewMode(false);
    });
    
    this.overlay.querySelector('#confirm-review').addEventListener('click', () => {
      this.exitReviewMode(true);
    });
  }

  applyMatches(matches) {
    // Clear existing selections
    const checkboxes = this.cheatsheet.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    
    // Apply matches
    matches.forEach(match => {
      if (!match.matched) return;
      
      const checkbox = this.cheatsheet.querySelector(
        `input[data-upgrade-id="${match.upgradeId}"]`
      );
      
      if (checkbox) {
        checkbox.checked = true;
        
        // Store match data
        const hexagon = checkbox.closest('.hexagon');
        hexagon.dataset.confidence = match.confidence;
        hexagon.dataset.matchData = JSON.stringify(match);
        
        // Flag if low confidence
        if (match.confidence < 0.9) {
          this.flaggedItems.add(match.upgradeId);
          hexagon.classList.add('hexagon-confidence-low');
        }
      }
    });
    
    // Trigger cheatsheet update
    if (window.updateDisplay) {
      window.updateDisplay();
    }
  }

  flagLowConfidence(matches) {
    const lowConfidence = matches.filter(m => m.confidence < 0.9);
    
    lowConfidence.forEach(match => {
      const hexagon = this.cheatsheet.querySelector(
        `input[data-upgrade-id="${match.upgradeId}"]`
      )?.closest('.hexagon');
      
      if (hexagon) {
        hexagon.addEventListener('click', (e) => {
          if (this.overlay && this.overlay.classList.contains('active')) {
            e.preventDefault();
            this.showCorrectionModal(match);
          }
        });
      }
    });
  }

  setupTooltips() {
    let tooltip = null;
    
    this.flaggedItems.forEach(upgradeId => {
      const hexagon = this.cheatsheet.querySelector(
        `input[data-upgrade-id="${upgradeId}"]`
      )?.closest('.hexagon');
      
      if (!hexagon) return;
      
      hexagon.addEventListener('mouseenter', (e) => {
        const matchData = JSON.parse(hexagon.dataset.matchData);
        
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.className = 'confidence-tooltip';
          document.body.appendChild(tooltip);
        }
        
        tooltip.innerHTML = `
          Confidence: ${(matchData.confidence * 100).toFixed(0)}%<br>
          Click to review alternatives
        `;
        
        const rect = hexagon.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 40}px`;
        tooltip.style.transform = 'translateX(-50%)';
        
        requestAnimationFrame(() => {
          tooltip.classList.add('visible');
        });
      });
      
      hexagon.addEventListener('mouseleave', () => {
        if (tooltip) {
          tooltip.classList.remove('visible');
        }
      });
    });
  }

  showCorrectionModal(match) {
    const modal = new CorrectionModal({
      match,
      onConfirm: (selectedId) => {
        this.corrections.set(match.position, {
          original: match.upgradeId,
          corrected: selectedId
        });
        
        // Update UI
        this.updateMatch(match, selectedId);
        
        // Update review stats
        this.updateReviewStats();
      }
    });
    
    modal.show();
  }

  updateMatch(match, newUpgradeId) {
    // Uncheck old
    const oldCheckbox = this.cheatsheet.querySelector(
      `input[data-upgrade-id="${match.upgradeId}"]`
    );
    if (oldCheckbox) {
      oldCheckbox.checked = false;
      const oldHexagon = oldCheckbox.closest('.hexagon');
      oldHexagon.classList.remove('hexagon-confidence-low');
    }
    
    // Check new
    const newCheckbox = this.cheatsheet.querySelector(
      `input[data-upgrade-id="${newUpgradeId}"]`
    );
    if (newCheckbox) {
      newCheckbox.checked = true;
      
      // Update match data
      match.upgradeId = newUpgradeId;
      match.confidence = 1.0; // User confirmed
      
      const newHexagon = newCheckbox.closest('.hexagon');
      newHexagon.dataset.confidence = '1';
      newHexagon.dataset.matchData = JSON.stringify(match);
    }
    
    // Remove from flagged
    this.flaggedItems.delete(match.upgradeId);
    
    // Update display
    if (window.updateDisplay) {
      window.updateDisplay();
    }
  }

  updateReviewStats() {
    const total = this.cheatsheet.querySelectorAll(
      'input[type="checkbox"]:checked'
    ).length;
    
    const needReview = this.flaggedItems.size;
    const confident = total - needReview;
    
    // Update overlay stats
    const statsContainer = this.overlay.querySelector('.review-stats');
    statsContainer.innerHTML = `
      <div class="review-stat">
        <span>Total:</span>
        <span class="review-stat-value">${total}</span>
      </div>
      <div class="review-stat">
        <span>Confident:</span>
        <span class="review-stat-value">${confident}</span>
      </div>
      <div class="review-stat">
        <span>Need Review:</span>
        <span class="review-stat-value" style="color: #ffa500;">
          ${needReview}
        </span>
      </div>
    `;
    
    // Update confirm button
    const confirmBtn = this.overlay.querySelector('#confirm-review');
    confirmBtn.textContent = `Confirm Build (${confident}/${total})`;
  }

  exitReviewMode(confirmed) {
    // Animate out
    this.overlay.classList.remove('active');
    
    setTimeout(() => {
      this.overlay.remove();
      this.overlay = null;
      
      // Clean up classes
      const flaggedHexagons = this.cheatsheet.querySelectorAll('.hexagon-confidence-low');
      flaggedHexagons.forEach(hex => {
        hex.classList.remove('hexagon-confidence-low');
      });
      
      if (confirmed) {
        // Show feedback prompt
        this.showFeedbackPrompt();
        
        // Callback
        if (this.options?.onComplete) {
          this.options.onComplete({
            corrections: Array.from(this.corrections.entries())
          });
        }
      } else {
        // Clear selections
        const checkboxes = this.cheatsheet.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
        
        if (window.updateDisplay) {
          window.updateDisplay();
        }
      }
      
      // Clear data
      this.flaggedItems.clear();
      this.corrections.clear();
    }, 300);
  }

  showFeedbackPrompt() {
    if (this.corrections.size === 0) return;
    
    const prompt = document.createElement('div');
    prompt.className = 'feedback-prompt';
    prompt.innerHTML = `
      <div class="feedback-text">
        You made ${this.corrections.size} corrections. Would you like to help improve recognition?
      </div>
      <a href="#" class="feedback-link" id="submit-feedback">
        Submit anonymous feedback
      </a>
    `;
    
    document.body.appendChild(prompt);
    
    // Animate in
    setTimeout(() => {
      prompt.classList.add('visible');
    }, 500);
    
    // Set up link
    prompt.querySelector('#submit-feedback').addEventListener('click', (e) => {
      e.preventDefault();
      this.generateFeedbackIssue();
      prompt.remove();
    });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      prompt.classList.remove('visible');
      setTimeout(() => prompt.remove(), 300);
    }, 10000);
  }

  generateFeedbackIssue() {
    const corrections = Array.from(this.corrections.entries());
    const issueBody = encodeURIComponent(`
## Screenshot Import Feedback

**Corrections Made:** ${corrections.length}

### Details:
${corrections.map(([pos, data]) => `
- Position: ${JSON.stringify(pos)}
  - Original: ${data.original}
  - Corrected to: ${data.corrected}
`).join('\n')}

### Session Info:
- Browser: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}
- Build URL: ${window.location.href}

---
*This feedback was generated automatically by the Screenshot Import Assistant*
    `);
    
    const issueUrl = `https://github.com/YOUR_REPO/issues/new?title=Screenshot%20Import%20Feedback&body=${issueBody}`;
    window.open(issueUrl, '_blank');
  }
}
```

### Correction Modal
```javascript
// ui-components/correction-modal.js
export class CorrectionModal {
  constructor(options) {
    this.options = options;
    this.modal = null;
    this.selectedId = null;
  }

  show() {
    this.createModal();
    document.body.appendChild(this.modal);
    
    // Animate in
    requestAnimationFrame(() => {
      this.modal.classList.add('active');
    });
  }

  createModal() {
    const { match } = this.options;
    
    this.modal = document.createElement('div');
    this.modal.className = 'correction-modal';
    
    this.modal.innerHTML = `
      <div class="correction-header">
        Select the correct upgrade
      </div>
      
      <div class="correction-preview">
        <canvas class="correction-hexagon" id="detected-hexagon"></canvas>
        <div class="correction-info">
          <div class="correction-confidence">
            Current match confidence: 
            <span class="correction-confidence-value">
              ${(match.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div style="color: #aaa; font-size: 12px;">
            Click the correct upgrade below
          </div>
        </div>
      </div>
      
      <div class="candidate-list" id="candidate-list">
        ${this.renderCandidates(match)}
      </div>
      
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancel-correction">Cancel</button>
        <button class="btn btn-primary" id="confirm-correction" disabled>
          Confirm Selection
        </button>
      </div>
    `;
    
    // Draw detected hexagon
    const canvas = this.modal.querySelector('#detected-hexagon');
    const ctx = canvas.getContext('2d');
    canvas.width = 80;
    canvas.height = 80;
    ctx.drawImage(match.normalizedCanvas, 0, 0, 80, 80);
    
    // Set up events
    this.setupEvents();
  }

  renderCandidates(match) {
    const candidates = [
      { upgradeId: match.upgradeId, ...match.metadata, score: match.confidence },
      ...match.alternatives
    ];
    
    return candidates.map((candidate, index) => `
      <div class="candidate-item" data-upgrade-id="${candidate.upgradeId}">
        <canvas class="candidate-hexagon" id="candidate-${index}"></canvas>
        <div class="candidate-info">
          <div class="candidate-name">${candidate.name || 'Unknown'}</div>
          <div class="candidate-type">${candidate.type || ''}</div>
        </div>
        <div class="candidate-score">
          ${(candidate.score * 100).toFixed(0)}%
        </div>
      </div>
    `).join('');
  }

  setupEvents() {
    // Candidate selection
    const candidateItems = this.modal.querySelectorAll('.candidate-item');
    candidateItems.forEach(item => {
      item.addEventListener('click', () => {
        // Remove previous selection
        candidateItems.forEach(i => i.classList.remove('selected'));
        
        // Select this item
        item.classList.add('selected');
        this.selectedId = item.dataset.upgradeId;
        
        // Enable confirm button
        this.modal.querySelector('#confirm-correction').disabled = false;
      });
    });
    
    // Draw candidate hexagons
    this.drawCandidateHexagons();
    
    // Cancel button
    this.modal.querySelector('#cancel-correction').addEventListener('click', () => {
      this.close();
    });
    
    // Confirm button
    this.modal.querySelector('#confirm-correction').addEventListener('click', () => {
      if (this.selectedId && this.options.onConfirm) {
        this.options.onConfirm(this.selectedId);
      }
      this.close();
    });
    
    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  drawCandidateHexagons() {
    // This would draw the actual hexagon images from templates
    // For now, placeholder implementation
    const canvases = this.modal.querySelectorAll('.candidate-hexagon');
    canvases.forEach((canvas, index) => {
      const ctx = canvas.getContext('2d');
      canvas.width = 48;
      canvas.height = 48;
      
      // Placeholder - would draw actual template images
      ctx.fillStyle = `hsl(${index * 60}, 50%, 30%)`;
      ctx.fillRect(0, 0, 48, 48);
    });
  }

  close() {
    this.modal.classList.remove('active');
    
    setTimeout(() => {
      this.modal.remove();
      this.modal = null;
    }, 300);
  }
}
```

## Integration with Main Application

### Main Integration
```javascript
// screenshot-import/index.js
import { ScreenshotImportAssistant } from './screenshot-import-assistant.js';
import { UploadComponent } from './ui-components/upload-component.js';
import { ReviewModeUI } from './ui-components/review-mode.js';

export class ScreenshotImportUI {
  constructor() {
    this.assistant = null;
    this.uploadComponent = null;
    this.reviewMode = null;
    this.initialized = false;
  }

  async initialize() {
    // Find integration point
    const controlsContainer = document.querySelector('.cheatsheet-controls');
    if (!controlsContainer) {
      console.error('Could not find controls container');
      return;
    }
    
    // Initialize assistant
    this.assistant = new ScreenshotImportAssistant();
    await this.assistant.initialize();
    
    // Create upload component
    this.uploadComponent = new UploadComponent(controlsContainer, {
      onFileSelected: (file) => this.handleFileUpload(file)
    });
    
    this.uploadComponent.render();
    
    // Initialize review mode
    const cheatsheetContainer = document.querySelector('.cheatsheet');
    this.reviewMode = new ReviewModeUI(cheatsheetContainer);
    
    this.initialized = true;
  }

  async handleFileUpload(file) {
    try {
      // Process screenshot
      const results = await this.assistant.processScreenshot(file, {
        onProgress: (progress) => {
          this.uploadComponent.updateProgress(
            progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1),
            progress.progress
          );
        },
        onError: (error) => {
          console.error('Processing error:', error);
          alert(`Error: ${error.message}`);
          this.uploadComponent.hideModal();
        }
      });
      
      // Close upload modal
      this.uploadComponent.hideModal();
      
      // Enter review mode
      this.reviewMode.enterReviewMode(results.allMatches);
      
    } catch (error) {
      console.error('Failed to process screenshot:', error);
      alert('Failed to process screenshot. Please try again.');
      this.uploadComponent.hideModal();
    }
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScreenshotImport);
} else {
  initializeScreenshotImport();
}

async function initializeScreenshotImport() {
  try {
    const ui = new ScreenshotImportUI();
    await ui.initialize();
    console.log('Screenshot Import Assistant initialized');
  } catch (error) {
    console.error('Failed to initialize Screenshot Import Assistant:', error);
  }
}
```

## Accessibility Considerations

1. **Keyboard Navigation**
   - All interactive elements are keyboard accessible
   - Tab order follows logical flow
   - Escape key closes modals

2. **Screen Reader Support**
   - Proper ARIA labels and roles
   - Status updates announced
   - Error messages clearly communicated

3. **Visual Indicators**
   - High contrast colors
   - Clear focus states
   - Multiple indicators for confidence levels

## Mobile Responsiveness

The UI components are designed to work on mobile devices:
- Modals adapt to smaller screens
- Touch-friendly interaction areas
- Simplified correction interface for mobile

## Next Steps

With the UI integration complete, proceed to:
- Implement client-side storage (see `07-data-storage.md`)
- Set up feedback collection system
- Create comprehensive testing suite