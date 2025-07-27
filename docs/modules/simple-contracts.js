/**
 * Simple Data Contracts - Validation System
 * Lightweight validation for data passed between workflow components
 */

class SimpleContracts {
  constructor() {
    this.version = '1.0.0';
    this.contracts = this.defineContracts();
    this.validationErrors = [];
  }

  /**
   * Define all data contracts used in the workflow
   */
  defineContracts() {
    return {
      'file-input': {
        description: 'Uploaded file data from user',
        required: ['imageElement', 'dimensions'],
        optional: ['file', 'metadata'],
        validation: {
          imageElement: (value) => value instanceof HTMLImageElement && value.complete,
          dimensions: (value) => value && typeof value.width === 'number' && typeof value.height === 'number' && value.width > 0 && value.height > 0,
          file: (value) => !value || value instanceof File,
          metadata: (value) => !value || typeof value === 'object'
        }
      },

      'crop-data': {
        description: 'Cropped image data ready for processing',
        required: ['imageData', 'cropBounds', 'originalDimensions'],
        optional: ['confidence', 'method'],
        validation: {
          imageData: (value) => value instanceof ImageData,
          cropBounds: (value) => this.validateBounds(value),
          originalDimensions: (value) => this.validateDimensions(value),
          confidence: (value) => !value || (typeof value === 'number' && value >= 0 && value <= 1),
          method: (value) => !value || typeof value === 'string'
        }
      },

      'roi-result': {
        description: 'ROI detection result',
        required: ['bounds', 'confidence', 'method'],
        optional: ['metadata'],
        validation: {
          bounds: (value) => this.validateBounds(value),
          confidence: (value) => typeof value === 'number' && value >= 0 && value <= 1,
          method: (value) => typeof value === 'string' && ['edge', 'color', 'template', 'manual'].includes(value),
          metadata: (value) => !value || typeof value === 'object'
        }
      },

      'recognition-result': {
        description: 'Recognition engine output',
        required: ['detectedMods', 'stats'],
        optional: ['metadata'],
        validation: {
          detectedMods: (value) => Array.isArray(value) && value.every(mod => this.validateDetectedMod(mod)),
          stats: (value) => this.validateRecognitionStats(value),
          metadata: (value) => !value || typeof value === 'object'
        }
      },

      'detected-mod': {
        description: 'Individual detected mod',
        required: ['modName', 'confidence', 'position'],
        optional: ['needsReview', 'candidates', 'gridPosition'],
        validation: {
          modName: (value) => typeof value === 'string' && value.length > 0,
          confidence: (value) => typeof value === 'number' && value >= 0 && value <= 1,
          position: (value) => this.validatePosition(value),
          needsReview: (value) => !value || typeof value === 'boolean',
          candidates: (value) => !value || Array.isArray(value),
          gridPosition: (value) => !value || this.validatePosition(value)
        }
      }
    };
  }

