# 09 - Deployment & Production

## Overview

This document outlines the deployment strategy for the Screenshot Import Assistant, covering build processes, production optimization, monitoring, and rollout procedures. The solution is designed for GitHub Pages deployment with no backend dependencies.

## Deployment Architecture

```
Development → Build Process → GitHub Pages
     ↓              ↓             ↓
Local Testing → Optimization → Production
     ↓              ↓             ↓
Integration → Asset Pipeline → CDN Delivery
```

## Build Process

### Webpack Production Configuration
```javascript
// webpack.prod.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'screenshot-import': './docs/js/screenshot-import/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'docs/dist'),
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    publicPath: '/nova-drift-cheatsheet/dist/'
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          }
        }
      }),
      new OptimizeCSSAssetsPlugin()
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        opencv: {
          test: /opencv/,
          name: 'opencv',
          chunks: 'all',
          priority: 20
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.25%, not dead',
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['autoprefixer', {}],
                  ['cssnano', { preset: 'default' }]
                ]
              }
            }
          }
        ]
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash:8][ext]'
        }
      }
    ]
  },
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    ...(process.env.ANALYZE_BUNDLE ? [new BundleAnalyzerPlugin()] : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'docs/js/screenshot-import')
    }
  }
};
```

### Build Scripts
```json
{
  "scripts": {
    "build": "webpack --config webpack.prod.js",
    "build:dev": "webpack --config webpack.dev.js",
    "build:analyze": "ANALYZE_BUNDLE=true npm run build",
    "build:templates": "node scripts/extract-templates.js",
    "prebuild": "npm run test && npm run build:templates",
    "postbuild": "npm run optimize:images"
  }
}
```

### Template Extraction Build Step
```javascript
// scripts/extract-templates.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function extractAndOptimizeTemplates() {
  console.log('Extracting upgrade templates...');
  
  const upgradesData = JSON.parse(
    fs.readFileSync('docs/data/upgrades.json', 'utf8')
  );
  
  const spriteSheetPath = 'docs/assets/hex.png';
  const outputDir = 'docs/templates/hexagons';
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Template configuration
  const hexWidth = 64;
  const hexHeight = 64;
  const cols = 10;
  
  const spriteBuffer = fs.readFileSync(spriteSheetPath);
  
  for (let i = 0; i < upgradesData.length; i++) {
    const upgrade = upgradesData[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    
    try {
      // Extract template
      const templateBuffer = await sharp(spriteBuffer)
        .extract({
          left: col * hexWidth,
          top: row * hexHeight,
          width: hexWidth,
          height: hexHeight
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
      
      // Save template
      const outputPath = path.join(outputDir, `${upgrade.id}.png`);
      fs.writeFileSync(outputPath, templateBuffer);
      
      // Create WebP version for modern browsers
      const webpBuffer = await sharp(templateBuffer)
        .webp({ quality: 85 })
        .toBuffer();
      
      const webpPath = path.join(outputDir, `${upgrade.id}.webp`);
      fs.writeFileSync(webpPath, webpBuffer);
      
    } catch (error) {
      console.error(`Failed to extract template for ${upgrade.id}:`, error);
    }
  }
  
  console.log(`Extracted ${upgradesData.length} templates`);
  
  // Generate template manifest
  const manifest = {
    version: Date.now(),
    templates: upgradesData.map(upgrade => ({
      id: upgrade.id,
      name: upgrade.name,
      type: upgrade.type,
      category: upgrade.category,
      png: `${upgrade.id}.png`,
      webp: `${upgrade.id}.webp`
    }))
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('Template manifest generated');
}

async function optimizeImages() {
  console.log('Optimizing images...');
  
  const imageDir = 'docs/assets';
  const files = fs.readdirSync(imageDir)
    .filter(file => /\.(png|jpg|jpeg)$/i.test(file));
  
  for (const file of files) {
    const inputPath = path.join(imageDir, file);
    const outputPath = path.join(imageDir, 'optimized', file);
    
    // Ensure output directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    
    try {
      await sharp(inputPath)
        .png({ quality: 90, compressionLevel: 9 })
        .jpeg({ quality: 85, progressive: true })
        .toFile(outputPath);
      
      console.log(`Optimized: ${file}`);
    } catch (error) {
      console.error(`Failed to optimize ${file}:`, error);
    }
  }
}

if (require.main === module) {
  extractAndOptimizeTemplates()
    .then(() => optimizeImages())
    .catch(console.error);
}

module.exports = { extractAndOptimizeTemplates, optimizeImages };
```

