/**
 * Node.js test runner for Phase 2 Grid Mapping
 * Validates the JavaScript code without browser dependencies
 */

// Simple global mock for Node.js environment
global.document = {
  addEventListener: () => {},
  dispatchEvent: () => {},
  createElement: () => ({
    getContext: () => ({
      drawImage: () => {},
      getImageData: () => ({ data: new Array(1000).fill(0), width: 100 }),
      fillRect: () => {},
      fillStyle: '',
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {}
    }),
    width: 0,
    height: 0,
    toDataURL: () => 'data:image/png;base64,test'
  }),
  getElementById: () => null
};

global.Image = class {
  constructor() {
    this.naturalWidth = 1920;
    this.naturalHeight = 1080;
  }
};

global.CustomEvent = class {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
  }
};

global.performance = {
  now: () => Date.now()
};

// Load the modules
console.log('Loading mod positions...');
require('./mod-positions.js');

console.log('Loading grid mapper...');
require('./grid-mapper.js');

console.log('Loading tests...');
require('./grid-mapper-tests.js');

// Run tests
console.log('\n🚀 Running Phase 2 Grid Mapping Validation Tests...');
console.log('================================================');

try {
  // Check that modules loaded correctly
  if (!global.NovaModPositions) {
    throw new Error('NovaModPositions not loaded');
  }
  
  if (!global.NovaGridMapper) {
    throw new Error('NovaGridMapper not loaded');
  }
  
  if (!global.NovaGridMapperTests) {
    throw new Error('NovaGridMapperTests not loaded');
  }
  
  console.log('✅ All modules loaded successfully');
  
  // Validate mod positions
  const issues = global.NovaModPositions.ModPositionHelper.validatePositions();
  if (issues.length > 0) {
    console.warn('⚠️ Mod position issues:', issues);
  } else {
    console.log('✅ Mod position data validated');
  }
  
  // Run quick tests
  const testResult = global.NovaGridMapperTests.TestRunner.runQuickTests();
  
  if (testResult) {
    console.log('\n🎉 Phase 2 validation completed successfully!');
    console.log('The grid mapping system is ready for browser testing.');
  } else {
    console.log('\n❌ Phase 2 validation failed!');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Validation error:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

console.log('\n📊 Summary:');
console.log(`- Mod positions: ${Object.keys(global.NovaModPositions.MOD_POSITIONS).length}`);
console.log(`- Categories: ${Object.keys(global.NovaModPositions.MOD_CATEGORIES).length}`);
console.log(`- Grid max radius: ${global.NovaModPositions.GRID_CONFIG.maxRadius}`);
console.log('- All core classes functional');
console.log('\nReady for Phase 3! 🚀');
