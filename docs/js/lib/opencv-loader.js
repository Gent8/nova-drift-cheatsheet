// OpenCV.js loader with fallback to CDN
// Based on research from the technical plan

let openCVPromise = null;

export async function loadOpenCV() {
  if (openCVPromise) {
    return openCVPromise;
  }

  openCVPromise = new Promise((resolve, reject) => {
    // Check if OpenCV is already loaded
    if (typeof cv !== 'undefined' && cv.Mat) {
      resolve(cv);
      return;
    }

    const script = document.createElement('script');
    
    // Try local version first, fallback to CDN
    const localPath = 'js/lib/opencv-4.5.5.js';  // Use more stable version
    const cdnPath = 'https://docs.opencv.org/4.5.5/opencv.js';
    
    script.src = localPath;
    script.async = true;
    
    // Add timeout for initialization (reduced to 10 seconds)
    const initTimeout = setTimeout(() => {
      console.warn('OpenCV.js initialization timeout - this may indicate WASM loading issues');
      reject(new Error('OpenCV.js initialization timeout - runtime failed to initialize within 10 seconds'));
    }, 10000);
    
    // Set up Module configuration before script loads
    // Check if Module already exists to prevent conflicts
    if (!window.Module) {
      window.Module = {
        onRuntimeInitialized() {
          clearTimeout(initTimeout);
          console.log('OpenCV.js runtime initialized successfully');
          try {
            if (typeof cv !== 'undefined' && cv.Mat) {
              console.log('Available methods:', Object.keys(cv).length);
              resolve(cv);
            } else {
              console.error('OpenCV object is not properly initialized');
              reject(new Error('OpenCV object not found after runtime initialization'));
            }
          } catch (error) {
            console.error('Error during OpenCV verification:', error);
            reject(new Error(`OpenCV verification failed: ${error.message}`));
          }
        },
        onAbort(what) {
          clearTimeout(initTimeout);
          console.error('OpenCV.js loading aborted:', what);
          reject(new Error(`OpenCV loading aborted: ${what}`));
        },
        // WebAssembly configuration
        locateFile(path, prefix) {
          console.log('OpenCV.js requesting file:', path, 'from prefix:', prefix);
          // Return the same path for WASM files - let browser handle it
          return prefix + path;
        },
        onRuntimeError(error) {
          clearTimeout(initTimeout);
          console.error('OpenCV.js runtime error:', error);
          reject(new Error(`OpenCV runtime error: ${error}`));
        },
        // Memory configuration
        INITIAL_MEMORY: 16777216, // 16MB
        MAXIMUM_MEMORY: 67108864, // 64MB  
        ALLOW_MEMORY_GROWTH: true,
        // Error handling
        printErr(text) {
          console.error('OpenCV.js Error:', text);
        },
        print(text) {
          console.log('OpenCV.js:', text);
        }
      };
    } else {
      console.warn('Module already exists, may cause OpenCV initialization conflicts');
      // Clear existing module to prevent conflicts
      delete window.Module;
      return loadOpenCV(); // Retry
    }
    
    script.onload = () => {
      console.log('OpenCV.js script loaded, waiting for runtime...');
    };
    
    script.onerror = () => {
      console.warn('Failed to load local OpenCV.js, trying CDN...');
      
      // Remove failed script
      script.remove();
      
      // Try CDN version
      const cdnScript = document.createElement('script');
      cdnScript.src = cdnPath;
      cdnScript.async = true;
      
      cdnScript.onload = () => {
        console.log('OpenCV.js CDN script loaded, waiting for runtime...');
      };
      
      cdnScript.onerror = () => {
        clearTimeout(initTimeout);
        reject(new Error('Failed to load OpenCV.js from both local and CDN sources'));
      };
      
      document.head.appendChild(cdnScript);
    };
    
    document.head.appendChild(script);
  });

  return openCVPromise;
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

// Performance monitoring utility
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
    
    return duration;
  }
}