/**
 * Mod Search Module
 * Intelligent search functionality for Nova Drift mod corrections
 * Integrates with existing mod database and provides fuzzy matching
 */

class ModSearch {
  constructor(options = {}) {
    this.options = {
      fuzzyThreshold: 0.6,
      maxResults: 10,
      enableTypoTolerance: true,
      prioritizeNameMatches: true,
      includeDescriptions: true,
      includeTags: true,
      enableCaching: true,
      ...options
    };

    this.modDatabase = [];
    this.searchIndex = new Map();
    this.cache = new Map();
    this.searchStats = {
      totalSearches: 0,
      cacheHits: 0,
      averageResultCount: 0
    };

    this.init();
  }

  /**
   * Initialize the search system
   */
  async init() {
    await this.loadModDatabase();
    this.buildSearchIndex();
  }

  /**
   * Load the complete Nova Drift mod database
   */
  async loadModDatabase() {
    try {
      // First try to load from existing mod definitions in the cheatsheet
      const modData = await this.fetchExistingModData();
      
      if (modData && modData.length > 0) {
        this.modDatabase = modData;
      } else {
        // Fallback to hardcoded mod list (for development/testing)
        this.modDatabase = this.getHardcodedModList();
      }

      console.log(`ModSearch: Loaded ${this.modDatabase.length} mods`);
    } catch (error) {
      console.warn('Failed to load mod database:', error);
      this.modDatabase = this.getHardcodedModList();
    }
  }

  /**
   * Attempt to fetch mod data from existing cheatsheet
   */
  async fetchExistingModData() {
    try {
      // Try to access the existing mod data structure
      if (typeof window !== 'undefined' && window.modData) {
        return this.convertExistingModData(window.modData);
      }
      
      // Try to load from localization CSV if available
      if (typeof window !== 'undefined' && window.fetch) {
        const response = await fetch('localization.csv');
        if (response.ok) {
          const csvText = await response.text();
          return this.parseModsFromCSV(csvText);
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Could not fetch existing mod data:', error);
      return null;
    }
  }

  /**
   * Convert existing mod data structure to search format
   */
  convertExistingModData(existingData) {
    const mods = [];
    
    // Handle different possible structures of existing mod data
    if (Array.isArray(existingData)) {
      existingData.forEach((mod, index) => {
        mods.push(this.normalizeModData(mod, index));
      });
    } else if (typeof existingData === 'object') {
      Object.entries(existingData).forEach(([key, mod], index) => {
        mods.push(this.normalizeModData(mod, index, key));
      });
    }
    
    return mods;
  }

  /**
   * Parse mods from CSV localization file
   */
  parseModsFromCSV(csvText) {
    const mods = [];
    const lines = csvText.split('\n');
    
    // Simple CSV parsing - assumes comma separation
    lines.forEach((line, index) => {
      if (index === 0 || !line.trim()) return; // Skip header and empty lines
      
      const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
      if (columns.length >= 2) {
        const mod = {
          id: this.generateModId(columns[0]),
          name: columns[0],
          description: columns[1] || '',
          icon: `assets/${columns[0].replace(/\s+/g, '')}.png`,
          tags: this.generateTagsFromName(columns[0]),
          searchTerms: this.generateSearchTerms(columns[0], columns[1] || '')
        };
        mods.push(mod);
      }
    });
    
    return mods;
  }

  /**
   * Normalize mod data to consistent format
   */
  normalizeModData(mod, index, key = null) {
    return {
      id: mod.id || key || this.generateModId(mod.name || `mod_${index}`),
      name: mod.name || mod.title || key || `Mod ${index}`,
      description: mod.description || mod.desc || '',
      icon: mod.icon || `assets/${(mod.name || key || '').replace(/\s+/g, '')}.png`,
      tags: mod.tags || this.generateTagsFromName(mod.name || key || ''),
      category: mod.category || 'general',
      searchTerms: this.generateSearchTerms(
        mod.name || key || '', 
        mod.description || mod.desc || ''
      )
    };
  }

  /**
   * Generate search terms for a mod
   */
  generateSearchTerms(name, description) {
    const terms = new Set();
    
    // Add name words
    name.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) terms.add(word);
    });
    
