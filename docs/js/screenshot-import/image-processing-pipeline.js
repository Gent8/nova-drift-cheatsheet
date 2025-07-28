// Image Processing Pipeline for Screenshot Import Assistant
// Orchestrates the complete processing workflow

import { ImageLoader } from './image-loader.js';
import { AutoCropper } from './auto-cropper.js';
import { ImagePreprocessor } from './image-preprocessor.js';
import { TemplateManager } from './template-manager.js';

export class ImageProcessingPipeline {
  constructor(cv) {
    this.cv = cv;
    this.loader = new ImageLoader();
    this.cropper = new AutoCropper();
    this.preprocessor = new ImagePreprocessor();
    this.templateManager = new TemplateManager();
    this.initialized = false;
  }

  // Initialize the pipeline
  async initialize() {
    if (this.initialized) return;
    
    console.log('Initializing Image Processing Pipeline...');
    
    try {
      // Initialize template manager
      await this.templateManager.initialize(this.cv);
      
      this.initialized = true;
      console.log('Image Processing Pipeline initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize pipeline:', error);
      throw error;
    }
  }

  // Main processing method
  async process(file, progressCallback) {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = performance.now();

    try {
      // Stage 1: Load and validate image
      progressCallback?.({ stage: 'loading', progress: 0, message: 'Loading image...' });
      const loadResult = await this.loader.loadFromFile(file);
      
      // Stage 2: Auto-crop upgrade area
      progressCallback?.({ stage: 'cropping', progress: 20, message: 'Detecting upgrade area...' });
      const cropResult = await this.cropper.detectAndCrop(loadResult.canvas, this.cv);
      
      // Stage 3: Preprocess image
      progressCallback?.({ stage: 'preprocessing', progress: 40, message: 'Enhancing image quality...' });
      const preprocessResult = await this.preprocessor.preprocess(cropResult.canvas, this.cv);
      
      // Stage 4: Extract upgrade hexagons (simplified for now)
      progressCallback?.({ stage: 'extracting', progress: 60, message: 'Extracting upgrade hexagons...' });
      const hexagons = await this.extractHexagons(preprocessResult.canvas);
      
      // Stage 5: Prepare for matching
      progressCallback?.({ stage: 'preparing', progress: 80, message: 'Preparing for recognition...' });
      const prepared = this.prepareHexagonsForMatching(hexagons);
      
      progressCallback?.({ stage: 'complete', progress: 100, message: 'Processing complete!' });
      
      const totalTime = performance.now() - startTime;
      
      return {
        originalCanvas: loadResult.canvas,
        croppedCanvas: cropResult.canvas,
        preprocessedCanvas: preprocessResult.canvas,
        hexagons: prepared,
        metadata: {
          processingTime: totalTime,
          originalSize: loadResult.metadata.dimensions,
          cropRegion: cropResult.region,
          cropMethod: cropResult.method,
          cropConfidence: cropResult.confidence,
          hexagonCount: prepared.length,
          fileName: loadResult.metadata.fileName,
          fileSize: loadResult.metadata.fileSize
        }
      };
      
    } catch (error) {
      progressCallback?.({ stage: 'error', error: error.message });
      throw error;
    }
  }

  // Extract hexagons from processed image (simplified implementation)
  async extractHexagons(canvas) {
    // This is a simplified implementation that creates grid-based regions
    // In a full implementation, this would use OpenCV contour detection
    
    const hexagons = [];
    const hexSize = 48; // Estimated hexagon size
    const hexSpacing = 52; // Spacing between hexagons
    
    // Define expected positions based on Nova Drift UI layout
    const corePositions = [
      { x: 50, y: 50, type: 'weapon', category: 'core' },
      { x: 50, y: 110, type: 'body', category: 'core' },
      { x: 50, y: 170, type: 'shield', category: 'core' }
    ];
    
    // Add core upgrade positions
    corePositions.forEach((pos, index) => {
      const hexCanvas = this.extractHexagonAt(canvas, pos.x, pos.y, hexSize);
      if (hexCanvas) {
        hexagons.push({
          canvas: hexCanvas,
          position: { x: pos.x, y: pos.y },
          type: pos.type,
          category: pos.category,
          index: index,
          bounds: { x: pos.x - hexSize/2, y: pos.y - hexSize/2, width: hexSize, height: hexSize }
        });
      }
    });
    
    // Add mod positions (grid-based estimation)
    const modStartY = 230;
    const modsPerRow = Math.floor((canvas.width - 100) / hexSpacing);
    const maxMods = 20; // Reasonable limit
    
    for (let i = 0; i < maxMods; i++) {
      const row = Math.floor(i / modsPerRow);
      const col = i % modsPerRow;
      const x = 50 + col * hexSpacing;
      const y = modStartY + row * hexSpacing;
      
      // Stop if we exceed canvas bounds
      if (y + hexSize/2 > canvas.height || x + hexSize/2 > canvas.width) {
        break;
      }
      
      const hexCanvas = this.extractHexagonAt(canvas, x, y, hexSize);
      if (hexCanvas && this.isValidHexagon(hexCanvas)) {
        hexagons.push({
          canvas: hexCanvas,
          position: { x, y },
          type: 'mod',
          category: 'mod',
          index: corePositions.length + i,
          bounds: { x: x - hexSize/2, y: y - hexSize/2, width: hexSize, height: hexSize }
        });
      }
    }
    
    console.log(`Extracted ${hexagons.length} hexagons from image`);
    return hexagons;
  }

