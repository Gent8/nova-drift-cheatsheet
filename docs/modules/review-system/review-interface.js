/**
 * Review Interface Module
 * Phase 2 enhancement - Visual mod review system for user corrections
 * Handles low-confidence detection review and manual corrections
 */

class ReviewInterface {
  constructor(options = {}) {
    this.options = {
      confidenceThreshold: 0.75, // Below this triggers review
      maxCandidates: 3, // Show top 3 candidates
      autoShowReview: true,
      enableKeyboardNavigation: true,
      showImageSnippets: true,
      enableSearch: true,
      ...options
    };

    this.state = {
      isVisible: false,
      currentReview: null,
      reviewQueue: [],
      reviewIndex: 0,
      totalReviews: 0,
      completedReviews: 0,
      userCorrections: [],
      searchQuery: ''
    };

    this.elements = {};
    this.callbacks = {};
    this.modDatabase = null; // Will be populated with mod definitions
    
    this.init();
  }

  /**
   * Initialize the review interface
   */
  init() {
    this.createInterface();
    this.setupEventListeners();
    this.loadModDatabase();
    
    if (this.options.enableKeyboardNavigation) {
      this.setupKeyboardControls();
    }
  }

  /**
   * Create the main review interface HTML structure
   */
  createInterface() {
    const reviewHTML = `
      <div id="review-interface" class="review-interface hidden" role="dialog" aria-labelledby="review-title">
        <div class="review-overlay"></div>
        <div class="review-modal">
          <!-- Header -->
          <div class="review-header">
            <h2 id="review-title">Review Recognition Results</h2>
            <div class="review-progress">
              <span class="review-counter">1 of 5</span>
              <div class="progress-bar">
                <div class="progress-fill"></div>
              </div>
            </div>
            <button class="review-close" aria-label="Close review">×</button>
          </div>

          <!-- Main content -->
          <div class="review-content">
            <!-- Current item review -->
            <div class="review-item">
              <!-- Image snippet -->
              <div class="review-image-section">
                <h3>Detected Region</h3>
                <div class="image-snippet-container">
                  <canvas class="image-snippet" width="96" height="96"></canvas>
                  <div class="detection-overlay">
                    <div class="detection-bounds"></div>
                  </div>
                </div>
                <div class="snippet-info">
                  <span class="position-info">Position: Core-1</span>
                  <span class="confidence-info">Confidence: 45%</span>
                </div>
              </div>

              <!-- Recognition results -->
              <div class="review-recognition-section">
                <h3>Recognition Results</h3>
                <div class="candidate-list">
                  <!-- Top candidates will be populated here -->
                </div>
              </div>

              <!-- Manual search/correction -->
              <div class="review-correction-section">
                <h3>Manual Correction</h3>
                <div class="mod-search">
                  <input type="text" 
                         class="search-input" 
                         placeholder="Search for mod name..."
                         aria-label="Search for mod name">
                  <div class="search-results">
                    <!-- Search results will be populated here -->
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="review-actions">
            <button class="btn-secondary review-skip">Skip This</button>
            <button class="btn-secondary review-previous" disabled>Previous</button>
            <button class="btn-primary review-accept" disabled>Accept</button>
            <button class="btn-primary review-next" disabled>Next</button>
            <button class="btn-success review-complete hidden">Complete Review</button>
          </div>

          <!-- Status messages -->
          <div class="review-status" role="status" aria-live="polite"></div>
        </div>
      </div>
    `;

    // Insert into DOM
    document.body.insertAdjacentHTML('beforeend', reviewHTML);
    
    // Cache element references
    this.elements = {
      interface: document.getElementById('review-interface'),
      modal: this.elements.interface?.querySelector('.review-modal'),
      overlay: this.elements.interface?.querySelector('.review-overlay'),
      title: document.getElementById('review-title'),
      counter: this.elements.interface?.querySelector('.review-counter'),
      progressBar: this.elements.interface?.querySelector('.progress-fill'),
      closeBtn: this.elements.interface?.querySelector('.review-close'),
      
      // Image section
      imageCanvas: this.elements.interface?.querySelector('.image-snippet'),
      positionInfo: this.elements.interface?.querySelector('.position-info'),
      confidenceInfo: this.elements.interface?.querySelector('.confidence-info'),
      
      // Recognition section
      candidateList: this.elements.interface?.querySelector('.candidate-list'),
      
      // Search section
      searchInput: this.elements.interface?.querySelector('.search-input'),
      searchResults: this.elements.interface?.querySelector('.search-results'),
      
      // Action buttons
      skipBtn: this.elements.interface?.querySelector('.review-skip'),
      previousBtn: this.elements.interface?.querySelector('.review-previous'),
      acceptBtn: this.elements.interface?.querySelector('.review-accept'),
      nextBtn: this.elements.interface?.querySelector('.review-next'),
      completeBtn: this.elements.interface?.querySelector('.review-complete'),
      
      // Status
      status: this.elements.interface?.querySelector('.review-status')
    };
  }