    // Add description words
    description.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 3) terms.add(word);
    });
    
    // Add common variations and synonyms
    const synonymMap = {
      'shield': ['barrier', 'defense', 'protection'],
      'weapon': ['gun', 'cannon', 'projectile'],
      'speed': ['velocity', 'fast', 'quick'],
      'damage': ['harm', 'hurt', 'destruction']
    };
    
    terms.forEach(term => {
      if (synonymMap[term]) {
        synonymMap[term].forEach(synonym => terms.add(synonym));
      }
    });
    
    return Array.from(terms);
  }

  /**
   * Generate tags from mod name
   */
  generateTagsFromName(name) {
    const tags = [];
    const lowerName = name.toLowerCase();
    
    // Common tag patterns
    const tagPatterns = {
      'shield': ['defense', 'protection'],
      'armor': ['defense', 'protection'],
      'weapon': ['offense', 'combat'],
      'fire': ['offense', 'elemental'],
      'drone': ['support', 'ally'],
      'mine': ['trap', 'explosive'],
      'speed': ['mobility', 'enhancement'],
      'stealth': ['utility', 'evasion']
    };
    
    Object.entries(tagPatterns).forEach(([pattern, patternTags]) => {
      if (lowerName.includes(pattern)) {
        tags.push(...patternTags);
      }
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Generate a consistent mod ID
   */
  generateModId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  /**
   * Build search index for faster lookups
   */
  buildSearchIndex() {
    this.searchIndex.clear();
    
    this.modDatabase.forEach(mod => {
      // Index by name
      this.addToIndex(mod.name.toLowerCase(), mod);
      
      // Index by search terms
      mod.searchTerms.forEach(term => {
        this.addToIndex(term, mod);
      });
      
      // Index by tags
      mod.tags.forEach(tag => {
        this.addToIndex(tag, mod);
      });
      
      // Index by partial matches
      if (this.options.enableTypoTolerance) {
        this.addPartialMatches(mod.name.toLowerCase(), mod);
      }
    });
    
    console.log(`ModSearch: Built search index with ${this.searchIndex.size} entries`);
  }

  /**
   * Add mod to search index
   */
  addToIndex(term, mod) {
    if (!this.searchIndex.has(term)) {
      this.searchIndex.set(term, []);
    }
    this.searchIndex.get(term).push(mod);
  }

  /**
   * Add partial matches for typo tolerance
   */
  addPartialMatches(name, mod) {
    // Add substrings of length 3 or more
    for (let i = 0; i <= name.length - 3; i++) {
      for (let j = i + 3; j <= name.length; j++) {
        const substring = name.substring(i, j);
        if (substring.length >= 3) {
          this.addToIndex(substring, mod);
        }
      }
    }
  }

  /**
   * Perform a search query
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Array of matching mods with scores
   */
  search(query, options = {}) {
    const searchOptions = { ...this.options, ...options };
    const cacheKey = this.getCacheKey(query, searchOptions);
    
    this.searchStats.totalSearches++;
    
    // Check cache first
    if (this.options.enableCaching && this.cache.has(cacheKey)) {
      this.searchStats.cacheHits++;
      return this.cache.get(cacheKey);
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 2) {
      return [];
    }
    
    const results = new Map(); // Use Map to avoid duplicates
    const queryTerms = normalizedQuery.split(/\s+/);
    
    // Direct index lookups
    queryTerms.forEach(term => {
      this.searchIndex.forEach((mods, indexTerm) => {
        const score = this.calculateMatchScore(term, indexTerm, normalizedQuery);
        if (score >= searchOptions.fuzzyThreshold) {
          mods.forEach(mod => {
            const existingScore = results.get(mod.id)?.score || 0;
            if (score > existingScore) {
              results.set(mod.id, { ...mod, score });
            }
          });
        }
      });
    });
    
    // Fuzzy matching for partial queries
    if (results.size < searchOptions.maxResults) {
      this.modDatabase.forEach(mod => {
        if (!results.has(mod.id)) {
          const fuzzyScore = this.calculateFuzzyScore(normalizedQuery, mod);
          if (fuzzyScore >= searchOptions.fuzzyThreshold) {
            results.set(mod.id, { ...mod, score: fuzzyScore });
          }
        }
      });
    }
    
    // Convert to array and sort by score
    const sortedResults = Array.from(results.values())
      .sort((a, b) => {
        // Prioritize name matches if enabled
        if (searchOptions.prioritizeNameMatches) {
          const aNameMatch = a.name.toLowerCase().includes(normalizedQuery);
          const bNameMatch = b.name.toLowerCase().includes(normalizedQuery);
          if (aNameMatch && !bNameMatch) return -1;
          if (!aNameMatch && bNameMatch) return 1;
        }
        
        // Sort by score
        return b.score - a.score;
      })
      .slice(0, searchOptions.maxResults);
    
    // Cache results
    if (this.options.enableCaching) {
      this.cache.set(cacheKey, sortedResults);
      
      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }
    }
    
    this.searchStats.averageResultCount = 
      (this.searchStats.averageResultCount * (this.searchStats.totalSearches - 1) + 
       sortedResults.length) / this.searchStats.totalSearches;
    
    return sortedResults;
  }

  /**
   * Calculate match score between query term and index term
   */
  calculateMatchScore(queryTerm, indexTerm, fullQuery) {
    // Exact match
    if (queryTerm === indexTerm) return 1.0;
    
    // Starts with
    if (indexTerm.startsWith(queryTerm)) return 0.9;
    
    // Contains
    if (indexTerm.includes(queryTerm)) return 0.8;
    
    // Full query contains index term
    if (fullQuery.includes(indexTerm)) return 0.7;
    
    // Levenshtein distance for typo tolerance
    if (this.options.enableTypoTolerance) {
      const distance = this.levenshteinDistance(queryTerm, indexTerm);
      const maxLength = Math.max(queryTerm.length, indexTerm.length);
      const similarity = 1 - (distance / maxLength);
      
      if (similarity >= 0.7) return similarity * 0.6;
    }
    
    return 0;
  }

  /**
   * Calculate fuzzy score for a mod against the full query
   */
  calculateFuzzyScore(query, mod) {
    let maxScore = 0;
    
    // Check against name
    const nameScore = this.stringsSimilarity(query, mod.name.toLowerCase());
    maxScore = Math.max(maxScore, nameScore * 1.2); // Boost name matches
    
    // Check against description
    if (this.options.includeDescriptions && mod.description) {
      const descScore = this.stringsSimilarity(query, mod.description.toLowerCase());
      maxScore = Math.max(maxScore, descScore * 0.8);
    }
    
    // Check against tags
    if (this.options.includeTags) {
      mod.tags.forEach(tag => {
        const tagScore = this.stringsSimilarity(query, tag.toLowerCase());
        maxScore = Math.max(maxScore, tagScore * 0.9);
      });
    }
    
    return maxScore;
  }

  /**
   * Calculate string similarity using Jaro-Winkler algorithm
   */
  stringsSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    
    // Simple implementation - could be enhanced with full Jaro-Winkler
    const maxLength = Math.max(s1.length, s2.length);
    let matches = 0;
    
    for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) matches++;
    }
    
    return matches / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(s1, s2) {
    const matrix = Array(s2.length + 1).fill(null).map(() => 
      Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // Deletion
          matrix[j - 1][i] + 1,     // Insertion
          matrix[j - 1][i - 1] + cost // Substitution
        );
      }
    }
    
    return matrix[s2.length][s1.length];
  }

  /**
   * Generate cache key for search results
   */
  getCacheKey(query, options) {
    return `${query}|${JSON.stringify(options)}`;
  }

  /**
   * Get search suggestions based on partial input
   */
  getSuggestions(partialQuery, limit = 5) {
    if (partialQuery.length < 2) return [];
    
    const suggestions = new Set();
    const lowerQuery = partialQuery.toLowerCase();
    
    // Get suggestions from mod names
    this.modDatabase.forEach(mod => {
      if (mod.name.toLowerCase().startsWith(lowerQuery)) {
        suggestions.add(mod.name);
      }
    });
    
    // Get suggestions from search terms
    this.searchIndex.forEach((mods, term) => {
      if (term.startsWith(lowerQuery)) {
        mods.forEach(mod => suggestions.add(mod.name));
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Get mods by category
   */
  getModsByCategory(category) {
    return this.modDatabase.filter(mod => 
      mod.category === category || mod.tags.includes(category)
    );
  }

  /**
   * Get random mods (useful for testing or showcasing)
   */
  getRandomMods(count = 5) {
    const shuffled = [...this.modDatabase].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * Get search statistics
   */
  getSearchStats() {
    return {
      ...this.searchStats,
      cacheHitRate: this.searchStats.totalSearches > 0 ? 
        this.searchStats.cacheHits / this.searchStats.totalSearches : 0,
      databaseSize: this.modDatabase.length,
      indexSize: this.searchIndex.size
    };
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.cache.clear();
    this.searchStats.cacheHits = 0;
  }

  /**
   * Get hardcoded mod list (fallback for development)
   */
  getHardcodedModList() {
    return [
      {
        id: 'absorption',
        name: 'Absorption',
        description: 'Converts a portion of damage to shield energy',
        icon: 'assets/Absorption.png',
        tags: ['defense', 'shield', 'energy'],
        category: 'defense',
        searchTerms: ['absorption', 'convert', 'damage', 'shield', 'energy', 'defense', 'protection']
      },
      {
        id: 'adaptive-armor',
        name: 'Adaptive Armor',
        description: 'Armor that adapts to incoming damage types',
        icon: 'assets/AdaptiveArmor.png',
        tags: ['defense', 'armor', 'adaptive'],
        category: 'defense',
        searchTerms: ['adaptive', 'armor', 'defense', 'resistance', 'protection']
      },
      {
        id: 'aegis',
        name: 'Aegis',
        description: 'Powerful shield system with energy reflection',
        icon: 'assets/Aegis.png',
        tags: ['defense', 'shield', 'reflection'],
        category: 'defense',
        searchTerms: ['aegis', 'shield', 'reflection', 'defense', 'energy', 'protection']
      },
      {
        id: 'assault',
        name: 'Assault',
        description: 'Increases weapon firing rate and damage',
        icon: 'assets/Assault.png',
        tags: ['offense', 'weapon', 'damage'],
        category: 'offense',
        searchTerms: ['assault', 'weapon', 'damage', 'firing', 'rate', 'offense', 'attack']
      },
      {
        id: 'blaster',
        name: 'Blaster',
        description: 'High-energy projectile weapon system',
        icon: 'assets/Blaster.png',
        tags: ['offense', 'weapon', 'projectile'],
        category: 'offense',
        searchTerms: ['blaster', 'projectile', 'weapon', 'energy', 'offense', 'shooting']
      },
      // Add more mods as needed...
    ];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModSearch;
} else if (typeof global !== 'undefined') {
  global.ModSearch = ModSearch;
}