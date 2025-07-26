/**
 * Nova Drift Worker Pool - Phase 3
 * Manages web workers for parallel image processing
 */

(function(global) {
  'use strict';

  /**
   * Worker pool for parallel processing
   */
  class WorkerPool {
    constructor(maxWorkers = 4) {
      this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
      this.workers = [];
      this.taskQueue = [];
      this.activeTasks = new Map(); // taskId to resolve/reject
      this.isInitialized = false;
      
      // Performance statistics
      this.stats = {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTaskTime: 0,
        totalTime: 0
      };
      
      // Initialize workers
      this.initialize();
    }

    /**
     * Initialize worker pool with actual web workers
     */
    async initialize() {
      // Check if we're in a browser environment with Web Worker support
      if (typeof Worker !== 'undefined') {
        try {
          for (let i = 0; i < this.maxWorkers; i++) {
            const worker = new Worker('../workers/image-processing-worker.js');
            worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
            worker.onerror = (e) => this.handleWorkerError(worker, e);
            this.workers.push(worker);
          }
          
          this.isInitialized = true;
          console.log(`WorkerPool initialized with ${this.maxWorkers} workers`);
          return;
        } catch (error) {
          console.error('Worker initialization failed:', error);
        }
      }
      
      // Fallback to synchronous mode in Node.js environments
      this.isInitialized = true;
      console.log('WorkerPool running in synchronous mode (Node.js fallback)');
    }

    /**
     * Handle messages from workers
     */
    handleWorkerMessage(worker, e) {
      const { taskId, success, result, error } = e.data;
      
      if (!this.activeTasks.has(taskId)) {
        console.warn(`Received response for unknown task: ${taskId}`);
        return;
      }
      
      const { resolve, reject, startTime } = this.activeTasks.get(taskId);
      this.activeTasks.delete(taskId);
      
      const taskTime = performance.now() - startTime;
      this.stats.completedTasks++;
      this.stats.totalTime += taskTime;
      this.stats.averageTaskTime = this.stats.totalTime / this.stats.completedTasks;
      
      if (success) {
        resolve(result);
      } else {
        this.stats.failedTasks++;
        reject(new Error(error || 'Worker task failed'));
      }
      
      this.processQueue();
    }

    /**
     * Handle worker errors
     */
    handleWorkerError(worker, error) {
      console.error('Worker error:', error);
      // Find the task associated with this worker and reject it
      for (const [taskId, { reject }] of this.activeTasks) {
        if (this.activeTasks.get(taskId).worker === worker) {
          this.stats.failedTasks++;
          reject(error);
          this.activeTasks.delete(taskId);
          break;
        }
      }
    }

    /**
     * Execute a task in a worker
     */
    async executeTask(task) {
      const startTime = performance.now();
      this.stats.totalTasks++;
      
      const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      return new Promise((resolve, reject) => {
        this.taskQueue.push({ task, taskId, resolve, reject, startTime });
        this.processQueue();
      });
    }

    /**
     * Process the next task in the queue
     */
    processQueue() {
      if (this.taskQueue.length === 0) return;
      
      const availableWorker = this.workers.find(worker => 
        !Array.from(this.activeTasks.values()).some(t => t.worker === worker)
      );
      
      if (!availableWorker) return;
      
      const { task, taskId, resolve, reject, startTime } = this.taskQueue.shift();
      this.activeTasks.set(taskId, { resolve, reject, startTime, worker: availableWorker });
      
      availableWorker.postMessage({
        type: task.type,
        data: task.data,
        taskId
      });
    }

    /**
     * Execute multiple tasks in parallel
     */
    async executeBatch(tasks) {
      return Promise.allSettled(tasks.map(task => this.executeTask(task)));
    }

    /**
     * Get worker statistics
     */
    getStats() {
      return {
        ...this.stats,
        activeWorkers: this.activeTasks.size,
        queueLength: this.taskQueue.length,
        successRate: this.stats.totalTasks > 0 ? 
          this.stats.completedTasks / this.stats.totalTasks : 0,
        isInitialized: this.isInitialized
      };
    }

    /**
     * Reset statistics
     */
    resetStats() {
      this.stats = {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        averageTaskTime: 0,
        totalTime: 0
      };
    }

    /**
     * Check if workers are available
     */
    hasAvailableWorkers() {
      return this.activeTasks.size < this.maxWorkers;
    }

    /**
     * Get optimal batch size for current load
     */
    getOptimalBatchSize() {
      const available = this.maxWorkers - this.activeTasks.size;
      return Math.max(1, Math.min(available * 2, 10));
    }

    /**
     * Dispose of all workers
     */
    dispose() {
      // Terminate all workers
      for (const worker of this.workers) {
        worker.terminate();
      }
      
      this.workers = [];
      this.activeTasks.clear();
      this.taskQueue = [];
      this.isInitialized = false;
      
      console.log('WorkerPool disposed');
    }

    /**
     * Estimate processing time for task count
     */
    estimateProcessingTime(taskCount) {
      if (this.stats.averageTaskTime === 0) {
        return taskCount * 50; // Default estimate
      }
      
      const parallelFactor = Math.min(taskCount, this.maxWorkers);
      const sequentialTasks = Math.ceil(taskCount / parallelFactor);
      
      return sequentialTasks * this.stats.averageTaskTime;
    }

    /**
     * Check if pool is overloaded
     */
    isOverloaded() {
      return this.taskQueue.length > this.maxWorkers * 5;
    }

    /**
     * Get current load percentage
     */
    getLoadPercentage() {
      return (this.activeTasks.size / this.maxWorkers) * 100;
    }
  }

  // Export to global scope
  global.WorkerPool = WorkerPool;

})(typeof window !== 'undefined' ? window : global);
