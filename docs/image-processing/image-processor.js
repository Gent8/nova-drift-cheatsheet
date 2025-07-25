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
          centerPoint: coordData.centerPoint,
          hexBounds: coordData.hexBounds,
          confidence: coordData.confidence
        }));

        // Process regions in batches for memory efficiency
        const batchSize = Math.max(1, Math.min(10, Math.floor(this.maxWorkers * 2)));
        const regionData = new Map();
        let totalQuality = 0;
        let successCount = 0;

        for (let i = 0; i < extractionTasks.length; i += batchSize) {
          const batch = extractionTasks.slice(i, i + batchSize);
          const batchResults = await this.processBatch(imageElement, batch);
          
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
    async processBatch(imageElement, tasks) {
      const promises = tasks.map(task => this.extractSingleRegion(imageElement, task));
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
     * Extract a single hex region
     */
    async extractSingleRegion(imageElement, task) {
      try {
        // Calculate hex radius from bounds or use default
        const hexRadius = task.hexBounds ? 
          Math.min(task.hexBounds.width, task.hexBounds.height) / 2 : 24;

        // Extract raw region
        const rawImageData = this.regionExtractor.extractHexRegion(
          imageElement,
          task.centerPoint,
          hexRadius
        );

        // Normalize to target size
        const normalizedImageData = this.regionExtractor.normalizeRegion(
          rawImageData,
          this.targetSize
        );

        // Assess quality
        const quality = this.qualityAnalyzer.analyzeImageQuality(normalizedImageData);
        const completeness = this.qualityAnalyzer.calculateCompleteness(
          normalizedImageData, 
          { radius: this.targetSize.width / 2 }
        );

        // Skip if quality is too low
        if (quality < this.qualityThreshold) {
          throw new Error(`Quality too low: ${quality.toFixed(2)} < ${this.qualityThreshold}`);
        }

        return {
          modName: task.modName,
          imageData: normalizedImageData,
          originalBounds: task.hexBounds || {
            x: task.centerPoint.x - hexRadius,
            y: task.centerPoint.y - hexRadius,
            width: hexRadius * 2,
            height: hexRadius * 2
          },
          extractionMetadata: {
            quality,
            completeness,
            confidence: task.confidence * quality,
            timestamp: Date.now()
          }
        };

      } catch (error) {
        throw new Error(`Region extraction failed for ${task.modName}: ${error.message}`);
      }
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
