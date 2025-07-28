# 03 - Development Setup

## Research-Based Prerequisites

### Required Software (Updated Versions)
- **Node.js 18+ LTS** (for development tools) - Current LTS version with latest security updates
- **Modern web browser** with full API support:
  - Chrome 90+ (recommended for development)
  - Firefox 88+ (excellent Canvas API performance)  
  - Safari 14+ (WebAssembly support confirmed)
  - Edge 90+ (Chromium-based, full compatibility)
- **Git 2.30+** with secure configuration
- **VS Code** with recommended extensions:
  - JavaScript/TypeScript Language Support
  - OpenCV Code Snippets (if available)
  - WCAG Accessibility Checker

### Browser Requirements (Research-Verified)
Based on current browser API research:
- **Canvas API**: Baseline widely available since 2015, supported across all target browsers
- **IndexedDB**: Native support in all modern browsers with transaction safety
- **WebAssembly**: Present in all target browsers, required for OpenCV.js performance
- **Web Workers**: Essential for background processing, universally supported
- **WebGL** (optional): For hardware-accelerated image processing, available in 95%+ browsers

### Accessibility Testing Requirements
- **Screen Reader Testing**: NVDA (Windows), VoiceOver (macOS), Orca (Linux)
- **Keyboard Navigation**: Test without mouse/touch input
- **Color Contrast**: Tools for WCAG AA compliance verification

## Project Structure

```
nova-drift-cheatsheet/
├── docs/
│   ├── assets/
│   │   ├── hex.png          # Existing sprite sheet
│   │   └── ...
│   ├── js/
│   │   ├── lib/
│   │   │   └── opencv.js    # OpenCV.js library
│   │   ├── screenshot-import/
│   │   │   ├── index.js     # Main entry point
│   │   │   ├── image-processor.js
│   │   │   ├── recognition-engine.js
│   │   │   ├── template-manager.js
│   │   │   ├── ui-components.js
│   │   │   ├── storage-manager.js
│   │   │   └── workers/
│   │   │       └── recognition.worker.js
│   │   └── ...
│   ├── css/
│   │   └── screenshot-import.css
│   ├── templates/            # Pre-extracted templates
│   │   └── hexagons/
│   └── index.html
```

## Step 1: Install OpenCV.js (Current Best Practices)

### Option A: Download Latest Stable Version (Recommended)
```bash
# Download OpenCV.js v4.8.0 (current stable)
wget https://docs.opencv.org/4.8.0/opencv.js

# Verify file integrity (optional but recommended)
# Check file size and basic structure
ls -la opencv.js

# Place in project with version tracking
mv opencv.js docs/js/lib/opencv-4.8.0.js
```

**Research-Based Rationale:**
- Version 4.8.0 is the current stable release with improved template matching algorithms
- Versioned filename prevents caching issues during updates
- File integrity verification prevents corrupted downloads

### Option B: Build Custom Version (Optimized)
```bash
# Clone OpenCV repository
git clone https://github.com/opencv/opencv.git
cd opencv

# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..

# Build OpenCV.js with only needed modules
python ./platforms/js/build_js.py build_js \
  --build_wasm \
  --simd \
  --threads \
  --build_flags="-s MODULARIZE=1 -s EXPORT_ES6=1"
```

### OpenCV.js Configuration (Research-Based Implementation)
Create `docs/js/lib/opencv-loader.js`:
```javascript
// Modern async loader for OpenCV.js following official patterns
export async function loadOpenCV() {
  return new Promise((resolve, reject) => {
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined' && cv.Mat) {
      resolve(cv);
      return;
    }
    
    const script = document.createElement('script');
    script.src = '/js/lib/opencv-4.8.0.js';
    script.async = true; // Async loading for better page performance
    
    // Set up Module configuration before script loads
    window.Module = {
      onRuntimeInitialized() {
        console.log('OpenCV.js v4.8.0 runtime initialized successfully');
        console.log('Available methods:', Object.keys(cv).length);
        resolve(cv);
      },
      onAbort(what) {
        console.error('OpenCV.js loading aborted:', what);
        reject(new Error(`OpenCV loading aborted: ${what}`));
      }
    };
    
    script.onload = () => {
      // OpenCV will call Module.onRuntimeInitialized when ready
      console.log('OpenCV.js script loaded, waiting for runtime...');
    };
    
    script.onerror = (error) => {
      console.error('Failed to load OpenCV.js script');
      reject(new Error('OpenCV.js script loading failed'));
    };
    
    document.head.appendChild(script);
  });
}

// Memory cleanup utility based on OpenCV.js best practices
export function cleanupOpenCVObjects(...objects) {
  objects.forEach(obj => {
    if (obj && typeof obj.delete === 'function') {
      try {
        obj.delete();
      } catch (error) {
        console.warn('Error cleaning up OpenCV object:', error);
      }
    }
  });
}
```

## Step 2: Development Environment

### Install Development Dependencies
```bash
# Initialize package.json (for dev tools only)
npm init -y

# Install dev dependencies
npm install --save-dev \
  webpack \
  webpack-cli \
  webpack-dev-server \
  babel-loader \
  @babel/core \
  @babel/preset-env \
  css-loader \
  style-loader \
  html-webpack-plugin \
  copy-webpack-plugin
```

