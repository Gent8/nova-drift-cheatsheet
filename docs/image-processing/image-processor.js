/**
 * Nova Drift Screenshot Image Processing - Phase 3
 * Main orchestrator for extracting hex regions from screenshots
 */

(function(global) {
  'use strict';

  /**
   * Main image processor class
   * Coordinates region extraction, quality assessment, and batch processing
   */
  class ImageProcessor {
    constructor(options = {}) {
      this.targetSize = options.targetSize || { width: 48, height: 48 };
      this.qualityThreshold = options.qualityThreshold || 0.7;
      this.maxWorkers = options.maxWorkers || 4;
      
      // Initialize canvas for processing
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      // Initialize components
      this.memoryManager = new global.MemoryManager();
      this.regionExtractor = new global.RegionExtractor(this.memoryManager);
      this.qualityAnalyzer = new global.QualityAnalyzer();
      this.workerPool = new global.WorkerPool(this.maxWorkers);
      
      // Processing statistics
      this.stats = {
        totalProcessed: 0,
        successfulExtractions: 0,
        totalProcessingTime: 0,
        averageQuality: 0
      };
    }

    /**
     * Extract all hex regions from a screenshot
     * @param {HTMLImageElement} imageElement - Source screenshot
     * @param {Map} coordinateMap - Map of position IDs to coordinate data
     * @returns {Object} Extraction result with region data
     */
    async extractRegions(imageElement, coordinateMap) {
      const startTime = performance.now();
      const memoryStart = this.memoryManager.getCurrentUsage();

      try {
        // Validate input
        if (!imageElement || !coordinateMap || coordinateMap.size === 0) {
          throw new Error('Invalid input: missing image or coordinate data');
        }

        console.log(`Starting region extraction for ${coordinateMap.size} positions`);

        // Prepare processing canvas
        this.setupProcessingCanvas(imageElement);

        // Convert coordinate map to extraction tasks
        const extractionTasks = Array.from(coordinateMap.entries()).map(([positionId, coordData]) => ({
          positionId,
          modName: coordData.modName,
          centerPoint: coordData.centerPoint, // The center point for extraction
          hexBounds: coordData.hexBounds, // The bounding box of the hex
          confidence: coordData.confidence, // Initial confidence from mapping
          hexRadius: coordData.hexBounds ? Math.min(coordData.hexBounds.width, coordData.hexBounds.height) / 2 : 24
        }));

        // Process regions in batches for memory efficiency
        const batchSize = this.workerPool.getOptimalBatchSize();
        const regionData = new Map();
        let totalQuality = 0;
        let successCount = 0;

        const sourceImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < extractionTasks.length; i += batchSize) {
          const batchTasks = extractionTasks.slice(i, i + batchSize);
          const batchResults = await this.processBatch(sourceImageData, batchTasks);
          
          for (const result of batchResults) {
            if (result.success) {
              regionData.set(result.positionId, result.data);
              totalQuality += result.data.extractionMetadata.quality;
              successCount++;
            } else {
              console.warn(`Failed to extract region for ${result.positionId}:`, result.error);
            }
          }

          // Force garbage collection between batches
          if (i % (batchSize * 3) === 0) {
            this.memoryManager.cleanup();
          }
        }

        const processingTime = performance.now() - startTime;
        const memoryUsage = this.memoryManager.getCurrentUsage() - memoryStart;
        const averageQuality = successCount > 0 ? totalQuality / successCount : 0;

        // Update statistics
        this.stats.totalProcessed += extractionTasks.length;
        this.stats.successfulExtractions += successCount;
        this.stats.totalProcessingTime += processingTime;
        this.stats.averageQuality = (this.stats.averageQuality + averageQuality) / 2;

        const result = {
          type: 'regions-extracted',
          detail: {
            regionData,
            processingMetadata: {
              totalRegions: extractionTasks.length,
              successfulExtractions: successCount,
              averageQuality,
              processingTime,
              memoryUsage,
              timestamp: Date.now()
            }
          }
        };

        console.log(`Region extraction completed: ${successCount}/${extractionTasks.length} successful in ${processingTime.toFixed(1)}ms`);
        
        return result;

      } catch (error) {
        console.error('Region extraction failed:', error);
        throw error;
      } finally {
        // Clean up resources
        this.memoryManager.cleanup();
      }
    }

    /**
     * Setup processing canvas with optimal size
     */
    setupProcessingCanvas(imageElement) {
      // Use reasonable canvas size to balance quality and performance
      const maxDimension = 2048;
      const scale = Math.min(1, maxDimension / Math.max(imageElement.naturalWidth, imageElement.naturalHeight));
      
      this.canvas.width = imageElement.naturalWidth * scale;
      this.canvas.height = imageElement.naturalHeight * scale;
      
      // Draw scaled image to canvas for processing
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(imageElement, 0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Process a batch of extraction tasks
     */
    async processBatch(sourceImageData, tasks) {
      const workerTasks = tasks.map(task => ({
        type: 'process-region',
        data: {
          // Pass a copy of the task data to the worker
          task: JSON.parse(JSON.stringify(task)),
          targetSize: this.targetSize,
          qualityThreshold: this.qualityThreshold
        }
      }));

      // The worker needs the full image data to extract from.
      // For performance, this could be optimized to pass only once or use SharedArrayBuffer.
      workerTasks.forEach(wt => wt.data.sourceImageData = sourceImageData);

      const promises = await this.workerPool.executeBatch(workerTasks);
      return await Promise.allSettled(promises).then(results =>
        results.map((result, index) => ({
          positionId: tasks[index].positionId,
          success: result.status === 'fulfilled',
          data: result.status === 'fulfilled' ? result.value : null,
          error: result.status === 'rejected' ? result.reason : null
        }))
      );
    }

    /**
     * Get processing statistics
     */
    getStats() {
      return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
      this.stats = {
        totalProcessed: 0,
        successfulExtractions: 0,
        totalProcessingTime: 0,
        averageQuality: 0
      };
    }

    /**
     * Cleanup resources
     */
    dispose() {
      this.memoryManager.cleanup();
      this.workerPool.dispose();
    }
  }

  // Export to global scope
  global.ImageProcessor = ImageProcessor;

})(typeof window !== 'undefined' ? window : global);