  /**
   * Validate data against a specific contract
   */
  validate(contractName, data, options = {}) {
    this.validationErrors = [];
    
    const contract = this.contracts[contractName];
    if (!contract) {
      return this.createError(`Unknown contract: ${contractName}`);
    }

    if (!data || typeof data !== 'object') {
      return this.createError('Data must be an object');
    }

    try {
      // Check required fields
      for (const field of contract.required) {
        if (!(field in data)) {
          this.validationErrors.push(`Missing required field: ${field}`);
          continue;
        }

        if (!this.validateField(field, data[field], contract, contractName)) {
          // Error already added by validateField
        }
      }

      // Check optional fields if present
      for (const field of contract.optional) {
        if (field in data) {
          if (!this.validateField(field, data[field], contract, contractName)) {
            // Error already added by validateField
          }
        }
      }

      // Check for unexpected fields (warn only, don't fail)
      if (!options.allowExtraFields) {
        const allowedFields = [...contract.required, ...contract.optional];
        const extraFields = Object.keys(data).filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
          console.warn(`SimpleContracts: Unexpected fields in ${contractName}:`, extraFields);
        }
      }

      // Return result
      if (this.validationErrors.length > 0) {
        return this.createError(`Validation failed for ${contractName}`, this.validationErrors);
      }

      return this.createSuccess(data, contract.description);

    } catch (error) {
      return this.createError(`Validation error: ${error.message}`);
    }
  }

  /**
   * Validate individual field
   */
  validateField(fieldName, value, contract, contractName) {
    const validator = contract.validation[fieldName];
    if (!validator) {
      // No validator defined, assume valid
      return true;
    }

    try {
      if (typeof validator === 'function') {
        const isValid = validator(value);
        if (!isValid) {
          this.validationErrors.push(`Invalid value for field '${fieldName}' in ${contractName}`);
          return false;
        }
      } else {
        console.warn(`SimpleContracts: Invalid validator for ${fieldName}`);
      }
      
      return true;
    } catch (error) {
      this.validationErrors.push(`Validation error for field '${fieldName}': ${error.message}`);
      return false;
    }
  }

  /**
   * Validate bounds object (x, y, width, height)
   */
  validateBounds(bounds) {
    if (!bounds || typeof bounds !== 'object') return false;
    
    const requiredProps = ['x', 'y', 'width', 'height'];
    return requiredProps.every(prop => 
      typeof bounds[prop] === 'number' && 
      bounds[prop] >= 0 && 
      isFinite(bounds[prop])
    ) && bounds.width > 0 && bounds.height > 0;
  }

  /**
   * Validate dimensions object (width, height)
   */
  validateDimensions(dimensions) {
    if (!dimensions || typeof dimensions !== 'object') return false;
    
    return typeof dimensions.width === 'number' && 
           typeof dimensions.height === 'number' && 
           dimensions.width > 0 && 
           dimensions.height > 0 &&
           isFinite(dimensions.width) && 
           isFinite(dimensions.height);
  }

  /**
   * Validate position object (x, y)
   */
  validatePosition(position) {
    if (!position || typeof position !== 'object') return false;
    
    return typeof position.x === 'number' && 
           typeof position.y === 'number' && 
           isFinite(position.x) && 
           isFinite(position.y);
  }

  /**
   * Validate detected mod object
   */
  validateDetectedMod(mod) {
    if (!mod || typeof mod !== 'object') return false;
    
    const modValidation = this.validate('detected-mod', mod, { allowExtraFields: true });
    return modValidation.valid;
  }

  /**
   * Validate recognition stats object
   */
  validateRecognitionStats(stats) {
    if (!stats || typeof stats !== 'object') return false;
    
    const requiredStats = ['totalAnalyzed', 'averageConfidence'];
    return requiredStats.every(stat => 
      typeof stats[stat] === 'number' && 
      stats[stat] >= 0 && 
      isFinite(stats[stat])
    );
  }

  /**
   * Create validation success result
   */
  createSuccess(data, description) {
    return {
      valid: true,
      data: data,
      description: description || 'Validation passed',
      version: this.version,
      timestamp: Date.now()
    };
  }

  /**
   * Create validation error result
   */
  createError(message, errors = []) {
    return {
      valid: false,
      error: message,
      errors: Array.isArray(errors) ? errors : [errors],
      version: this.version,
      timestamp: Date.now()
    };
  }

  /**
   * Quick validation helper - just returns true/false
   */
  isValid(contractName, data) {
    const result = this.validate(contractName, data);
    return result.valid;
  }

  /**
   * Validate and throw on error
   */
  validateOrThrow(contractName, data) {
    const result = this.validate(contractName, data);
    if (!result.valid) {
      throw new Error(`Contract validation failed: ${result.error}`);
    }
    return result.data;
  }

  /**
   * Get contract information
   */
  getContract(contractName) {
    const contract = this.contracts[contractName];
    if (!contract) {
      return null;
    }

    return {
      name: contractName,
      description: contract.description,
      required: [...contract.required],
      optional: [...contract.optional],
      version: this.version
    };
  }

  /**
   * List all available contracts
   */
  listContracts() {
    return Object.keys(this.contracts).map(name => ({
      name,
      description: this.contracts[name].description,
      requiredFields: this.contracts[name].required.length,
      optionalFields: this.contracts[name].optional.length
    }));
  }

  /**
   * Create a sanitized copy of data matching contract
   */
  sanitize(contractName, data) {
    const contract = this.contracts[contractName];
    if (!contract) {
      throw new Error(`Unknown contract: ${contractName}`);
    }

    const sanitized = {};
    const allowedFields = [...contract.required, ...contract.optional];
    
    allowedFields.forEach(field => {
      if (field in data) {
        sanitized[field] = data[field];
      }
    });

    return sanitized;
  }

  /**
   * Deep clone validation result for safety
   */
  cloneResult(result) {
    return JSON.parse(JSON.stringify(result));
  }

  /**
   * Batch validate multiple data items
   */
  validateBatch(contractName, dataArray) {
    if (!Array.isArray(dataArray)) {
      return this.createError('Data must be an array for batch validation');
    }

    const results = [];
    let allValid = true;

    for (let i = 0; i < dataArray.length; i++) {
      const result = this.validate(contractName, dataArray[i]);
      results.push({
        index: i,
        ...result
      });
      
      if (!result.valid) {
        allValid = false;
      }
    }

    return {
      valid: allValid,
      results: results,
      totalCount: dataArray.length,
      validCount: results.filter(r => r.valid).length,
      invalidCount: results.filter(r => !r.valid).length
    };
  }
}

// Create global instance
window.SimpleContracts = SimpleContracts;
window.simpleContracts = new SimpleContracts();

// Convenience methods for global access
window.validateContract = (contractName, data, options) => {
  return window.simpleContracts.validate(contractName, data, options);
};

window.isValidContract = (contractName, data) => {
  return window.simpleContracts.isValid(contractName, data);
};

console.log('SimpleContracts: Module loaded with contracts:', window.simpleContracts.listContracts());