## Production Optimization

### Asset Optimization
```javascript
// scripts/optimize-assets.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { minify } = require('terser');

class AssetOptimizer {
  static async optimizeJavaScript(inputPath, outputPath) {
    const code = fs.readFileSync(inputPath, 'utf8');
    
    const result = await minify(code, {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        dead_code: true,
        unused: true
      },
      mangle: {
        reserved: ['cv', 'Module'] // Preserve OpenCV globals
      },
      format: {
        comments: false
      }
    });
    
    fs.writeFileSync(outputPath, result.code);
    
    const originalSize = fs.statSync(inputPath).size;
    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`JS optimized: ${path.basename(inputPath)} (${savings}% smaller)`);
  }
  
  static async optimizeImages(inputDir, outputDir) {
    const files = fs.readdirSync(inputDir)
      .filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));
    
    fs.mkdirSync(outputDir, { recursive: true });
    
    for (const file of files) {
      const inputPath = path.join(inputDir, file);
      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);
      
      try {
        if (ext === '.png') {
          // Create optimized PNG and WebP versions
          await sharp(inputPath)
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(path.join(outputDir, file));
          
          await sharp(inputPath)
            .webp({ quality: 85 })
            .toFile(path.join(outputDir, `${baseName}.webp`));
            
        } else if (['.jpg', '.jpeg'].includes(ext)) {
          // Create optimized JPEG and WebP versions
          await sharp(inputPath)
            .jpeg({ quality: 85, progressive: true })
            .toFile(path.join(outputDir, file));
          
          await sharp(inputPath)
            .webp({ quality: 80 })
            .toFile(path.join(outputDir, `${baseName}.webp`));
        }
        
        console.log(`Image optimized: ${file}`);
      } catch (error) {
        console.error(`Failed to optimize ${file}:`, error);
      }
    }
  }
  
  static generateServiceWorker() {
    const swContent = `