  // Extract hexagon at specific position
  extractHexagonAt(canvas, x, y, size) {
    const halfSize = size / 2;
    const bounds = {
      x: Math.max(0, x - halfSize),
      y: Math.max(0, y - halfSize),
      width: Math.min(size, canvas.width - (x - halfSize)),
      height: Math.min(size, canvas.height - (y - halfSize))
    };
    
    // Skip if bounds are too small
    if (bounds.width < size * 0.8 || bounds.height < size * 0.8) {
      return null;
    }
    
    const hexCanvas = document.createElement('canvas');
    hexCanvas.width = size;
    hexCanvas.height = size;
    const ctx = hexCanvas.getContext('2d');
    
    // Fill with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Draw the hexagon region
    ctx.drawImage(
      canvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      0, 0, size, size
    );
    
    return hexCanvas;
  }

  // Check if extracted hexagon contains meaningful content
  isValidHexagon(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let nonTransparentPixels = 0;
    let colorfulPixels = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a > 50) { // Non-transparent
        nonTransparentPixels++;
        
        // Check if pixel has color (not just gray)
        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        if (maxChannel - minChannel > 30) {
          colorfulPixels++;
        }
      }
    }
    
    const totalPixels = (canvas.width * canvas.height);
    const contentRatio = nonTransparentPixels / totalPixels;
    const colorRatio = colorfulPixels / totalPixels;
    
    // Valid hexagon should have some content and color
    return contentRatio > 0.3 && colorRatio > 0.1;
  }

  // Prepare hexagons for template matching
  prepareHexagonsForMatching(hexagons) {
    return hexagons.map((hexagon, index) => {
      // Calculate perceptual hash
      const hash = this.calculatePerceptualHash(hexagon.canvas);
      
      // Normalize size
      const normalized = this.normalizeHexagon(hexagon.canvas);
      
      return {
        ...hexagon,
        normalizedCanvas: normalized,
        hash: hash,
        id: `hex_${index}`
      };
    });
  }

  // Normalize hexagon to standard size
  normalizeHexagon(canvas) {
    const targetSize = 48;
    const normalized = document.createElement('canvas');
    normalized.width = targetSize;
    normalized.height = targetSize;
    
    const ctx = normalized.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Draw scaled hexagon
    ctx.drawImage(canvas, 0, 0, targetSize, targetSize);
    
    return normalized;
  }

  // Calculate perceptual hash for quick comparison
  calculatePerceptualHash(canvas) {
    // Resize to 8x8 for hash
    const size = 8;
    const small = document.createElement('canvas');
    small.width = size;
    small.height = size;
    const ctx = small.getContext('2d');
    ctx.drawImage(canvas, 0, 0, size, size);
    
    // Get pixel data and convert to grayscale
    const data = ctx.getImageData(0, 0, size, size).data;
    const gray = [];
    
    for (let i = 0; i < data.length; i += 4) {
      gray.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    
    // Calculate average
    const avg = gray.reduce((a, b) => a + b) / gray.length;
    
    // Generate hash
    let hash = '';
    for (let i = 0; i < gray.length; i++) {
      hash += gray[i] > avg ? '1' : '0';
    }
    
    return hash;
  }

  // Get pipeline statistics
  getStats() {
    return {
      initialized: this.initialized,
      templateCount: this.templateManager.getStats().total,
      supportedFormats: this.loader.supportedFormats,
      maxFileSize: this.loader.maxFileSize
    };
  }

  // Create debug visualization
  createDebugVisualization(processResult) {
    const debugCanvas = document.createElement('canvas');
    const margin = 10;
    const canvasWidth = 300;
    
    // Calculate layout
    const stages = [
      { canvas: processResult.originalCanvas, title: 'Original' },
      { canvas: processResult.croppedCanvas, title: 'Cropped' },
      { canvas: processResult.preprocessedCanvas, title: 'Preprocessed' }
    ];
    
    const stageHeight = 200;
    debugCanvas.width = canvasWidth;
    debugCanvas.height = stages.length * (stageHeight + margin) + margin;
    
    const ctx = debugCanvas.getContext('2d');
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, debugCanvas.width, debugCanvas.height);
    
    // Draw each stage
    stages.forEach((stage, index) => {
      const y = margin + index * (stageHeight + margin);
      
      // Calculate scale to fit
      const scale = Math.min(
        (canvasWidth - margin * 2) / stage.canvas.width,
        (stageHeight - 30) / stage.canvas.height
      );
      
      const scaledWidth = stage.canvas.width * scale;
      const scaledHeight = stage.canvas.height * scale;
      const x = (canvasWidth - scaledWidth) / 2;
      
      // Draw stage image
      ctx.drawImage(stage.canvas, x, y + 20, scaledWidth, scaledHeight);
      
      // Draw title
      ctx.fillStyle = '#fff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(stage.title, canvasWidth / 2, y + 15);
      
      // Draw border
      ctx.strokeStyle = '#444';
      ctx.strokeRect(x, y + 20, scaledWidth, scaledHeight);
    });
    
    return debugCanvas;
  }

  // Cleanup resources
  cleanup() {
    if (this.templateManager) {
      this.templateManager.cleanup();
    }
    this.initialized = false;
  }
}