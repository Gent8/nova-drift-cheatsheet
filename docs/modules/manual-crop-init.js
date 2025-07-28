/**
 * Manual Crop Interface Initialization
 * Sets up the manual crop interface and connects it to the upload workflow
 */

// Initialize manual crop interface when DOM is ready
function initializeManualCropInterface() {
  if (typeof ManualCropInterface === 'undefined') {
    console.error('ManualCropInterface not available');
    return;
  }

  // Create global instance for upload handler integration
  window.manualCropInterface = new ManualCropInterface({
    minCropWidth: 200,
    minCropHeight: 150,
    maxCropWidth: 4096,
    maxCropHeight: 4096,
    showLayoutGuides: true,
    enableKeyboardControls: true,
    touchEnabled: true
  });

  // Listen for crop-applied events to proceed to next step
  document.addEventListener('crop-applied', handleCropApplied);
  
  console.log('Manual crop interface initialized and ready');
}

/**
 * Handle crop applied event - proceed to recognition processing
 * @param {CustomEvent} event - Crop applied event with cropped image data
 */
function handleCropApplied(event) {
  const croppedImageData = event.detail;
  
  console.log('Crop applied, proceeding to recognition:', {
    cropArea: croppedImageData.cropArea,
    originalDimensions: croppedImageData.originalDimensions,
    croppedDimensions: croppedImageData.croppedDimensions
  });
  
  // The ImportCoordinator will handle the crop-applied event automatically
  // through its event listeners - no need to manually trigger anything here
  
  // Show processing message (will be replaced by ImportCoordinator's status messages)
  showProcessingMessage('Crop applied - proceeding to two-zone recognition...');
}

/**
 * Show processing message to user
 * @param {string} message - Message to display
 */
function showProcessingMessage(message) {
  // Create or update processing message UI
  let messageEl = document.getElementById('crop-processing-message');
  
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'crop-processing-message';
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2a2d3a;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    document.body.appendChild(messageEl);
  }
  
  messageEl.textContent = message;
  messageEl.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (messageEl && messageEl.parentNode) {
      messageEl.style.display = 'none';
    }
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeManualCropInterface);
} else {
  // DOM is already ready
  initializeManualCropInterface();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeManualCropInterface, handleCropApplied };
}