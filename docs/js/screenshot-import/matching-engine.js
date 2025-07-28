// Matching Engine for Screenshot Import Assistant
// Implements multi-algorithm template matching

import { cleanupOpenCVObjects } from '../lib/opencv-loader.js';

export class MatchingEngine {
  constructor(templateManager, cv) {
    this.templateManager = templateManager;
    this.cv = cv;
    
    // Algorithm weights based on research
    this.algorithms = {
      templateMatch: { weight: 0.5, threshold: 0.7 },
      hashMatch: { weight: 0.3, threshold: 0.8 },
      colorMatch: { weight: 0.2, threshold: 0.6 }
    };
  }

  // Match a single hexagon against all templates
  async matchHexagon(hexagonData, options = {}) {
    const results = new Map();
    
    try {
      // Run template matching
      const templateResults = await this.templateMatching(hexagonData);
      this.aggregateResults(results, templateResults, this.algorithms.templateMatch);
      
      // Run hash matching
      const hashResults = await this.hashMatching(hexagonData);
      this.aggregateResults(results, hashResults, this.algorithms.hashMatch);
      
      // Run color matching
      const colorResults = await this.colorMatching(hexagonData);
      this.aggregateResults(results, colorResults, this.algorithms.colorMatch);
      
      // Sort and return top matches
      const sortedResults = Array.from(results.entries())
        .map(([className, data]) => ({
          className: className,
          upgradeId: className, // For compatibility
          score: data.weightedScore,
          confidence: this.calculateConfidence(data),
          metadata: this.templateManager.getTemplateMetadata(className),
          details: data
        }))
        .sort((a, b) => b.score - a.score);
      
      return sortedResults.slice(0, options.topK || 5);
      
    } catch (error) {
      console.error('Matching failed:', error);
      return [];
    }
  }

  // Template matching using OpenCV
  async templateMatching(hexagonData) {
    const results = [];
    const hexMat = this.cv.imread(hexagonData.normalizedCanvas);
    const hexGray = new cv.Mat();
    
    try {
      this.cv.cvtColor(hexMat, hexGray, this.cv.COLOR_RGBA2GRAY);
      
      // Test different matching methods
      const methods = [
        { method: this.cv.TM_CCOEFF_NORMED, weight: 0.4, name: 'CCOEFF_NORMED' },
        { method: this.cv.TM_CCORR_NORMED, weight: 0.3, name: 'CCORR_NORMED' },
        { method: this.cv.TM_SQDIFF_NORMED, weight: 0.3, name: 'SQDIFF_NORMED' }
      ];
      
      for (const [className, template] of this.templateManager.templates) {
        if (!template.gray || template.gray.empty()) continue;
        
        let weightedScore = 0;
        const methodScores = {};
        
        for (const { method, weight, name } of methods) {
          const result = new cv.Mat();
          
          try {
            this.cv.matchTemplate(hexGray, template.gray, result, method);
            
            const minMax = this.cv.minMaxLoc(result);
            let score = method === this.cv.TM_SQDIFF_NORMED ? 
              1 - minMax.minVal : minMax.maxVal;
            
            // Clamp score to valid range
            score = Math.max(0, Math.min(1, score));
            
            methodScores[name] = score;
            weightedScore += score * weight;
            
          } catch (error) {
            console.warn(`Template matching failed for ${className} with ${name}:`, error);
            methodScores[name] = 0;
          } finally {
            cleanupOpenCVObjects(result);
          }
        }
        
        results.push({
          className,
          score: weightedScore,
          methodScores,
          confidence: this.calculateMethodAgreement(methodScores)
        });
      }
      
    } finally {
      cleanupOpenCVObjects(hexMat, hexGray);
    }
    
    return results;
  }

  // Hash-based matching
  async hashMatching(hexagonData) {
    const results = [];
    const hexHash = hexagonData.hash;
    
    if (!hexHash) return results;
    
    for (const [className, template] of this.templateManager.templates) {
      if (!template.hash) continue;
      
      const distance = this.hammingDistance(hexHash, template.hash);
      const maxDistance = hexHash.length;
      const score = 1 - (distance / maxDistance);
      
      results.push({
        className,
        score,
        distance
      });
    }
    
    return results;
  }

  // Color-based matching
  async colorMatching(hexagonData) {
    const results = [];
    const hexColors = this.extractDominantColors(hexagonData.normalizedCanvas);
    
    for (const [className, template] of this.templateManager.templates) {
      const templateColors = this.extractDominantColors(template.canvas);
      const score = this.compareColorProfiles(hexColors, templateColors);
      
      results.push({
        className,
        score,
        colorSimilarity: score
      });
    }
    
    return results;
  }

