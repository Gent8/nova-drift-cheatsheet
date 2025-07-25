/**
 * Nova Drift Consensus Engine - Phase 4
 * Combines results from multiple detection algorithms for robust selection detection
 */

(function(global) {
  'use strict';

  /**
   * Consensus engine for multi-algorithm fusion
   * Combines brightness, color, edge, and pattern detection results
   */
  class ConsensusEngine {
    constructor(algorithmWeights = {}) {
      this.weights = {
        brightness: 0.3,
        color: 0.25,
        edge: 0.25,
        pattern: 0.2,
        ...algorithmWeights
      };
      
      this.name = 'consensus';
      this.version = '1.0.0';
      
      // Consensus thresholds
      this.thresholds = {
        minimumConfidence: 0.3,
        highConfidenceThreshold: 0.8,
        consensusThreshold: 0.6,
        ambiguousThreshold: 0.1
      };
      
      // Performance tracking
      this.performance = {
        totalAnalyses: 0,
        highConfidenceResults: 0,
        consensusAchieved: 0,
        ambiguousResults: 0
      };
    }

    /**
     * Calculate consensus from multiple algorithm results
     * @param {Object} algorithmResults - Results from all detection algorithms
     * @param {Object} metadata - Additional context
     * @returns {Object} Consensus result with final selection decision
     */
    calculateConsensus(algorithmResults, metadata = {}) {
      try {
        const startTime = performance.now();
        
        // Validate algorithm results
        const validatedResults = this.validateAlgorithmResults(algorithmResults);
        
        // Calculate weighted votes
        const weightedVotes = this.calculateWeightedVotes(validatedResults);
        
        // Calculate overall confidence
        const overallConfidence = this.calculateOverallConfidence(validatedResults);
        
        // Calculate algorithm agreement
        const agreement = this.calculateAgreement(validatedResults);
        
        // Apply consensus rules
        const consensusDecision = this.applyConsensusRules(
          weightedVotes, 
          overallConfidence, 
          agreement, 
          validatedResults
        );
        
        // Analyze result quality
        const qualityAnalysis = this.analyzeResultQuality(
          consensusDecision, 
          validatedResults, 
          agreement
        );
        
        // Update performance tracking
        this.updatePerformanceTracking(consensusDecision, qualityAnalysis);
        
        const processingTime = performance.now() - startTime;
        
        const result = {
          selected: consensusDecision.selected,
          confidence: consensusDecision.confidence,
          weightedVotes: weightedVotes,
          agreement: agreement,
          algorithmResults: validatedResults,
          consensusData: {
            decision: consensusDecision,
            qualityAnalysis: qualityAnalysis,
            supportingAlgorithms: consensusDecision.supportingAlgorithms,
            conflictingAlgorithms: consensusDecision.conflictingAlgorithms,
            ambiguous: qualityAnalysis.ambiguous,
            reliable: qualityAnalysis.reliable
          },
          metadata: {
            algorithm: this.name,
            version: this.version,
            processingTime,
            algorithmCount: Object.keys(validatedResults).length,
            weights: { ...this.weights },
            timestamp: Date.now()
          }
        };
        
        return result;
        
      } catch (error) {
        console.error('Consensus calculation failed:', error);
        return this.createFailureResult(error);
      }
    }

    /**
     * Validate and normalize algorithm results
     * @param {Object} algorithmResults - Raw algorithm results
     * @returns {Object} Validated and normalized results
     */
    validateAlgorithmResults(algorithmResults) {
      const validated = {};
      
      // Expected algorithm names
      const expectedAlgorithms = ['brightness', 'color', 'edge', 'pattern'];
      
      expectedAlgorithms.forEach(algorithmName => {
        const result = algorithmResults[algorithmName];
        
        if (result && typeof result === 'object') {
          validated[algorithmName] = {
            selected: Boolean(result.selected),
            confidence: this.normalizeConfidence(result.confidence),
            algorithm: algorithmName,
            available: true,
            error: result.error || null,
            processingTime: result.metadata?.processingTime || 0,
            rawResult: result
          };
        } else {
          // Algorithm failed or unavailable
          validated[algorithmName] = {
            selected: false,
            confidence: 0,
            algorithm: algorithmName,
            available: false,
            error: `Algorithm ${algorithmName} failed or unavailable`,
            processingTime: 0,
            rawResult: null
          };
        }
      });
      
      return validated;
    }

    /**
     * Normalize confidence values to 0-1 range
     * @param {number} confidence - Raw confidence value
     * @returns {number} Normalized confidence (0-1)
     */
    normalizeConfidence(confidence) {
      if (typeof confidence !== 'number' || isNaN(confidence)) return 0;
      return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Calculate weighted votes from algorithm results
     * @param {Object} validatedResults - Validated algorithm results
     * @returns {number} Weighted vote score (0-1)
     */
    calculateWeightedVotes(validatedResults) {
      let totalWeight = 0;
      let weightedVoteSum = 0;
      
      Object.keys(validatedResults).forEach(algorithmName => {
        const result = validatedResults[algorithmName];
        const weight = this.weights[algorithmName] || 0;
        
        if (result.available && result.confidence >= this.thresholds.minimumConfidence) {
          const vote = result.selected ? result.confidence : (1 - result.confidence);
          weightedVoteSum += vote * weight;
          totalWeight += weight;
        }
      });
      
      return totalWeight > 0 ? weightedVoteSum / totalWeight : 0.5; // Default to neutral if no valid votes
    }

    /**
     * Calculate overall confidence based on individual algorithm confidences
     * @param {Object} validatedResults - Validated algorithm results
     * @returns {number} Overall confidence (0-1)
     */
    calculateOverallConfidence(validatedResults) {
      const availableResults = Object.values(validatedResults).filter(r => r.available);
      
      if (availableResults.length === 0) return 0;
      
      // Calculate weighted average confidence
      let totalWeight = 0;
      let weightedConfidenceSum = 0;
      
      availableResults.forEach(result => {
        const weight = this.weights[result.algorithm] || 0;
        weightedConfidenceSum += result.confidence * weight;
        totalWeight += weight;
      });
      
      const baseConfidence = totalWeight > 0 ? weightedConfidenceSum / totalWeight : 0;
      
      // Apply confidence bonuses/penalties
      let adjustedConfidence = baseConfidence;
      
      // Bonus for multiple high-confidence algorithms
      const highConfidenceCount = availableResults.filter(r => 
        r.confidence >= this.thresholds.highConfidenceThreshold
      ).length;
      
      if (highConfidenceCount >= 2) {
        adjustedConfidence = Math.min(1, adjustedConfidence * (1 + highConfidenceCount * 0.1));
      }
      
      // Penalty for algorithm failures
      const failedAlgorithms = Object.values(validatedResults).filter(r => !r.available).length;
      if (failedAlgorithms > 0) {
        adjustedConfidence *= Math.max(0.5, 1 - failedAlgorithms * 0.1);
      }
      
      return Math.max(0, Math.min(1, adjustedConfidence));
    }

    /**
     * Calculate agreement between algorithms
     * @param {Object} validatedResults - Validated algorithm results
     * @returns {number} Agreement score (0-1)
     */
    calculateAgreement(validatedResults) {
      const availableResults = Object.values(validatedResults).filter(r => 
        r.available && r.confidence >= this.thresholds.minimumConfidence
      );
      
      if (availableResults.length < 2) {
        return availableResults.length === 1 ? 1 : 0; // Perfect agreement if only one result, no agreement if none
      }
      
      // Calculate pairwise agreement
      let totalComparisons = 0;
      let agreementSum = 0;
      
      for (let i = 0; i < availableResults.length; i++) {
        for (let j = i + 1; j < availableResults.length; j++) {
          const result1 = availableResults[i];
          const result2 = availableResults[j];
          
          // Agreement based on selection decision match and confidence similarity
          const decisionMatch = result1.selected === result2.selected ? 1 : 0;
          const confidenceSimilarity = 1 - Math.abs(result1.confidence - result2.confidence);
          
          // Weighted agreement (decision is more important than confidence similarity)
          const pairAgreement = decisionMatch * 0.7 + confidenceSimilarity * 0.3;
          
          // Weight by both algorithms' confidence
          const weight = (result1.confidence + result2.confidence) / 2;
          
          agreementSum += pairAgreement * weight;
          totalComparisons += weight;
        }
      }
      
      return totalComparisons > 0 ? agreementSum / totalComparisons : 0;
    }

    /**
     * Apply consensus rules to determine final decision
     * @param {number} weightedVotes - Weighted vote score
     * @param {number} overallConfidence - Overall confidence
     * @param {number} agreement - Agreement score
     * @param {Object} validatedResults - Validated algorithm results
     * @returns {Object} Consensus decision
     */
    applyConsensusRules(weightedVotes, overallConfidence, agreement, validatedResults) {
      const availableResults = Object.values(validatedResults).filter(r => r.available);
      
      // Rule 1: High confidence with good agreement
      if (overallConfidence >= this.thresholds.highConfidenceThreshold && 
          agreement >= this.thresholds.consensusThreshold) {
        const selected = weightedVotes > 0.5;
        return {
          selected,
          confidence: Math.min(overallConfidence, agreement),
          rule: 'high-confidence-consensus',
          supportingAlgorithms: this.findSupportingAlgorithms(selected, availableResults),
          conflictingAlgorithms: this.findConflictingAlgorithms(selected, availableResults)
        };
      }
      
      // Rule 2: Strong majority vote
      const majorityThreshold = 0.7;
      if (weightedVotes > majorityThreshold || weightedVotes < (1 - majorityThreshold)) {
        const selected = weightedVotes > 0.5;
        const confidence = Math.abs(weightedVotes - 0.5) * 2; // Convert to 0-1 scale
        return {
          selected,
          confidence: Math.min(confidence, overallConfidence),
          rule: 'strong-majority',
          supportingAlgorithms: this.findSupportingAlgorithms(selected, availableResults),
          conflictingAlgorithms: this.findConflictingAlgorithms(selected, availableResults)
        };
      }
      
      // Rule 3: Single high-confidence algorithm (fallback)
      const highConfidenceResults = availableResults.filter(r => 
        r.confidence >= this.thresholds.highConfidenceThreshold
      );
      
      if (highConfidenceResults.length === 1 && availableResults.length <= 2) {
        const result = highConfidenceResults[0];
        return {
          selected: result.selected,
          confidence: result.confidence * 0.8, // Reduced confidence for single-algorithm decision
          rule: 'single-high-confidence',
          supportingAlgorithms: [result.algorithm],
          conflictingAlgorithms: this.findConflictingAlgorithms(result.selected, availableResults)
        };
      }
      
      // Rule 4: Default to weighted vote with reduced confidence
      const selected = weightedVotes > 0.5;
      const baseConfidence = Math.abs(weightedVotes - 0.5) * 2;
      
      return {
        selected,
        confidence: Math.min(baseConfidence * 0.6, overallConfidence * 0.8), // Heavily reduced confidence
        rule: 'weak-consensus',
        supportingAlgorithms: this.findSupportingAlgorithms(selected, availableResults),
        conflictingAlgorithms: this.findConflictingAlgorithms(selected, availableResults)
      };
    }

    /**
     * Find algorithms that support the consensus decision
     * @param {boolean} consensusDecision - The consensus selection decision
     * @param {Array} availableResults - Available algorithm results
     * @returns {Array} Array of supporting algorithm names
     */
    findSupportingAlgorithms(consensusDecision, availableResults) {
      return availableResults
        .filter(result => 
          result.selected === consensusDecision && 
          result.confidence >= this.thresholds.minimumConfidence
        )
        .map(result => result.algorithm);
    }

    /**
     * Find algorithms that conflict with the consensus decision
     * @param {boolean} consensusDecision - The consensus selection decision
     * @param {Array} availableResults - Available algorithm results
     * @returns {Array} Array of conflicting algorithm names
     */
    findConflictingAlgorithms(consensusDecision, availableResults) {
      return availableResults
        .filter(result => 
          result.selected !== consensusDecision && 
          result.confidence >= this.thresholds.minimumConfidence
        )
        .map(result => result.algorithm);
    }

    /**
     * Analyze the quality of the consensus result
     * @param {Object} consensusDecision - The consensus decision
     * @param {Object} validatedResults - Validated algorithm results
     * @param {number} agreement - Agreement score
     * @returns {Object} Quality analysis
     */
    analyzeResultQuality(consensusDecision, validatedResults, agreement) {
      const availableResults = Object.values(validatedResults).filter(r => r.available);
      const supportingCount = consensusDecision.supportingAlgorithms.length;
      const conflictingCount = consensusDecision.conflictingAlgorithms.length;
      
      // Determine if result is ambiguous
      const ambiguous = 
        consensusDecision.confidence < this.thresholds.consensusThreshold ||
        agreement < this.thresholds.consensusThreshold ||
        Math.abs(supportingCount - conflictingCount) <= 1;
      
      // Determine if result is reliable
      const reliable = 
        consensusDecision.confidence >= this.thresholds.highConfidenceThreshold &&
        agreement >= this.thresholds.consensusThreshold &&
        supportingCount >= 2 &&
        availableResults.length >= 3;
      
      // Calculate quality score
      const qualityFactors = [
        consensusDecision.confidence,
        agreement,
        supportingCount / Math.max(1, availableResults.length),
        availableResults.length / 4 // Assuming 4 total algorithms
      ];
      
      const qualityScore = qualityFactors.reduce((sum, factor) => sum + factor, 0) / qualityFactors.length;
      
      return {
        ambiguous,
        reliable,
        qualityScore,
        supportingCount,
        conflictingCount,
        availableAlgorithms: availableResults.length,
        needsReview: ambiguous || !reliable,
        confidence: consensusDecision.confidence,
        agreement
      };
    }

    /**
     * Update performance tracking metrics
     * @param {Object} consensusDecision - The consensus decision
     * @param {Object} qualityAnalysis - Quality analysis results
     */
    updatePerformanceTracking(consensusDecision, qualityAnalysis) {
      this.performance.totalAnalyses++;
      
      if (qualityAnalysis.reliable) {
        this.performance.highConfidenceResults++;
      }
      
      if (!qualityAnalysis.ambiguous) {
        this.performance.consensusAchieved++;
      }
      
      if (qualityAnalysis.ambiguous) {
        this.performance.ambiguousResults++;
      }
    }

    /**
     * Create a failure result when consensus calculation fails
     * @param {Error} error - The error that occurred
     * @returns {Object} Failure result
     */
    createFailureResult(error) {
      return {
        selected: false,
        confidence: 0,
        weightedVotes: 0,
        agreement: 0,
        algorithmResults: {},
        consensusData: {
          decision: {
            selected: false,
            confidence: 0,
            rule: 'failure',
            supportingAlgorithms: [],
            conflictingAlgorithms: []
          },
          qualityAnalysis: {
            ambiguous: true,
            reliable: false,
            qualityScore: 0,
            needsReview: true
          }
        },
        error: error.message,
        metadata: {
          algorithm: this.name,
          version: this.version,
          failed: true,
          timestamp: Date.now()
        }
      };
    }

    /**
     * Get current performance statistics
     * @returns {Object} Performance statistics
     */
    getPerformanceStats() {
      const total = this.performance.totalAnalyses;
      
      return {
        totalAnalyses: total,
        highConfidenceRate: total > 0 ? this.performance.highConfidenceResults / total : 0,
        consensusRate: total > 0 ? this.performance.consensusAchieved / total : 0,
        ambiguousRate: total > 0 ? this.performance.ambiguousResults / total : 0,
        ...this.performance
      };
    }

    /**
     * Update algorithm weights based on performance feedback
     * @param {Array} feedbackData - Array of feedback examples
     */
    calibrate(feedbackData) {
      if (!feedbackData || feedbackData.length < 10) {
        console.warn('Insufficient feedback data for consensus engine calibration');
        return;
      }
      
      // Analyze which algorithms performed best
      const algorithmPerformance = {
        brightness: { correct: 0, total: 0 },
        color: { correct: 0, total: 0 },
        edge: { correct: 0, total: 0 },
        pattern: { correct: 0, total: 0 }
      };
      
      feedbackData.forEach(feedback => {
        if (feedback.algorithmResults && feedback.actualSelection !== undefined) {
          Object.keys(feedback.algorithmResults).forEach(algorithmName => {
            const result = feedback.algorithmResults[algorithmName];
            if (result && result.available) {
              algorithmPerformance[algorithmName].total++;
              if (result.selected === feedback.actualSelection) {
                algorithmPerformance[algorithmName].correct++;
              }
            }
          });
        }
      });
      
      // Update weights based on performance
      const totalWeight = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
      
      Object.keys(algorithmPerformance).forEach(algorithmName => {
        const perf = algorithmPerformance[algorithmName];
        if (perf.total > 0) {
          const accuracy = perf.correct / perf.total;
          const currentWeight = this.weights[algorithmName];
          
          // Adjust weight based on accuracy (gradual adjustment)
          const adjustment = (accuracy - 0.5) * 0.1; // Max 10% adjustment
          const newWeight = Math.max(0.1, Math.min(0.5, currentWeight + adjustment));
          this.weights[algorithmName] = newWeight;
        }
      });
      
      // Renormalize weights to maintain total weight
      const newTotalWeight = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
      const normalizationFactor = totalWeight / newTotalWeight;
      
      Object.keys(this.weights).forEach(algorithmName => {
        this.weights[algorithmName] *= normalizationFactor;
      });
      
      console.log('Consensus engine calibrated with new weights:', this.weights);
    }

    /**
     * Reset performance tracking
     */
    resetPerformanceTracking() {
      this.performance = {
        totalAnalyses: 0,
        highConfidenceResults: 0,
        consensusAchieved: 0,
        ambiguousResults: 0
      };
    }

    /**
     * Get current configuration
     * @returns {Object} Configuration object
     */
    getConfig() {
      return {
        name: this.name,
        version: this.version,
        weights: { ...this.weights },
        thresholds: { ...this.thresholds },
        performance: this.getPerformanceStats()
      };
    }
  }

  // Export for both browser and Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConsensusEngine;
  } else {
    global.ConsensusEngine = ConsensusEngine;
  }

})(typeof window !== 'undefined' ? window : global);