// Screenshot Import Assistant Service Worker
const CACHE_NAME = 'screenshot-import-v${Date.now()}';
const STATIC_ASSETS = [
  '/nova-drift-cheatsheet/',
  '/nova-drift-cheatsheet/index.html',
  '/nova-drift-cheatsheet/dist/screenshot-import.js',
  '/nova-drift-cheatsheet/dist/opencv.js',
  '/nova-drift-cheatsheet/assets/hex.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});
    `.trim();
    
    fs.writeFileSync('docs/sw.js', swContent);
    console.log('Service worker generated');
  }
}

module.exports = AssetOptimizer;
```

### Progressive Loading Strategy
```javascript
// docs/js/screenshot-import/progressive-loader.js
export class ProgressiveLoader {
  constructor() {
    this.loadedModules = new Set();
    this.loadingPromises = new Map();
  }
  
  async loadCore() {
    // Load essential components first
    const coreModules = [
      () => import('./image-loader.js'),
      () => import('./ui-components/upload-component.js')
    ];
    
    const results = await Promise.all(coreModules.map(loader => loader()));
    
    results.forEach((module, index) => {
      this.loadedModules.add(`core-${index}`);
    });
    
    return results;
  }
  
  async loadOnDemand(moduleName) {
    if (this.loadedModules.has(moduleName)) {
      return true;
    }
    
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }
    
    let loadPromise;
    
    switch (moduleName) {
      case 'opencv':
        loadPromise = this.loadOpenCV();
        break;
      case 'recognition':
        loadPromise = this.loadRecognitionEngine();
        break;
      case 'workers':
        loadPromise = this.loadWorkers();
        break;
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
    
    this.loadingPromises.set(moduleName, loadPromise);
    
    try {
      await loadPromise;
      this.loadedModules.add(moduleName);
      this.loadingPromises.delete(moduleName);
      return true;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }
  
  async loadOpenCV() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/nova-drift-cheatsheet/dist/opencv.js';
      
      script.onload = () => {
        if (typeof cv !== 'undefined') {
          cv.onRuntimeInitialized = resolve;
        } else {
          reject(new Error('OpenCV failed to load'));
        }
      };
      
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  async loadRecognitionEngine() {
    const [
      { TemplateManager },
      { MatchingEngine },
      { RecognitionManager }
    ] = await Promise.all([
      import('./template-manager.js'),
      import('./matching-engine.js'),
      import('./recognition-manager.js')
    ]);
    
    return { TemplateManager, MatchingEngine, RecognitionManager };
  }
  
  async loadWorkers() {
    // Check if workers are supported
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported, falling back to main thread');
      return { workersAvailable: false };
    }
    
    try {
      const worker = new Worker('/nova-drift-cheatsheet/dist/recognition.worker.js');
      
      // Test worker communication
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker timeout')), 5000);
        
        worker.onmessage = (e) => {
          if (e.data.type === 'ready') {
            clearTimeout(timeout);
            resolve();
          }
        };
        
        worker.onerror = reject;
        worker.postMessage({ type: 'test' });
      });
      
      worker.terminate();
      return { workersAvailable: true };
    } catch (error) {
      console.warn('Workers not available:', error);
      return { workersAvailable: false };
    }
  }
  
  getLoadingStatus() {
    return {
      loaded: Array.from(this.loadedModules),
      loading: Array.from(this.loadingPromises.keys())
    };
  }
}
```

## GitHub Pages Integration

### GitHub Actions Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
      env:
        NODE_ENV: production
    
    - name: Optimize assets
      run: npm run optimize:assets
    
    - name: Generate sitemap
      run: npm run generate:sitemap
    
    - name: Setup Pages
      uses: actions/configure-pages@v4
    
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: './docs'
  
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

### HTML Integration
```html
<!-- docs/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nova Drift Cheatsheet</title>
  
  <!-- Preload critical resources -->
  <link rel="preload" href="/nova-drift-cheatsheet/dist/screenshot-import.js" as="script">
  <link rel="preload" href="/nova-drift-cheatsheet/assets/hex.png" as="image">
  
  <!-- Progressive Web App -->
  <link rel="manifest" href="/nova-drift-cheatsheet/manifest.json">
  <meta name="theme-color" content="#1a1a1a">
  
  <!-- CSS -->
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/screenshot-import.css">
</head>
<body>
  <!-- Existing cheatsheet content -->
  <div id="cheatsheet-container">
    <!-- Your existing cheatsheet HTML -->
  </div>
  
  <!-- Screenshot Import Assistant will be injected here -->
  <div id="screenshot-import-root"></div>
  
  <!-- Loading indicator -->
  <div id="loading-indicator" style="display: none;">
    <div class="spinner"></div>
    <p>Loading Screenshot Import Assistant...</p>
  </div>
  
  <!-- Scripts -->
  <script>
    // Feature detection and progressive loading
    (function() {
      const features = {
        canvas: !!document.createElement('canvas').getContext,
        indexedDB: !!window.indexedDB,
        webWorkers: typeof Worker !== 'undefined',
        fileAPI: !!(window.File && window.FileReader && window.FileList)
      };
      
      const requiredFeatures = ['canvas', 'indexedDB', 'fileAPI'];
      const hasRequiredFeatures = requiredFeatures.every(feature => features[feature]);
      
      if (hasRequiredFeatures) {
        // Load Screenshot Import Assistant
        const script = document.createElement('script');
        script.src = '/nova-drift-cheatsheet/dist/screenshot-import.js';
        script.async = true;
        
        script.onload = function() {
          console.log('Screenshot Import Assistant loaded');
        };
        
        script.onerror = function() {
          console.warn('Failed to load Screenshot Import Assistant');
          showFallbackMessage();
        };
        
        document.head.appendChild(script);
      } else {
        showFallbackMessage();
      }
      
      function showFallbackMessage() {
        const container = document.getElementById('screenshot-import-root');
        container.innerHTML = `
          <div class="feature-notice">
            <h3>Screenshot Import Not Available</h3>
            <p>Your browser doesn't support all required features for screenshot import.</p>
            <p>Please use a modern browser like Chrome, Firefox, or Safari.</p>
          </div>
        `;
      }
    })();
  </script>
  
  <!-- Service Worker Registration -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/nova-drift-cheatsheet/sw.js')
          .then(registration => {
            console.log('SW registered: ', registration);
          })
          .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  </script>
</body>
</html>
```

## Performance Monitoring

### Performance Tracking
```javascript
// docs/js/performance-tracker.js
export class PerformanceTracker {
  constructor() {
    this.metrics = {};
    this.observer = null;
    this.initialized = false;
  }
  
  initialize() {
    if (this.initialized) return;
    
    // Performance Observer for detailed metrics
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordEntry(entry);
        });
      });
      
      this.observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
    
    // Core Web Vitals
    this.trackCoreWebVitals();
    
    this.initialized = true;
  }
  
  trackCoreWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.lcp = lastEntry.startTime;
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      this.metrics.fid = firstInput.processingStart - firstInput.startTime;
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let cumulativeScore = 0;
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
          this.metrics.cls = cumulativeScore;
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  recordEntry(entry) {
    if (entry.entryType === 'resource') {
      // Track resource loading times
      if (entry.name.includes('opencv.js')) {
        this.metrics.opencvLoadTime = entry.responseEnd - entry.startTime;
      } else if (entry.name.includes('screenshot-import')) {
        this.metrics.scriptLoadTime = entry.responseEnd - entry.startTime;
      }
    } else if (entry.entryType === 'measure') {
      // Custom performance marks
      this.metrics[entry.name] = entry.duration;
    }
  }
  
  mark(name) {
    performance.mark(name);
  }
  
  measure(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      memoryUsage: this.getMemoryUsage(),
      timing: performance.timing,
      navigation: performance.navigation
    };
  }
  
  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
  
  reportMetrics() {
    const metrics = this.getMetrics();
    
    // Send to analytics service
    if (window.gtag) {
      window.gtag('event', 'performance_metrics', {
        custom_map: {
          'metric1': 'lcp',
          'metric2': 'fid',
          'metric3': 'cls'
        },
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls
      });
    }
    
    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.table(metrics);
    }
    
    return metrics;
  }
}

// Initialize performance tracking
const tracker = new PerformanceTracker();
tracker.initialize();

// Report metrics on page unload
window.addEventListener('beforeunload', () => {
  tracker.reportMetrics();
});
```

### Error Tracking
```javascript
// docs/js/error-tracker.js
export class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.setupGlobalHandlers();
  }
  
  setupGlobalHandlers() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
    
    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.recordError({
          type: 'resource',
          message: `Failed to load: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          timestamp: Date.now()
        });
      }
    }, true);
  }
  
  recordError(error) {
    // Add to local collection
    this.errors.push(error);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Report to monitoring service
    this.reportError(error);
    
    console.error('Error tracked:', error);
  }
  
  reportError(error) {
    // Send to error reporting service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: error.type === 'javascript'
      });
    }
    
    // Send to custom monitoring endpoint (if available)
    if (this.shouldReportError(error)) {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {
        // Silently fail if reporting endpoint is not available
      });
    }
  }
  
  shouldReportError(error) {
    // Filter out noise
    const ignoredMessages = [
      'Script error.',
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded'
    ];
    
    return !ignoredMessages.some(msg => 
      error.message.includes(msg)
    );
  }
  
  getErrors() {
    return this.errors.slice();
  }
  
  clearErrors() {
    this.errors = [];
  }
}

