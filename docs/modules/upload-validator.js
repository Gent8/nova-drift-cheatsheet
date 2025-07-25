/**
 * Upload Validator Module
 * Handles file validation with structured error handling for Nova Drift screenshot recognition
 */
class UploadValidator {
  constructor(options = {}) {
    this.constraints = {
      maxSize: options.maxSize || 10 * 1024 * 1024,     // 10MB maximum
      minSize: options.minSize || 1024,                  // 1KB minimum
      allowedTypes: options.allowedTypes || ['image/png', 'image/jpeg', 'image/jpg'],
      maxDimensions: options.maxDimensions || { width: 4096, height: 4096 },
      minDimensions: options.minDimensions || { width: 300, height: 200 }
    };
  }

  /**
   * Validate a file through the complete validation chain
   * @param {File} file - The file to validate
   * @returns {Promise<Object>} Validation result with structured error handling
   */
  async validateFile(file) {
    const validations = [
      () => this.validateFileType(file),
      () => this.validateFileSize(file),
      () => this.validateImageDimensions(file),
      () => this.validateImageContent(file)
    ];
    
    for (const validate of validations) {
      const result = await validate();
      if (!result.valid) {
        return result;
      }
    }
    
    return { valid: true, file };
  }

  /**
   * Validate file type against allowed MIME types
   * @param {File} file - The file to validate
   * @returns {Object} Validation result
   */
  validateFileType(file) {
    if (!this.constraints.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: {
          code: 'INVALID_TYPE',
          message: 'Please upload a PNG or JPG image file.',
          action: 'Choose a different file format',
          details: `Received: ${file.type}, Expected: ${this.constraints.allowedTypes.join(', ')}`
        }
      };
    }
    
    return { valid: true };
  }

  /**
   * Validate file size constraints
   * @param {File} file - The file to validate
   * @returns {Object} Validation result
   */
  validateFileSize(file) {
    if (file.size > this.constraints.maxSize) {
      return {
        valid: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size must be less than ${(this.constraints.maxSize / 1024 / 1024).toFixed(1)}MB.`,
          action: 'Resize your image or choose a smaller file',
          details: `File size: ${(file.size / 1024 / 1024).toFixed(1)}MB`
        }
      };
    }

    if (file.size < this.constraints.minSize) {
      return {
        valid: false,
        error: {
          code: 'FILE_TOO_SMALL',
          message: 'File too small. Please upload a valid image file.',
          action: 'Choose a larger file',
          details: `File size: ${file.size} bytes, Minimum: ${this.constraints.minSize} bytes`
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate image dimensions by loading the image
   * @param {File} file - The file to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        const { width, height } = img;
        
        if (width > this.constraints.maxDimensions.width || height > this.constraints.maxDimensions.height) {
          resolve({
            valid: false,
            error: {
              code: 'DIMENSIONS_TOO_LARGE',
              message: `Image too large. Maximum dimensions are ${this.constraints.maxDimensions.width}x${this.constraints.maxDimensions.height}px.`,
              action: 'Resize your image to smaller dimensions',
              details: `Image size: ${width}x${height}px`
            }
          });
          return;
        }

        if (width < this.constraints.minDimensions.width || height < this.constraints.minDimensions.height) {
          resolve({
            valid: false,
            error: {
              code: 'DIMENSIONS_TOO_SMALL',
              message: `Image too small. Minimum dimensions are ${this.constraints.minDimensions.width}x${this.constraints.minDimensions.height}px.`,
              action: 'Upload a larger screenshot',
              details: `Image size: ${width}x${height}px`
            }
          });
          return;
        }

        resolve({ valid: true, dimensions: { width, height } });
      };

      img.onerror = () => {
        resolve({
          valid: false,
          error: {
            code: 'INVALID_IMAGE',
            message: 'Failed to load image. Please check the file format.',
            action: 'Try a different image file',
            details: 'Image could not be loaded or decoded'
          }
        });
      };

      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        resolve({
          valid: false,
          error: {
            code: 'FILE_READ_ERROR',
            message: 'Failed to read file. Please try again.',
            action: 'Select the file again',
            details: 'FileReader error occurred'
          }
        });
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate that the file is actually a valid image
   * @param {File} file - The file to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateImageContent(file) {
    // This validation is performed as part of validateImageDimensions
    // since loading the image validates its content
    return { valid: true };
  }

  /**
   * Get validation constraints for external use
   * @returns {Object} Current validation constraints
   */
  getConstraints() {
    return { ...this.constraints };
  }
}

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UploadValidator;
} else {
  window.UploadValidator = UploadValidator;
}
