/**
 * Phase 0 Completion Validator
 * Validates that all Phase 0 exit criteria are met before proceeding to Phase 1
 */

class Phase0Validator {
  constructor() {
    this.validationResults = {};
    this.exitCriteria = {
      roiAccuracy: 0.70,
      recognitionAccuracy: 0.75,
      performanceBudgets: {
        roiDetection: 4000,   // 4 seconds
        gridMapping: 5000,    // 5 seconds
        recognition: 8000,    // 8 seconds
        total: 20000          // 20 seconds
      },
      requiredComponents: [
        'ROIDetector',
        'EdgeROIDetector',
        'ColorROIDetector',
        'TemplateROIDetector',
        'CornerROIDetector',
        'ROIBenchmarkRunner'
      ]
    };
  }

  /**
   * Run complete Phase 0 validation
   */
  async validatePhase0Completion() {
    console.log('Phase0Validator: Starting Phase 0 completion validation');
    
    try {
      // 1. Validate component availability
      const componentValidation = await this.validateComponents();
      
      // 2. Validate ROI detection accuracy
      const roiValidation = await this.validateROIAccuracy();
      
      // 3. Validate recognition engine accuracy (if available)
      const recognitionValidation = await this.validateRecognitionAccuracy();
      
      // 4. Validate performance budgets
      const performanceValidation = await this.validatePerformanceBudgets();
      
      // 5. Validate fallback mechanisms
      const fallbackValidation = await this.validateFallbackMechanisms();
      
      // 6. Validate dataset completeness
      const datasetValidation = await this.validateDataset();
      
      const overallResult = {
        timestamp: new Date().toISOString(),
        phase: 'Phase 0 - Risk Reduction & Prototyping',
        validations: {
          components: componentValidation,
          roiDetection: roiValidation,
          recognition: recognitionValidation,
          performance: performanceValidation,
          fallbacks: fallbackValidation,
          dataset: datasetValidation
        },
        phase0Complete: this.assessOverallCompletion([
          componentValidation,
          roiValidation,
          performanceValidation,
          fallbackValidation,
          datasetValidation
        ]),
        readyForPhase1: false,
        recommendations: []
      };
      
      // Generate final assessment
      overallResult.readyForPhase1 = this.determinePhase1Readiness(overallResult.validations);
      overallResult.recommendations = this.generateRecommendations(overallResult);
      
      this.generateCompletionReport(overallResult);
      return overallResult;
      
    } catch (error) {
      console.error('Phase0Validator: Validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate all required components are available
   */
  async validateComponents() {
    console.log('Phase0Validator: Validating component availability');
    
    const validation = {
      name: 'Component Availability',
      passed: true,
      details: {
        availableComponents: [],
        missingComponents: [],
        totalRequired: this.exitCriteria.requiredComponents.length
      }
    };
    
    // Check each required component
    for (const componentName of this.exitCriteria.requiredComponents) {
      if (window[componentName]) {
        validation.details.availableComponents.push(componentName);
      } else {
        validation.details.missingComponents.push(componentName);
        validation.passed = false;
      }
    }
    
    validation.details.availabilityRate = validation.details.availableComponents.length / validation.details.totalRequired;
    
    console.log(`Phase0Validator: ${validation.details.availableComponents.length}/${validation.details.totalRequired} components available`);
    return validation;
  }

  /**
   * Validate ROI detection accuracy using benchmark
   */
  async validateROIAccuracy() {
    console.log('Phase0Validator: Validating ROI detection accuracy');
    
    const validation = {
      name: 'ROI Detection Accuracy',
      passed: false,
      details: {
        targetAccuracy: this.exitCriteria.roiAccuracy,
        actualAccuracy: 0,
        selectedAlgorithm: null,
        algorithmResults: {},
        testResults: null
      }
    };
    
    try {
      // Check if we have a validation dataset
      const dataset = await this.loadValidationDataset();
      
      if (!dataset || dataset.length === 0) {
        validation.details.error = 'No validation dataset available';
        return validation;
      }
      
      // Run ROI benchmark
      const benchmarkRunner = new ROIBenchmarkRunner(dataset);
      await benchmarkRunner.initialize();
      
      const results = await benchmarkRunner.runFullBenchmark();
      validation.details.testResults = results;
      
      // Extract best algorithm results
      if (results.algorithmRankings && results.algorithmRankings.length > 0) {
        const topAlgorithm = results.algorithmRankings[0];
        
        validation.details.selectedAlgorithm = topAlgorithm.algorithm;
        validation.details.actualAccuracy = topAlgorithm.metrics.accuracy;
        validation.details.algorithmResults = results.algorithmRankings;
        
        // Check if accuracy meets requirement
        validation.passed = topAlgorithm.metrics.accuracy >= this.exitCriteria.roiAccuracy;
      }
      
    } catch (error) {
      console.error('Phase0Validator: ROI accuracy validation failed:', error);
      validation.details.error = error.message;
    }
    
    return validation;
  }

  /**
   * Validate recognition engine accuracy (if available)
   */
  async validateRecognitionAccuracy() {
    console.log('Phase0Validator: Validating recognition engine accuracy');
    
    const validation = {
      name: 'Recognition Engine Accuracy',
      passed: true, // Not required for Phase 0 completion
      details: {
        targetAccuracy: this.exitCriteria.recognitionAccuracy,
        actualAccuracy: 0,
        available: false,
        testResults: null,
        note: 'Recognition engine validation is optional for Phase 0'
      }
    };
    
    try {
      // Check if recognition engine is available
      if (window.RecognitionEngine) {
        validation.details.available = true;
        
        // If available, run basic validation test
        const mockResults = await this.runRecognitionValidationTest();
        validation.details.testResults = mockResults;
        validation.details.actualAccuracy = mockResults.overallAccuracy || 0;
      }
      
    } catch (error) {
      console.warn('Phase0Validator: Recognition engine validation failed (non-critical):', error);
      validation.details.error = error.message;
    }
    
    return validation;
  }

  /**
   * Validate performance budgets are achievable
   */
  async validatePerformanceBudgets() {
    console.log('Phase0Validator: Validating performance budgets');
    
    const validation = {
      name: 'Performance Budgets',
      passed: false,
      details: {
        budgets: this.exitCriteria.performanceBudgets,
        actualPerformance: {},
        testResults: []
      }
    };
    
    try {
      // Test ROI detection performance
      const roiPerformance = await this.testROIPerformance();
      validation.details.actualPerformance.roiDetection = roiPerformance;
      validation.details.testResults.push({
        component: 'ROI Detection',
        target: this.exitCriteria.performanceBudgets.roiDetection,
        actual: roiPerformance.averageTime,
        passed: roiPerformance.averageTime <= this.exitCriteria.performanceBudgets.roiDetection
      });
      
      // Calculate overall pass/fail
      const allTestsPassed = validation.details.testResults.every(test => test.passed);
      validation.passed = allTestsPassed;
      
    } catch (error) {
      console.error('Phase0Validator: Performance validation failed:', error);
      validation.details.error = error.message;
    }
    
    return validation;
  }

  /**
   * Validate fallback mechanisms work correctly
   */
  async validateFallbackMechanisms() {
    console.log('Phase0Validator: Validating fallback mechanisms');
    
    const validation = {
      name: 'Fallback Mechanisms',
      passed: false,
      details: {
        fallbackTests: [],
        allFallbacksWork: false
      }
    };
    
    try {
      // Test ROI detection fallback
      const roiFallback = await this.testROIDetectionFallback();
      validation.details.fallbackTests.push(roiFallback);
      
      // Test timeout handling
      const timeoutFallback = await this.testTimeoutHandling();
      validation.details.fallbackTests.push(timeoutFallback);
      
      // Test error recovery
      const errorFallback = await this.testErrorRecovery();
      validation.details.fallbackTests.push(errorFallback);
      
      validation.details.allFallbacksWork = validation.details.fallbackTests.every(test => test.passed);
      validation.passed = validation.details.allFallbacksWork;
      
    } catch (error) {
      console.error('Phase0Validator: Fallback validation failed:', error);
      validation.details.error = error.message;
    }
    
    return validation;
  }

  /**
   * Validate dataset completeness and quality
   */
  async validateDataset() {
    console.log('Phase0Validator: Validating dataset completeness');
    
    const validation = {
      name: 'Dataset Validation',
      passed: false,
      details: {
        targetCount: 40,
        actualCount: 0,
        annotatedCount: 0,
        qualityScore: 0,
        completenessRatio: 0
      }
    };
    
    try {
      const dataset = await this.loadValidationDataset();
      
      if (dataset) {
        validation.details.actualCount = dataset.length;
        validation.details.annotatedCount = dataset.filter(item => 
          item.groundTruth && item.groundTruth.buildArea
        ).length;
        
        validation.details.completenessRatio = validation.details.actualCount / validation.details.targetCount;
        
        // Calculate quality score based on annotations
        if (validation.details.annotatedCount > 0) {
          const avgQuality = dataset
            .filter(item => item.metadata && item.metadata.qualityScore)
            .reduce((sum, item) => sum + item.metadata.qualityScore, 0) / validation.details.annotatedCount;
          
          validation.details.qualityScore = avgQuality;
        }
        
        // Pass if we have at least 10 annotated samples (minimum for testing)
        validation.passed = validation.details.annotatedCount >= 10;
      }
      
    } catch (error) {
      console.error('Phase0Validator: Dataset validation failed:', error);
      validation.details.error = error.message;
    }
    
    return validation;
  }

  /**
   * Load validation dataset from localStorage or file
   */
  async loadValidationDataset() {
    try {
      // Try to load from localStorage first (from annotation tool)
      const saved = localStorage.getItem('nova-drift-annotations');
      if (saved) {
        const annotations = JSON.parse(saved);
        
        // Convert annotations to test format
        return annotations.map(annotation => ({
          filename: annotation.filename,
          groundTruth: {
            buildArea: annotation.buildArea
          },
          metadata: annotation.metadata,
          imageData: null // Would need to be loaded separately
        }));
      }
      
      return [];
      
    } catch (error) {
      console.warn('Phase0Validator: Failed to load validation dataset:', error);
      return [];
    }
  }

  /**
   * Test ROI detection performance
   */
  async testROIPerformance() {
    const iterations = 5;
    const times = [];
    
    // Create test image
    const testImage = await this.createTestImage();
    
    if (!window.ROIDetector) {
      throw new Error('ROIDetector not available for performance testing');
    }
    
    const detector = new ROIDetector();
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      try {
        await detector.detectROI(testImage);
        const endTime = performance.now();
        times.push(endTime - startTime);
      } catch (error) {
        console.warn('Phase0Validator: ROI performance test iteration failed:', error);
        times.push(10000); // High penalty for failure
      }
    }
    
    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations: iterations,
      allTimes: times
    };
  }

  /**
   * Test ROI detection fallback mechanism
   */
  async testROIDetectionFallback() {
    try {
      if (!window.ROIDetector) {
        return { name: 'ROI Fallback', passed: false, error: 'ROIDetector not available' };
      }
      
      const detector = new ROIDetector({ enableFallback: true });
      
      // Create a problematic image that should trigger fallback
      const testImage = await this.createTestImage(10, 10); // Very small image
      
      const result = await detector.detectROI(testImage);
      
      // Check if fallback was used
      const fallbackUsed = result && result.method === 'fallback';
      
      return {
        name: 'ROI Detection Fallback',
        passed: fallbackUsed,
        details: {
          result: result,
          fallbackUsed: fallbackUsed
        }
      };
      
    } catch (error) {
      return {
        name: 'ROI Detection Fallback',
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Test timeout handling
   */
  async testTimeoutHandling() {
    try {
      if (!window.ROIDetector) {
        return { name: 'Timeout Handling', passed: false, error: 'ROIDetector not available' };
      }
      
      const detector = new ROIDetector({ timeout: 100 }); // Very short timeout
      const testImage = await this.createTestImage();
      
      let timeoutOccurred = false;
      
      try {
        await detector.detectROI(testImage);
      } catch (error) {
        if (error.message.includes('timeout')) {
          timeoutOccurred = true;
        }
      }
      
      return {
        name: 'Timeout Handling',
        passed: timeoutOccurred,
        details: {
          timeoutOccurred: timeoutOccurred
        }
      };
      
    } catch (error) {
      return {
        name: 'Timeout Handling',
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Test error recovery mechanisms
   */
  async testErrorRecovery() {
    try {
      // Test that invalid inputs are handled gracefully
      if (!window.ROIDetector) {
        return { name: 'Error Recovery', passed: false, error: 'ROIDetector not available' };
      }
      
      const detector = new ROIDetector();
      
      let errorHandled = false;
      
      try {
        // Pass invalid image
        await detector.detectROI(null);
      } catch (error) {
        errorHandled = true;
      }
      
      return {
        name: 'Error Recovery',
        passed: errorHandled,
        details: {
          errorHandled: errorHandled
        }
      };
      
    } catch (error) {
      return {
        name: 'Error Recovery',
        passed: false,
        error: error.message
      };
    }
  }

  /**
   * Run basic recognition engine validation test
   */
  async runRecognitionValidationTest() {
    // Mock implementation - would be replaced with actual recognition engine test
    return {
      overallAccuracy: 0.80,
      testCount: 10,
      note: 'Mock recognition test results'
    };
  }

  /**
   * Create test image for performance testing
   */
  async createTestImage(width = 1920, height = 1080) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      
      // Draw mock Nova Drift-like content
      ctx.fillStyle = '#1a1a2e'; // Dark space background
      ctx.fillRect(0, 0, width, height);
      
      // Add some colored hexagon-like shapes
      const centerX = width / 2;
      const centerY = height / 2;
      
      for (let i = 0; i < 20; i++) {
        const x = centerX + (Math.random() - 0.5) * 400;
        const y = centerY + (Math.random() - 0.5) * 300;
        const size = 20 + Math.random() * 20;
        
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
        ctx.beginPath();
        
        // Draw hexagon-like shape
        for (let j = 0; j < 6; j++) {
          const angle = (j * Math.PI) / 3;
          const px = x + size * Math.cos(angle);
          const py = y + size * Math.sin(angle);
          
          if (j === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        
        ctx.closePath();
        ctx.fill();
      }
      
      // Convert to image
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = canvas.toDataURL();
    });
  }

  /**
   * Assess overall completion status
   */
  assessOverallCompletion(validations) {
    const criticalValidations = validations.filter(v => 
      v.name !== 'Recognition Engine Accuracy' // Not required for Phase 0
    );
    
    return criticalValidations.every(v => v.passed);
  }

  /**
   * Determine if ready for Phase 1
   */
  determinePhase1Readiness(validations) {
    // Phase 1 readiness criteria:
    // 1. All components available
    // 2. ROI detection accuracy >= 70%
    // 3. Performance budgets met
    // 4. Fallback mechanisms working
    // 5. Minimum dataset available
    
    const critical = [
      validations.components.passed,
      validations.roiDetection.passed,
      validations.performance.passed,
      validations.fallbacks.passed,
      validations.dataset.passed
    ];
    
    return critical.every(Boolean);
  }

  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(overallResult) {
    const recommendations = [];
    const validations = overallResult.validations;
    
    // Component recommendations
    if (!validations.components.passed) {
      recommendations.push({
        type: 'critical',
        component: 'Components',
        message: `Missing required components: ${validations.components.details.missingComponents.join(', ')}`,
        action: 'Ensure all ROI detection algorithms are loaded before proceeding'
      });
    }
    
    // ROI accuracy recommendations
    if (!validations.roiDetection.passed) {
      const actualAccuracy = validations.roiDetection.details.actualAccuracy;
      const targetAccuracy = validations.roiDetection.details.targetAccuracy;
      
      recommendations.push({
        type: 'critical',
        component: 'ROI Detection',
        message: `Accuracy ${(actualAccuracy * 100).toFixed(1)}% below target ${(targetAccuracy * 100).toFixed(1)}%`,
        action: 'Optimize algorithm parameters or collect more training data'
      });
    }
    
    // Performance recommendations
    if (!validations.performance.passed) {
      recommendations.push({
        type: 'important',
        component: 'Performance',
        message: 'Performance budgets not met',
        action: 'Optimize algorithms or adjust performance targets'
      });
    }
    
    // Dataset recommendations
    if (!validations.dataset.passed) {
      const actualCount = validations.dataset.details.actualCount;
      const targetCount = validations.dataset.details.targetCount;
      
      recommendations.push({
        type: 'important',
        component: 'Dataset',
        message: `Only ${actualCount}/${targetCount} test cases available`,
        action: 'Use ground truth annotator to create more test cases'
      });
    }
    
    // Success recommendations
    if (overallResult.readyForPhase1) {
      recommendations.push({
        type: 'success',
        component: 'Overall',
        message: 'Phase 0 validation successful - ready to proceed to Phase 1',
        action: 'Begin Phase 1 implementation with recommended algorithm configuration'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate completion report
   */
  generateCompletionReport(overallResult) {
    console.log('Phase0Validator: Generating completion report');
    
    const report = {
      ...overallResult,
      exportTimestamp: new Date().toISOString(),
      summary: {
        totalValidations: Object.keys(overallResult.validations).length,
        passedValidations: Object.values(overallResult.validations).filter(v => v.passed).length,
        criticalIssues: overallResult.recommendations.filter(r => r.type === 'critical').length,
        readyForPhase1: overallResult.readyForPhase1
      }
    };
    
    // Save to localStorage for reference
    try {
      localStorage.setItem('phase0-validation-results', JSON.stringify(report));
    } catch (error) {
      console.warn('Phase0Validator: Could not save results to localStorage:', error);
    }
    
    // Dispatch completion event
    document.dispatchEvent(new CustomEvent('phase0-validation-complete', {
      detail: report
    }));
    
    console.log('Phase0Validator: Validation completed:', report.summary);
    return report;
  }

  /**
   * Export validation results
   */
  exportResults(results, filename = null) {
    const exportFilename = filename || `phase0-validation-${new Date().toISOString().split('T')[0]}.json`;
    
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename;
    a.click();
    
    URL.revokeObjectURL(url);
    
    console.log(`Phase0Validator: Results exported to ${exportFilename}`);
  }
}

// Export for global use
window.Phase0Validator = Phase0Validator;

console.log('Phase0Validator: Phase 0 validation system loaded');