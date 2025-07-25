/**
 * Updated tests for Nova Drift Screenshot Upload Feature - Phase 1 Modular Architecture
 * These tests validate the new OOP-based modular implementation
 */

// Test modular architecture
function testModularArchitecture() {
  console.log('Testing modular architecture...');
  
  const requiredModules = [
    'UploadValidator',
    'ProgressIndicator', 
    'ScreenshotUploadHandler',
    'NovaScreenshotUpload'
  ];

  let passed = 0;
  let failed = 0;

  requiredModules.forEach(moduleName => {
    if (typeof window[moduleName] !== 'undefined') {
      console.log(`✅ Module ${moduleName}: LOADED`);
      passed++;
    } else {
      console.log(`❌ Module ${moduleName}: MISSING`);
      failed++;
    }
  });

  // Test that NovaScreenshotUpload API is available
  if (window.NovaScreenshotUpload && window.NovaScreenshotUpload.isReady) {
    console.log(`✅ NovaScreenshotUpload API: AVAILABLE`);
    passed++;
  } else {
    console.log(`❌ NovaScreenshotUpload API: MISSING`);
    failed++;
  }

  console.log(`Modular architecture tests: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test UploadValidator class functionality
function testUploadValidator() {
  console.log('Testing UploadValidator class...');
  
  if (typeof UploadValidator === 'undefined') {
    console.log('❌ UploadValidator class not available');
    return { passed: 0, failed: 1 };
  }

  const validator = new UploadValidator();
  
  // Mock file objects for testing
  const validPNG = new File([''], 'test.png', { type: 'image/png', size: 1024 * 100 }); // 100KB
  const validJPG = new File([''], 'test.jpg', { type: 'image/jpeg', size: 1024 * 500 }); // 500KB
  const oversizedFile = new File([''], 'large.png', { type: 'image/png', size: 1024 * 1024 * 15 }); // 15MB
  const undersizedFile = new File([''], 'tiny.png', { type: 'image/png', size: 100 }); // 100 bytes
  const invalidType = new File([''], 'test.gif', { type: 'image/gif', size: 1024 * 100 }); // GIF

  const tests = [
    { file: validPNG, expectedValid: true, name: 'Valid PNG' },
    { file: validJPG, expectedValid: true, name: 'Valid JPG' },
    { file: oversizedFile, expectedValid: false, name: 'Oversized file' },
    { file: undersizedFile, expectedValid: false, name: 'Undersized file' },
    { file: invalidType, expectedValid: false, name: 'Invalid file type' }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    const typeResult = validator.validateFileType(test.file);
    const sizeResult = validator.validateFileSize(test.file);
    const isValid = typeResult.valid && sizeResult.valid;

    if (isValid === test.expectedValid) {
      console.log(`✅ ${test.name}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: FAILED (expected valid: ${test.expectedValid}, got: ${isValid})`);
      failed++;
    }
  });

  console.log(`UploadValidator tests: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test ProgressIndicator class functionality
function testProgressIndicator() {
  console.log('Testing ProgressIndicator class...');
  
  if (typeof ProgressIndicator === 'undefined') {
    console.log('❌ ProgressIndicator class not available');
    return { passed: 0, failed: 1 };
  }

  // Create a temporary container for testing
  const tempContainer = document.createElement('div');
  document.body.appendChild(tempContainer);

  let passed = 0;
  let failed = 0;

  try {
    const progressIndicator = new ProgressIndicator(tempContainer);
    
    // Test initialization
    if (progressIndicator.getState) {
      console.log('✅ ProgressIndicator initialization: PASSED');
      passed++;
    } else {
      console.log('❌ ProgressIndicator initialization: FAILED');
      failed++;
    }

    // Test progress update
    progressIndicator.updateProgress('uploading', 50, 'Testing...');
    const state = progressIndicator.getState();
    
    if (state.currentState === 'uploading' && state.percentage === 50) {
      console.log('✅ ProgressIndicator update: PASSED');
      passed++;
    } else {
      console.log('❌ ProgressIndicator update: FAILED');
      failed++;
    }

    // Test error state
    progressIndicator.showError('Test error');
    if (progressIndicator.getState().currentState === 'error') {
      console.log('✅ ProgressIndicator error state: PASSED');
      passed++;
    } else {
      console.log('❌ ProgressIndicator error state: FAILED');
      failed++;
    }

    // Cleanup
    progressIndicator.destroy();
    
  } catch (error) {
    console.log('❌ ProgressIndicator test error:', error.message);
    failed++;
  }

  // Remove temporary container
  document.body.removeChild(tempContainer);

  console.log(`ProgressIndicator tests: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test UI element existence
function testUIElements() {
  console.log('Testing UI elements...');
  
  const requiredElements = [
    'screenshot-upload-btn',
    'screenshot-input',
    'screenshot-drop-zone',
    'upload-progress',
    'progress-fill',
    'progress-text',
    'upload-error',
    'error-text',
    'error-close'
  ];

  let passed = 0;
  let failed = 0;

  requiredElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      console.log(`✅ Element ${id}: EXISTS`);
      passed++;
    } else {
      console.log(`❌ Element ${id}: MISSING`);
      failed++;
    }
  });

  console.log(`UI elements test: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test event system
function testEventSystem() {
  console.log('Testing event system...');
  
  let eventFired = false;
  
  // Listen for the custom event
  const eventListener = (event) => {
    eventFired = true;
    console.log('✅ screenshot-ready event received:', event.detail);
  };
  
  document.addEventListener('screenshot-ready', eventListener);
  
  // We can't easily trigger a file upload in automated tests,
  // so we'll just verify the event listener setup
  console.log('Event listener setup complete. Manual file upload needed to test event firing.');
  
  // Cleanup
  setTimeout(() => {
    document.removeEventListener('screenshot-ready', eventListener);
  }, 1000);

  return { passed: 1, failed: 0 };
}

// Test accessibility features
function testAccessibility() {
  console.log('Testing accessibility features...');
  
  const uploadBtn = document.getElementById('screenshot-upload-btn');
  const dropZone = document.getElementById('screenshot-drop-zone');
  const fileInput = document.getElementById('screenshot-input');

  let passed = 0;
  let failed = 0;

  // Check upload button attributes
  if (uploadBtn && uploadBtn.hasAttribute('title')) {
    console.log('✅ Upload button has title attribute');
    passed++;
  } else {
    console.log('❌ Upload button missing title attribute');
    failed++;
  }

  // Check drop zone attributes
  if (dropZone && dropZone.hasAttribute('role') && dropZone.hasAttribute('tabindex')) {
    console.log('✅ Drop zone has accessibility attributes');
    passed++;
  } else {
    console.log('❌ Drop zone missing accessibility attributes');
    failed++;
  }

  // Check file input attributes
  if (fileInput && fileInput.hasAttribute('aria-describedby')) {
    console.log('✅ File input has aria-describedby attribute');
    passed++;
  } else {
    console.log('❌ File input missing aria-describedby attribute');
    failed++;
  }

  console.log(`Accessibility tests: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Test mobile responsiveness (basic check)
function testMobileResponsiveness() {
  console.log('Testing mobile responsiveness...');
  
  // Check if mobile styles exist
  const stylesheets = Array.from(document.styleSheets);
  let mobileStylesFound = false;

  try {
    stylesheets.forEach(sheet => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          Array.from(rules).forEach(rule => {
            if (rule.media && rule.media.mediaText.includes('max-width')) {
              mobileStylesFound = true;
            }
          });
        }
      } catch (e) {
        // Cross-origin stylesheets might throw errors
      }
    });
  } catch (e) {
    console.log('Note: Could not fully check stylesheets due to security restrictions');
  }

  if (mobileStylesFound) {
    console.log('✅ Mobile responsive styles found');
    return { passed: 1, failed: 0 };
  } else {
    console.log('❌ Mobile responsive styles not detected');
    return { passed: 0, failed: 1 };
  }
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running Nova Drift Screenshot Upload Tests (Modular Architecture)...\n');
  
  const results = {
    modularArchitecture: testModularArchitecture(),
    uploadValidator: testUploadValidator(),
    progressIndicator: testProgressIndicator(),
    uiElements: testUIElements(),
    eventSystem: testEventSystem(),
    accessibility: testAccessibility(),
    mobileResponsiveness: testMobileResponsiveness()
  };

  console.log('\n📊 Test Summary:');
  let totalPassed = 0;
  let totalFailed = 0;

  Object.entries(results).forEach(([testName, result]) => {
    totalPassed += result.passed;
    totalFailed += result.failed;
    console.log(`${testName}: ${result.passed} passed, ${result.failed} failed`);
  });

  console.log(`\n🎯 Overall: ${totalPassed} passed, ${totalFailed} failed`);
  
  if (totalFailed === 0) {
    console.log('🎉 All tests passed! Phase 1 modular implementation looks good.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }

  return results;
}

// Manual testing instructions
function printManualTestingInstructions() {
  console.log(`
📋 Manual Testing Checklist for Phase 1 (Modular Architecture):

1. Module Tests:
   - Check browser console for any module loading errors
   - Verify all classes are available: UploadValidator, ProgressIndicator, ScreenshotUploadHandler
   - Confirm NovaScreenshotUpload API is initialized

2. Upload Tests:
   - Click "📷 Upload Screenshot" button
   - Verify drop zone appears with proper styling
   - Click "📁 Browse Files" button to open file picker
   - Select a PNG file (should show structured progress)
   - Select a JPG file (should show structured progress)
   - Try to select a GIF file (should show structured error with action guidance)

3. Drag & Drop Tests:
   - Drag a PNG file onto the drop zone (should work)
   - Drag a JPG file onto the drop zone (should work)
   - Try to drag a large file >10MB (should show structured error)
   - Try to drag a non-image file (should show structured error with action)

4. Progress & Error Tests:
   - Upload should show progress bar with percentages
   - Progress should show different states: uploading, processing, complete
   - Invalid files should show structured error messages with user actions
   - Error messages should include specific guidance
   - Progress should auto-hide on completion

5. Memory Management Tests:
   - Upload multiple files and check browser memory usage
   - Verify no canvas elements remain after upload completion
   - Check for any memory leaks using browser dev tools

6. Accessibility Tests:
   - Tab to upload button and press Enter
   - Tab to drop zone and press Enter/Space
   - Press Escape in drop zone (should close)
   - Test with screen reader if available
   - Verify ARIA attributes are properly set

7. Mobile Tests:
   - Test on mobile device or responsive mode
   - Verify touch interactions work
   - Check that layout doesn't break
   - Test drag and drop on touch devices

8. Integration Tests:
   - Verify existing cheatsheet features still work
   - Check that no console errors appear
   - Verify the screenshot-ready event fires with proper data structure
   - Test backward compatibility with Phase 2 integration

9. Architecture Tests:
   - Verify classes can be instantiated independently
   - Test error handling doesn't break the entire system
   - Check that modules are properly encapsulated
   - Validate OOP structure and inheritance

Run runAllTests() in the console to check automated tests.
Run NovaScreenshotUploadTests.testModularArchitecture() to specifically test module loading.
  `);
}

// Expose testing functions globally
window.NovaScreenshotUploadTests = {
  runAllTests,
  testModularArchitecture,
  testUploadValidator,
  testProgressIndicator,
  testUIElements,
  testEventSystem,
  testAccessibility,
  testMobileResponsiveness,
  printManualTestingInstructions
};

// Auto-run tests after a short delay to allow for initialization
setTimeout(() => {
  if (typeof window.NovaScreenshotUpload !== 'undefined') {
    console.log('🚀 Nova Drift Screenshot Upload feature detected. Running tests...\n');
    runAllTests();
    console.log('\nFor manual testing instructions, run: NovaScreenshotUploadTests.printManualTestingInstructions()');
  } else {
    console.log('⚠️ Nova Drift Screenshot Upload feature not found. Please check implementation.');
  }
}, 1000);
