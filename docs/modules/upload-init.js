/**
 * Screenshot Upload Feature Initialization
 * Entry point for Nova Drift screenshot upload with modular architecture
 */
(function(global) {
  'use strict';

  // Module loading validation
  const requiredModules = ['UploadValidator', 'ProgressIndicator', 'ScreenshotUploadHandler'];
  const missingModules = requiredModules.filter(module => !global[module]);
  
  if (missingModules.length > 0) {
    console.error('Screenshot Upload: Missing required modules:', missingModules);
    return;
  }

  // Global upload handler instance
  let uploadHandler = null;

  /**
   * Initialize the screenshot upload feature
   * @param {Object} options - Configuration options
   */
  function init(options = {}) {
    try {
      // Check if already initialized
      if (uploadHandler) {
        console.warn('Screenshot upload already initialized. Call reset() first if reinitialization is needed.');
        return uploadHandler;
      }

      // Create upload handler instance
      uploadHandler = new ScreenshotUploadHandler(options);
      
      console.log('Screenshot upload feature initialized successfully with modular architecture');
      return uploadHandler;
      
    } catch (error) {
      console.error('Failed to initialize screenshot upload:', error);
      return null;
    }
  }

  /**
   * Reset the upload feature to initial state
   */
  function reset() {
    if (uploadHandler) {
      uploadHandler.reset();
    }
  }

  /**
   * Destroy the upload feature and clean up resources
   */
  function destroy() {
    if (uploadHandler) {
      uploadHandler.destroy();
      uploadHandler = null;
    }
  }

  /**
   * Get current upload state (for testing/debugging)
   * @returns {Object|null} Current state or null if not initialized
   */
  function getState() {
    return uploadHandler ? uploadHandler.getState() : null;
  }

  /**
   * Show the drop zone programmatically
   */
  function showDropZone() {
    if (uploadHandler) {
      uploadHandler.showDropZone();
    }
  }

  /**
   * Hide the drop zone programmatically
   */
  function hideDropZone() {
    if (uploadHandler) {
      uploadHandler.hideDropZone();
    }
  }

  /**
   * Get the upload handler instance
   * @returns {ScreenshotUploadHandler|null} Current handler instance
   */
  function getInstance() {
    return uploadHandler;
  }

  /**
   * Check if the feature is properly initialized
   * @returns {boolean} True if initialized and ready
   */
  function isReady() {
    return uploadHandler !== null;
  }

  // Initialize when DOM is ready
  function autoInit() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => init());
    } else {
      init();
    }
  }

  // Auto-initialize unless explicitly disabled
  if (!global.DISABLE_UPLOAD_AUTO_INIT) {
    autoInit();
  }

  // Expose public API maintaining backward compatibility
  global.NovaScreenshotUpload = {
    init: init,
    reset: reset,
    destroy: destroy,
    getState: getState,
    showDropZone: showDropZone,
    hideDropZone: hideDropZone,
    getInstance: getInstance,
    isReady: isReady
  };

  // For backward compatibility, also expose the handler classes
  global.NovaScreenshotUpload.UploadValidator = global.UploadValidator;
  global.NovaScreenshotUpload.ProgressIndicator = global.ProgressIndicator;
  global.NovaScreenshotUpload.ScreenshotUploadHandler = global.ScreenshotUploadHandler;

})(window);
