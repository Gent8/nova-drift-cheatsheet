/**
 * Legacy Adapter - Integration Bridge
 * Bridges existing ScreenshotUploadHandler with new import workflow
 */

class LegacyAdapter {
  constructor() {
    this.originalHandler = null;
    this.isIntegrated = false;
    this.hooks = new Map();
    this.config = {
      enableROIDetection: false, // Start disabled, enable after Phase 0 validation
      enableReviewMode: false,   // Enable in Phase 2
      fallbackToManual: true,    // Always fallback to manual for now
      preserveOriginalBehavior: true
    };
    
    this.init();
  }

  /**
   * Initialize the adapter and integrate with existing upload handler
   */
  init() {
    console.log('LegacyAdapter: Initializing integration bridge');
    
    // Wait for existing upload handler to be available
    if (window.ScreenshotUploadHandler && window.uploadHandler) {
      this.integrateWithExistingHandler();
    } else {
      // Poll for upload handler availability
      const checkInterval = setInterval(() => {
        if (window.ScreenshotUploadHandler && window.uploadHandler) {
          this.integrateWithExistingHandler();
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Stop polling after 5 seconds
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  }

  /**
   * Integrate with the existing upload handler without breaking it
   */
  integrateWithExistingHandler() {
    try {
      this.originalHandler = window.uploadHandler;
      
      if (!this.originalHandler) {
        console.warn('LegacyAdapter: No existing upload handler found');
        return;
      }

      console.log('LegacyAdapter: Found existing upload handler, integrating...');
      
      // Store original methods we'll extend
      this.originalMethods = {
        onFileReady: this.originalHandler.onFileReady?.bind(this.originalHandler),
        handleValidFile: this.originalHandler.handleValidFile?.bind(this.originalHandler),
        processImage: this.originalHandler.processImage?.bind(this.originalHandler)
      };

      // Extend the existing handler
      this.extendUploadHandler();
      
      this.isIntegrated = true;
      console.log('LegacyAdapter: Integration complete');
      
    } catch (error) {
      console.error('LegacyAdapter: Integration failed:', error);
      this.isIntegrated = false;
    }
  }

  /**
   * Extend existing upload handler methods with new functionality
   */
  extendUploadHandler() {
    const adapter = this;
    
    // Extend onFileReady to add our preprocessing
    if (this.originalHandler.onFileReady) {
      this.originalHandler.onFileReady = async function(fileData) {
        console.log('LegacyAdapter: Intercepting onFileReady');
        
        try {
          // Call original method first to preserve existing behavior
          if (adapter.originalMethods.onFileReady) {
            await adapter.originalMethods.onFileReady(fileData);
          }
          
          // Add our enhanced processing if enabled
          if (adapter.config.enableROIDetection || adapter.config.enableReviewMode) {
            await adapter.processEnhancedWorkflow(fileData);
          }
          
        } catch (error) {
          console.error('LegacyAdapter: Enhanced processing failed, falling back', error);
          adapter.executeHook('error', { error, fileData, fallback: 'original' });
        }
      };
    }

    // Add method to check if file should use enhanced processing
    this.originalHandler.shouldUseEnhancedProcessing = (fileData) => {
      return adapter.config.enableROIDetection && adapter.isValidForEnhancement(fileData);
    };

    // Add method to get adapter configuration
    this.originalHandler.getAdapterConfig = () => {
      return { ...adapter.config };
    };

    // Add method to update adapter configuration
    this.originalHandler.updateAdapterConfig = (newConfig) => {
      adapter.updateConfig(newConfig);
    };
  }

  /**
   * Process enhanced workflow (ROI detection, review mode, etc.)
   */
  async processEnhancedWorkflow(fileData) {
    console.log('LegacyAdapter: Starting enhanced workflow');
    
    try {
      // Validate data format
      const validatedData = this.validateFileData(fileData);
      
      // Execute preprocessing hooks
      await this.executeHook('preprocess', validatedData);
      
      // Phase 0: ROI Detection (if enabled)
      if (this.config.enableROIDetection) {
        const roiResult = await this.attemptROIDetection(validatedData);
        
        if (roiResult && roiResult.confidence > 0.7) {
          console.log('LegacyAdapter: ROI detected with confidence:', roiResult.confidence);
          await this.executeHook('roi-detected', { fileData: validatedData, roi: roiResult });
          return await this.processROIWorkflow(validatedData, roiResult);
        } else {
          console.log('LegacyAdapter: ROI detection failed or low confidence');
          await this.executeHook('roi-failed', { fileData: validatedData, roi: roiResult });
        }
      }

      // Fallback to manual workflow
      if (this.config.fallbackToManual) {
        console.log('LegacyAdapter: Falling back to manual workflow');
        await this.executeHook('fallback-manual', validatedData);
        return await this.processManualWorkflow(validatedData);
      }

    } catch (error) {
      console.error('LegacyAdapter: Enhanced workflow failed:', error);
      await this.executeHook('workflow-error', { error, fileData });
      throw error;
    }
  }

  /**
   * Validate file data format for compatibility
   */
  validateFileData(fileData) {
    // Convert existing format to standardized format
    if (!fileData) {
      throw new Error('No file data provided');
    }

    // Handle different possible input formats from existing handler
    let standardizedData = {};

    if (fileData.file) {
      // New format
      standardizedData = {
        file: fileData.file,
        imageElement: fileData.imageElement,
        dimensions: fileData.dimensions || { 
          width: fileData.imageElement?.naturalWidth, 
          height: fileData.imageElement?.naturalHeight 
        },
        metadata: fileData.metadata || {
          size: fileData.file.size,
          type: fileData.file.type,
          lastModified: fileData.file.lastModified,
          name: fileData.file.name
        }
      };
    } else if (fileData.imageElement) {
      // Legacy format with just image element
      standardizedData = {
        file: null,
        imageElement: fileData.imageElement,
        dimensions: {
          width: fileData.imageElement.naturalWidth,
          height: fileData.imageElement.naturalHeight
        },
        metadata: {
          size: 0,
          type: 'unknown',
          lastModified: Date.now(),
          name: 'uploaded-image'
        }
      };
    } else {
      throw new Error('Invalid file data format');
    }

    console.log('LegacyAdapter: File data validated:', {
      hasFile: !!standardizedData.file,
      hasImage: !!standardizedData.imageElement,
      dimensions: standardizedData.dimensions
    });

    return standardizedData;
  }

  /**
   * Attempt ROI detection using available algorithms
   */
  async attemptROIDetection(fileData) {
    if (!this.config.enableROIDetection) {
      return null;
    }

    try {
      // Check if ROI detector is available (will be implemented in Phase 0)
      if (window.ROIDetector) {
        const detector = new window.ROIDetector();
        return await detector.detectROI(fileData.imageElement);
      } else {
        console.warn('LegacyAdapter: ROI detector not available');
        return null;
      }
    } catch (error) {
      console.error('LegacyAdapter: ROI detection failed:', error);
      return null;
    }
  }

  /**
   * Process ROI-based workflow
   */
  async processROIWorkflow(fileData, roiResult) {
    console.log('LegacyAdapter: Processing ROI workflow');
    
    try {
      // Create crop data from ROI
      const cropData = this.createCropDataFromROI(fileData, roiResult);
      
      // Execute crop processing hooks
      await this.executeHook('crop-processed', { fileData, cropData, roi: roiResult });
      
      // Continue with recognition if enabled
      if (this.config.enableReviewMode && window.RecognitionAdapter) {
        return await this.processRecognitionWorkflow(cropData);
      }
      
      // Otherwise just apply the crop
      return await this.applyCropToCheatsheet(cropData);
      
    } catch (error) {
      console.error('LegacyAdapter: ROI workflow failed:', error);
      throw error;
    }
  }

  /**
   * Process manual crop workflow
   */
  async processManualWorkflow(fileData) {
    console.log('LegacyAdapter: Processing manual workflow');
    
    try {
      // Check if crop interface is available
      if (window.CropInterface) {
        const cropInterface = new window.CropInterface();
        const cropData = await cropInterface.show(fileData.imageElement);
        
        await this.executeHook('manual-crop-completed', { fileData, cropData });
        
        if (this.config.enableReviewMode && window.RecognitionAdapter) {
          return await this.processRecognitionWorkflow(cropData);
        }
        
        return await this.applyCropToCheatsheet(cropData);
      } else {
        console.warn('LegacyAdapter: Crop interface not available, using fallback');
        return await this.executeHook('no-crop-interface', fileData);
      }
      
    } catch (error) {
      console.error('LegacyAdapter: Manual workflow failed:', error);
      throw error;
    }
  }

  /**
   * Process recognition workflow
   */
  async processRecognitionWorkflow(cropData) {
    console.log('LegacyAdapter: Processing recognition workflow');
    
    try {
      if (!window.RecognitionAdapter) {
        throw new Error('Recognition adapter not available');
      }

      const recognitionAdapter = new window.RecognitionAdapter();
      const recognitionResults = await recognitionAdapter.processImage(cropData);
      
      await this.executeHook('recognition-completed', { cropData, recognitionResults });
      
      // Apply results to cheatsheet
      return await this.applyRecognitionResults(recognitionResults);
      
    } catch (error) {
      console.error('LegacyAdapter: Recognition workflow failed:', error);
      throw error;
    }
  }

  /**
   * Create crop data from ROI detection result
   */
  createCropDataFromROI(fileData, roiResult) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = roiResult.bounds.width;
    canvas.height = roiResult.bounds.height;
    
    ctx.drawImage(
      fileData.imageElement,
      roiResult.bounds.x, roiResult.bounds.y, roiResult.bounds.width, roiResult.bounds.height,
      0, 0, canvas.width, canvas.height
    );
    
    return {
      imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
      cropBounds: roiResult.bounds,
      originalDimensions: fileData.dimensions,
      confidence: roiResult.confidence,
      method: roiResult.method || 'auto-roi'
    };
  }

  /**
   * Apply crop results to cheatsheet (placeholder for now)
   */
  async applyCropToCheatsheet(cropData) {
    console.log('LegacyAdapter: Applying crop to cheatsheet');
    
    // For now, just emit an event that other systems can listen to
    await this.executeHook('crop-applied', cropData);
    
    // TODO: Implement actual cheatsheet integration
    const event = new CustomEvent('screenshot-crop-applied', {
      detail: cropData
    });
    document.dispatchEvent(event);
    
    return { success: true, method: 'crop-applied', data: cropData };
  }

  /**
   * Apply recognition results to cheatsheet (placeholder for now)
   */
  async applyRecognitionResults(recognitionResults) {
    console.log('LegacyAdapter: Applying recognition results to cheatsheet');
    
    await this.executeHook('recognition-applied', recognitionResults);
    
    // TODO: Implement actual cheatsheet integration
    const event = new CustomEvent('screenshot-recognition-applied', {
      detail: recognitionResults
    });
    document.dispatchEvent(event);
    
    return { success: true, method: 'recognition-applied', data: recognitionResults };
  }

  /**
   * Check if file data is valid for enhancement
   */
  isValidForEnhancement(fileData) {
    try {
      const validated = this.validateFileData(fileData);
      
      // Check minimum requirements
      const minWidth = 800;
      const minHeight = 600;
      
      return validated.dimensions.width >= minWidth && 
             validated.dimensions.height >= minHeight &&
             validated.imageElement && 
             validated.imageElement.complete;
             
    } catch (error) {
      console.warn('LegacyAdapter: File validation failed:', error);
      return false;
    }
  }

  /**
   * Update adapter configuration
   */
  updateConfig(newConfig) {
    console.log('LegacyAdapter: Updating configuration:', newConfig);
    
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    this.executeHook('config-updated', this.config);
  }

  /**
   * Register a hook for extension points
   */
  registerHook(name, callback) {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name).push(callback);
    console.log(`LegacyAdapter: Registered hook '${name}'`);
  }

  /**
   * Execute all callbacks for a hook
   */
  async executeHook(name, data) {
    if (!this.hooks.has(name)) {
      return;
    }

    const callbacks = this.hooks.get(name);
    for (const callback of callbacks) {
      try {
        await callback(data);
      } catch (error) {
        console.error(`LegacyAdapter: Hook '${name}' callback failed:`, error);
      }
    }
  }

  /**
   * Get current status and configuration
   */
  getStatus() {
    return {
      isIntegrated: this.isIntegrated,
      config: { ...this.config },
      hasOriginalHandler: !!this.originalHandler,
      availableHooks: Array.from(this.hooks.keys()),
      capabilities: {
        roiDetection: !!window.ROIDetector,
        cropInterface: !!window.CropInterface,
        recognitionAdapter: !!window.RecognitionAdapter
      }
    };
  }

  /**
   * Safely remove integration (for testing/debugging)
   */
  removeIntegration() {
    if (!this.isIntegrated || !this.originalHandler) {
      return;
    }

    console.log('LegacyAdapter: Removing integration');
    
    // Restore original methods
    if (this.originalMethods.onFileReady) {
      this.originalHandler.onFileReady = this.originalMethods.onFileReady;
    }

    // Remove added methods
    delete this.originalHandler.shouldUseEnhancedProcessing;
    delete this.originalHandler.getAdapterConfig;
    delete this.originalHandler.updateAdapterConfig;

    this.isIntegrated = false;
    console.log('LegacyAdapter: Integration removed');
  }
}

// Create global instance
window.LegacyAdapter = LegacyAdapter;

// Auto-initialize if upload handler is already available
if (window.uploadHandler) {
  window.legacyAdapter = new LegacyAdapter();
} else {
  // Wait for upload handler to be ready
  document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure upload handler is initialized
    setTimeout(() => {
      if (!window.legacyAdapter) {
        window.legacyAdapter = new LegacyAdapter();
      }
    }, 100);
  });
}

console.log('LegacyAdapter: Module loaded');