// Initialize error tracking
const errorTracker = new ErrorTracker();
window.errorTracker = errorTracker;
```

## Monitoring and Analytics

### Custom Analytics
```javascript
// docs/js/analytics.js
export class ScreenshotImportAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.events = [];
  }
  
  track(event, properties = {}) {
    const eventData = {
      sessionId: this.sessionId,
      event,
      properties,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.events.push(eventData);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', event, properties);
    }
    
    // Send to custom endpoint
    this.sendToEndpoint(eventData);
  }
  
  trackScreenshotUpload(metadata) {
    this.track('screenshot_upload', {
      file_size: metadata.fileSize,
      image_width: metadata.width,
      image_height: metadata.height,
      file_format: metadata.format
    });
  }
  
  trackProcessingTime(phase, duration) {
    this.track('processing_time', {
      phase,
      duration_ms: duration
    });
  }
  
  trackRecognitionResults(results) {
    this.track('recognition_complete', {
      total_hexagons: results.total,
      recognized_hexagons: results.recognized,
      high_confidence: results.highConfidence,
      low_confidence: results.lowConfidence
    });
  }
  
  trackUserCorrection(correction) {
    this.track('user_correction', {
      original_confidence: correction.originalConfidence,
      original_upgrade: correction.originalUpgrade,
      corrected_upgrade: correction.correctedUpgrade
    });
  }
  
  trackError(error) {
    this.track('error_occurred', {
      error_type: error.type,
      error_message: error.message,
      phase: error.phase
    });
  }
  
  sendToEndpoint(eventData) {
    // Only send if endpoint is configured
    if (!window.ANALYTICS_ENDPOINT) return;
    
    fetch(window.ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    }).catch(() => {
      // Silently fail
    });
  }
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getEvents() {
    return this.events.slice();
  }
}
```

## Production Checklist

### Pre-deployment Checklist
```markdown
## Pre-deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage > 85%
- [ ] ESLint/Prettier checks pass
- [ ] No console.log statements in production code
- [ ] Error handling implemented for all user actions

