/**
 * Nova Drift Phase 3 Integration - Image Processing
 * Connects image processing to the grid mapping system
 */

(function(global) {
  'use strict';

  // Initialize image processing system when DOM is ready
  function initializeImageProcessing() {
    console.log('Initializing Phase 3: Image Processing');

    // Event handler for grid mapping completion
    document.addEventListener('grid-mapped', async (event) => {
      console.log('Grid mapping completed, starting image processing...');
      
      try {
        const gridData = event.detail;
        
        // Validate input data
        if (!gridData.imageElement || !gridData.coordinateMap) {
          throw new Error('Invalid grid mapping data received');
        }
        
        // Create image processor
        const processor = new global.ImageProcessor({
          targetSize: { width: 48, height: 48 },
          qualityThreshold: 0.7,
          maxWorkers: 4
        });
        
        // Extract regions
        const extractionResult = await processor.extractRegions(
          gridData.imageElement,
          gridData.coordinateMap
        );
        
        // Log processing results
        const metadata = extractionResult.detail.processingMetadata;
        console.log(`Image processing completed:`, {
          totalRegions: metadata.totalRegions,
          successful: metadata.successfulExtractions,
          averageQuality: metadata.averageQuality.toFixed(3),
          processingTime: `${metadata.processingTime.toFixed(1)}ms`,
          memoryUsage: `${(metadata.memoryUsage / 1024 / 1024).toFixed(1)}MB`
        });
        
        // Dispatch event for Phase 4
        document.dispatchEvent(new CustomEvent('regions-extracted', {
          detail: extractionResult.detail
        }));
        
        // Cleanup
        processor.dispose();
        
      } catch (error) {
        console.error('Image processing failed:', error);
        
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('image-processing-error', {
          detail: {
            error: error.message,
            timestamp: Date.now()
          }
        }));
      }
    });

    // Add status logging for regions-extracted event
    document.addEventListener('regions-extracted', (event) => {
      const data = event.detail;
      console.log('Phase 3 completed - Regions extracted:', {
        regions: data.regionData.size,
        averageQuality: data.processingMetadata.averageQuality.toFixed(3),
        processingTime: `${data.processingMetadata.processingTime.toFixed(1)}ms`
      });
    });

    console.log('Phase 3 Image Processing initialized and ready');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeImageProcessing);
  } else {
    initializeImageProcessing();
  }

  // Export for testing
  global.Phase3Integration = {
    initializeImageProcessing
  };

})(typeof window !== 'undefined' ? window : global);
