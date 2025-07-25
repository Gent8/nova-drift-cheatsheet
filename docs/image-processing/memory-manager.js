/**
 * Nova Drift Memory Manager - Phase 3
 * Manages canvas objects and memory usage for efficient processing
 */

(function(global) {
  'use strict';

  /**
   * Memory manager for canvas pooling and resource management
   */
  class MemoryManager {
    constructor(options = {}) {
      this.maxPoolSize = options.maxPoolSize || 8;
      this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB
      this.cleanupThreshold = options.cleanupThreshold || 0.8; // 80% of max memory
      
      // Canvas pools organized by size
      this.canvasPools = new Map();
      this.activeCanvases = new Set();
      this.memoryUsage = 0;
      
      // Performance monitoring
      this.stats = {
        totalCanvasesCreated: 0,
        totalCanvasesReused: 0,
        peakMemoryUsage: 0,
        cleanupCount: 0
      };
      
      // Automatic cleanup timer
      this.cleanupTimer = null;
      this.startPeriodicCleanup();
    }

    /**
     * Get a canvas from the pool or create a new one
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {HTMLCanvasElement} Canvas element
     */
    getCanvas(width, height) {
      const sizeKey = `${width}x${height}`;
      const canvasSize = width * height * 4; // RGBA bytes
      
      // Check if we're approaching memory limits
      if (this.memoryUsage + canvasSize > this.maxMemoryUsage * this.cleanupThreshold) {
        this.cleanup();
      }
      
      // Try to get from pool
      let pool = this.canvasPools.get(sizeKey);
      if (pool && pool.length > 0) {
        const canvas = pool.pop();
        this.activeCanvases.add(canvas);
        this.stats.totalCanvasesReused++;
        return canvas;
      }
      
      // Create new canvas
      const canvas = this.createCanvas(width, height);
      this.activeCanvases.add(canvas);
      this.memoryUsage += canvasSize;
      this.stats.totalCanvasesCreated++;
      
      // Update peak memory usage
      if (this.memoryUsage > this.stats.peakMemoryUsage) {
        this.stats.peakMemoryUsage = this.memoryUsage;
      }
      
      return canvas;
    }

    /**
     * Return a canvas to the pool for reuse
     * @param {HTMLCanvasElement} canvas - Canvas to return
     */
    releaseCanvas(canvas) {
      if (!canvas || !this.activeCanvases.has(canvas)) {
        return;
      }
      
      this.activeCanvases.delete(canvas);
      
      const width = canvas.width;
      const height = canvas.height;
      const sizeKey = `${width}x${height}`;
      
      // Get or create pool for this size
      let pool = this.canvasPools.get(sizeKey);
      if (!pool) {
        pool = [];
        this.canvasPools.set(sizeKey, pool);
      }
      
      // Add to pool if not full
      if (pool.length < this.maxPoolSize) {
        // Clear canvas for reuse
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        
        pool.push(canvas);
      } else {
        // Pool is full, release memory
        const canvasSize = width * height * 4;
        this.memoryUsage -= canvasSize;
      }
    }

    /**
     * Create a new canvas element
     */
    createCanvas(width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      // Configure context for optimal performance
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      return canvas;
    }

    /**
     * Force cleanup of unused resources
     */
    cleanup() {
      const beforeMemory = this.memoryUsage;
      
      // Clean up pools, keeping only recent sizes
      const recentSizes = new Set();
      for (const canvas of this.activeCanvases) {
        recentSizes.add(`${canvas.width}x${canvas.height}`);
      }
      
      // Remove pools for sizes not currently in use
      for (const [sizeKey, pool] of this.canvasPools.entries()) {
        if (!recentSizes.has(sizeKey)) {
          // Calculate memory to be freed
          const [width, height] = sizeKey.split('x').map(Number);
          const poolMemory = pool.length * width * height * 4;
          this.memoryUsage -= poolMemory;
          
          // Remove the pool
          this.canvasPools.delete(sizeKey);
        } else {
          // Keep pool but reduce size if too large
          const maxSize = Math.max(2, Math.floor(this.maxPoolSize / 2));
          if (pool.length > maxSize) {
            const [width, height] = sizeKey.split('x').map(Number);
            const removedCount = pool.length - maxSize;
            const freedMemory = removedCount * width * height * 4;
            
            pool.splice(maxSize);
            this.memoryUsage -= freedMemory;
          }
        }
      }
      
      // Force garbage collection hint (if available)
      if (global.gc && typeof global.gc === 'function') {
        global.gc();
      }
      
      this.stats.cleanupCount++;
      const freedMemory = beforeMemory - this.memoryUsage;
      
      if (freedMemory > 0) {
        console.log(`Memory cleanup freed ${this.formatBytes(freedMemory)} (${this.formatBytes(this.memoryUsage)} remaining)`);
      }
    }

    /**
     * Get current memory usage estimate
     */
    getCurrentUsage() {
      return this.memoryUsage;
    }

    /**
     * Get memory usage statistics
     */
    getStats() {
      return {
        ...this.stats,
        currentMemoryUsage: this.memoryUsage,
        activeCanvases: this.activeCanvases.size,
        pooledCanvases: Array.from(this.canvasPools.values()).reduce((sum, pool) => sum + pool.length, 0),
        poolCount: this.canvasPools.size
      };
    }

    /**
     * Start periodic cleanup
     */
    startPeriodicCleanup() {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
      
      // Run cleanup every 30 seconds
      this.cleanupTimer = setInterval(() => {
        if (this.memoryUsage > this.maxMemoryUsage * this.cleanupThreshold) {
          this.cleanup();
        }
      }, 30000);
    }

    /**
     * Stop periodic cleanup
     */
    stopPeriodicCleanup() {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }
    }

    /**
     * Format bytes for human readable output
     */
    formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Reset all statistics
     */
    resetStats() {
      this.stats = {
        totalCanvasesCreated: 0,
        totalCanvasesReused: 0,
        peakMemoryUsage: 0,
        cleanupCount: 0
      };
    }

    /**
     * Dispose of all resources
     */
    dispose() {
      this.stopPeriodicCleanup();
      
      // Clear all pools
      this.canvasPools.clear();
      this.activeCanvases.clear();
      this.memoryUsage = 0;
      
      console.log('MemoryManager disposed');
    }

    /**
     * Check if memory usage is critical
     */
    isMemoryCritical() {
      return this.memoryUsage > this.maxMemoryUsage * 0.9;
    }

    /**
     * Get memory efficiency ratio
     */
    getEfficiencyRatio() {
      const total = this.stats.totalCanvasesCreated + this.stats.totalCanvasesReused;
      return total > 0 ? this.stats.totalCanvasesReused / total : 0;
    }
  }

  // Export to global scope
  global.MemoryManager = MemoryManager;

})(typeof window !== 'undefined' ? window : global);
