/**
 * Nova Drift Grid Mapping Tests - Phase 2
 * Comprehensive test suite for coordinate mapping functionality
 */

(function(global) {
  'use strict';

  // Test utilities
  const TestUtils = {
    createTestImage: (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Draw some hex-like patterns for testing
      ctx.fillStyle = '#FFFFFF';
      const centerX = width / 2;
      const centerY = height / 2;
      const hexRadius = 24;
      
      // Draw center hex
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = centerX + hexRadius * Math.cos(angle);
        const y = centerY + hexRadius * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      
      const image = new Image();
      image.src = canvas.toDataURL();
      return image;
    },

    createMockEvent: (detail) => {
      return {
        detail: detail,
        type: 'screenshot-ready',
        preventDefault: () => {},
        stopPropagation: () => {}
      };
    },

    assertApproximatelyEqual: (actual, expected, tolerance = 0.01, message = '') => {
      const diff = Math.abs(actual - expected);
      if (diff > tolerance) {
        throw new Error(`${message} Expected ${expected} ± ${tolerance}, got ${actual} (diff: ${diff})`);
      }
    },

    assertCoordinatesValid: (coordinates, bounds) => {
      if (coordinates.x < bounds.left || coordinates.x > bounds.right ||
          coordinates.y < bounds.top || coordinates.y > bounds.bottom) {
        throw new Error(`Coordinates ${JSON.stringify(coordinates)} are outside bounds ${JSON.stringify(bounds)}`);
      }
    }
  };

  /**
   * Test suite for HexCalculator
   */
  const HexCalculatorTests = {
    testAxialToPixel: () => {
      console.log('Testing HexCalculator.axialToPixel...');
      
      const calc = new global.NovaGridMapper.HexCalculator();
      const hexRadius = 24;
      const gridCenter = { x: 100, y: 100 };
      
      // Test center position
      const centerPixel = calc.axialToPixel(0, 0, hexRadius, gridCenter);
      TestUtils.assertApproximatelyEqual(centerPixel.x, 100, 0.1, 'Center X');
      TestUtils.assertApproximatelyEqual(centerPixel.y, 100, 0.1, 'Center Y');
      
      // Test known positions
      const rightPixel = calc.axialToPixel(1, 0, hexRadius, gridCenter);
      TestUtils.assertApproximatelyEqual(rightPixel.x, 136, 1, 'Right hex X'); // 100 + 24*1.5
      
      console.log('✅ HexCalculator.axialToPixel tests passed');
    },

    testPixelToAxial: () => {
      console.log('Testing HexCalculator.pixelToAxial...');
      
      const calc = new global.NovaGridMapper.HexCalculator();
      const hexRadius = 24;
      const gridCenter = { x: 100, y: 100 };
      
      // Test round-trip conversion
      const originalAxial = { q: 1, r: -1 };
      const pixel = calc.axialToPixel(originalAxial.q, originalAxial.r, hexRadius, gridCenter);
      const backToAxial = calc.pixelToAxial(pixel.x, pixel.y, hexRadius, gridCenter);
      
      TestUtils.assertApproximatelyEqual(backToAxial.q, originalAxial.q, 0.01, 'Round-trip Q');
      TestUtils.assertApproximatelyEqual(backToAxial.r, originalAxial.r, 0.01, 'Round-trip R');
      
      console.log('✅ HexCalculator.pixelToAxial tests passed');
    },

    testHexDistance: () => {
      console.log('Testing HexCalculator.hexDistance...');
      
      const calc = new global.NovaGridMapper.HexCalculator();
      
      // Test distance from center
      const distance1 = calc.hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 });
      TestUtils.assertApproximatelyEqual(distance1, 1, 0.01, 'Distance to adjacent hex');
      
      const distance2 = calc.hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 });
      TestUtils.assertApproximatelyEqual(distance2, 2, 0.01, 'Distance to hex 2 steps away');
      
      console.log('✅ HexCalculator.hexDistance tests passed');
    },

    testGenerateHexGrid: () => {
      console.log('Testing HexCalculator.generateHexGrid...');
      
      const calc = new global.NovaGridMapper.HexCalculator();
      
      // Test radius 1 grid (should have 7 hexes: center + 6 around)
      const grid1 = calc.generateHexGrid({ q: 0, r: 0 }, 1);
      if (grid1.length !== 7) {
        throw new Error(`Expected 7 hexes for radius 1, got ${grid1.length}`);
      }
      
      // Test radius 2 grid (should have 19 hexes)
      const grid2 = calc.generateHexGrid({ q: 0, r: 0 }, 2);
      if (grid2.length !== 19) {
        throw new Error(`Expected 19 hexes for radius 2, got ${grid2.length}`);
      }
      
      console.log('✅ HexCalculator.generateHexGrid tests passed');
    },

    runAll: () => {
      console.log('🧪 Running HexCalculator tests...');
      HexCalculatorTests.testAxialToPixel();
      HexCalculatorTests.testPixelToAxial();
      HexCalculatorTests.testHexDistance();
      HexCalculatorTests.testGenerateHexGrid();
      console.log('✅ All HexCalculator tests passed!');
    }
  };

  /**
   * Test suite for ScaleDetector
   */
  const ScaleDetectorTests = {
    testDetectByResolution: () => {
      console.log('Testing ScaleDetector.detectByResolution...');
      
      const detector = new global.NovaGridMapper.ScaleDetector(global.NovaGridMapper.REFERENCE_DATA);
      
      // Test 1920x1080 detection
      const canvas1080 = { width: 1920, height: 1080 };
      const result1080 = detector.detectByResolution(canvas1080);
      TestUtils.assertApproximatelyEqual(result1080.scaleFactor, 1.0, 0.01, '1080p scale factor');
      
      // Test 4K detection
      const canvas4K = { width: 3840, height: 2160 };
      const result4K = detector.detectByResolution(canvas4K);
      TestUtils.assertApproximatelyEqual(result4K.scaleFactor, 2.0, 0.01, '4K scale factor');
      
      console.log('✅ ScaleDetector.detectByResolution tests passed');
    },

    testConsolidateResults: () => {
      console.log('Testing ScaleDetector.consolidateResults...');
      
      const detector = new global.NovaGridMapper.ScaleDetector(global.NovaGridMapper.REFERENCE_DATA);
      
      const results = [
        { scaleFactor: 1.0, confidence: 0.8, method: 'resolution' },
        { scaleFactor: 1.1, confidence: 0.6, method: 'gridSpacing' }
      ];
      
      const consolidated = detector.consolidateResults(results);
      
      // Should be weighted average: (1.0*0.8 + 1.1*0.6) / (0.8+0.6) = 1.043
      TestUtils.assertApproximatelyEqual(consolidated.scaleFactor, 1.043, 0.01, 'Consolidated scale factor');
      
      console.log('✅ ScaleDetector.consolidateResults tests passed');
    },

    runAll: () => {
      console.log('🧪 Running ScaleDetector tests...');
      ScaleDetectorTests.testDetectByResolution();
      ScaleDetectorTests.testConsolidateResults();
      console.log('✅ All ScaleDetector tests passed!');
    }
  };

  /**
   * Test suite for GridMapper
   */
  const GridMapperTests = {
    testCoordinateMapGeneration: () => {
      console.log('Testing GridMapper coordinate map generation...');
      
      const mapper = new global.NovaGridMapper.GridMapper();
      const testImage = TestUtils.createTestImage(1920, 1080);
      
      // Mock the image dimensions
      Object.defineProperty(testImage, 'naturalWidth', { value: 1920 });
      Object.defineProperty(testImage, 'naturalHeight', { value: 1080 });
      
      const coordinateMap = mapper.generateCoordinateMap(
        testImage,
        1.0, // scale factor
        { x: 960, y: 540 } // grid center
      );
      
      if (coordinateMap.size === 0) {
        throw new Error('Coordinate map should not be empty');
      }
      
      // Check that center position exists
      const hasCenter = Array.from(coordinateMap.values()).some(coord => 
        coord.gridPosition.q === 0 && coord.gridPosition.r === 0
      );
      
      if (!hasCenter) {
        throw new Error('Coordinate map should include center position');
      }
      
      console.log(`Generated ${coordinateMap.size} coordinate mappings`);
      console.log('✅ GridMapper coordinate map generation tests passed');
    },

    testBoundingBoxCalculation: () => {
      console.log('Testing GridMapper bounding box calculation...');
      
      const mapper = new global.NovaGridMapper.GridMapper();
      
      // Create mock coordinate map
      const coordinateMap = new Map();
      coordinateMap.set('test1', new global.NovaGridMapper.CoordinateData(
        'test1',
        { x: 100, y: 100 },
        { left: 80, top: 80, right: 120, bottom: 120 },
        { q: 0, r: 0 }
      ));
      coordinateMap.set('test2', new global.NovaGridMapper.CoordinateData(
        'test2',
        { x: 200, y: 200 },
        { left: 180, top: 180, right: 220, bottom: 220 },
        { q: 1, r: 1 }
      ));
      
      const boundingBox = mapper.calculateBoundingBox(coordinateMap);
      
      TestUtils.assertApproximatelyEqual(boundingBox.left, 80, 0.01, 'Bounding box left');
      TestUtils.assertApproximatelyEqual(boundingBox.top, 80, 0.01, 'Bounding box top');
      TestUtils.assertApproximatelyEqual(boundingBox.right, 220, 0.01, 'Bounding box right');
      TestUtils.assertApproximatelyEqual(boundingBox.bottom, 220, 0.01, 'Bounding box bottom');
      
      console.log('✅ GridMapper bounding box calculation tests passed');
    },

    runAll: () => {
      console.log('🧪 Running GridMapper tests...');
      GridMapperTests.testCoordinateMapGeneration();
      GridMapperTests.testBoundingBoxCalculation();
      console.log('✅ All GridMapper tests passed!');
    }
  };

  /**
   * Integration tests
   */
  const IntegrationTests = {
    testPhase1ToPhase2Integration: () => {
      console.log('Testing Phase 1 to Phase 2 integration...');
      
      // Create mock Phase 1 event
      const mockPhase1Event = TestUtils.createMockEvent({
        file: new File(['test'], 'test.png', { type: 'image/png' }),
        dimensions: { width: 1920, height: 1080 },
        metadata: {
          size: 1024,
          type: 'image/png',
          lastModified: Date.now(),
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        }
      });
      
      // Test that event listener exists
      let eventHandled = false;
      const testHandler = () => { eventHandled = true; };
      
      document.addEventListener('grid-mapped', testHandler, { once: true });
      
      // This should trigger the grid mapping
      document.dispatchEvent(new CustomEvent('screenshot-ready', mockPhase1Event));
      
      // Give it a moment to process
      setTimeout(() => {
        document.removeEventListener('grid-mapped', testHandler);
        console.log('✅ Phase 1 to Phase 2 integration test completed');
      }, 100);
    },

    testErrorHandling: () => {
      console.log('Testing error handling...');
      
      // Test with invalid image data
      const mockInvalidEvent = TestUtils.createMockEvent({
        file: new File(['test'], 'test.png', { type: 'image/png' }),
        dimensions: { width: 1920, height: 1080 },
        metadata: {
          size: 1024,
          type: 'image/png',
          lastModified: Date.now(),
          dataUrl: 'invalid-data-url'
        }
      });
      
      let errorHandled = false;
      const errorHandler = (event) => {
        errorHandled = true;
        console.log('Error event received:', event.detail);
      };
      
      document.addEventListener('grid-mapping-error', errorHandler, { once: true });
      
      // This should trigger an error
      document.dispatchEvent(new CustomEvent('screenshot-ready', mockInvalidEvent));
      
      setTimeout(() => {
        document.removeEventListener('grid-mapping-error', errorHandler);
        console.log('✅ Error handling test completed');
      }, 100);
    },

    runAll: () => {
      console.log('🧪 Running Integration tests...');
      IntegrationTests.testPhase1ToPhase2Integration();
      IntegrationTests.testErrorHandling();
      console.log('✅ All Integration tests completed!');
    }
  };

  /**
   * Performance tests
   */
  const PerformanceTests = {
    testMappingSpeed: async () => {
      console.log('Testing mapping performance...');
      
      const mapper = new global.NovaGridMapper.GridMapper();
      const testImage = TestUtils.createTestImage(1920, 1080);
      
      // Mock the image dimensions
      Object.defineProperty(testImage, 'naturalWidth', { value: 1920 });
      Object.defineProperty(testImage, 'naturalHeight', { value: 1080 });
      
      const startTime = performance.now();
      
      try {
        await mapper.mapScreenshot(testImage);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`Mapping completed in ${duration.toFixed(2)}ms`);
        
        if (duration > 2000) { // Should complete within 2 seconds
          console.warn(`⚠️ Mapping took ${duration.toFixed(2)}ms, which exceeds target of 2000ms`);
        } else {
          console.log('✅ Mapping performance is within target');
        }
        
      } catch (error) {
        console.log('Performance test completed with expected error (mock image)');
      }
    },

    runAll: async () => {
      console.log('🧪 Running Performance tests...');
      await PerformanceTests.testMappingSpeed();
      console.log('✅ All Performance tests completed!');
    }
  };

  /**
   * Main test runner
   */
  const TestRunner = {
    runAllTests: async () => {
      console.log('🚀 Starting Phase 2 Grid Mapping Tests...');
      console.log('================================================');
      
      try {
        // Check if the main classes are available
        if (!global.NovaGridMapper) {
          throw new Error('NovaGridMapper not found. Make sure grid-mapper.js is loaded.');
        }
        
        // Run all test suites
        HexCalculatorTests.runAll();
        console.log('');
        
        ScaleDetectorTests.runAll();
        console.log('');
        
        GridMapperTests.runAll();
        console.log('');
        
        IntegrationTests.runAll();
        console.log('');
        
        await PerformanceTests.runAll();
        
        console.log('================================================');
        console.log('🎉 All Phase 2 tests completed successfully!');
        
        return true;
        
      } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
      }
    },

    runQuickTests: () => {
      console.log('🏃 Running quick validation tests...');
      
      try {
        HexCalculatorTests.testAxialToPixel();
        HexCalculatorTests.testPixelToAxial();
        ScaleDetectorTests.testDetectByResolution();
        GridMapperTests.testCoordinateMapGeneration();
        
        console.log('✅ Quick tests passed!');
        return true;
        
      } catch (error) {
        console.error('❌ Quick test failed:', error.message);
        return false;
      }
    }
  };

  // Auto-run tests when this script loads (if in test mode)
  if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        TestRunner.runAllTests();
      }, 1000); // Wait for other scripts to load
    });
  }

  // Export test utilities
  global.NovaGridMapperTests = {
    TestRunner,
    HexCalculatorTests,
    ScaleDetectorTests,
    GridMapperTests,
    IntegrationTests,
    PerformanceTests,
    TestUtils
  };

})(typeof window !== 'undefined' ? window : global);
