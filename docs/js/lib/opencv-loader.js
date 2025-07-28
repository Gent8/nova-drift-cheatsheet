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
    const localPath = '/js/lib/opencv-4.8.0.js';
    const cdnPath = 'https://docs.opencv.org/4.8.0/opencv.js';
    
    script.src = localPath;
    script.async = true;
    
    // Set up Module configuration before script loads
    window.Module = {
      onRuntimeInitialized() {
        console.log('OpenCV.js runtime initialized successfully');
        console.log('Available methods:', Object.keys(cv).length);
        resolve(cv);
      },
      onAbort(what) {
        console.error('OpenCV.js loading aborted:', what);
        reject(new Error(`OpenCV loading aborted: ${what}`));
      }
    };
    
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