// Auto-Cropper for Screenshot Import Assistant
// Detects and crops the upgrade area from screenshots

import { cleanupOpenCVObjects } from '../lib/opencv-loader.js';

export class AutoCropper {
  constructor(options = {}) {
    this.upgradeAreaRatio = options.upgradeAreaRatio || 0.35; // Upgrade area is ~35% of screen width
    this.edgeThreshold = options.edgeThreshold || 30;
    this.minPanelWidth = options.minPanelWidth || 200;
    this.maxPanelWidth = options.maxPanelWidth || 600;
  }

  // Main method to detect and crop upgrade area
  async detectAndCrop(canvas, cv, options = {}) {
    const src = cv.imread(canvas);
    
    try {
      // Step 1: Check if already perfectly cropped
      if (this.isPerfectlyCropped(src, cv)) {
        console.log('Image appears to already be cropped');
        return {
          canvas: canvas,
          region: { x: 0, y: 0, width: canvas.width, height: canvas.height },
          confidence: 1.0,
          method: 'already_cropped'
        };
      }
      
      // Step 2: Try edge detection method
      const edgeResult = await this.detectByEdges(src, cv);
      if (edgeResult.confidence > 0.7) {
        const croppedCanvas = this.applyCrop(canvas, edgeResult.region);
        return {
          canvas: croppedCanvas,
          region: edgeResult.region,
          confidence: edgeResult.confidence,
          method: 'edge_detection'
        };
      }
      
      // Step 3: Try color analysis method
      const colorResult = await this.detectByColorAnalysis(src, cv);
      if (colorResult.confidence > 0.6) {
        const croppedCanvas = this.applyCrop(canvas, colorResult.region);
        return {
          canvas: croppedCanvas,
          region: colorResult.region,
          confidence: colorResult.confidence,
          method: 'color_analysis'
        };
      }
      
      // Step 4: Fallback to fixed ratio
      const fallbackRegion = this.getFallbackRegion(canvas);
      const croppedCanvas = this.applyCrop(canvas, fallbackRegion);
      
      return {
        canvas: croppedCanvas,
        region: fallbackRegion,
        confidence: 0.5,
        method: 'fallback_ratio'
      };
      
    } finally {
      cleanupOpenCVObjects(src);
    }
  }

