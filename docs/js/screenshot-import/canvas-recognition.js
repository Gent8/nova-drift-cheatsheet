// Canvas-only recognition fallback
// Basic template matching without OpenCV dependency

export class CanvasRecognition {
  constructor() {
    this.templates = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load hex sprite sheet
      const img = await this.loadImage('hex.png');
      console.log('Canvas Recognition: Sprite sheet loaded');
      
      // Extract basic templates from CSS
      const positions = await this.extractCSSPositions();
      console.log(`Canvas Recognition: Found ${positions.size} upgrade positions`);
      
      // Create simple templates
      for (const [className, position] of positions) {
        const template = this.extractTemplate(img, position, className);
        if (template) {
          this.templates.set(className, template);
        }
      }
      
      console.log(`Canvas Recognition: Initialized with ${this.templates.size} templates`);
      this.initialized = true;
      
    } catch (error) {
      console.error('Canvas Recognition initialization failed:', error);
      throw error;
    }
  }

  // Load image helper
  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Extract CSS positions (same as template-extractor.js)
  async extractCSSPositions() {
    try {
      const response = await fetch('hex.css');
      const cssText = await response.text();
      
      const positions = new Map();
      const regex = /\.hex\.(\w+)\s*{[^}]*background-position:\s*(-?\d+)px\s+(-?\d+)px/g;
      
      let match;
      while ((match = regex.exec(cssText)) !== null) {
        const [, className, x, y] = match;
        positions.set(className, {
          x: Math.abs(parseInt(x)),
          y: Math.abs(parseInt(y)),
          className: className
        });
      }
      
      return positions;
    } catch (error) {
      console.error('Failed to extract CSS positions:', error);
      throw error;
    }
  }

  // Extract template from sprite sheet
  extractTemplate(spriteImg, position, className) {
    const canvas = document.createElement('canvas');
    const width = 42;
    const height = 48;
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    try {
      // Extract sprite region
      ctx.drawImage(
        spriteImg,
        position.x, position.y, width, height,
        0, 0, width, height
      );
      
      // Get image data for matching
      const imageData = ctx.getImageData(0, 0, width, height);
      
      return {
        canvas: canvas,
        imageData: imageData,
        className: className,
        position: position,
        // Calculate basic features
        averageColor: this.calculateAverageColor(imageData),
        edgeCount: this.calculateEdgeCount(imageData)
      };
    } catch (error) {
      console.warn(`Failed to extract template for ${className}:`, error);
      return null;
    }
  }

  // Calculate average color
  calculateAverageColor(imageData) {
    let r = 0, g = 0, b = 0, count = 0;
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Skip transparent pixels
      if (data[i + 3] > 100) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
    }
    
    return count > 0 ? {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    } : { r: 0, g: 0, b: 0 };
  }

  // Simple edge detection count
  calculateEdgeCount(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let edgeCount = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const currentGray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Check right neighbor
        const rightIdx = (y * width + x + 1) * 4;
        const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
        
        if (Math.abs(currentGray - rightGray) > 30) {
          edgeCount++;
        }
      }
    }
    
    return edgeCount;
  }

  // Basic template matching using Canvas
  async matchHexagon(hexCanvas) {
    if (!this.initialized) {
      await this.initialize();
    }

    const hexImageData = hexCanvas.getContext('2d').getImageData(0, 0, hexCanvas.width, hexCanvas.height);
    const hexColor = this.calculateAverageColor(hexImageData);
    const hexEdges = this.calculateEdgeCount(hexImageData);
    
    const matches = [];
    
    for (const [className, template] of this.templates) {
      // Simple similarity scoring
      const colorDiff = this.colorDistance(hexColor, template.averageColor);
      const edgeDiff = Math.abs(hexEdges - template.edgeCount) / Math.max(hexEdges, template.edgeCount, 1);
      
      // Basic template matching using correlation
      const correlationScore = this.calculateCorrelation(hexImageData, template.imageData);
      
      const score = (1 - colorDiff / 255) * 0.3 + (1 - edgeDiff) * 0.2 + correlationScore * 0.5;
      
      matches.push({
        className: className,
        upgradeId: className,
        score: score,
        confidence: Math.min(score, 1.0),
        method: 'canvas_basic'
      });
    }
    
    // Return top 5 matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // Color distance helper
  colorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // Basic correlation calculation
  calculateCorrelation(imageData1, imageData2) {
    if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
      return 0;
    }
    
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < data1.length; i += 4) {
      // Skip fully transparent pixels
      if (data1[i + 3] > 50 && data2[i + 3] > 50) {
        const gray1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
        const gray2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;
        
        // Simple normalized correlation
        correlation += Math.min(gray1, gray2) / Math.max(gray1, gray2, 1);
        count++;
      }
    }
    
    return count > 0 ? correlation / count : 0;
  }

  // Process a screenshot using basic recognition
  async processScreenshot(canvas) {
    console.log('Canvas Recognition: Processing screenshot...');
    
    // Simple auto-crop: assume upgrade area is right side
    const cropWidth = Math.min(canvas.width * 0.4, 400);
    const cropX = canvas.width - cropWidth;
    
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = canvas.height;
    
    const ctx = croppedCanvas.getContext('2d');
    ctx.drawImage(canvas, cropX, 0, cropWidth, canvas.height, 0, 0, cropWidth, canvas.height);
    
    // Extract hexagon regions (simplified grid detection)
    const hexagons = this.extractHexagonGrid(croppedCanvas);
    console.log(`Canvas Recognition: Found ${hexagons.length} hexagon regions`);
    
    const results = [];
    for (const hexagon of hexagons) {
      const matches = await this.matchHexagon(hexagon.canvas);
      if (matches.length > 0 && matches[0].confidence > 0.5) {
        results.push({
          ...matches[0],
          position: hexagon.position
        });
      }
    }
    
    return {
      success: true,
      method: 'canvas_recognition',
      highConfidenceMatches: results.filter(r => r.confidence > 0.6),
      allMatches: results,
      processingTime: 0
    };
  }

  // Extract hexagon grid (simplified)
  extractHexagonGrid(canvas) {
    const hexagons = [];
    const hexSize = 48;
    const cols = Math.floor(canvas.width / (hexSize + 4));
    const rows = Math.floor(canvas.height / (hexSize + 4));
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * (hexSize + 4);
        const y = row * (hexSize + 4);
        
        // Extract hexagon region
        const hexCanvas = document.createElement('canvas');
        hexCanvas.width = hexSize;
        hexCanvas.height = hexSize;
        
        const ctx = hexCanvas.getContext('2d');
        ctx.drawImage(canvas, x, y, hexSize, hexSize, 0, 0, hexSize, hexSize);
        
        // Check if region contains meaningful content
        const imageData = ctx.getImageData(0, 0, hexSize, hexSize);
        if (this.hasContent(imageData)) {
          hexagons.push({
            canvas: hexCanvas,
            position: { x, y, row, col }
          });
        }
      }
    }
    
    return hexagons;
  }

  // Check if image region has meaningful content
  hasContent(imageData) {
    const data = imageData.data;
    let nonTransparentPixels = 0;
    let colorVariance = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 100) { // Not transparent
        nonTransparentPixels++;
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        colorVariance += gray;
      }
    }
    
    return nonTransparentPixels > 100 && colorVariance > 1000;
  }

  // Get capabilities
  getCapabilities() {
    return {
      hasTemplateMatching: this.initialized,
      hasAdvancedRecognition: false,
      method: 'canvas_basic',
      templateCount: this.templates.size
    };
  }
}