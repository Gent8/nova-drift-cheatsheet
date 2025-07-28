// Template extraction from hex.png sprite sheet
// Based on analysis of existing hex.css positioning

export class TemplateExtractor {
  constructor() {
    this.spriteWidth = 42;
    this.spriteHeight = 48;
    this.spriteSpacingX = 44; // Based on CSS positions (-1, -45, -89, etc.)
    this.spriteSpacingY = 50; // Based on vertical positioning pattern
    this.templates = new Map();
    this.spriteSheet = null;
  }

  async loadSpriteSheet() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.spriteSheet = img;
        console.log(`Loaded sprite sheet: ${img.width}x${img.height}`);
        resolve(img);
      };
      img.onerror = reject;
      img.src = 'hex.png';
    });
  }

  // Extract sprite positions from existing CSS
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
      
      console.log(`Extracted ${positions.size} sprite positions from CSS`);
      return positions;
    } catch (error) {
      console.error('Failed to extract CSS positions:', error);
      throw error;
    }
  }

  // Extract individual template from sprite sheet
  extractTemplate(position, className) {
    if (!this.spriteSheet) {
      throw new Error('Sprite sheet not loaded');
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.spriteWidth;
    canvas.height = this.spriteHeight;
    const ctx = canvas.getContext('2d');

    // Extract the sprite region
    ctx.drawImage(
      this.spriteSheet,
      position.x, position.y,
      this.spriteWidth, this.spriteHeight,
      0, 0,
      this.spriteWidth, this.spriteHeight
    );

    return {
      canvas: canvas,
      className: className,
      position: position,
      imageData: ctx.getImageData(0, 0, this.spriteWidth, this.spriteHeight)
    };
  }

  // Extract all templates
  async extractAllTemplates() {
    if (!this.spriteSheet) {
      await this.loadSpriteSheet();
    }

    const positions = await this.extractCSSPositions();
    const templates = new Map();

    for (const [className, position] of positions) {
      try {
        const template = this.extractTemplate(position, className);
        templates.set(className, template);
      } catch (error) {
        console.warn(`Failed to extract template for ${className}:`, error);
      }
    }

    this.templates = templates;
    console.log(`Successfully extracted ${templates.size} templates`);
    return templates;
  }

  // Get template by class name
  getTemplate(className) {
    return this.templates.get(className);
  }

  // Get all template class names
  getTemplateNames() {
    return Array.from(this.templates.keys());
  }

  // Convert template to different formats for recognition
  prepareTemplateForMatching(template, cv) {
    if (!cv || !template) return null;

    const mat = cv.imread(template.canvas);
    
    // Convert to grayscale for template matching
    const gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);
    
    // Calculate perceptual hash
    const hash = this.calculatePerceptualHash(template.canvas);
    
    // Extract features (basic implementation)
    const keypoints = new cv.KeyPointVector();
    const descriptors = new cv.Mat();
    
    try {
      const orb = new cv.ORB();
      orb.detectAndCompute(gray, new cv.Mat(), keypoints, descriptors);
    } catch (error) {
      console.warn(`Failed to extract features for ${template.className}:`, error);
    }

    return {
      original: mat,
      gray: gray,
      keypoints: keypoints,
      descriptors: descriptors,
      hash: hash,
      className: template.className,
      canvas: template.canvas
    };
  }

  // Simple perceptual hash calculation
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

  // Create a preview of all extracted templates
  createPreviewCanvas() {
    if (this.templates.size === 0) {
      console.warn('No templates to preview');
      return null;
    }

    const cols = 20;
    const rows = Math.ceil(this.templates.size / cols);
    
    const canvas = document.createElement('canvas');
    canvas.width = cols * (this.spriteWidth + 2);
    canvas.height = rows * (this.spriteHeight + 2);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let index = 0;
    for (const [className, template] of this.templates) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * (this.spriteWidth + 2) + 1;
      const y = row * (this.spriteHeight + 2) + 1;
      
      ctx.drawImage(template.canvas, x, y);
      
      // Add label
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.fillText(className.substring(0, 8), x, y + this.spriteHeight + 12);
      
      index++;
    }
    
    return canvas;
  }

  // Cleanup OpenCV objects
  cleanup() {
    for (const template of this.templates.values()) {
      if (template.prepared) {
        if (template.prepared.original) template.prepared.original.delete();
        if (template.prepared.gray) template.prepared.gray.delete();
        if (template.prepared.keypoints) template.prepared.keypoints.delete();
        if (template.prepared.descriptors) template.prepared.descriptors.delete();
      }
    }
  }
}