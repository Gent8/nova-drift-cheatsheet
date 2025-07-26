/**
 * Nova Drift Memory Manager - Phase 3 (Node.js Compatible)
 * Manages canvas objects and memory usage for efficient processing
 */

(function(global) {
  'use strict';

  class MemoryManager {
  constructor(options = {}) {
    this.maxPoolSize = options.maxPoolSize || 8;
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB
    this.cleanupThreshold = options.cleanupThreshold || 0.8;
    
    // Canvas pools organized by size
    this.canvasPools = new Map();
    this.activeCanvases = new Set();
    this.memoryUsage = 0;
    this.temporaryBuffers = [];
    
    // Performance monitoring
    this.stats = {
      totalCanvasesCreated: 0,
      totalCanvasesReused: 0,
      peakMemoryUsage: 0,
      cleanupCount: 0
    };
  }

  getCanvas(width, height) {
    const sizeKey = `${width}x${height}`;
    const canvasSize = width * height * 4;
    
    if (this.memoryUsage + canvasSize > this.maxMemoryUsage * this.cleanupThreshold) {
      this.cleanup();
    }
    
    let pool = this.canvasPools.get(sizeKey);
    if (pool && pool.length > 0) {
      const canvas = pool.pop();
      this.activeCanvases.add(canvas);
      this.stats.totalCanvasesReused++;
      return canvas;
    }
    
    // In Node.js, we'll use a simple object to represent canvas
    const canvas = { width, height, data: new Uint8ClampedArray(width * height * 4) };
    this.activeCanvases.add(canvas);
    this.memoryUsage += canvasSize;
    this.stats.totalCanvasesCreated++;
    
    if (this.memoryUsage > this.stats.peakMemoryUsage) {
      this.stats.peakMemoryUsage = this.memoryUsage;
    }
    
    return canvas;
  }

  releaseCanvas(canvas) {
    if (!canvas || !this.activeCanvases.has(canvas)) return;
    
    this.activeCanvases.delete(canvas);
    const sizeKey = `${canvas.width}x${canvas.height}`;
    
    let pool = this.canvasPools.get(sizeKey);
    if (!pool) {
      pool = [];
      this.canvasPools.set(sizeKey, pool);
    }
    
    if (pool.length < this.maxPoolSize) {
      // Reset canvas data
      canvas.data.fill(0);
      pool.push(canvas);
    } else {
      this.memoryUsage -= canvas.width * canvas.height * 4;
    }
  }

  cleanup() {
    const beforeMemory = this.memoryUsage;
    const recentSizes = new Set();
    
    for (const canvas of this.activeCanvases) {
      recentSizes.add(`${canvas.width}x${canvas.height}`);
    }
    
    for (const [sizeKey, pool] of this.canvasPools.entries()) {
      if (!recentSizes.has(sizeKey)) {
        const [width, height] = sizeKey.split('x').map(Number);
        const poolMemory = pool.length * width * height * 4;
        this.memoryUsage -= poolMemory;
        this.canvasPools.delete(sizeKey);
      }
    }
    
    this.stats.cleanupCount++;
    const freedMemory = beforeMemory - this.memoryUsage;
    
    if (freedMemory > 0) {
      console.log(`Memory cleanup freed ${this.formatBytes(freedMemory)}`);
    }
  }

  getCurrentUsage() {
    return this.memoryUsage;
  }

  getTotalMemoryUsage() {
    let total = this.memoryUsage;
    
    for (const canvas of this.activeCanvases) {
      total += canvas.width * canvas.height * 4;
    }
    
    total += this.temporaryBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    
    return total;
  }

  registerBuffer(buffer) {
    this.temporaryBuffers.push(buffer);
    return buffer;
  }

  unregisterBuffer(buffer) {
    const index = this.temporaryBuffers.indexOf(buffer);
    if (index !== -1) this.temporaryBuffers.splice(index, 1);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Other methods remain mostly the same with minor adjustments
  }

  // Attach to global object
  global.MemoryManager = MemoryManager;
  
})(typeof window !== 'undefined' ? window : global);
