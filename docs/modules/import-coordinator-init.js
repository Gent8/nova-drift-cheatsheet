/**
 * Import Coordinator Initialization
 * Sets up the simplified state machine for Nova Drift screenshot import workflow
 */

// Initialize import coordinator when DOM is ready
function initializeImportCoordinator() {
  if (typeof ImportCoordinator === 'undefined') {
    console.error('ImportCoordinator not available');
    return;
  }

  // Create global instance
  window.importCoordinator = new ImportCoordinator({
    processingTimeout: 30000, // 30 seconds
    enableDebugMode: false, // Set to true for development
    showProgressIndicators: true
  });

  // Set up additional event listeners for integration
  setupIntegrationEvents();
  
  console.log('Import coordinator initialized and ready for workflow management');
}

/**
 * Setup additional events for integration with existing systems
 */
function setupIntegrationEvents() {
  // Listen for successful mod imports to update the UI
  document.addEventListener('mods-imported', handleModsImported);
  
  // Listen for state changes to update UI elements
  document.addEventListener('import-state-change', handleStateChange);
  
  // Setup reset button (if exists)
  const resetBtn = document.getElementById('import-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const event = new CustomEvent('import-reset');
      document.dispatchEvent(event);
    });
  }
}

/**
 * Handle successful mod imports
 * @param {CustomEvent} event - Mods imported event
 */
function handleModsImported(event) {
  const { mods, confidence } = event.detail;
  
  console.log('Mods imported successfully:', {
    count: mods.length,
    mods: mods,
    confidence: Math.round(confidence * 100) + '%'
  });
  
  // TODO: Apply mods to Nova Drift cheatsheet interface
  // For now, just show a notification
  showImportNotification(mods, confidence);
}

/**
 * Handle state changes for UI updates
 * @param {CustomEvent} event - State change event
 */
function handleStateChange(event) {
  const { oldState, newState, data } = event.detail;
  
  // Update upload button state based on workflow state
  updateUploadButtonState(newState);
  
  // Update any progress indicators
  updateProgressIndicators(newState, data);
  
  if (window.importCoordinator?.options.enableDebugMode) {
    console.log('Import state change:', { oldState, newState });
  }
}

/**
 * Update upload button state based on workflow
 * @param {string} state - Current workflow state
 */
function updateUploadButtonState(state) {
  const uploadBtn = document.getElementById('screenshot-upload-btn');
  if (!uploadBtn) return;
  
  switch (state) {
    case 'idle':
      uploadBtn.textContent = '📷 Upload Screenshot';
      uploadBtn.disabled = false;
      break;
    case 'manual-crop':
      uploadBtn.textContent = '✂️ Cropping...';
      uploadBtn.disabled = true;
      break;
    case 'processing-grid':
      uploadBtn.textContent = '🔍 Processing...';
      uploadBtn.disabled = true;
      break;
    case 'reviewing':
      uploadBtn.textContent = '👀 Reviewing...';
      uploadBtn.disabled = true;
      break;
    case 'complete':
      uploadBtn.textContent = '✅ Complete!';
      uploadBtn.disabled = false;
      break;
    case 'error':
      uploadBtn.textContent = '❌ Error - Try Again';
      uploadBtn.disabled = false;
      break;
  }
}

/**
 * Update progress indicators
 * @param {string} state - Current state
 * @param {*} data - State data
 */
function updateProgressIndicators(state, data) {
  // Update any existing progress bars or indicators
  const progressEl = document.getElementById('import-progress');
  if (!progressEl) return;
  
  const stateProgress = {
    'idle': 0,
    'uploading': 20,
    'manual-crop': 40,
    'processing-grid': 60,
    'reviewing': 80,
    'complete': 100,
    'error': 0
  };
  
  const progress = stateProgress[state] || 0;
  progressEl.style.width = progress + '%';
}

/**
 * Show import notification
 * @param {Array} mods - Imported mod names
 * @param {number} confidence - Overall confidence
 */
function showImportNotification(mods, confidence) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #4CAF50;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 400px;
    text-align: center;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">
      🎉 Successfully imported ${mods.length} mods!
    </div>
    <div style="font-size: 12px; opacity: 0.9;">
      Confidence: ${Math.round(confidence * 100)}%
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

/**
 * Add debug controls for development
 */
function addDebugControls() {
  if (!window.importCoordinator?.options.enableDebugMode) return;
  
  const debugPanel = document.createElement('div');
  debugPanel.id = 'import-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    bottom: 60px;
    right: 20px;
    background: #1a1a1a;
    color: #fff;
    padding: 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 11px;
    z-index: 9999;
    min-width: 200px;
  `;
  
  debugPanel.innerHTML = `
    <div>Debug Controls:</div>
    <button onclick="window.importCoordinator.reset()">Reset</button>
    <button onclick="console.log(window.importCoordinator.getState())">Log State</button>
  `;
  
  document.body.appendChild(debugPanel);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeImportCoordinator();
    addDebugControls();
  });
} else {
  // DOM is already ready
  initializeImportCoordinator();
  addDebugControls();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    initializeImportCoordinator, 
    handleModsImported, 
    handleStateChange 
  };
}