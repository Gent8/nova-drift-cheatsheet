// Template Manager for Screenshot Import Assistant
// Based on technical plan and template extraction analysis

import { TemplateExtractor } from './template-extractor.js';

export class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.templateMetadata = new Map();
    this.extractor = new TemplateExtractor();
    this.initialized = false;
  }

  async initialize(cv) {
    if (this.initialized) return;

    console.log('Initializing TemplateManager...');
    
    try {
      // Extract templates from sprite sheet
      const rawTemplates = await this.extractor.extractAllTemplates();
      
      // Prepare templates for matching
      for (const [className, template] of rawTemplates) {
        const prepared = this.extractor.prepareTemplateForMatching(template, cv);
        if (prepared) {
          this.templates.set(className, prepared);
          
          // Create metadata (could be enhanced with upgrade data)
          this.templateMetadata.set(className, {
            name: this.formatClassName(className),
            className: className,
            type: this.inferUpgradeType(className),
            category: this.inferUpgradeCategory(className)
          });
        }
      }
      
      console.log(`Initialized ${this.templates.size} templates for matching`);
      this.initialized = true;
      
    } catch (error) {
      console.error('Failed to initialize TemplateManager:', error);
      throw error;
    }
  }

  // Format class name for display
  formatClassName(className) {
    // Convert CamelCase to readable format
    return className.replace(/([A-Z])/g, ' $1').trim();
  }

  // Infer upgrade type from class name
  inferUpgradeType(className) {
    const weaponKeywords = ['Weapon', 'Shot', 'Projectile', 'Damage', 'Range', 'Fire'];
    const bodyKeywords = ['Body', 'Hull', 'Armor', 'Shield', 'Speed', 'Agility'];
    const modKeywords = ['Mod', 'Enhancement', 'Augment', 'System'];
    
    const name = className.toLowerCase();
    
    if (weaponKeywords.some(keyword => name.includes(keyword.toLowerCase()))) {
      return 'weapon';
    } else if (bodyKeywords.some(keyword => name.includes(keyword.toLowerCase()))) {
      return 'body';
    } else {
      return 'mod';
    }
  }

  // Infer upgrade category
  inferUpgradeCategory(className) {
    // This could be enhanced with actual upgrade data
    const coreUpgrades = [
      'DefaultWeapon', 'Split', 'Railgun', 'Grenade', 'Torrent', 'Pulse', 'Flak',
      'ThermalLance', 'Salvo', 'Vortex', 'BladeDrone', 'Dart',
      'DefaultBody', 'Assault', 'Stealth', 'Sentinel', 'Engineer', 'Firefly',
      'Carrier', 'Hullbreaker', 'Battery', 'Architect', 'Research', 'Viper',
      'Courser', 'Leviathan',
      'DefaultShield', 'Reflect', 'Barrier', 'Emergency', 'Amp', 'Nova'
    ];
    
    return coreUpgrades.includes(className) ? 'core' : 'mod';
  }

  // Get template by class name
  getTemplate(className) {
    return this.templates.get(className);
  }

  // Get template metadata
  getTemplateMetadata(className) {
    return this.templateMetadata.get(className);
  }

  // Get all template names
  getTemplateNames() {
    return Array.from(this.templates.keys());
  }

  // Get templates by category
  getTemplatesByCategory(category) {
    const result = new Map();
    for (const [className, template] of this.templates) {
      const metadata = this.templateMetadata.get(className);
      if (metadata && metadata.category === category) {
        result.set(className, template);
      }
    }
    return result;
  }

  // Get templates by type
  getTemplatesByType(type) {
    const result = new Map();
    for (const [className, template] of this.templates) {
      const metadata = this.templateMetadata.get(className);
      if (metadata && metadata.type === type) {
        result.set(className, template);
      }
    }
    return result;
  }

  // Search templates by name
  searchTemplates(query) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [className, template] of this.templates) {
      const metadata = this.templateMetadata.get(className);
      if (metadata) {
        const nameMatch = metadata.name.toLowerCase().includes(queryLower);
        const classMatch = className.toLowerCase().includes(queryLower);
        
        if (nameMatch || classMatch) {
          results.push({
            className,
            template,
            metadata,
            relevance: nameMatch ? 2 : 1
          });
        }
      }
    }
    
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  // Get template statistics
  getStats() {
    const stats = {
      total: this.templates.size,
      byType: {},
      byCategory: {}
    };
    
    for (const metadata of this.templateMetadata.values()) {
      // Count by type
      stats.byType[metadata.type] = (stats.byType[metadata.type] || 0) + 1;
      
      // Count by category
      stats.byCategory[metadata.category] = (stats.byCategory[metadata.category] || 0) + 1;
    }
    
    return stats;
  }

  // Create a debug preview of all templates
  createDebugPreview() {
    return this.extractor.createPreviewCanvas();
  }

  // Validate template quality
  validateTemplate(className) {
    const template = this.templates.get(className);
    if (!template) return { valid: false, reason: 'Template not found' };
    
    // Check if canvas is valid
    if (!template.canvas || template.canvas.width === 0 || template.canvas.height === 0) {
      return { valid: false, reason: 'Invalid canvas dimensions' };
    }
    
    // Check if image has content (not completely transparent)
    const ctx = template.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, template.canvas.width, template.canvas.height);
    const hasContent = Array.from(imageData.data).some((value, index) => 
      index % 4 === 3 && value > 0 // Check alpha channel
    );
    
    if (!hasContent) {
      return { valid: false, reason: 'Template appears to be empty' };
    }
    
    // Check if OpenCV objects are valid
    if (!template.gray || template.gray.empty()) {
      return { valid: false, reason: 'OpenCV grayscale conversion failed' };
    }
    
    return { valid: true };
  }

  // Get quality metrics for a template
  getTemplateQuality(className) {
    const template = this.templates.get(className);
    if (!template) return null;
    
    const validation = this.validateTemplate(className);
    if (!validation.valid) return { quality: 0, issues: [validation.reason] };
    
    const issues = [];
    let qualityScore = 1.0;
    
    // Check feature count
    if (template.keypoints && template.keypoints.size() < 5) {
      issues.push('Low feature count (may affect feature matching)');
      qualityScore *= 0.8;
    }
    
    // Check hash quality (should not be all 0s or all 1s)
    if (template.hash) {
      const onesCount = (template.hash.match(/1/g) || []).length;
      const ratio = onesCount / template.hash.length;
      if (ratio < 0.1 || ratio > 0.9) {
        issues.push('Poor hash distribution (may affect hash matching)');
        qualityScore *= 0.9;
      }
    }
    
    return {
      quality: qualityScore,
      issues,
      featureCount: template.keypoints ? template.keypoints.size() : 0,
      hashDistribution: template.hash ? (template.hash.match(/1/g) || []).length / template.hash.length : 0
    };
  }

  // Export template data for debugging
  exportTemplateData(className) {
    const template = this.templates.get(className);
    const metadata = this.templateMetadata.get(className);
    const quality = this.getTemplateQuality(className);
    
    if (!template) return null;
    
    return {
      className,
      metadata,
      quality,
      hash: template.hash,
      dimensions: {
        width: template.canvas.width,
        height: template.canvas.height
      },
      canvasDataURL: template.canvas.toDataURL()
    };
  }

  // Cleanup resources
  cleanup() {
    console.log('Cleaning up TemplateManager resources...');
    
    // Cleanup OpenCV objects
    for (const template of this.templates.values()) {
      if (template.original) template.original.delete();
      if (template.gray) template.gray.delete();
      if (template.keypoints) template.keypoints.delete();
      if (template.descriptors) template.descriptors.delete();
    }
    
    // Cleanup extractor
    this.extractor.cleanup();
    
    this.templates.clear();
    this.templateMetadata.clear();
    this.initialized = false;
  }
}