### Webpack Configuration
Create `webpack.config.js`:
```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './docs/js/screenshot-import/index.js',
  output: {
    path: path.resolve(__dirname, 'docs/dist'),
    filename: 'screenshot-import.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'docs/js/lib/opencv.js', to: 'lib/' },
        { from: 'docs/assets/', to: 'assets/' }
      ]
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'docs')
    },
    compress: true,
    port: 8080
  }
};
```

## Step 3: Extract Templates from Sprite Sheet

### Template Extraction Script
Create `scripts/extract-templates.js`:
```javascript
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

async function extractTemplates() {
  const spriteSheet = await loadImage('docs/assets/hex.png');
  const hexWidth = 64;  // Adjust based on actual sprite dimensions
  const hexHeight = 64;
  
  const upgrades = require('../docs/data/upgrades.json');
  const canvas = createCanvas(hexWidth, hexHeight);
  const ctx = canvas.getContext('2d');
  
  // Create output directory
  const outputDir = 'docs/templates/hexagons';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  upgrades.forEach((upgrade, index) => {
    // Calculate sprite position
    const row = Math.floor(index / 10);  // Adjust based on sprite layout
    const col = index % 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, hexWidth, hexHeight);
    
    // Extract hexagon
    ctx.drawImage(
      spriteSheet,
      col * hexWidth, row * hexHeight,
      hexWidth, hexHeight,
      0, 0,
      hexWidth, hexHeight
    );
    
    // Save template
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(
      path.join(outputDir, `${upgrade.id}.png`),
      buffer
    );
  });
  
  console.log(`Extracted ${upgrades.length} templates`);
}

extractTemplates().catch(console.error);
```

Run extraction:
```bash
npm install canvas
node scripts/extract-templates.js
```

## Step 4: Local Development Setup

### Development Server Script
Add to `package.json`:
```json
{
  "scripts": {
    "dev": "webpack serve --open",
    "build": "webpack --mode production",
    "extract-templates": "node scripts/extract-templates.js"
  }
}
```

### Environment Variables
Create `.env.development`:
```bash
# Development settings
DEBUG_MODE=true
OPENCV_SIMD=true
OPENCV_THREADS=false  # Enable if supported
CONFIDENCE_THRESHOLD=0.75
```

## Step 5: Testing Infrastructure

### Install Testing Dependencies
```bash
npm install --save-dev \
  jest \
  @testing-library/dom \
  canvas \
  jest-canvas-mock
```

### Jest Configuration
Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-canvas-mock'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
  }
};
```

## Step 6: Browser Testing Setup

### Create Test Page
Create `docs/test.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Screenshot Import Test</title>
  <link rel="stylesheet" href="css/screenshot-import.css">
</head>
<body>
  <h1>Screenshot Import Assistant Test Page</h1>
  
  <div id="test-container">
    <button id="upload-btn">Upload Screenshot</button>
    <div id="status"></div>
    <canvas id="preview"></canvas>
    <div id="results"></div>
  </div>
  
  <!-- Load dependencies -->
  <script src="js/lib/opencv.js"></script>
  <script type="module" src="js/screenshot-import/index.js"></script>
  
  <script type="module">
    import { ScreenshotImportAssistant } from './js/screenshot-import/index.js';
    
    window.addEventListener('DOMContentLoaded', async () => {
      const assistant = new ScreenshotImportAssistant({
        container: document.getElementById('test-container'),
        onComplete: (results) => {
          console.log('Recognition complete:', results);
          document.getElementById('results').textContent = 
            JSON.stringify(results, null, 2);
        }
      });
      
      await assistant.initialize();
    });
  </script>
</body>
</html>
```

## Step 7: Performance Monitoring

### Add Performance Tracking
Create `docs/js/screenshot-import/performance.js`:
```javascript
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
  }
  
  start(label) {
    this.marks.set(label, performance.now());
  }
  
  end(label) {
    const start = this.marks.get(label);
    if (!start) return;
    
    const duration = performance.now() - start;
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    
    // Send to analytics if needed
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: label,
        value: Math.round(duration)
      });
    }
    
    return duration;
  }
}
```

## Development Workflow

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test with Sample Screenshots
- Prepare test screenshots in various formats
- Test both cropped and fullscreen versions
- Test different resolutions

### 3. Debug Tools
```javascript
// Enable debug mode
window.DEBUG_SCREENSHOT_IMPORT = true;

// This will enable:
// - Verbose logging
// - Visual debugging overlays
// - Performance metrics
// - Intermediate processing steps
```

## Common Issues and Solutions

### Issue: OpenCV.js Loading Fails
```javascript
// Fallback loading mechanism
async function loadOpenCVWithFallback() {
  try {
    return await loadOpenCV();
  } catch (error) {
    console.warn('Failed to load local OpenCV.js, trying CDN...');
    return await loadOpenCVFromCDN();
  }
}
```

### Issue: Memory Leaks
```javascript
// Always clean up OpenCV objects
function processImage(mat) {
  try {
    // Process image
    const result = cv.someOperation(mat);
    return result;
  } finally {
    // Clean up
    mat.delete();
  }
}
```

## Next Steps

With the development environment set up, proceed to:
1. Implement the image processing pipeline (see `04-image-processing-pipeline.md`)
2. Build the recognition engine (see `05-recognition-engine.md`)
3. Create UI components (see `06-ui-integration.md`)