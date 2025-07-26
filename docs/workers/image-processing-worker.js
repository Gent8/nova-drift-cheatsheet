// Web Worker for parallel image processing

// Import required scripts. This allows the worker to share code with the main thread.
self.importScripts(
  '../image-processing/memory-manager.js',
  '../image-processing/quality-analyzer.js',
  '../image-processing/region-extractor.js'
);

let processor_instance;

self.onmessage = function(e) {
  const { type, data, taskId } = e.data;
  
  try {
    let result;
    switch (type) {
      case 'process-region':
        result = processRegion(data);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({
      type: 'task-complete',
      taskId,
      result,
      success: true
    });
  } catch (error) {
    self.postMessage({
      type: 'task-error',
      taskId,
      error: error.message,
      success: false
    });
  }
};

/**
 * Initializes the required class instances within the worker's scope.
 */
function getProcessorInstance() {
  if (!processor_instance) {
    const memoryManager = new self.MemoryManager();
    processor_instance = {
      regionExtractor: new self.RegionExtractor(memoryManager),
      qualityAnalyzer: new self.QualityAnalyzer()
    };
  }
  return processor_instance;
}

/**
 * The main processing function for a single region, executed inside the worker.
 * This mirrors the logic from the original ImageProcessor.extractSingleRegion.
 * @param {object} data - The task data from the main thread.
 * @returns {object} The processed region data.
 */
function processRegion(data) {
  const { sourceImageData, task, targetSize, qualityThreshold } = data;
  const { regionExtractor, qualityAnalyzer } = getProcessorInstance();

  // Mock a canvas-like object for the extractor to use with the provided ImageData
  const mockImageElement = {
    naturalWidth: sourceImageData.width,
    naturalHeight: sourceImageData.height,
    getContext: () => ({ getImageData: () => sourceImageData }) // Simplified mock
  };

  // 1. Extract raw region
  const rawImageData = regionExtractor.extractHexRegion(mockImageElement, task.centerPoint, task.hexRadius);

  // 2. Normalize to target size
  const normalizedImageData = regionExtractor.normalizeRegion(rawImageData, targetSize);

  // 3. Assess quality
  const qualityMetrics = qualityAnalyzer.analyzeImageQuality(normalizedImageData);
  const completeness = qualityAnalyzer.calculateCompleteness(normalizedImageData, { radius: targetSize.width / 2 });

  // 4. Check against threshold
  if (qualityMetrics.quality < qualityThreshold) {
    throw new Error(`Quality too low: ${qualityMetrics.quality.toFixed(2)} < ${qualityThreshold}`);
  }

  // 5. Return the final data structure
  return {
    modName: task.modName,
    imageData: normalizedImageData,
    originalBounds: task.hexBounds,
    extractionMetadata: {
      ...qualityMetrics,
      completeness,
      confidence: task.confidence * qualityMetrics.quality,
      timestamp: Date.now()
    }
  };
}