  /**
   * Set up event listeners for interface interactions
   */
  setupEventListeners() {
    if (!this.elements.interface) return;

    // Close button
    this.elements.closeBtn?.addEventListener('click', () => this.hide());
    this.elements.overlay?.addEventListener('click', () => this.hide());

    // Action buttons
    this.elements.skipBtn?.addEventListener('click', () => this.skipCurrent());
    this.elements.previousBtn?.addEventListener('click', () => this.goToPrevious());
    this.elements.nextBtn?.addEventListener('click', () => this.goToNext());
    this.elements.acceptBtn?.addEventListener('click', () => this.acceptCurrent());
    this.elements.completeBtn?.addEventListener('click', () => this.completeReview());

    // Search functionality
    this.elements.searchInput?.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });

    // Candidate selection (delegated event handling)
    this.elements.candidateList?.addEventListener('click', (e) => {
      if (e.target.closest('.candidate-item')) {
        this.selectCandidate(e.target.closest('.candidate-item'));
      }
    });

    // Search result selection (delegated event handling)
    this.elements.searchResults?.addEventListener('click', (e) => {
      if (e.target.closest('.search-result-item')) {
        this.selectSearchResult(e.target.closest('.search-result-item'));
      }
    });
  }

  /**
   * Set up keyboard navigation controls
   */
  setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      if (!this.state.isVisible) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.hide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.goToNext();
          break;
        case 'Enter':
          e.preventDefault();
          if (this.elements.acceptBtn && !this.elements.acceptBtn.disabled) {
            this.acceptCurrent();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.skipCurrent();
          }
          break;
      }
    });
  }

  /**
   * Load mod database for search functionality
   */
  async loadModDatabase() {
    try {
      // This would typically load from your existing mod definitions
      // For now, we'll create a placeholder structure
      this.modDatabase = await this.fetchModDatabase();
      this.buildSearchIndex();
    } catch (error) {
      console.warn('Failed to load mod database:', error);
      this.modDatabase = [];
    }
  }

  /**
   * Show the review interface with a queue of items to review
   * @param {Array} reviewQueue - Array of recognition results to review
   * @param {Object} options - Display options
   */
  show(reviewQueue, options = {}) {
    if (!reviewQueue || reviewQueue.length === 0) {
      this.showStatus('No items need review', 'success');
      return;
    }

    this.state.reviewQueue = reviewQueue;
    this.state.reviewIndex = 0;
    this.state.totalReviews = reviewQueue.length;
    this.state.completedReviews = 0;
    this.state.userCorrections = [];
    this.state.isVisible = true;

    this.elements.interface?.classList.remove('hidden');
    this.displayCurrentReview();
    this.updateProgressIndicators();
    
    // Focus management for accessibility
    this.elements.interface?.focus();
    
    // Callback for show
    if (this.callbacks.onShow) {
      this.callbacks.onShow(this.state);
    }
  }

  /**
   * Hide the review interface
   */
  hide() {
    this.state.isVisible = false;
    this.elements.interface?.classList.add('hidden');
    
    // Clear any timeouts or pending operations
    this.clearSearchTimeout();
    
    // Callback for hide
    if (this.callbacks.onHide) {
      this.callbacks.onHide(this.state);
    }
  }

  /**
   * Display the current review item
   */
  displayCurrentReview() {
    const currentItem = this.getCurrentReviewItem();
    if (!currentItem) return;

    this.state.currentReview = currentItem;

    // Update image snippet
    this.displayImageSnippet(currentItem);
    
    // Update position and confidence info
    this.updateItemInfo(currentItem);
    
    // Display recognition candidates
    this.displayCandidates(currentItem.candidates || []);
    
    // Update button states
    this.updateButtonStates();
    
    // Clear search
    this.clearSearch();
  }

  /**
   * Display the image snippet for the current item
   */
  displayImageSnippet(item) {
    if (!this.elements.imageCanvas || !item.imageData) return;

    const canvas = this.elements.imageCanvas;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image snippet
    try {
      const imageData = item.imageData;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageData, 0, 0);
      
      // Scale to fit canvas
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      
      // Draw detection bounds if available
      if (item.bounds) {
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          item.bounds.x * canvas.width / imageData.width,
          item.bounds.y * canvas.height / imageData.height,
          item.bounds.width * canvas.width / imageData.width,
          item.bounds.height * canvas.height / imageData.height
        );
      }
    } catch (error) {
      console.warn('Failed to display image snippet:', error);
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Image Error', canvas.width / 2, canvas.height / 2);
    }
  }

  /**
   * Update item information display
   */
  updateItemInfo(item) {
    if (this.elements.positionInfo) {
      this.elements.positionInfo.textContent = `Position: ${item.position || 'Unknown'}`;
    }
    
    if (this.elements.confidenceInfo) {
      const confidence = Math.round((item.confidence || 0) * 100);
      this.elements.confidenceInfo.textContent = `Confidence: ${confidence}%`;
      this.elements.confidenceInfo.className = `confidence-info confidence-${this.getConfidenceClass(confidence)}`;
    }
  }

  /**
   * Display recognition candidates
   */
  displayCandidates(candidates) {
    if (!this.elements.candidateList) return;

    this.elements.candidateList.innerHTML = '';

    candidates.slice(0, this.options.maxCandidates).forEach((candidate, index) => {
      const candidateElement = this.createCandidateElement(candidate, index);
      this.elements.candidateList.appendChild(candidateElement);
    });

    if (candidates.length === 0) {
      this.elements.candidateList.innerHTML = '<div class="no-candidates">No candidates found</div>';
    }
  }

  /**
   * Create a candidate element
   */
  createCandidateElement(candidate, index) {
    const element = document.createElement('div');
    element.className = 'candidate-item';
    element.dataset.candidateId = candidate.id;
    element.dataset.candidateIndex = index;
    
    const confidence = Math.round((candidate.confidence || 0) * 100);
    const isTopCandidate = index === 0;
    
    element.innerHTML = `
      <div class="candidate-info">
        <div class="candidate-name">${candidate.name || 'Unknown'}</div>
        <div class="candidate-confidence confidence-${this.getConfidenceClass(confidence)}">${confidence}%</div>
        ${isTopCandidate ? '<div class="top-candidate-badge">Top Match</div>' : ''}
      </div>
      <div class="candidate-preview">
        ${candidate.icon ? `<img src="${candidate.icon}" alt="${candidate.name}" class="candidate-icon">` : ''}
        <div class="candidate-description">${candidate.description || ''}</div>
      </div>
      <button class="candidate-select-btn" aria-label="Select ${candidate.name}">Select</button>
    `;

    return element;
  }

  /**
   * Handle search input with debouncing
   */
  handleSearchInput(query) {
    this.state.searchQuery = query.trim();
    
    this.clearSearchTimeout();
    
    if (this.state.searchQuery.length >= 2) {
      this.searchTimeout = setTimeout(() => {
        this.performModSearch(this.state.searchQuery);
      }, 300);
    } else {
      this.clearSearchResults();
    }
  }

  /**
   * Perform mod search
   */
  performModSearch(query) {
    if (!this.modDatabase || !query) return;

    const results = this.modDatabase
      .filter(mod => 
        mod.name.toLowerCase().includes(query.toLowerCase()) ||
        (mod.description && mod.description.toLowerCase().includes(query.toLowerCase())) ||
        (mod.tags && mod.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
      )
      .slice(0, 10) // Limit results
      .sort((a, b) => {
        // Prioritize exact name matches
        const aNameMatch = a.name.toLowerCase().includes(query.toLowerCase());
        const bNameMatch = b.name.toLowerCase().includes(query.toLowerCase());
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return a.name.localeCompare(b.name);
      });

    this.displaySearchResults(results);
  }

  /**
   * Display search results
   */
  displaySearchResults(results) {
    if (!this.elements.searchResults) return;

    this.elements.searchResults.innerHTML = '';

    results.forEach(result => {
      const resultElement = this.createSearchResultElement(result);
      this.elements.searchResults.appendChild(resultElement);
    });

    if (results.length === 0) {
      this.elements.searchResults.innerHTML = '<div class="no-search-results">No mods found</div>';
    }

    this.elements.searchResults.classList.toggle('hidden', results.length === 0);
  }

  /**
   * Create a search result element
   */
  createSearchResultElement(mod) {
    const element = document.createElement('div');
    element.className = 'search-result-item';
    element.dataset.modId = mod.id;
    
    element.innerHTML = `
      <div class="search-result-info">
        <div class="search-result-name">${mod.name}</div>
        <div class="search-result-description">${mod.description || ''}</div>
      </div>
      ${mod.icon ? `<img src="${mod.icon}" alt="${mod.name}" class="search-result-icon">` : ''}
    `;

    return element;
  }

  // Navigation methods
  goToPrevious() {
    if (this.state.reviewIndex > 0) {
      this.state.reviewIndex--;
      this.displayCurrentReview();
      this.updateProgressIndicators();
    }
  }

  goToNext() {
    if (this.state.reviewIndex < this.state.totalReviews - 1) {
      this.state.reviewIndex++;
      this.displayCurrentReview();
      this.updateProgressIndicators();
    } else {
      this.completeReview();
    }
  }

  // Action methods
  skipCurrent() {
    const currentItem = this.getCurrentReviewItem();
    if (currentItem) {
      this.recordCorrection(currentItem, null, 'skipped');
      this.goToNext();
    }
  }

  acceptCurrent() {
    const currentItem = this.getCurrentReviewItem();
    const selectedCandidate = this.getSelectedCandidate();
    
    if (currentItem && selectedCandidate) {
      this.recordCorrection(currentItem, selectedCandidate, 'accepted');
      this.goToNext();
    }
  }

  completeReview() {
    // Callback for completion
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(this.state.userCorrections);
    }
    
    this.hide();
  }

  // Helper methods
  getCurrentReviewItem() {
    return this.state.reviewQueue[this.state.reviewIndex] || null;
  }

  getSelectedCandidate() {
    const selected = this.elements.candidateList?.querySelector('.candidate-item.selected');
    if (selected) {
      return {
        id: selected.dataset.candidateId,
        index: parseInt(selected.dataset.candidateIndex),
        source: 'candidate'
      };
    }

    const searchSelected = this.elements.searchResults?.querySelector('.search-result-item.selected');
    if (searchSelected) {
      return {
        id: searchSelected.dataset.modId,
        source: 'search'
      };
    }

    return null;
  }

  selectCandidate(candidateElement) {
    // Clear other selections
    this.elements.candidateList?.querySelectorAll('.candidate-item').forEach(el => 
      el.classList.remove('selected'));
    this.elements.searchResults?.querySelectorAll('.search-result-item').forEach(el => 
      el.classList.remove('selected'));
    
    // Select this candidate
    candidateElement.classList.add('selected');
    this.updateButtonStates();
  }

  selectSearchResult(resultElement) {
    // Clear other selections
    this.elements.candidateList?.querySelectorAll('.candidate-item').forEach(el => 
      el.classList.remove('selected'));
    this.elements.searchResults?.querySelectorAll('.search-result-item').forEach(el => 
      el.classList.remove('selected'));
    
    // Select this result
    resultElement.classList.add('selected');
    this.updateButtonStates();
  }

  recordCorrection(item, correction, action) {
    this.state.userCorrections.push({
      timestamp: new Date().toISOString(),
      position: item.position,
      originalPrediction: item.topCandidate,
      userCorrection: correction,
      action: action,
      confidence: item.confidence,
      metadata: item.metadata || {}
    });

    this.state.completedReviews++;
  }

  updateProgressIndicators() {
    if (this.elements.counter) {
      this.elements.counter.textContent = 
        `${this.state.reviewIndex + 1} of ${this.state.totalReviews}`;
    }

    if (this.elements.progressBar) {
      const progress = ((this.state.reviewIndex + 1) / this.state.totalReviews) * 100;
      this.elements.progressBar.style.width = `${progress}%`;
    }
  }

  updateButtonStates() {
    const hasSelection = this.getSelectedCandidate() !== null;
    const isFirst = this.state.reviewIndex === 0;
    const isLast = this.state.reviewIndex === this.state.totalReviews - 1;

    if (this.elements.previousBtn) {
      this.elements.previousBtn.disabled = isFirst;
    }

    if (this.elements.acceptBtn) {
      this.elements.acceptBtn.disabled = !hasSelection;
    }

    if (this.elements.nextBtn) {
      this.elements.nextBtn.disabled = isLast && !hasSelection;
      this.elements.nextBtn.classList.toggle('hidden', isLast);
    }

    if (this.elements.completeBtn) {
      this.elements.completeBtn.classList.toggle('hidden', !isLast);
    }
  }

  // Utility methods
  getConfidenceClass(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 60) return 'medium';
    if (confidence >= 40) return 'low';
    return 'very-low';
  }

  clearSearch() {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    this.clearSearchResults();
    this.state.searchQuery = '';
  }

  clearSearchResults() {
    if (this.elements.searchResults) {
      this.elements.searchResults.innerHTML = '';
      this.elements.searchResults.classList.add('hidden');
    }
  }

  clearSearchTimeout() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
  }

  showStatus(message, type = 'info', duration = 3000) {
    if (!this.elements.status) return;

    this.elements.status.textContent = message;
    this.elements.status.className = `review-status ${type}`;
    this.elements.status.classList.remove('hidden');

    if (duration > 0) {
      setTimeout(() => {
        this.elements.status.classList.add('hidden');
      }, duration);
    }
  }

  // Public API methods
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Placeholder for mod database fetching
  async fetchModDatabase() {
    // This would typically fetch from your existing mod definitions
    // For now, return a placeholder structure
    return [
      {
        id: 'absorption',
        name: 'Absorption',
        description: 'Converts damage to shields',
        icon: 'assets/Absorption.png',
        tags: ['defense', 'shield']
      },
      // More mods would be loaded here...
    ];
  }

  buildSearchIndex() {
    // Could implement more sophisticated search indexing here
    // For now, simple array filtering is sufficient
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReviewInterface;
} else if (typeof global !== 'undefined') {
  global.ReviewInterface = ReviewInterface;
}