// Image Loader for Screenshot Import Assistant
// Handles file validation, loading, and basic preprocessing

export class ImageLoader {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.supportedFormats = options.supportedFormats || ['image/png', 'image/jpeg', 'image/jpg'];
    this.minDimensions = options.minDimensions || { width: 800, height: 600 };
    this.maxDimensions = options.maxDimensions || { width: 4096, height: 4096 };
  }

  // Load image from file with comprehensive validation
  async loadFromFile(file) {
    try {
      // Step 1: Validate file type and size
      this.validateFile(file);
      
      // Step 2: Read file to data URL
      const dataUrl = await this.readFileToDataURL(file);
      
      // Step 3: Load into image element
      const imageElement = await this.createImageFromDataURL(dataUrl);
      
      // Step 4: Validate dimensions
      this.validateImageDimensions(imageElement);
      
      // Step 5: Convert to canvas for processing
      const canvas = this.imageToCanvas(imageElement);
      
      // Step 6: Return result with metadata
      return {
        canvas: canvas,
        originalFile: file,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          dimensions: {
            width: imageElement.width,
            height: imageElement.height
          },
          loadedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Failed to load image:', error);
      throw new Error(`Image loading failed: ${error.message}`);
    }
  }

  // Load image from URL (for testing or remote images)
  async loadFromURL(url) {
    try {
      const imageElement = await this.createImageFromURL(url);
      this.validateImageDimensions(imageElement);
      
      const canvas = this.imageToCanvas(imageElement);
      
      return {
        canvas: canvas,
        originalURL: url,
        metadata: {
          source: 'url',
          url: url,
          dimensions: {
            width: imageElement.width,
            height: imageElement.height
          },
          loadedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Failed to load image from URL:', error);
      throw new Error(`URL image loading failed: ${error.message}`);
    }
  }

  // Validate file before processing
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file type
    if (!this.supportedFormats.includes(file.type)) {
      throw new Error(
        `Unsupported file format: ${file.type}. ` +
        `Supported formats: ${this.supportedFormats.join(', ')}`
      );
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const maxSizeMB = (this.maxFileSize / 1024 / 1024).toFixed(2);
      throw new Error(`File too large: ${sizeMB}MB. Maximum allowed: ${maxSizeMB}MB`);
    }

    // Check if file is empty
    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }

  // Read file to data URL
  readFileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.onabort = () => {
        reject(new Error('File reading was aborted'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  // Create image element from data URL
  createImageFromDataURL(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image data'));
      };
      
      img.src = dataUrl;
    });
  }

  // Create image element from URL
  createImageFromURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image from URL: ${url}`));
      };
      
      // Handle CORS if needed
      img.crossOrigin = 'anonymous';
      img.src = url;
    });
  }

  // Validate image dimensions
  validateImageDimensions(imageElement) {
    const { width, height } = imageElement;
    
    // Check minimum dimensions
    if (width < this.minDimensions.width || height < this.minDimensions.height) {
      throw new Error(
        `Image too small: ${width}x${height}. ` +
        `Minimum required: ${this.minDimensions.width}x${this.minDimensions.height}`
      );
    }
    
    // Check maximum dimensions
    if (width > this.maxDimensions.width || height > this.maxDimensions.height) {
      throw new Error(
        `Image too large: ${width}x${height}. ` +
        `Maximum allowed: ${this.maxDimensions.width}x${this.maxDimensions.height}`
      );
    }
    
    // Check aspect ratio (basic sanity check)
    const aspectRatio = width / height;
    if (aspectRatio < 0.5 || aspectRatio > 3.0) {
      console.warn(`Unusual aspect ratio: ${aspectRatio.toFixed(2)}. This may affect recognition.`);
    }
  }

  // Convert image element to canvas
  imageToCanvas(imageElement) {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(imageElement, 0, 0);
    
    return canvas;
  }

  // Get image quality metrics
  analyzeImageQuality(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalBrightness = 0;
    let totalContrast = 0;
    let pixelCount = 0;
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness (luminance)
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      pixelCount++;
    }
    
    const avgBrightness = totalBrightness / pixelCount;
    
    // Calculate contrast (simplified)
    let varianceSum = 0;
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      varianceSum += Math.pow(brightness - avgBrightness, 2);
    }
    
    const variance = varianceSum / pixelCount;
    const contrast = Math.sqrt(variance);
    
    return {
      brightness: avgBrightness,
      contrast: contrast,
      quality: this.calculateQualityScore(avgBrightness, contrast),
      dimensions: { width: canvas.width, height: canvas.height },
      pixelCount: canvas.width * canvas.height
    };
  }

  // Calculate overall quality score
  calculateQualityScore(brightness, contrast) {
    let score = 1.0;
    
    // Brightness scoring (ideal range: 80-180)
    if (brightness < 50 || brightness > 200) {
      score *= 0.7; // Very dark or very bright
    } else if (brightness < 80 || brightness > 180) {
      score *= 0.9; // Somewhat dark or bright
    }
    
    // Contrast scoring (higher is generally better for recognition)
    if (contrast < 20) {
      score *= 0.6; // Very low contrast
    } else if (contrast < 40) {
      score *= 0.8; // Low contrast
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  // Resize image if too large (performance optimization)
  resizeIfNeeded(canvas, maxWidth = 2048, maxHeight = 2048) {
    if (canvas.width <= maxWidth && canvas.height <= maxHeight) {
      return canvas; // No resize needed
    }
    
    // Calculate new dimensions maintaining aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    let newWidth, newHeight;
    
    if (aspectRatio > 1) {
      // Landscape
      newWidth = Math.min(maxWidth, canvas.width);
      newHeight = newWidth / aspectRatio;
    } else {
      // Portrait
      newHeight = Math.min(maxHeight, canvas.height);
      newWidth = newHeight * aspectRatio;
    }
    
    // Create resized canvas
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = Math.floor(newWidth);
    resizedCanvas.height = Math.floor(newHeight);
    
    const ctx = resizedCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
    
    console.log(`Resized image from ${canvas.width}x${canvas.height} to ${newWidth}x${newHeight}`);
    
    return resizedCanvas;
  }

  // Create thumbnail for preview
  createThumbnail(canvas, maxSize = 200) {
    const aspectRatio = canvas.width / canvas.height;
    let thumbWidth, thumbHeight;
    
    if (aspectRatio > 1) {
      thumbWidth = maxSize;
      thumbHeight = maxSize / aspectRatio;
    } else {
      thumbHeight = maxSize;
      thumbWidth = maxSize * aspectRatio;
    }
    
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    
    const ctx = thumbCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
    
    return thumbCanvas;
  }

  // Load multiple images (for batch processing)
  async loadMultipleFiles(files, progressCallback) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.loadFromFile(files[i]);
        results.push(result);
        
        if (progressCallback) {
          progressCallback({
            processed: i + 1,
            total: files.length,
            current: result.metadata.fileName,
            success: true
          });
        }
      } catch (error) {
        errors.push({
          file: files[i],
          error: error.message
        });
        
        if (progressCallback) {
          progressCallback({
            processed: i + 1,
            total: files.length,
            current: files[i].name,
            success: false,
            error: error.message
          });
        }
      }
    }
    
    return { results, errors };
  }
}