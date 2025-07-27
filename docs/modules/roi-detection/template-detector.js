/**
 * Template-based ROI Detection
 * Detects build area by matching UI templates and patterns
 */

class TemplateROIDetector {
  constructor(config = {}) {
    this.config = {
      templateSizes: [
        { width: 64, height: 32 }, // Small UI elements
        { width: 96, height: 48 }, // Medium UI elements
        { width: 128, height: 64 } // Large UI elements
      ],
      
      matchThreshold: 0.6,
      maxTemplateMatches: 10,
      clusterDistance: 50,
      
      // UI patterns to look for
      cornerPatterns: true,
      hexPatterns: true,
      framePatterns: true,
      
      debugMode: false,
      ...config
    };

    this.templates = new Map();
    this.generatedTemplates = false;
  }

  /**
   * Detect ROI using template matching
   */
  async detect(imageElement) {
    const startTime = performance.now();
    
    try {
      // Create working canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      
      // Register canvas for memory management
      const canvasId = window.registerCanvas(canvas, 'template-roi-detection');
      
      // Draw image to canvas
      ctx.drawImage(imageElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Generate templates if not already done
      if (!this.generatedTemplates) {
        this.generateUITemplates();
        this.generatedTemplates = true;
      }
      
      // Find template matches
      const allMatches = await this.findAllTemplateMatches(imageData);
      
      // Cluster matches to find UI regions
      const clusters = this.clusterMatches(allMatches);
      
      // Analyze clusters to find build area
      const candidates = this.analyzeClusters(clusters, imageData);
      
      // Score candidates
      const scoredCandidates = this.scoreTemplateCandidates(candidates, imageData);
      
      // Select best candidate
      const bestCandidate = this.selectBestCandidate(scoredCandidates);
      
      const processingTime = performance.now() - startTime;
      
      if (bestCandidate) {
        console.log(`TemplateROIDetector: Found ROI with confidence ${bestCandidate.confidence} in ${processingTime.toFixed(2)}ms`);
        
        return {
          bounds: bestCandidate.bounds,
          confidence: bestCandidate.confidence,
          metadata: {
            processingTime,
            totalMatches: allMatches.length,
            clusters: clusters.length,
            candidates: candidates.length,
            bestCluster: bestCandidate.cluster,
            algorithm: 'template-matching'
          }
        };
      } else {
        console.log(`TemplateROIDetector: No suitable ROI found in ${processingTime.toFixed(2)}ms`);
        return null;
      }
      
    } catch (error) {
      console.error('TemplateROIDetector: Detection failed:', error);
      throw error;
    }
  }

  /**
   * Generate UI templates for matching
   */
  generateUITemplates() {
    console.log('TemplateROIDetector: Generating UI templates');
    
    // Generate corner templates
    if (this.config.cornerPatterns) {
      this.generateCornerTemplates();
    }
    
    // Generate hex pattern templates
    if (this.config.hexPatterns) {
      this.generateHexTemplates();
    }
    
    // Generate frame pattern templates
    if (this.config.framePatterns) {
      this.generateFrameTemplates();
    }
    
    console.log(`TemplateROIDetector: Generated ${this.templates.size} templates`);
  }

  /**
   * Generate corner pattern templates (UI frame corners)
   */
  generateCornerTemplates() {
    for (const size of this.config.templateSizes) {
      // Top-left corner
      this.templates.set(`corner-tl-${size.width}x${size.height}`, 
        this.createCornerTemplate(size.width, size.height, 'top-left'));
      
      // Top-right corner
      this.templates.set(`corner-tr-${size.width}x${size.height}`, 
        this.createCornerTemplate(size.width, size.height, 'top-right'));
      
      // Bottom-left corner
      this.templates.set(`corner-bl-${size.width}x${size.height}`, 
        this.createCornerTemplate(size.width, size.height, 'bottom-left'));
      
      // Bottom-right corner
      this.templates.set(`corner-br-${size.width}x${size.height}`, 
        this.createCornerTemplate(size.width, size.height, 'bottom-right'));
    }
  }

  /**
   * Generate hexagon pattern templates
   */
  generateHexTemplates() {
    for (const size of this.config.templateSizes) {
      if (size.width >= 48 && size.height >= 48) {
        // Hexagon outline
        this.templates.set(`hex-outline-${size.width}x${size.height}`, 
          this.createHexTemplate(size.width, size.height, 'outline'));
        
        // Filled hexagon
        this.templates.set(`hex-filled-${size.width}x${size.height}`, 
          this.createHexTemplate(size.width, size.height, 'filled'));
      }
    }
  }

  /**
   * Generate frame pattern templates
   */
  generateFrameTemplates() {
    for (const size of this.config.templateSizes) {
      // Horizontal frame edge
      this.templates.set(`frame-h-${size.width}x${size.height}`, 
        this.createFrameTemplate(size.width, size.height, 'horizontal'));
      
      // Vertical frame edge
      this.templates.set(`frame-v-${size.width}x${size.height}`, 
        this.createFrameTemplate(size.width, size.height, 'vertical'));
    }
  }

  /**
   * Create corner template
   */
  createCornerTemplate(width, height, corner) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with dark background
    ctx.fillStyle = 'rgb(20, 25, 35)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw corner lines
    ctx.strokeStyle = 'rgb(150, 180, 220)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const margin = 4;
    const lineLength = Math.min(width, height) * 0.6;
    
    switch (corner) {
      case 'top-left':
        ctx.moveTo(margin, lineLength);
        ctx.lineTo(margin, margin);
        ctx.lineTo(lineLength, margin);
        break;
      case 'top-right':
        ctx.moveTo(width - lineLength, margin);
        ctx.lineTo(width - margin, margin);
        ctx.lineTo(width - margin, lineLength);
        break;
      case 'bottom-left':
        ctx.moveTo(margin, height - lineLength);
        ctx.lineTo(margin, height - margin);
        ctx.lineTo(lineLength, height - margin);
        break;
      case 'bottom-right':
        ctx.moveTo(width - lineLength, height - margin);
        ctx.lineTo(width - margin, height - margin);
        ctx.lineTo(width - margin, height - lineLength);
        break;
    }
    
    ctx.stroke();
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Create hexagon template
   */
  createHexTemplate(width, height, type) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with dark background
    ctx.fillStyle = 'rgb(20, 25, 35)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw hexagon
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    
    if (type === 'filled') {
      ctx.fillStyle = 'rgb(60, 80, 120)';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgb(150, 180, 220)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Create frame template
   */
  createFrameTemplate(width, height, orientation) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Fill with dark background
    ctx.fillStyle = 'rgb(20, 25, 35)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw frame line
    ctx.strokeStyle = 'rgb(150, 180, 220)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    if (orientation === 'horizontal') {
      const y = height / 2;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    } else {
      const x = width / 2;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    
    ctx.stroke();
    
    return ctx.getImageData(0, 0, width, height);
  }

  /**
   * Find all template matches in the image
   */
  async findAllTemplateMatches(imageData) {
    const allMatches = [];
    
    for (const [templateName, templateData] of this.templates) {
      const matches = this.matchTemplate(imageData, templateData, templateName);
      allMatches.push(...matches);
    }
    
    // Sort by match score
    allMatches.sort((a, b) => b.score - a.score);
    
    // Keep only best matches to avoid overwhelming the clustering
    return allMatches.slice(0, this.config.maxTemplateMatches * this.templates.size);
  }

  /**
   * Match a single template against the image
   */
  matchTemplate(imageData, templateData, templateName) {
    const imageWidth = imageData.width;
    const imageHeight = imageData.height;
    const templateWidth = templateData.width;
    const templateHeight = templateData.height;
    
    const matches = [];
    const stepSize = Math.max(1, Math.min(templateWidth, templateHeight) / 4);
    
    // Slide template across image
    for (let y = 0; y <= imageHeight - templateHeight; y += stepSize) {
      for (let x = 0; x <= imageWidth - templateWidth; x += stepSize) {
        const score = this.calculateTemplateMatch(imageData, templateData, x, y);
        
        if (score >= this.config.matchThreshold) {
          matches.push({
            x,
            y,
            width: templateWidth,
            height: templateHeight,
            score,
            templateName
          });
        }
      }
    }
    
    return matches;
  }

  /**
   * Calculate template match score using normalized cross-correlation
   */
  calculateTemplateMatch(imageData, templateData, offsetX, offsetY) {
    const imageWidth = imageData.width;
    const templateWidth = templateData.width;
    const templateHeight = templateData.height;
    
    let sumImage = 0;
    let sumTemplate = 0;
    let sumImageSquared = 0;
    let sumTemplateSquared = 0;
    let sumProduct = 0;
    let pixelCount = 0;
    
    // Sample pixels for correlation calculation
    const sampleStep = Math.max(1, Math.floor(Math.min(templateWidth, templateHeight) / 16));
    
    for (let y = 0; y < templateHeight; y += sampleStep) {
      for (let x = 0; x < templateWidth; x += sampleStep) {
        const imageIdx = ((offsetY + y) * imageWidth + (offsetX + x)) * 4;
        const templateIdx = (y * templateWidth + x) * 4;
        
        // Convert to grayscale
        const imageGray = (imageData.data[imageIdx] + imageData.data[imageIdx + 1] + imageData.data[imageIdx + 2]) / 3;
        const templateGray = (templateData.data[templateIdx] + templateData.data[templateIdx + 1] + templateData.data[templateIdx + 2]) / 3;
        
        sumImage += imageGray;
        sumTemplate += templateGray;
        sumImageSquared += imageGray * imageGray;
        sumTemplateSquared += templateGray * templateGray;
        sumProduct += imageGray * templateGray;
        pixelCount++;
      }
    }
    
    if (pixelCount === 0) return 0;
    
    // Calculate normalized cross-correlation
    const meanImage = sumImage / pixelCount;
    const meanTemplate = sumTemplate / pixelCount;
    
    const numerator = sumProduct - pixelCount * meanImage * meanTemplate;
    const denominator = Math.sqrt(
      (sumImageSquared - pixelCount * meanImage * meanImage) *
      (sumTemplateSquared - pixelCount * meanTemplate * meanTemplate)
    );
    
    if (denominator === 0) return 0;
    
    const correlation = numerator / denominator;
    
    // Convert correlation to 0-1 score
    return Math.max(0, (correlation + 1) / 2);
  }

  /**
   * Cluster matches that are close together
   */
  clusterMatches(matches) {
    if (matches.length === 0) return [];
    
    const clusters = [];
    const processed = new Set();
    
    for (let i = 0; i < matches.length; i++) {
      if (processed.has(i)) continue;
      
      const cluster = {
        matches: [matches[i]],
        centerX: matches[i].x + matches[i].width / 2,
        centerY: matches[i].y + matches[i].height / 2,
        totalScore: matches[i].score,
        bounds: {
          minX: matches[i].x,
          maxX: matches[i].x + matches[i].width,
          minY: matches[i].y,
          maxY: matches[i].y + matches[i].height
        }
      };
      
      processed.add(i);
      
      // Find nearby matches
      for (let j = i + 1; j < matches.length; j++) {
        if (processed.has(j)) continue;
        
        const distance = Math.sqrt(
          Math.pow(matches[j].x - matches[i].x, 2) +
          Math.pow(matches[j].y - matches[i].y, 2)
        );
        
        if (distance <= this.config.clusterDistance) {
          cluster.matches.push(matches[j]);
          cluster.totalScore += matches[j].score;
          
          // Update bounds
          cluster.bounds.minX = Math.min(cluster.bounds.minX, matches[j].x);
          cluster.bounds.maxX = Math.max(cluster.bounds.maxX, matches[j].x + matches[j].width);
          cluster.bounds.minY = Math.min(cluster.bounds.minY, matches[j].y);
          cluster.bounds.maxY = Math.max(cluster.bounds.maxY, matches[j].y + matches[j].height);
          
          processed.add(j);
        }
      }
      
      // Update cluster center
      cluster.centerX = (cluster.bounds.minX + cluster.bounds.maxX) / 2;
      cluster.centerY = (cluster.bounds.minY + cluster.bounds.maxY) / 2;
      cluster.averageScore = cluster.totalScore / cluster.matches.length;
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  /**
   * Analyze clusters to find potential build areas
   */
  analyzeClusters(clusters, imageData) {
    const candidates = [];
    
    for (const cluster of clusters) {
      // Skip clusters with too few matches
      if (cluster.matches.length < 2) continue;
      
      // Calculate cluster properties
      const clusterWidth = cluster.bounds.maxX - cluster.bounds.minX;
      const clusterHeight = cluster.bounds.maxY - cluster.bounds.minY;
      const clusterArea = clusterWidth * clusterHeight;
      const aspectRatio = clusterWidth / clusterHeight;
      
      // Filter by reasonable size and aspect ratio
      if (clusterArea < 10000 || clusterArea > 1000000) continue;
      if (aspectRatio < 0.5 || aspectRatio > 4.0) continue;
      
      // Analyze template types in cluster
      const templateTypes = this.analyzeClusterTemplates(cluster);
      
      // Estimate build area from cluster
      const buildAreaBounds = this.estimateBuildAreaFromCluster(cluster, imageData);
      
      if (buildAreaBounds) {
        candidates.push({
          bounds: buildAreaBounds,
          cluster: cluster,
          templateTypes: templateTypes,
          clusterScore: cluster.averageScore,
          clusterSize: cluster.matches.length
        });
      }
    }
    
    return candidates;
  }

  /**
   * Analyze types of templates found in cluster
   */
  analyzeClusterTemplates(cluster) {
    const types = {
      corners: 0,
      hexes: 0,
      frames: 0,
      total: cluster.matches.length
    };
    
    for (const match of cluster.matches) {
      if (match.templateName.includes('corner')) {
        types.corners++;
      } else if (match.templateName.includes('hex')) {
        types.hexes++;
      } else if (match.templateName.includes('frame')) {
        types.frames++;
      }
    }
    
    return types;
  }

  /**
   * Estimate build area bounds from cluster of UI matches
   */
  estimateBuildAreaFromCluster(cluster, imageData) {
    const margin = 50; // Margin around UI elements to find build area
    
    // Expand cluster bounds to estimate build area
    const buildBounds = {
      x: Math.max(0, cluster.bounds.minX - margin),
      y: Math.max(0, cluster.bounds.minY - margin),
      width: Math.min(imageData.width, cluster.bounds.maxX + margin) - Math.max(0, cluster.bounds.minX - margin),
      height: Math.min(imageData.height, cluster.bounds.maxY + margin) - Math.max(0, cluster.bounds.minY - margin)
    };
    
    // Validate build area
    const area = buildBounds.width * buildBounds.height;
    const aspectRatio = buildBounds.width / buildBounds.height;
    
    if (area >= 50000 && area <= 2000000 && aspectRatio >= 0.8 && aspectRatio <= 3.0) {
      return buildBounds;
    }
    
    return null;
  }

  /**
   * Score template-based candidates
   */
  scoreTemplateCandidates(candidates, imageData) {
    const scoredCandidates = [];
    
    for (const candidate of candidates) {
      let score = 0;
      
      // Score based on cluster quality
      score += candidate.clusterScore * 0.3;
      
      // Score based on template diversity
      const templateScore = this.calculateTemplateTypeScore(candidate.templateTypes);
      score += templateScore * 0.2;
      
      // Score based on cluster size
      const sizeScore = Math.min(1, candidate.clusterSize / 10);
      score += sizeScore * 0.15;
      
      // Score based on position
      const positionScore = this.calculatePositionScore(candidate.bounds, imageData.width, imageData.height);
      score += positionScore * 0.15;
      
      // Score based on area
      const relativeArea = (candidate.bounds.width * candidate.bounds.height) / (imageData.width * imageData.height);
      const areaScore = this.calculateSizeScore(relativeArea);
      score += areaScore * 0.2;
      
      // Normalize score
      score = Math.max(0, Math.min(1, score));
      
      scoredCandidates.push({
        ...candidate,
        confidence: score
      });
    }
    
    return scoredCandidates;
  }

  /**
   * Calculate score based on template type diversity
   */
  calculateTemplateTypeScore(types) {
    let score = 0;
    
    // Prefer clusters with corner patterns (UI frames)
    if (types.corners > 0) {
      score += 0.4;
    }
    
    // Prefer clusters with hex patterns (build elements)
    if (types.hexes > 0) {
      score += 0.3;
    }
    
    // Prefer clusters with frame patterns (UI structure)
    if (types.frames > 0) {
      score += 0.3;
    }
    
    return Math.min(1, score);
  }

  /**
   * Calculate size-based score (reused from other detectors)
   */
  calculateSizeScore(relativeArea) {
    const optimal = 0.35;
    const distance = Math.abs(relativeArea - optimal);
    return Math.max(0, 1 - distance * 3);
  }

  /**
   * Calculate position-based score (reused from other detectors)
   */
  calculatePositionScore(bounds, imageWidth, imageHeight) {
    const centerX = imageWidth / 2;
    const centerY = imageHeight / 2;
    const rectCenterX = bounds.x + bounds.width / 2;
    const rectCenterY = bounds.y + bounds.height / 2;
    
    const distanceX = Math.abs(rectCenterX - centerX) / (imageWidth / 2);
    const distanceY = Math.abs(rectCenterY - centerY) / (imageHeight / 2);
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    
    return Math.max(0, 1 - distance);
  }

  /**
   * Select the best candidate
   */
  selectBestCandidate(candidates) {
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    return candidates[0];
  }
}

// Export for global use
window.TemplateROIDetector = TemplateROIDetector;

console.log('TemplateROIDetector: Template-based detection algorithm loaded');