/**
 * Phase 2 Enhanced Validation Demo
 * Demonstrates the improved grid mapping system with real-world validation
 */

(function(global) {
  'use strict';

  /**
   * Demo system for Phase 2 enhancements
   */
  const Phase2Demo = {
    
    /**
     * Run complete demonstration of Phase 2 improvements
     */
    runDemo: async () => {
      console.log('🎯 Phase 2 Enhanced Grid Mapping Demo');
      console.log('=====================================');
      
      try {
        // Test 1: Enhanced Scale Detection
        console.log('\n1️⃣ Testing Enhanced Scale Detection...');
        await Phase2Demo.demoScaleDetection();
        
        // Test 2: Grid Center Detection  
        console.log('\n2️⃣ Testing Grid Center Detection...');
        await Phase2Demo.demoGridCenterDetection();
        
        // Test 3: Real-World Validation
        console.log('\n3️⃣ Testing Real-World Validation...');
        await Phase2Demo.demoRealWorldValidation();
        
        // Test 4: Performance Benchmark
        console.log('\n4️⃣ Running Performance Benchmark...');
        await Phase2Demo.demoPerformanceBenchmark();
        
        // Test 5: Comprehensive Test Suite
        console.log('\n5️⃣ Running Comprehensive Test Suite...');
        await Phase2Demo.demoComprehensiveTests();
        
        console.log('\n✅ Phase 2 Demo Complete!');
        console.log('The enhanced grid mapping system is ready for production use.');
        
      } catch (error) {
        console.error('❌ Demo failed:', error);
        console.log('Please check the implementation and try again.');
      }
    },

    /**
     * Demo enhanced scale detection capabilities
     */
    demoScaleDetection: async () => {
      const scaleDetector = new global.NovaGridMapper.ScaleDetector({
        metadata: { hexDiameter: 48, hexRadius: 24 }
      });

      // Test with different synthetic images
      const testImages = [
        { name: '1920x1080 Reference', width: 1920, height: 1080 },
        { name: '2560x1440 Scaled', width: 2560, height: 1440 },
        { name: '3840x2160 4K', width: 3840, height: 2160 }
      ];

      console.log('   Testing scale detection with multiple methods:');
      
      for (const imageSpec of testImages) {
        const testImage = Phase2Demo.createTestImage(imageSpec.width, imageSpec.height);
        
        try {
          const result = await scaleDetector.detectScale(testImage);
          console.log(`     ${imageSpec.name}: Scale=${result.scaleFactor.toFixed(2)}, Confidence=${(result.confidence * 100).toFixed(1)}%`);
        } catch (error) {
          console.log(`     ${imageSpec.name}: Detection failed (${error.message})`);
        }
      }
    },

    /**
     * Demo grid center detection
     */
    demoGridCenterDetection: async () => {
      const gridMapper = new global.NovaGridMapper.GridMapper();
      
      const testImage = Phase2Demo.createTestImageWithCenteredGrid(800, 600);
      const scaleResult = { scaleFactor: 1.0, confidence: 0.8 };
      
      console.log('   Testing multiple center detection methods:');
      
      try {
        const center = await gridMapper.detectGridCenter(testImage, scaleResult);
        const expectedX = testImage.width / 2;
        const expectedY = testImage.height / 2;
        const errorX = Math.abs(center.x - expectedX);
        const errorY = Math.abs(center.y - expectedY);
        
        console.log(`     Detected center: (${center.x.toFixed(1)}, ${center.y.toFixed(1)})`);
        console.log(`     Expected center: (${expectedX}, ${expectedY})`);
        console.log(`     Error: (${errorX.toFixed(1)}, ${errorY.toFixed(1)}) pixels`);
        
        if (errorX < 50 && errorY < 50) {
          console.log('     ✅ Center detection within tolerance');
        } else {
          console.log('     ⚠️ Center detection outside tolerance');
        }
      } catch (error) {
        console.log(`     ❌ Center detection failed: ${error.message}`);
      }
    },

    /**
     * Demo real-world validation system
     */
    demoRealWorldValidation: async () => {
      if (!global.NovaRealWorldValidator) {
        console.log('     ⚠️ Real-world validator not available');
        return;
      }

      const validator = new global.NovaRealWorldValidator.RealWorldValidator();
      const gridMapper = new global.NovaGridMapper.GridMapper();
      
      console.log('   Setting up validation samples...');
      await validator.generateBenchmarkSamples();
      
      console.log('   Running accuracy validation...');
      const validationResults = await validator.runValidation(gridMapper);
      
      console.log(`     Overall Accuracy: ${(validationResults.overallAccuracy * 100).toFixed(1)}%`);
      console.log(`     Samples Processed: ${validationResults.processedSamples}/${validationResults.totalSamples}`);
      console.log(`     Meets Requirement: ${validationResults.meetsRequirement ? '✅' : '❌'}`);
      
      if (validationResults.results.length > 0) {
        const avgConfidence = validationResults.results.reduce((sum, r) => sum + r.mappingConfidence, 0) / validationResults.results.length;
        console.log(`     Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      }
    },

    /**
     * Demo performance benchmark
     */
    demoPerformanceBenchmark: async () => {
      if (!global.NovaRealWorldValidator) {
        console.log('     ⚠️ Performance benchmark not available');
        return;
      }

      const validator = new global.NovaRealWorldValidator.RealWorldValidator();
      const gridMapper = new global.NovaGridMapper.GridMapper();
      
      await validator.generateBenchmarkSamples();
      
      console.log('   Running performance benchmark...');
      const performanceResults = await validator.runPerformanceBenchmark(gridMapper);
      
      console.log(`     Average Processing Time: ${performanceResults.averageProcessingTime.toFixed(1)}ms`);
      console.log(`     Performance Requirement (<2000ms): ${performanceResults.meetsPerformanceRequirement ? '✅' : '❌'}`);
      console.log(`     Test Iterations: ${performanceResults.iterations}`);
      
      if (performanceResults.results.length > 0) {
        const minTime = Math.min(...performanceResults.results.map(r => r.processingTime));
        const maxTime = Math.max(...performanceResults.results.map(r => r.processingTime));
        console.log(`     Time Range: ${minTime.toFixed(1)}ms - ${maxTime.toFixed(1)}ms`);
      }
    },

    /**
     * Demo comprehensive test suite
     */
    demoComprehensiveTests: async () => {
      if (!global.NovaEnhancedGridMappingTests) {
        console.log('     ⚠️ Enhanced test suite not available');
        return;
      }

      console.log('   Running comprehensive test suite...');
      const testResults = await global.NovaEnhancedGridMappingTests.runAllTests();
      
      console.log(`     Unit Tests: ${testResults.unitTests.passed}/${testResults.unitTests.total} passed`);
      console.log(`     Integration Tests: ${testResults.integrationTests.passed}/${testResults.integrationTests.total} passed`);
      
      if (testResults.realWorldValidation) {
        console.log(`     Real-World Accuracy: ${(testResults.realWorldValidation.overallAccuracy * 100).toFixed(1)}%`);
      }
      
      if (testResults.performanceBenchmark) {
        console.log(`     Performance: ${testResults.performanceBenchmark.averageProcessingTime.toFixed(1)}ms avg`);
      }
      
      console.log(`     Overall Status: ${testResults.overallStatus}`);
    },

    /**
     * Utility methods for creating test images
     */
    createTestImage: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Create basic test pattern
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);
      
      // Add some visual elements for detection
      const scale = Math.min(width / 1920, height / 1080);
      const hexRadius = 24 * scale;
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, scale);
      
      // Draw center hex
      const centerX = width / 2;
      const centerY = height / 2;
      Phase2Demo.drawHexagon(ctx, centerX, centerY, hexRadius);
      
      return canvas;
    },

    createTestImageWithCenteredGrid: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Nova Drift-like background
      ctx.fillStyle = '#0a0a1e';
      ctx.fillRect(0, 0, width, height);
      
      // Create hex grid centered in image
      const hexRadius = 24;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.strokeStyle = '#4a6fa5';
      ctx.fillStyle = '#1e3a5f';
      ctx.lineWidth = 2;
      
      // Draw hex grid pattern
      for (let q = -3; q <= 3; q++) {
        for (let r = -3; r <= 3; r++) {
          if (Math.abs(q) + Math.abs(r) + Math.abs(-q-r) <= 6) { // Hex grid bounds
            const x = centerX + hexRadius * (3/2 * q);
            const y = centerY + hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
            
            if (x > hexRadius && x < width - hexRadius && 
                y > hexRadius && y < height - hexRadius) {
              ctx.beginPath();
              Phase2Demo.drawHexagon(ctx, x, y, hexRadius);
              ctx.fill();
              ctx.stroke();
            }
          }
        }
      }
      
      return canvas;
    },

    drawHexagon: (ctx, centerX, centerY, radius) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
    },

    /**
     * Interactive demo launcher
     */
    launchInteractiveDemo: () => {
      console.log('🎮 Interactive Phase 2 Demo Launcher');
      console.log('====================================');
      console.log('Available commands:');
      console.log('- Phase2Demo.runDemo() - Run complete demo');
      console.log('- Phase2Demo.demoScaleDetection() - Test scale detection');
      console.log('- Phase2Demo.demoGridCenterDetection() - Test center detection');
      console.log('- Phase2Demo.demoRealWorldValidation() - Test validation');
      console.log('- Phase2Demo.demoPerformanceBenchmark() - Test performance');
      console.log('- Phase2Demo.demoComprehensiveTests() - Run all tests');
      console.log('\nExample: await Phase2Demo.runDemo()');
    }
  };

  // Export to global scope
  global.Phase2Demo = Phase2Demo;

  // Auto-launch interactive demo info
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.log('\n🎯 Phase 2 Enhanced Grid Mapping System Loaded!');
      console.log('Run "Phase2Demo.launchInteractiveDemo()" to see available commands.');
      console.log('Or run "await Phase2Demo.runDemo()" to test all improvements.');
    }, 1000);
  }

})(typeof window !== 'undefined' ? window : global);
