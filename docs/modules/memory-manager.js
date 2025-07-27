/**
 * Memory Manager - Resource Cleanup and Monitoring
 * Prevents memory leaks by tracking and cleaning up canvases, workers, and large objects
 */

class MemoryManager {
  constructor(options = {}) {
    this.config = {
      maxCanvases: 10,
      maxWorkers: 3,
      cleanupInterval: 30000, // 30 seconds
      memoryWarningThreshold: 100 * 1024 * 1024, // 100MB
      garbageCollectHint: true,
      trackImageData: true,
      ...options
    };

    // Resource registries
    this.canvasRegistry = new Map();
    this.workerRegistry = new Map();
    this.imageDataRegistry = new Map();
    this.urlRegistry = new Set();
    this.intervalRegistry = new Set();
    this.eventListenerRegistry = new Map();

    // Memory tracking
    this.memoryStats = {
      initialHeapSize: 0,
      currentHeapSize: 0,
      maxHeapSize: 0,
      canvasCount: 0,
      workerCount: 0,
      imageDataCount: 0,
      lastCleanup: Date.now()
    };

    this.init();
  }

  /**
   * Initialize memory manager
   */
  init() {
    console.log('MemoryManager: Initializing resource tracking');
    
    // Start baseline memory measurement
    this.updateMemoryStats();
    this.memoryStats.initialHeapSize = this.memoryStats.currentHeapSize;

    // Start cleanup interval
    this.startCleanupInterval();

    // Listen for page unload to cleanup everything
    window.addEventListener('beforeunload', () => {
      this.cleanupAll();
    });

    // Listen for visibility change to cleanup when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanup();
      }
    });

    console.log('MemoryManager: Initialized with config:', this.config);
  }

  /**
   * Register a canvas for tracking and cleanup
   */
  registerCanvas(canvas, context = 'unknown') {
    const id = this.generateId('canvas');
    
    this.canvasRegistry.set(id, {
      canvas: canvas,
      context: context,
      created: Date.now(),
      width: canvas.width,
      height: canvas.height,
      estimated_size: canvas.width * canvas.height * 4 // RGBA bytes
    });

    this.memoryStats.canvasCount++;
    
    console.log(`MemoryManager: Registered canvas ${id} (${canvas.width}x${canvas.height}) for ${context}`);
    
    // Check if we're exceeding limits
    this.checkCanvasLimits();
    
    return id;
  }

  /**
   * Register a web worker for tracking and cleanup
   */
  registerWorker(worker, context = 'unknown') {
    const id = this.generateId('worker');
    
    this.workerRegistry.set(id, {
      worker: worker,
      context: context,
      created: Date.now(),
      url: worker.url || 'unknown'
    });

    this.memoryStats.workerCount++;
    
    console.log(`MemoryManager: Registered worker ${id} for ${context}`);
    
    // Auto-terminate worker if we exceed limits
    this.checkWorkerLimits();
    
    return id;
  }

  /**
   * Register ImageData for tracking
   */
  registerImageData(imageData, context = 'unknown') {
    if (!this.config.trackImageData) return null;
    
    const id = this.generateId('imagedata');
    
    this.imageDataRegistry.set(id, {
      imageData: imageData,
      context: context,
      created: Date.now(),
      width: imageData.width,
      height: imageData.height,
      estimated_size: imageData.data.length
    });

    this.memoryStats.imageDataCount++;
    
    console.log(`MemoryManager: Registered ImageData ${id} (${imageData.width}x${imageData.height}) for ${context}`);
    
    return id;
  }

  /**
   * Register an object URL for cleanup
   */
  registerURL(url, context = 'unknown') {
    this.urlRegistry.add({
      url: url,
      context: context,
      created: Date.now()
    });
    
    console.log(`MemoryManager: Registered URL for ${context}`);
  }

  /**
   * Register an interval for cleanup
   */
  registerInterval(intervalId, context = 'unknown') {
    this.intervalRegistry.add({
      intervalId: intervalId,
      context: context,
      created: Date.now()
    });
    
    console.log(`MemoryManager: Registered interval for ${context}`);
  }

  /**
   * Register an event listener for cleanup
   */
  registerEventListener(element, event, listener, context = 'unknown') {
    const id = this.generateId('listener');
    
    this.eventListenerRegistry.set(id, {
      element: element,
      event: event,
      listener: listener,
      context: context,
      created: Date.now()
    });
    
    console.log(`MemoryManager: Registered event listener ${id} for ${context}`);
    
    return id;
  }

  /**
   * Unregister and cleanup a specific canvas
   */
  unregisterCanvas(id) {
    const entry = this.canvasRegistry.get(id);
    if (!entry) return false;

    // Clear the canvas
    if (entry.canvas && entry.canvas.getContext) {
      try {
        const ctx = entry.canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
        }
        entry.canvas.width = 1;
        entry.canvas.height = 1;
      } catch (error) {
        console.warn('MemoryManager: Error clearing canvas:', error);
      }
    }

    this.canvasRegistry.delete(id);
    this.memoryStats.canvasCount--;
    
    console.log(`MemoryManager: Unregistered canvas ${id}`);
    return true;
  }

  /**
   * Unregister and cleanup a specific worker
   */
  unregisterWorker(id) {
    const entry = this.workerRegistry.get(id);
    if (!entry) return false;

    // Terminate the worker
    if (entry.worker && entry.worker.terminate) {
      try {
        entry.worker.terminate();
      } catch (error) {
        console.warn('MemoryManager: Error terminating worker:', error);
      }
    }

    this.workerRegistry.delete(id);
    this.memoryStats.workerCount--;
    
    console.log(`MemoryManager: Unregistered worker ${id}`);
    return true;
  }

  /**
   * Unregister ImageData
   */
  unregisterImageData(id) {
    const entry = this.imageDataRegistry.get(id);
    if (!entry) return false;

    this.imageDataRegistry.delete(id);
    this.memoryStats.imageDataCount--;
    
    console.log(`MemoryManager: Unregistered ImageData ${id}`);
    return true;
  }

  /**
   * Unregister event listener
   */
  unregisterEventListener(id) {
    const entry = this.eventListenerRegistry.get(id);
    if (!entry) return false;

    try {
      entry.element.removeEventListener(entry.event, entry.listener);
    } catch (error) {
      console.warn('MemoryManager: Error removing event listener:', error);
    }

    this.eventListenerRegistry.delete(id);
    
    console.log(`MemoryManager: Unregistered event listener ${id}`);
    return true;
  }

  /**
   * Perform periodic cleanup
   */
  performCleanup() {
    console.log('MemoryManager: Performing cleanup');
    
    const now = Date.now();
    const maxAge = 300000; // 5 minutes
    
    // Cleanup old canvases
    for (const [id, entry] of this.canvasRegistry) {
      if (now - entry.created > maxAge) {
        console.log(`MemoryManager: Cleaning up old canvas ${id}`);
        this.unregisterCanvas(id);
      }
    }

    // Cleanup old ImageData
    for (const [id, entry] of this.imageDataRegistry) {
      if (now - entry.created > maxAge) {
        console.log(`MemoryManager: Cleaning up old ImageData ${id}`);
        this.unregisterImageData(id);
      }
    }

    // Cleanup URLs
    for (const entry of this.urlRegistry) {
      if (now - entry.created > maxAge) {
        try {
          URL.revokeObjectURL(entry.url);
          this.urlRegistry.delete(entry);
          console.log(`MemoryManager: Revoked URL for ${entry.context}`);
        } catch (error) {
          console.warn('MemoryManager: Error revoking URL:', error);
        }
      }
    }

    // Update memory stats
    this.updateMemoryStats();
    this.memoryStats.lastCleanup = now;

    // Suggest garbage collection if available and memory usage is high
    if (this.config.garbageCollectHint && this.shouldSuggestGC()) {
      this.suggestGarbageCollection();
    }

    console.log('MemoryManager: Cleanup completed', this.getMemoryStats());
  }

  /**
   * Check if we should suggest garbage collection
   */
  shouldSuggestGC() {
    return this.memoryStats.currentHeapSize > this.config.memoryWarningThreshold;
  }

  /**
   * Suggest garbage collection
   */
  suggestGarbageCollection() {
    // Hint garbage collection if available
    if (window.gc) {
      try {
        window.gc();
        console.log('MemoryManager: Triggered garbage collection');
      } catch (error) {
        console.warn('MemoryManager: GC hint failed:', error);
      }
    }

    // Alternative: create memory pressure
    const temp = new Array(1000000).fill(0);
    temp.length = 0;
  }

  /**
   * Check canvas limits and cleanup if necessary
   */
  checkCanvasLimits() {
    if (this.canvasRegistry.size > this.config.maxCanvases) {
      // Remove oldest canvas
      const entries = Array.from(this.canvasRegistry.entries());
      entries.sort((a, b) => a[1].created - b[1].created);
      
      const [oldestId] = entries[0];
      console.log(`MemoryManager: Canvas limit exceeded, removing oldest: ${oldestId}`);
      this.unregisterCanvas(oldestId);
    }
  }

  /**
   * Check worker limits and cleanup if necessary
   */
  checkWorkerLimits() {
    if (this.workerRegistry.size > this.config.maxWorkers) {
      // Remove oldest worker
      const entries = Array.from(this.workerRegistry.entries());
      entries.sort((a, b) => a[1].created - b[1].created);
      
      const [oldestId] = entries[0];
      console.log(`MemoryManager: Worker limit exceeded, terminating oldest: ${oldestId}`);
      this.unregisterWorker(oldestId);
    }
  }

  /**
   * Update memory statistics
   */
  updateMemoryStats() {
    if (performance.memory) {
      this.memoryStats.currentHeapSize = performance.memory.usedJSHeapSize;
      this.memoryStats.maxHeapSize = Math.max(
        this.memoryStats.maxHeapSize, 
        this.memoryStats.currentHeapSize
      );
    }
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats() {
    this.updateMemoryStats();
    
    return {
      ...this.memoryStats,
      registeredCanvases: this.canvasRegistry.size,
      registeredWorkers: this.workerRegistry.size,
      registeredImageData: this.imageDataRegistry.size,
      registeredURLs: this.urlRegistry.size,
      registeredIntervals: this.intervalRegistry.size,
      registeredListeners: this.eventListenerRegistry.size,
      memoryUsageMB: Math.round(this.memoryStats.currentHeapSize / 1024 / 1024),
      memoryIncreaseMB: Math.round((this.memoryStats.currentHeapSize - this.memoryStats.initialHeapSize) / 1024 / 1024)
    };
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.cleanupIntervalId = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);

    console.log(`MemoryManager: Started cleanup interval (${this.config.cleanupInterval}ms)`);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('MemoryManager: Stopped cleanup interval');
    }
  }

  /**
   * Cleanup all resources
   */
  cleanupAll() {
    console.log('MemoryManager: Cleaning up all resources');

    // Cleanup all canvases
    for (const id of this.canvasRegistry.keys()) {
      this.unregisterCanvas(id);
    }

    // Cleanup all workers
    for (const id of this.workerRegistry.keys()) {
      this.unregisterWorker(id);
    }

    // Cleanup all ImageData
    for (const id of this.imageDataRegistry.keys()) {
      this.unregisterImageData(id);
    }

    // Cleanup all URLs
    for (const entry of this.urlRegistry) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch (error) {
        console.warn('MemoryManager: Error revoking URL:', error);
      }
    }
    this.urlRegistry.clear();

    // Cleanup all intervals
    for (const entry of this.intervalRegistry) {
      try {
        clearInterval(entry.intervalId);
      } catch (error) {
        console.warn('MemoryManager: Error clearing interval:', error);
      }
    }
    this.intervalRegistry.clear();

    // Cleanup all event listeners
    for (const id of this.eventListenerRegistry.keys()) {
      this.unregisterEventListener(id);
    }

    // Stop cleanup interval
    this.stopCleanupInterval();

    console.log('MemoryManager: All resources cleaned up');
  }

  /**
   * Generate unique ID for resources
   */
  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get detailed breakdown of memory usage
   */
  getDetailedBreakdown() {
    const breakdown = {
      canvases: [],
      workers: [],
      imageData: [],
      urls: Array.from(this.urlRegistry),
      intervals: Array.from(this.intervalRegistry),
      listeners: []
    };

    // Canvas breakdown
    for (const [id, entry] of this.canvasRegistry) {
      breakdown.canvases.push({
        id,
        context: entry.context,
        size: `${entry.width}x${entry.height}`,
        estimatedBytes: entry.estimated_size,
        age: Date.now() - entry.created
      });
    }

    // Worker breakdown
    for (const [id, entry] of this.workerRegistry) {
      breakdown.workers.push({
        id,
        context: entry.context,
        url: entry.url,
        age: Date.now() - entry.created
      });
    }

    // ImageData breakdown
    for (const [id, entry] of this.imageDataRegistry) {
      breakdown.imageData.push({
        id,
        context: entry.context,
        size: `${entry.width}x${entry.height}`,
        estimatedBytes: entry.estimated_size,
        age: Date.now() - entry.created
      });
    }

    // Event listeners breakdown
    for (const [id, entry] of this.eventListenerRegistry) {
      breakdown.listeners.push({
        id,
        context: entry.context,
        event: entry.event,
        age: Date.now() - entry.created
      });
    }

    return breakdown;
  }

  /**
   * Force immediate cleanup of specific context
   */
  cleanupContext(context) {
    console.log(`MemoryManager: Cleaning up context: ${context}`);
    
    let cleaned = 0;

    // Cleanup canvases from this context
    for (const [id, entry] of this.canvasRegistry) {
      if (entry.context === context) {
        this.unregisterCanvas(id);
        cleaned++;
      }
    }

    // Cleanup workers from this context
    for (const [id, entry] of this.workerRegistry) {
      if (entry.context === context) {
        this.unregisterWorker(id);
        cleaned++;
      }
    }

    // Cleanup ImageData from this context
    for (const [id, entry] of this.imageDataRegistry) {
      if (entry.context === context) {
        this.unregisterImageData(id);
        cleaned++;
      }
    }

    // Cleanup event listeners from this context
    for (const [id, entry] of this.eventListenerRegistry) {
      if (entry.context === context) {
        this.unregisterEventListener(id);
        cleaned++;
      }
    }

    console.log(`MemoryManager: Cleaned up ${cleaned} resources from context: ${context}`);
    return cleaned;
  }
}

// Create global instance
window.MemoryManager = MemoryManager;
window.memoryManager = new MemoryManager();

// Convenience methods for easy access
window.registerCanvas = (canvas, context) => window.memoryManager.registerCanvas(canvas, context);
window.registerWorker = (worker, context) => window.memoryManager.registerWorker(worker, context);
window.registerImageData = (imageData, context) => window.memoryManager.registerImageData(imageData, context);
window.cleanupContext = (context) => window.memoryManager.cleanupContext(context);

console.log('MemoryManager: Module loaded and initialized');