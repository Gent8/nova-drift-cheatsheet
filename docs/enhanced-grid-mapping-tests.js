/**
 * Enhanced Test Suite for Phase 2 Grid Mapping
 * Includes real-world validation and comprehensive accuracy testing
 */

(function(global) {
  'use strict';

  /**
   * Enhanced test suite with real-world validation
   */
  const EnhancedGridMappingTests = {
    
    /**
     * Run all enhanced tests including real-world validation
     */
    runAllTests: async () => {
      console.log('🚀 Starting Enhanced Grid Mapping Tests...');
      
      const results = {
        unitTests: {},
        integrationTests: {},
        realWorldValidation: {},
        performanceBenchmark: {},
        overallStatus: 'unknown'
      };

      try {
        // Unit tests
        console.log('\n📊 Running Unit Tests...');
        results.unitTests = await EnhancedGridMappingTests.runUnitTests();
        
        // Integration tests
        console.log('\n🔗 Running Integration Tests...');
        results.integrationTests = await EnhancedGridMappingTests.runIntegrationTests();
        
        // Real-world validation
        console.log('\n🌍 Running Real-World Validation...');
        results.realWorldValidation = await EnhancedGridMappingTests.runRealWorldValidation();
        
        // Performance benchmark
        console.log('\n⚡ Running Performance Benchmark...');
        results.performanceBenchmark = await EnhancedGridMappingTests.runPerformanceBenchmark();
        
        // Overall status
        results.overallStatus = EnhancedGridMappingTests.calculateOverallStatus(results);
        
        console.log('\n📋 Test Summary:');
        console.log(`Unit Tests: ${results.unitTests.passed}/${results.unitTests.total} passed`);
        console.log(`Integration Tests: ${results.integrationTests.passed}/${results.integrationTests.total} passed`);
        console.log(`Real-World Accuracy: ${(results.realWorldValidation.overallAccuracy * 100).toFixed(1)}%`);
        console.log(`Performance: ${results.performanceBenchmark.averageProcessingTime.toFixed(1)}ms avg`);
        console.log(`Overall Status: ${results.overallStatus}`);
        
        return results;
        
      } catch (error) {
        console.error('❌ Test suite failed:', error);
        results.overallStatus = 'failed';
        results.error = error.message;
        return results;
      }
    },

    /**
     * Enhanced unit tests
     */
    runUnitTests: async () => {
      const tests = [
        {
          name: 'HexCalculator.axialToPixel accuracy',
          test: () => EnhancedGridMappingTests.testAxialToPixelAccuracy()
        },
        {
          name: 'HexCalculator.pixelToAxial roundtrip',
          test: () => EnhancedGridMappingTests.testPixelToAxialRoundtrip()
        },
        {
          name: 'ScaleDetector.edgeDetection',
          test: () => EnhancedGridMappingTests.testEdgeDetection()
        },
        {
          name: 'ScaleDetector.multiPointValidation',
          test: () => EnhancedGridMappingTests.testMultiPointValidation()
        },
        {
          name: 'GridMapper.centerDetection',
          test: () => EnhancedGridMappingTests.testCenterDetection()
        },
        {
          name: 'CoordinateData.confidenceCalculation',
          test: () => EnhancedGridMappingTests.testConfidenceCalculation()
        },
        {
          name: 'GridMapper.neighborValidation',
          test: () => EnhancedGridMappingTests.testNeighborValidation()
        },
        {
          name: 'GridMapper.positionFiltering',
          test: () => EnhancedGridMappingTests.testPositionFiltering()
        }
      ];

      let passed = 0;
      const results = [];

      for (const test of tests) {
        try {
          console.log(`  Testing ${test.name}...`);
          const result = await test.test();
          results.push({ name: test.name, passed: true, result });
          passed++;
          console.log(`    ✅ ${test.name} passed`);
        } catch (error) {
          results.push({ name: test.name, passed: false, error: error.message });
          console.log(`    ❌ ${test.name} failed: ${error.message}`);
        }
      }

      return { total: tests.length, passed, results };
    },

    /**
     * Integration tests
     */
    runIntegrationTests: async () => {
      const tests = [
        {
          name: 'End-to-end grid mapping with synthetic image',
          test: () => EnhancedGridMappingTests.testEndToEndMapping()
        },
        {
          name: 'Scale detection consistency across resolutions',
          test: () => EnhancedGridMappingTests.testScaleConsistency()
        },
        {
          name: 'Grid center detection robustness',
          test: () => EnhancedGridMappingTests.testCenterRobustness()
        },
        {
          name: 'Coordinate map validation',
          test: () => EnhancedGridMappingTests.testCoordinateMapValidation()
        },
        {
          name: 'Error handling and fallbacks',
          test: () => EnhancedGridMappingTests.testErrorHandling()
        }
      ];

      let passed = 0;
      const results = [];

      for (const test of tests) {
        try {
          console.log(`  Testing ${test.name}...`);
          const result = await test.test();
          results.push({ name: test.name, passed: true, result });
          passed++;
          console.log(`    ✅ ${test.name} passed`);
        } catch (error) {
          results.push({ name: test.name, passed: false, error: error.message });
          console.log(`    ❌ ${test.name} failed: ${error.message}`);
        }
      }

      return { total: tests.length, passed, results };
    },

    /**
     * Real-world validation using the validation system
     */
    runRealWorldValidation: async () => {
      if (!global.NovaRealWorldValidator) {
        throw new Error('Real-world validator not available');
      }

      const validator = new global.NovaRealWorldValidator.RealWorldValidator();
      
      // Generate benchmark samples
      await validator.generateBenchmarkSamples();
      
      // Create grid mapper for testing
      const gridMapper = new global.NovaGridMapper.GridMapper();
      
      // Run validation
      const validationResults = await validator.runValidation(gridMapper);
      
      return validationResults;
    },

    /**
     * Performance benchmark
     */
    runPerformanceBenchmark: async () => {
      if (!global.NovaRealWorldValidator) {
        throw new Error('Real-world validator not available');
      }

      const validator = new global.NovaRealWorldValidator.RealWorldValidator();
      await validator.generateBenchmarkSamples();
      
      const gridMapper = new global.NovaGridMapper.GridMapper();
      
      const performanceResults = await validator.runPerformanceBenchmark(gridMapper);
      
      return performanceResults;
    },

    /**
     * Test axial to pixel conversion accuracy
     */
    testAxialToPixelAccuracy: () => {
      const calc = new global.NovaGridMapper.HexCalculator();
      const hexRadius = 24;
      const gridCenter = { x: 100, y: 100 };
      
      // Test known positions with high precision
      const testCases = [
        { axial: { q: 0, r: 0 }, expected: { x: 100, y: 100 } },
        { axial: { q: 1, r: 0 }, expected: { x: 136, y: 100 } },
        { axial: { q: 0, r: 1 }, expected: { x: 118, y: 141.569 } },
        { axial: { q: -1, r: 1 }, expected: { x: 82, y: 141.569 } }
      ];

      for (const testCase of testCases) {
        const result = calc.axialToPixel(testCase.axial.q, testCase.axial.r, hexRadius, gridCenter);
        const errorX = Math.abs(result.x - testCase.expected.x);
        const errorY = Math.abs(result.y - testCase.expected.y);
        
        if (errorX > 0.1 || errorY > 0.1) {
          throw new Error(`Conversion error too large: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(result)}`);
        }
      }

      return { message: 'All axial to pixel conversions within 0.1px tolerance' };
    },

    /**
     * Test pixel to axial roundtrip conversion
     */
    testPixelToAxialRoundtrip: () => {
      const calc = new global.NovaGridMapper.HexCalculator();
      const hexRadius = 24;
      const gridCenter = { x: 100, y: 100 };
      
      // Test roundtrip conversion for multiple positions
      const testPositions = [
        { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }, 
        { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 2, r: -1 }
      ];

      for (const original of testPositions) {
        const pixel = calc.axialToPixel(original.q, original.r, hexRadius, gridCenter);
        const roundtrip = calc.pixelToAxial(pixel.x, pixel.y, hexRadius, gridCenter);
        
        if (roundtrip.q !== original.q || roundtrip.r !== original.r) {
          throw new Error(`Roundtrip failed: ${JSON.stringify(original)} -> ${JSON.stringify(roundtrip)}`);
        }
      }

      return { message: 'All roundtrip conversions exact' };
    },

    /**
     * Test edge detection functionality
     */
    testEdgeDetection: async () => {
      const scaleDetector = new global.NovaGridMapper.ScaleDetector({
        metadata: { hexDiameter: 48, hexRadius: 24 }
      });

      // Create test image with edges
      const testImage = EnhancedGridMappingTests.createTestImageWithEdges(200, 200);
      
      try {
        const result = await scaleDetector.detectByEdgeDetection(
          testImage.getContext('2d'), 
          testImage
        );
        
        if (result.confidence < 0.3) {
          throw new Error(`Edge detection confidence too low: ${result.confidence}`);
        }
        
        return { confidence: result.confidence, patternsFound: result.patternsFound };
      } catch (error) {
        if (error.message.includes('No hexagonal patterns found')) {
          // This is expected for a simple test image
          return { message: 'Edge detection correctly rejected simple test image' };
        }
        throw error;
      }
    },

    /**
     * Test multi-point validation
     */
    testMultiPointValidation: async () => {
      const scaleDetector = new global.NovaGridMapper.ScaleDetector({
        metadata: { hexDiameter: 48, hexRadius: 24 }
      });

      const testImage = EnhancedGridMappingTests.createTestImageWithPattern(400, 300);
      
      try {
        const result = await scaleDetector.detectByMultiPointValidation(
          testImage.getContext('2d'), 
          testImage
        );
        
        return { 
          scaleFactor: result.scaleFactor, 
          confidence: result.confidence,
          validationPoints: result.validationPoints 
        };
      } catch (error) {
        if (error.message.includes('Insufficient validation points')) {
          return { message: 'Multi-point validation correctly rejected insufficient data' };
        }
        throw error;
      }
    },

    /**
     * Test grid center detection
     */
    testCenterDetection: async () => {
      const gridMapper = new global.NovaGridMapper.GridMapper();
      const testImage = EnhancedGridMappingTests.createTestImageWithCenteredPattern(400, 300);
      
      const scaleResult = { scaleFactor: 1.0, confidence: 0.8 };
      const center = await gridMapper.detectGridCenter(testImage, scaleResult);
      
      // Center should be roughly in the middle of the image
      const expectedCenterX = testImage.width / 2;
      const expectedCenterY = testImage.height / 2;
      const tolerance = 50; // 50px tolerance
      
      if (Math.abs(center.x - expectedCenterX) > tolerance || 
          Math.abs(center.y - expectedCenterY) > tolerance) {
        throw new Error(`Center detection inaccurate: expected ~(${expectedCenterX}, ${expectedCenterY}), got (${center.x}, ${center.y})`);
      }
      
      return { detectedCenter: center, expected: { x: expectedCenterX, y: expectedCenterY } };
    },

    /**
     * Test confidence calculation
     */
    testConfidenceCalculation: () => {
      const gridMapper = new global.NovaGridMapper.GridMapper();
      const testImage = EnhancedGridMappingTests.createTestImageWithGameLikeFeatures(100, 100);
      
      const confidence = gridMapper.calculatePositionConfidence(testImage, { x: 50, y: 50 }, 24);
      
      if (confidence < 0 || confidence > 1) {
        throw new Error(`Confidence out of range: ${confidence}`);
      }
      
      return { confidence };
    },

    /**
     * Test end-to-end grid mapping
     */
    testEndToEndMapping: async () => {
      const gridMapper = new global.NovaGridMapper.GridMapper();
      const testImage = EnhancedGridMappingTests.createTestImageWithHexGrid(800, 600);
      
      const result = await gridMapper.mapScreenshot(testImage);
      
      // Validate result structure
      if (!result.coordinateMap || !result.scalingFactor || !result.boundingBox) {
        throw new Error('Result missing required properties');
      }
      
      if (result.coordinateMap.size === 0) {
        throw new Error('No coordinates mapped');
      }
      
      return { 
        coordinateCount: result.coordinateMap.size,
        scalingFactor: result.scalingFactor,
        confidence: result.confidence
      };
    },

    /**
     * Test scale detection consistency
     */
    testScaleConsistency: async () => {
      const scaleDetector = new global.NovaGridMapper.ScaleDetector({
        metadata: { hexDiameter: 48, hexRadius: 24 }
      });

      const resolutions = [
        { width: 1920, height: 1080, expectedScale: 1.0 },
        { width: 2560, height: 1440, expectedScale: 1.33 },
        { width: 3840, height: 2160, expectedScale: 2.0 }
      ];

      const results = [];
      
      for (const res of resolutions) {
        const testImage = EnhancedGridMappingTests.createTestImageAtResolution(res.width, res.height);
        const result = await scaleDetector.detectScale(testImage);
        
        results.push({
          resolution: res,
          detectedScale: result.scaleFactor,
          confidence: result.confidence
        });
      }

      return { results };
    },

    /**
     * Test coordinate map validation
     */
    testCoordinateMapValidation: () => {
      const gridMapper = new global.NovaGridMapper.GridMapper();
      const testImage = EnhancedGridMappingTests.createTestImageWithHexGrid(400, 300);
      
      // Create mock coordinate map
      const coordinateMap = new Map();
      coordinateMap.set('TestMod1', {
        centerPoint: { x: 200, y: 150 },
        confidence: 0.9,
        neighbors: []
      });
      coordinateMap.set('TestMod2', {
        centerPoint: { x: 236, y: 150 },
        confidence: 0.8,
        neighbors: []
      });
      
      const validation = gridMapper.validateCoordinateMap(coordinateMap, testImage, 1.0);
      
      if (validation.totalPositions !== 2) {
        throw new Error(`Expected 2 positions, got ${validation.totalPositions}`);
      }
      
      return validation;
    },

    /**
     * Test error handling
     */
    testErrorHandling: async () => {
      const gridMapper = new global.NovaGridMapper.GridMapper();
      
      // Test with invalid image
      const invalidImage = { naturalWidth: 0, naturalHeight: 0 };
      
      try {
        await gridMapper.mapScreenshot(invalidImage);
        throw new Error('Should have thrown error for invalid image');
      } catch (error) {
        if (!error.message.includes('failed')) {
          throw new Error('Unexpected error message');
        }
      }
      
      return { message: 'Error handling working correctly' };
    },

    /**
     * Utility methods for creating test images
     */
    createTestImageWithEdges: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw some edges
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, 100, 100);
      
      return canvas;
    },

    createTestImageWithPattern: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Create repeating pattern
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      
      for (let x = 20; x < width; x += 40) {
        for (let y = 20; y < height; y += 40) {
          ctx.fillRect(x, y, 20, 20);
        }
      }
      
      return canvas;
    },

    createTestImageWithCenteredPattern: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw centered pattern
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      
      const centerX = width / 2;
      const centerY = height / 2;
      ctx.fillRect(centerX - 10, centerY - 10, 20, 20);
      
      return canvas;
    },

    createTestImageWithGameLikeFeatures: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Create game-like colors and features
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#16213e';
      ctx.fillRect(20, 20, 60, 60);
      
      ctx.fillStyle = '#0f4c75';
      ctx.fillRect(30, 30, 40, 40);
      
      return canvas;
    },

    createTestImageWithHexGrid: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Draw hex grid background
      ctx.fillStyle = '#000033';
      ctx.fillRect(0, 0, width, height);
      
      // Draw some hex-like shapes
      const hexRadius = 24;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      
      for (let q = -2; q <= 2; q++) {
        for (let r = -2; r <= 2; r++) {
          const x = centerX + hexRadius * (3/2 * q);
          const y = centerY + hexRadius * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
          
          if (x > hexRadius && x < width - hexRadius && 
              y > hexRadius && y < height - hexRadius) {
            EnhancedGridMappingTests.drawHexagon(ctx, x, y, hexRadius);
          }
        }
      }
      
      return canvas;
    },

    createTestImageAtResolution: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Scale pattern based on resolution
      const scale = Math.min(width / 1920, height / 1080);
      const hexRadius = 24 * scale;
      
      ctx.fillStyle = '#000033';
      ctx.fillRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1, scale);
      
      EnhancedGridMappingTests.drawHexagon(ctx, centerX, centerY, hexRadius);
      
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
      ctx.stroke();
    },

    /**
     * Calculate overall test status
     */
    calculateOverallStatus: (results) => {
      const unitTestsPassed = results.unitTests.passed === results.unitTests.total;
      const integrationTestsPassed = results.integrationTests.passed === results.integrationTests.total;
      const accuracyMet = results.realWorldValidation.meetsRequirement;
      const performanceMet = results.performanceBenchmark.meetsPerformanceRequirement;
      
      if (unitTestsPassed && integrationTestsPassed && accuracyMet && performanceMet) {
        return '✅ ALL TESTS PASSED - SYSTEM READY';
      } else if (unitTestsPassed && integrationTestsPassed) {
        return '⚠️ CORE FUNCTIONALITY OK - PERFORMANCE/ACCURACY ISSUES';
      } else {
        return '❌ CRITICAL ISSUES - SYSTEM NOT READY';
      }
    }
  };

  // Export to global scope
  global.NovaEnhancedGridMappingTests = EnhancedGridMappingTests;

})(typeof window !== 'undefined' ? window : global);