### Performance
- [ ] Bundle size < 2MB total
- [ ] OpenCV.js loads asynchronously
- [ ] Images optimized (WebP fallbacks available)
- [ ] Service worker configured for caching
- [ ] Lazy loading implemented for non-critical features

### Security
- [ ] No sensitive information in client code
- [ ] Input validation on all file uploads
- [ ] CSP headers configured
- [ ] HTTPS enforced

### Accessibility
- [ ] WCAG AA compliance verified
- [ ] Keyboard navigation tested
- [ ] Screen reader compatibility verified
- [ ] Color contrast ratios meet standards

### Browser Compatibility
- [ ] Chrome (last 2 versions) tested
- [ ] Firefox (last 2 versions) tested
- [ ] Safari (last 2 versions) tested
- [ ] Edge (last 2 versions) tested
- [ ] Mobile Safari tested
- [ ] Mobile Chrome tested

### Features
- [ ] Upload functionality works
- [ ] Image processing pipeline complete
- [ ] Recognition accuracy meets requirements (>75%)
- [ ] Review mode functional
- [ ] Correction interface working
- [ ] Feedback collection implemented

### Documentation
- [ ] README updated with new features
- [ ] API documentation complete
- [ ] User guide available
- [ ] Troubleshooting guide created
```

### Rollout Strategy
```javascript
// docs/js/feature-flags.js
export class FeatureFlags {
  constructor() {
    this.flags = this.loadFlags();
  }
  
  loadFlags() {
    // Load from localStorage with server-side fallback
    const stored = localStorage.getItem('screenshot-import-flags');
    const defaults = {
      screenshotImportEnabled: true,
      webWorkersEnabled: true,
      performanceTrackingEnabled: true,
      advancedFeaturesEnabled: false,
      betaFeaturesEnabled: false
    };
    
    if (stored) {
      try {
        return { ...defaults, ...JSON.parse(stored) };
      } catch {
        return defaults;
      }
    }
    
    return defaults;
  }
  
