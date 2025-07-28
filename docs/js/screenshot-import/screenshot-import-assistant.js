// Screenshot Import Assistant - Main orchestrator class
// Coordinates the complete screenshot processing and recognition workflow

import { loadOpenCV } from '../lib/opencv-loader.js';
import { ImageProcessingPipeline } from './image-processing-pipeline.js';
import { MatchingEngine } from './matching-engine.js';

export class ScreenshotImportAssistant {
  constructor(options = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold || 0.75,
      maxProcessingTime: options.maxProcessingTime || 30000, // 30 seconds
      enableDebugMode: options.enableDebugMode || false,
      ...options
    };
    
    this.cv = null;
    this.pipeline = null;
    this.matchingEngine = null;
    this.initialized = false;
    this.processing = false;
  }

  // Initialize the assistant
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing Screenshot Import Assistant...');
    
    try {
      // Load OpenCV
      this.cv = await loadOpenCV();
      console.log('OpenCV loaded successfully');
      
      // Initialize pipeline
      this.pipeline = new ImageProcessingPipeline(this.cv);
      await this.pipeline.initialize();
      
      // Initialize matching engine
      this.matchingEngine = new MatchingEngine(this.pipeline.templateManager, this.cv);
      
      this.initialized = true;
      console.log('Screenshot Import Assistant initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Screenshot Import Assistant:', error);
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  // Main method to process screenshot
  async processScreenshot(file, callbacks = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.processing) {
      throw new Error('Another screenshot is already being processed');
    }
    
    this.processing = true;
    const startTime = performance.now();
    
    try {
      // Step 1: Process image through pipeline
      callbacks.onProgress?.({ stage: 'processing', progress: 0 });
      
      const processResult = await this.pipeline.process(file, (progress) => {
        callbacks.onProgress?.({
          stage: 'processing',
          progress: progress.progress * 0.7, // 70% for processing
          substage: progress.stage,
          message: progress.message
        });
      });
      
      // Step 2: Perform recognition
      callbacks.onProgress?.({ 
        stage: 'recognizing', 
        progress: 70,
        message: 'Recognizing upgrades...'
      });
      
      const recognitionResults = await this.recognizeHexagons(
        processResult.hexagons,
        (progress) => {
          callbacks.onProgress?.({
            stage: 'recognizing',
            progress: 70 + (progress * 25), // 25% for recognition
            message: `Matching hexagon ${Math.floor(progress * processResult.hexagons.length) + 1}...`
          });
        }
      );
      
      // Step 3: Analyze results
      callbacks.onProgress?.({ 
        stage: 'analyzing', 
        progress: 95,
        message: 'Analyzing results...'
      });
      
      const analysis = this.analyzeResults(recognitionResults, processResult);
      
      callbacks.onProgress?.({ 
        stage: 'complete', 
        progress: 100,
        message: 'Processing complete!'
      });
      
      const totalTime = performance.now() - startTime;
      
      const result = {
        success: true,
        processingTime: totalTime,
        originalImage: processResult.originalCanvas,
        processedImage: processResult.preprocessedCanvas,
        matches: analysis.matches,
        highConfidenceMatches: analysis.highConfidence,
        lowConfidenceMatches: analysis.lowConfidence,
        statistics: analysis.statistics,
        metadata: {
          ...processResult.metadata,
          recognitionTime: totalTime - processResult.metadata.processingTime,
          totalMatches: analysis.matches.length,
          confidenceThreshold: this.options.confidenceThreshold
        }
      };
      
      if (this.options.enableDebugMode) {
        result.debug = {
          processStages: processResult,
          recognitionDetails: recognitionResults,
          debugVisualization: this.pipeline.createDebugVisualization(processResult)
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('Screenshot processing failed:', error);
      callbacks.onError?.(error);
      
      return {
        success: false,
        error: error.message,
        processingTime: performance.now() - startTime
      };
      
    } finally {
      this.processing = false;
    }
  }

  // Recognize hexagons using the matching engine
  async recognizeHexagons(hexagons, progressCallback) {
    const results = [];
    
    for (let i = 0; i < hexagons.length; i++) {
      const hexagon = hexagons[i];
      
      try {
        const matches = await this.matchingEngine.matchHexagon(hexagon, {
          topK: 3 // Get top 3 matches for alternatives
        });
        
        results.push({
          hexagon,
          matches,
          success: true,
          bestMatch: matches[0] || null,
          alternatives: matches.slice(1)
        });
        
      } catch (error) {
        console.warn(`Failed to recognize hexagon ${i}:`, error);
        results.push({
          hexagon,
          matches: [],
          success: false,
          error: error.message
        });
      }
      
      progressCallback?.((i + 1) / hexagons.length);
    }
    
    return results;
  }

  // Analyze recognition results
  analyzeResults(recognitionResults, processResult) {
    const matches = [];
    const highConfidence = [];
    const lowConfidence = [];
    const failed = [];
    
    recognitionResults.forEach((result, index) => {
      if (!result.success || !result.bestMatch) {
        failed.push({
          index,
          hexagon: result.hexagon,
          error: result.error || 'No matches found'
        });
        return;
      }
      
      const match = {
        index,
        hexagon: result.hexagon,
        upgradeId: result.bestMatch.className,
        className: result.bestMatch.className,
        confidence: result.bestMatch.confidence,
        score: result.bestMatch.score,
        metadata: result.bestMatch.metadata,
        alternatives: result.alternatives,
        position: result.hexagon.position,
        category: result.hexagon.category,
        type: result.hexagon.type
      };
      
      matches.push(match);
      
      if (match.confidence >= this.options.confidenceThreshold) {
        highConfidence.push(match);
      } else {
        lowConfidence.push(match);
      }
    });
    
    // Calculate statistics
    const statistics = {
      totalHexagons: recognitionResults.length,
      successfulMatches: matches.length,
      highConfidenceCount: highConfidence.length,
      lowConfidenceCount: lowConfidence.length,
      failedCount: failed.length,
      averageConfidence: matches.length > 0 ? 
        matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length : 0,
      successRate: matches.length / recognitionResults.length,
      confidenceRate: highConfidence.length / matches.length || 0,
      byCategory: this.groupByCategory(matches),
      byType: this.groupByType(matches)
    };
    
    return {
      matches,
      highConfidence,
      lowConfidence,
      failed,
      statistics
    };
  }

  // Group matches by category
  groupByCategory(matches) {
    const groups = {};
    matches.forEach(match => {
      const category = match.category || 'unknown';
      if (!groups[category]) {
        groups[category] = { count: 0, highConfidence: 0, lowConfidence: 0 };
      }
      groups[category].count++;
      if (match.confidence >= this.options.confidenceThreshold) {
        groups[category].highConfidence++;
      } else {
        groups[category].lowConfidence++;
      }
    });
    return groups;
  }

  // Group matches by type
  groupByType(matches) {
    const groups = {};
    matches.forEach(match => {
      const type = match.type || 'unknown';
      if (!groups[type]) {
        groups[type] = { count: 0, highConfidence: 0, lowConfidence: 0 };
      }
      groups[type].count++;
      if (match.confidence >= this.options.confidenceThreshold) {
        groups[type].highConfidence++;
      } else {
        groups[type].lowConfidence++;
      }
    });
    return groups;
  }

  // Apply matches to cheatsheet (integration method)
  applyMatchesToCheatsheet(matches, mode = 'replace') {
    if (mode === 'replace') {
      // Clear existing selections
      const checkboxes = document.querySelectorAll('input[type="checkbox"][data-upgrade-id]');
      checkboxes.forEach(cb => cb.checked = false);
    }
    
    // Apply new matches
    matches.forEach(match => {
      const checkbox = document.querySelector(`input[data-upgrade-id="${match.upgradeId}"]`);
      if (checkbox) {
        checkbox.checked = true;
        
        // Store match metadata for review mode
        const container = checkbox.closest('.upgrade-container, .hexagon');
        if (container) {
          container.dataset.importedMatch = 'true';
          container.dataset.confidence = match.confidence.toFixed(2);
          container.dataset.matchScore = match.score.toFixed(2);
        }
      } else {
        console.warn(`Could not find checkbox for upgrade: ${match.upgradeId}`);
      }
    });
    
    // Trigger cheatsheet update if available
    if (typeof window.updateDisplay === 'function') {
      window.updateDisplay();
    }
    if (typeof window.updateURL === 'function') {
      window.updateURL();
    }
  }

  // Get processing capabilities
  getCapabilities() {
    return {
      initialized: this.initialized,
      processing: this.processing,
      supportedFormats: ['image/png', 'image/jpeg', 'image/jpg'],
      maxFileSize: '10MB',
      features: [
        'Automatic crop detection',
        'Image preprocessing',
        'Template matching',
        'Confidence scoring',
        'Alternative suggestions'
      ],
      algorithms: this.matchingEngine ? this.matchingEngine.getStats() : null,
      templates: this.pipeline ? this.pipeline.templateManager.getStats() : null
    };
  }

  // Create a simple test interface (for development)
  createTestInterface() {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #1a1a1a;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 16px;
      z-index: 10000;
      color: white;
      font-family: Arial, sans-serif;
      max-width: 300px;
    `;
    
    container.innerHTML = `
      <h3>Screenshot Import Test</h3>
      <input type="file" accept="image/*" id="test-file-input">
      <div id="test-status" style="margin: 10px 0; font-size: 12px;"></div>
      <div id="test-results" style="max-height: 200px; overflow-y: auto; font-size: 11px;"></div>
    `;
    
    const fileInput = container.querySelector('#test-file-input');
    const status = container.querySelector('#test-status');
    const results = container.querySelector('#test-results');
    
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        status.textContent = 'Processing...';
        results.innerHTML = '';
        
        const result = await this.processScreenshot(file, {
          onProgress: (progress) => {
            status.textContent = `${progress.stage}: ${progress.progress.toFixed(0)}%`;
          }
        });
        
        if (result.success) {
          status.textContent = `Success! ${result.matches.length} matches in ${result.processingTime.toFixed(0)}ms`;
          
          results.innerHTML = result.matches.map(match => 
            `<div style="margin: 5px 0; padding: 5px; border: 1px solid #444;">
              ${match.upgradeId} (${(match.confidence * 100).toFixed(0)}%)
            </div>`
          ).join('');
        } else {
          status.textContent = `Error: ${result.error}`;
        }
        
      } catch (error) {
        status.textContent = `Error: ${error.message}`;
      }
    });
    
    document.body.appendChild(container);
    return container;
  }

  // Cleanup resources
  cleanup() {
    if (this.pipeline) {
      this.pipeline.cleanup();
    }
    this.initialized = false;
    this.processing = false;
  }
}