  // Extract dominant colors from canvas
  extractDominantColors(canvas, numColors = 5) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const colorCounts = {};
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = Math.floor(data[i] / 32) * 32;
      const g = Math.floor(data[i + 1] / 32) * 32;
      const b = Math.floor(data[i + 2] / 32) * 32;
      const a = data[i + 3];
      
      // Skip transparent pixels
      if (a < 128) continue;
      
      const colorKey = `${r},${g},${b}`;
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
    }
    
    // Get top colors
    const sortedColors = Object.entries(colorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, numColors)
      .map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b, count };
      });
    
    return sortedColors;
  }

  // Compare color profiles
  compareColorProfiles(colors1, colors2) {
    if (colors1.length === 0 || colors2.length === 0) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (const color1 of colors1) {
      for (const color2 of colors2) {
        const similarity = this.colorSimilarity(color1, color2);
        const weight = Math.min(color1.count, color2.count);
        totalSimilarity += similarity * weight;
        comparisons += weight;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  // Calculate similarity between two colors
  colorSimilarity(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    const maxDistance = Math.sqrt(255 * 255 * 3);
    
    return 1 - (distance / maxDistance);
  }

  // Calculate Hamming distance between two hashes
  hammingDistance(hash1, hash2) {
    if (hash1.length !== hash2.length) return hash1.length;
    
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
  }

  // Calculate method agreement for confidence
  calculateMethodAgreement(methodScores) {
    const scores = Object.values(methodScores);
    if (scores.length < 2) return scores[0] || 0;
    
    const mean = scores.reduce((a, b) => a + b) / scores.length;
    const variance = scores.reduce((acc, score) => 
      acc + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // High agreement when standard deviation is low
    const agreement = mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0;
    return mean * agreement;
  }

  // Aggregate results from different algorithms
  aggregateResults(results, algorithmResults, config) {
    algorithmResults.forEach(({ className, score, ...details }) => {
      if (score < config.threshold) return;
      
      if (!results.has(className)) {
        results.set(className, {
          scores: {},
          details: {},
          weightedScore: 0,
          totalWeight: 0
        });
      }
      
      const data = results.get(className);
      data.scores[config.name || 'unknown'] = score;
      data.details[config.name || 'unknown'] = details;
      data.weightedScore += score * config.weight;
      data.totalWeight += config.weight;
    });
  }

  // Calculate overall confidence
  calculateConfidence(data) {
    const scoreCount = Object.keys(data.scores).length;
    if (scoreCount === 0) return 0;
    
    const avgScore = data.weightedScore / data.totalWeight;
    
    // Boost confidence when multiple algorithms agree
    let confidence = avgScore;
    
    if (scoreCount >= 2) {
      const scores = Object.values(data.scores);
      const variance = this.calculateVariance(scores);
      
      // Low variance indicates agreement
      if (variance < 0.1) {
        confidence = Math.min(1, confidence * 1.2);
      } else if (variance > 0.3) {
        confidence *= 0.8;
      }
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  // Calculate variance of scores
  calculateVariance(scores) {
    if (scores.length < 2) return 0;
    
    const mean = scores.reduce((a, b) => a + b) / scores.length;
    const variance = scores.reduce((acc, score) => 
      acc + Math.pow(score - mean, 2), 0) / scores.length;
    
    return variance;
  }

  // Batch matching for multiple hexagons
  async matchBatch(hexagons, progressCallback) {
    const results = [];
    
    for (let i = 0; i < hexagons.length; i++) {
      try {
        const matches = await this.matchHexagon(hexagons[i]);
        results.push({
          hexagon: hexagons[i],
          matches,
          success: true,
          index: i
        });
      } catch (error) {
        results.push({
          hexagon: hexagons[i],
          error: error.message,
          success: false,
          index: i
        });
      }
      
      progressCallback?.((i + 1) / hexagons.length);
    }
    
    return results;
  }

  // Get engine statistics
  getStats() {
    return {
      algorithms: Object.keys(this.algorithms),
      templateCount: this.templateManager.templates.size,
      weights: this.algorithms
    };
  }

  // Update algorithm weights
  updateWeights(newWeights) {
    Object.assign(this.algorithms, newWeights);
  }

  // Validate matching result
  validateMatch(match) {
    if (!match || typeof match.score !== 'number') {
      return { valid: false, reason: 'Invalid match object' };
    }
    
    if (match.score < 0 || match.score > 1) {
      return { valid: false, reason: 'Score out of range' };
    }
    
    if (!match.className || !this.templateManager.getTemplate(match.className)) {
      return { valid: false, reason: 'Invalid template class' };
    }
    
    return { valid: true };
  }
}