  isEnabled(flag) {
    return this.flags[flag] === true;
  }
  
  enable(flag) {
    this.flags[flag] = true;
    this.saveFlags();
  }
  
  disable(flag) {
    this.flags[flag] = false;
    this.saveFlags();
  }
  
  saveFlags() {
    localStorage.setItem('screenshot-import-flags', JSON.stringify(this.flags));
  }
  
  // Gradual rollout based on user percentage
  enableForPercentage(flag, percentage) {
    const userId = this.getUserId();
    const hash = this.hashString(userId);
    const userPercentage = (hash % 100) + 1;
    
    if (userPercentage <= percentage) {
      this.enable(flag);
      return true;
    }
    
    return false;
  }
  
  getUserId() {
    let userId = localStorage.getItem('screenshot-import-user-id');
    if (!userId) {
      userId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem('screenshot-import-user-id', userId);
    }
    return userId;
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Initialize feature flags
const featureFlags = new FeatureFlags();

// Gradual rollout - enable for 10% of users initially
featureFlags.enableForPercentage('screenshotImportEnabled', 10);

export default featureFlags;
```

## Maintenance and Updates

### Update Process
1. **Development**: Feature branches with comprehensive testing
2. **Staging**: Deploy to staging environment for QA
3. **Canary Release**: Enable for small percentage of users
4. **Full Rollout**: Gradually increase user percentage
5. **Monitoring**: Track performance and error rates

### Backup and Recovery
```javascript
// scripts/backup-templates.js
const fs = require('fs');
const path = require('path');

function backupTemplates() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backups/templates-${timestamp}`;
  
  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });
  
  // Copy templates
  const templatesDir = 'docs/templates';
  if (fs.existsSync(templatesDir)) {
    fs.cpSync(templatesDir, path.join(backupDir, 'templates'), { recursive: true });
  }
  
  // Copy upgrade data
  const upgradesFile = 'docs/data/upgrades.json';
  if (fs.existsSync(upgradesFile)) {
    fs.copyFileSync(upgradesFile, path.join(backupDir, 'upgrades.json'));
  }
  
  console.log(`Backup created: ${backupDir}`);
}

function restoreTemplates(backupPath) {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup not found: ${backupPath}`);
  }
  
  // Restore templates
  const backupTemplatesDir = path.join(backupPath, 'templates');
  if (fs.existsSync(backupTemplatesDir)) {
    fs.rmSync('docs/templates', { recursive: true, force: true });
    fs.cpSync(backupTemplatesDir, 'docs/templates', { recursive: true });
  }
  
  // Restore upgrades data
  const backupUpgradesFile = path.join(backupPath, 'upgrades.json');
  if (fs.existsSync(backupUpgradesFile)) {
    fs.copyFileSync(backupUpgradesFile, 'docs/data/upgrades.json');
  }
  
  console.log(`Backup restored from: ${backupPath}`);
}

module.exports = { backupTemplates, restoreTemplates };
```

## Success Metrics

### Key Performance Indicators
- **Adoption Rate**: % of users who try the upload feature
- **Success Rate**: % of uploads that complete successfully
- **Accuracy Rate**: % of correct recognitions
- **User Satisfaction**: Feedback scores and usage retention
- **Performance**: Average processing time < 20 seconds
- **Error Rate**: < 5% of uploads result in errors

### Monitoring Dashboard
Create a simple dashboard to track these metrics using the collected analytics data.

## Conclusion

The deployment strategy ensures:
1. **Reliable delivery** through automated CI/CD
2. **Optimal performance** via asset optimization and caching
3. **Progressive enhancement** with feature detection
4. **Comprehensive monitoring** for issues and performance
5. **Gradual rollout** to minimize risk
6. **Easy maintenance** with proper tooling and processes

The Screenshot Import Assistant is now ready for production deployment with all necessary safeguards and monitoring in place.