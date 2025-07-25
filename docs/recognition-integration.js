/**
 * Nova Drift Recognition Integration - Phase 4
 * Integrates recognition engine with the image processing pipeline
 */

(function(global) {
  'use strict';

  // Import the recognition engine
  const RecognitionEngine = global.RecognitionEngine || require('./recognition-engine/recognition-engine.js');

  /**
   * Initialize recognition system when DOM is ready
   */
  function initializeRecognitionSystem() {
    // Initialize recognition engine with optimized configuration
    const recognitionEngine = new RecognitionEngine({
      algorithms: ['brightness', 'color', 'edge', 'pattern'],
      consensusThreshold: 0.6,
      calibrationEnabled: true,
      performanceMonitoring: true,
      batchProcessing: true,
      maxConcurrentAnalyses: 8,
      algorithmWeights: {
        brightness: 0.35,  // Slightly higher weight for brightness
        color: 0.25,
        edge: 0.25,
        pattern: 0.15     // Lower weight for pattern matching initially
      }
    });

    // Set up event listeners for Phase 3 → Phase 4 integration
    setupPhase3Integration(recognitionEngine);
    
    // Set up calibration and user feedback handling
    setupCalibrationSystem(recognitionEngine);
    
    // Set up performance monitoring
    setupPerformanceMonitoring(recognitionEngine);
    
    console.log('Recognition system initialized successfully');
    
    // Store globally for debugging and access
    global.recognitionEngine = recognitionEngine;
    
    return recognitionEngine;
  }

  /**
   * Set up integration with Phase 3 (image processing)
   * @param {RecognitionEngine} recognitionEngine - The recognition engine instance
   */
  function setupPhase3Integration(recognitionEngine) {
    // Listen for regions-extracted events from Phase 3
    document.addEventListener('regions-extracted', async (event) => {
      console.log('Recognition: Received regions-extracted event');
      
      try {
        const regionData = event.detail.regionData;
        const processingMetadata = event.detail.processingMetadata;
        
        // Validate input data
        if (!regionData || !(regionData instanceof Map) || regionData.size === 0) {
          throw new Error('Invalid or empty region data received');
        }
        
        console.log(`Recognition: Starting analysis of ${regionData.size} regions`);
        
        // Start recognition analysis
        const startTime = performance.now();
        
        const recognitionResult = await recognitionEngine.analyzeRegions(
          regionData, 
          processingMetadata
        );
        
        const totalTime = performance.now() - startTime;
        
        // Log analysis results
        const stats = recognitionResult.detail.overallStats;
        console.log(`Recognition completed in ${totalTime.toFixed(1)}ms:`);
        console.log(`- Total analyzed: ${stats.totalAnalyzed}`);
        console.log(`- High confidence: ${stats.highConfidence}`);
        console.log(`- Average confidence: ${stats.averageConfidence.toFixed(2)}`);
        console.log(`- Selected mods: ${stats.selectedCount}`);
        console.log(`- Ambiguous results: ${stats.ambiguousCount}`);
        
        // Dispatch recognition results for Phase 5
        document.dispatchEvent(new CustomEvent('selection-detected', {
          detail: recognitionResult.detail
        }));
        
      } catch (error) {
        console.error('Recognition analysis failed:', error);
        
        // Dispatch error event
        document.dispatchEvent(new CustomEvent('recognition-error', {
          detail: {
            error: error.message,
            timestamp: Date.now(),
            phase: 'recognition'
          }
        }));
      }
    });
    
    // Add status logging for recognition events
    document.addEventListener('selection-detected', (event) => {
      const stats = event.detail.overallStats;
      
      // Update UI status if status element exists
      const statusElement = document.getElementById('recognition-status');
      if (statusElement) {
        statusElement.textContent = 
          `Recognition: ${stats.totalAnalyzed} mods analyzed, ` +
          `${stats.highConfidence} high confidence, ` +
          `${stats.selectedCount} selected`;
        statusElement.className = 'status-success';
      }
      
      console.log('Recognition results dispatched for Phase 5');
    });
  }

  /**
   * Set up calibration system for continuous learning
   * @param {RecognitionEngine} recognitionEngine - The recognition engine instance
   */
  function setupCalibrationSystem(recognitionEngine) {
    // Listen for user corrections from Phase 6 (user feedback)
    document.addEventListener('user-correction', (event) => {
      try {
        const { positionId, actualSelection, detectionResult } = event.detail;
        
        // Record the correction for calibration
        recognitionEngine.recordUserCorrection(
          positionId, 
          actualSelection, 
          detectionResult
        );
        
        console.log(`User correction recorded: ${positionId} = ${actualSelection}`);
        
      } catch (error) {
        console.warn('Failed to record user correction:', error);
      }
    });
    
    // Periodic calibration (every 20 corrections or 5 minutes)
    let correctionCount = 0;
    let lastCalibrationTime = Date.now();
    
    document.addEventListener('user-correction', () => {
      correctionCount++;
      const timeSinceLastCalibration = Date.now() - lastCalibrationTime;
      
      // Trigger calibration if enough corrections or enough time has passed
      if (correctionCount >= 20 || timeSinceLastCalibration > 5 * 60 * 1000) {
        try {
          recognitionEngine.calibrateAlgorithms();
          correctionCount = 0;
          lastCalibrationTime = Date.now();
          
          console.log('Automatic calibration completed');
          
          // Dispatch calibration event
          document.dispatchEvent(new CustomEvent('recognition-calibrated', {
            detail: {
              timestamp: Date.now(),
              trigger: correctionCount >= 20 ? 'correction-count' : 'time-based'
            }
          }));
          
        } catch (error) {
          console.warn('Automatic calibration failed:', error);
        }
      }
    });
    
    // Manual calibration trigger
    document.addEventListener('trigger-calibration', () => {
      try {
        recognitionEngine.calibrateAlgorithms();
        console.log('Manual calibration completed');
        
        document.dispatchEvent(new CustomEvent('recognition-calibrated', {
          detail: {
            timestamp: Date.now(),
            trigger: 'manual'
          }
        }));
        
      } catch (error) {
        console.warn('Manual calibration failed:', error);
      }
    });
  }

  /**
   * Set up performance monitoring and reporting
   * @param {RecognitionEngine} recognitionEngine - The recognition engine instance
   */
  function setupPerformanceMonitoring(recognitionEngine) {
    // Periodic performance reporting (every 10 analyses or 2 minutes)
    let analysisCount = 0;
    let lastReportTime = Date.now();
    
    document.addEventListener('selection-detected', () => {
      analysisCount++;
      const timeSinceLastReport = Date.now() - lastReportTime;
      
      // Generate performance report
      if (analysisCount >= 10 || timeSinceLastReport > 2 * 60 * 1000) {
        try {
          const statusReport = recognitionEngine.getStatusReport();
          
          console.log('Recognition Performance Report:');
          console.log(`- Total processed: ${statusReport.engine.performance.totalProcessed}`);
          console.log(`- Average confidence: ${statusReport.engine.performance.averageConfidence.toFixed(3)}`);
          console.log(`- Average processing time: ${statusReport.engine.performance.averageProcessingTime.toFixed(1)}ms`);
          console.log(`- Calibration data points: ${statusReport.calibration.dataPoints}`);
          
          // Dispatch performance report
          document.dispatchEvent(new CustomEvent('recognition-performance-report', {
            detail: statusReport
          }));
          
          analysisCount = 0;
          lastReportTime = Date.now();
          
        } catch (error) {
          console.warn('Performance reporting failed:', error);
        }
      }
    });
    
    // Error tracking
    document.addEventListener('recognition-error', (event) => {
      console.error('Recognition error tracked:', event.detail);
      
      // Update error status in UI if available
      const statusElement = document.getElementById('recognition-status');
      if (statusElement) {
        statusElement.textContent = `Recognition Error: ${event.detail.error}`;
        statusElement.className = 'status-error';
      }
    });
    
    // Success rate monitoring
    let totalAttempts = 0;
    let successfulAttempts = 0;
    
    document.addEventListener('regions-extracted', () => {
      totalAttempts++;
    });
    
    document.addEventListener('selection-detected', () => {
      successfulAttempts++;
      
      const successRate = (successfulAttempts / totalAttempts) * 100;
      
      // Log success rate periodically
      if (totalAttempts % 5 === 0) {
        console.log(`Recognition success rate: ${successRate.toFixed(1)}% (${successfulAttempts}/${totalAttempts})`);
      }
    });
  }

  /**
   * Create debug interface for recognition system
   */
  function createDebugInterface() {
    // Only create debug interface in development/debug mode
    if (global.location && global.location.search.includes('debug=true')) {
      
      const debugPanel = document.createElement('div');
      debugPanel.id = 'recognition-debug-panel';
      debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 10000;
        max-height: 400px;
        overflow-y: auto;
      `;
      
      debugPanel.innerHTML = `
        <h3>Recognition Debug</h3>
        <div id="recognition-status">Initializing...</div>
        <div id="recognition-stats"></div>
        <button onclick="global.recognitionEngine?.calibrateAlgorithms()">
          Manual Calibration
        </button>
        <button onclick="console.log(global.recognitionEngine?.getStatusReport())">
          Status Report
        </button>
        <button onclick="global.recognitionEngine?.reset()">
          Reset Engine
        </button>
      `;
      
      document.body.appendChild(debugPanel);
      
      // Update debug panel with performance data
      document.addEventListener('recognition-performance-report', (event) => {
        const statsElement = document.getElementById('recognition-stats');
        if (statsElement) {
          const stats = event.detail.engine.performance;
          statsElement.innerHTML = `
            <div>Processed: ${stats.totalProcessed}</div>
            <div>Avg Confidence: ${stats.averageConfidence.toFixed(3)}</div>
            <div>Avg Time: ${stats.averageProcessingTime.toFixed(1)}ms</div>
            <div>Calibration Points: ${event.detail.calibration.dataPoints}</div>
          `;
        }
      });
    }
  }

  // Initialize when DOM is ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeRecognitionSystem();
        createDebugInterface();
      });
    } else {
      // DOM already loaded
      initializeRecognitionSystem();
      createDebugInterface();
    }
  }

  // Export for testing and manual initialization
  global.initializeRecognitionSystem = initializeRecognitionSystem;

})(typeof window !== 'undefined' ? window : global);