  // Check if image appears to already be cropped
  isPerfectlyCropped(src, cv) {
    const gray = new cv.Mat();
    
    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Check dimensions - cropped images are typically narrower
      if (src.cols > 800) {
        return false;
      }
      
      // Check average brightness - cropped upgrade areas tend to be darker
      const mean = cv.mean(gray);
      const avgBrightness = mean[0];
      
      // Check if predominantly dark (upgrade panels have dark backgrounds)
      if (avgBrightness < 60 && src.cols < 600) {
        return true;
      }
      
      return false;
      
    } finally {
      cleanupOpenCVObjects(gray);
    }
  }

  // Detect upgrade area using edge detection
  async detectByEdges(src, cv) {
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    const lines = new cv.Mat();
    
    try {
      // Convert to grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      // Apply Gaussian blur to reduce noise
      const blurred = new cv.Mat();
      const ksize = new cv.Size(5, 5);
      cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);
      
      // Canny edge detection
      cv.Canny(blurred, edges, 50, 150, 3, false);
      
      // Find lines using Hough transform
      cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 80, 50, 10);
      
      // Analyze vertical lines in the left portion of the image
      const verticalLines = this.findVerticalLines(lines, src.cols);
      
      if (verticalLines.length > 0) {
        // Find the rightmost strong vertical line (panel boundary)
        const panelBoundary = Math.max(...verticalLines.map(line => line.x));
        
        // Validate the boundary position
        if (panelBoundary > this.minPanelWidth && panelBoundary < Math.min(this.maxPanelWidth, src.cols * 0.6)) {
          const region = {
            x: 0,
            y: 0,
            width: panelBoundary + 20, // Add small margin
            height: src.rows
          };
          
          return {
            region: region,
            confidence: 0.8
          };
        }
      }
      
      return { region: null, confidence: 0 };
      
    } finally {
      cleanupOpenCVObjects(gray, edges, lines);
    }
  }

  // Find vertical lines from Hough lines result
  findVerticalLines(lines, imageWidth) {
    const verticalLines = [];
    const maxSlope = 0.2; // Maximum slope for "vertical" lines
    
    for (let i = 0; i < lines.rows; i++) {
      const line = lines.data32S.slice(i * 4, (i + 1) * 4);
      const [x1, y1, x2, y2] = line;
      
      // Skip if line is not in the left portion of the image
      if (x1 > imageWidth * 0.5 || x2 > imageWidth * 0.5) {
        continue;
      }
      
      // Calculate slope
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      
      if (dy === 0) continue; // Horizontal line
      
      const slope = dx / dy;
      
      // Check if line is vertical enough
      if (slope <= maxSlope) {
        const avgX = (x1 + x2) / 2;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        verticalLines.push({
          x: avgX,
          length: length,
          slope: slope
        });
      }
    }
    
    // Sort by x position (left to right)
    return verticalLines.sort((a, b) => a.x - b.x);
  }

  // Detect upgrade area using color analysis
  async detectByColorAnalysis(src, cv) {
    const hsv = new cv.Mat();
    const mask = new cv.Mat();
    
    try {
      // Convert to HSV for better color analysis
      cv.cvtColor(src, hsv, cv.COLOR_RGBA2HSV);
      
      // Create mask for dark regions (upgrade panel background)
      const low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 0, 0, 0]);
      const high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [180, 255, 50, 255]);
      cv.inRange(hsv, low, high, mask);
      
      // Find contours of dark regions
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      // Find the largest dark region in the left portion
      let bestRegion = null;
      let bestScore = 0;
      
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = cv.boundingRect(contour);
        
        // Only consider regions in the left half
        if (rect.x > src.cols * 0.5) {
          continue;
        }
        
        // Score based on size and position
        const area = rect.width * rect.height;
        const leftScore = 1 - (rect.x / src.cols); // Prefer leftmost regions
        const sizeScore = Math.min(1, area / (src.cols * src.rows * 0.2)); // Size relative to image
        
        const totalScore = leftScore * 0.4 + sizeScore * 0.6;
        
        if (totalScore > bestScore && rect.width > this.minPanelWidth) {
          bestScore = totalScore;
          bestRegion = {
            x: 0, // Always start from left edge
            y: rect.y,
            width: rect.x + rect.width + 20, // Add margin
            height: rect.height
          };
        }
      }
      
      // Cleanup contours
      for (let i = 0; i < contours.size(); i++) {
        contours.get(i).delete();
      }
      contours.delete();
      hierarchy.delete();
      
      if (bestRegion) {
        return {
          region: bestRegion,
          confidence: Math.min(0.8, bestScore)
        };
      }
      
      return { region: null, confidence: 0 };
      
    } finally {
      cleanupOpenCVObjects(hsv, mask);
    }
  }

  // Get fallback region using fixed ratio
  getFallbackRegion(canvas) {
    const width = Math.floor(canvas.width * this.upgradeAreaRatio);
    
    return {
      x: 0,
      y: 0,
      width: Math.max(this.minPanelWidth, Math.min(width, this.maxPanelWidth)),
      height: canvas.height
    };
  }

  // Apply crop to canvas
  applyCrop(canvas, region) {
    // Validate region
    const validRegion = this.validateCropRegion(region, canvas);
    
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = validRegion.width;
    croppedCanvas.height = validRegion.height;
    
    const ctx = croppedCanvas.getContext('2d');
    
    // Draw cropped region
    ctx.drawImage(
      canvas,
      validRegion.x, validRegion.y, validRegion.width, validRegion.height,
      0, 0, validRegion.width, validRegion.height
    );
    
    return croppedCanvas;
  }

  // Validate and fix crop region
  validateCropRegion(region, canvas) {
    return {
      x: Math.max(0, Math.min(region.x, canvas.width - 1)),
      y: Math.max(0, Math.min(region.y, canvas.height - 1)),
      width: Math.max(1, Math.min(region.width, canvas.width - region.x)),
      height: Math.max(1, Math.min(region.height, canvas.height - region.y))
    };
  }

  // Manual crop with user-defined region
  manualCrop(canvas, region) {
    const validRegion = this.validateCropRegion(region, canvas);
    return this.applyCrop(canvas, validRegion);
  }

  // Get crop suggestions for user interface
  getCropSuggestions(canvas, cv) {
    const suggestions = [];
    const src = cv.imread(canvas);
    
    try {
      // Add automatic detection suggestion
      const autoResult = this.detectAndCrop(canvas, cv);
      suggestions.push({
        name: 'Auto Detect',
        region: autoResult.region,
        confidence: autoResult.confidence,
        preview: this.createPreviewCanvas(canvas, autoResult.region)
      });
      
      // Add common ratio suggestions
      const ratios = [0.25, 0.33, 0.4, 0.5];
      ratios.forEach(ratio => {
        const region = {
          x: 0,
          y: 0,
          width: Math.floor(canvas.width * ratio),
          height: canvas.height
        };
        
        suggestions.push({
          name: `${Math.round(ratio * 100)}% Width`,
          region: region,
          confidence: 0.3,
          preview: this.createPreviewCanvas(canvas, region)
        });
      });
      
      return suggestions;
      
    } finally {
      cleanupOpenCVObjects(src);
    }
  }

  // Create preview canvas for crop region
  createPreviewCanvas(canvas, region, maxSize = 150) {
    const preview = document.createElement('canvas');
    const aspectRatio = region.width / region.height;
    
    if (aspectRatio > 1) {
      preview.width = maxSize;
      preview.height = maxSize / aspectRatio;
    } else {
      preview.height = maxSize;
      preview.width = maxSize * aspectRatio;
    }
    
    const ctx = preview.getContext('2d');
    ctx.drawImage(
      canvas,
      region.x, region.y, region.width, region.height,
      0, 0, preview.width, preview.height
    );
    
    return preview;
  }

  // Analyze crop quality
  analyzeCropQuality(canvas, region) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
    const data = imageData.data;
    
    let darkPixels = 0;
    let brightPixels = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (brightness < 50) darkPixels++;
      else if (brightness > 200) brightPixels++;
      
      totalPixels++;
    }
    
    const darkRatio = darkPixels / totalPixels;
    const brightRatio = brightPixels / totalPixels;
    
    // Good upgrade crops tend to have a mix of dark backgrounds and bright icons
    let qualityScore = 0.5;
    
    // Prefer regions with moderate dark background (upgrade panel)
    if (darkRatio > 0.2 && darkRatio < 0.6) {
      qualityScore += 0.3;
    }
    
    // Prefer regions with some bright elements (upgrade icons)
    if (brightRatio > 0.1 && brightRatio < 0.4) {
      qualityScore += 0.2;
    }
    
    return {
      quality: Math.min(1.0, qualityScore),
      darkRatio: darkRatio,
      brightRatio: brightRatio,
      aspectRatio: region.width / region.height
    };
  }
}