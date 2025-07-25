# Phase 5: System Integration & Selection Application

**Duration:** 2-3 days  
**Dependencies:** Phases 1-4 (Complete recognition pipeline)  
**Output:** Applied mod selections integrated with existing cheatsheet system

## 📋 Overview

Integrates recognition results with the existing Nova Drift Cheatsheet selection system, applying detected selections while maintaining compatibility with manual user interactions.

### Success Criteria
- ✅ Seamless integration with existing `.hex[checked]` system
- ✅ Preserve all existing functionality (URL sharing, prefab export)
- ✅ Handle conflicts between detection and manual selection
- ✅ Maintain state consistency and event flow

### Input from Phase 4
```javascript
{
  type: 'selection-detected',
  detail: {
    detectionResults: Map<string, DetectionResult>,
    overallConfidence: number,
    detectionMetadata: Metadata
  }
}
```

---

## Implementation Sub-Steps

### 5.1 Selection Application Engine

**File:** `docs/modules/selection-applicator.js`

```javascript
class SelectionApplicator {
  constructor() {
    this.existingSelectionHandler = window.onHexToggle; // From base.js
    this.conflictResolution = 'confirm'; // 'auto', 'confirm', 'manual'
  }
  
  async applyDetectedSelections(detectionResults, options = {}) {
    const { 
      clearExisting = true,
      confidenceThreshold = 0.7,
      confirmConflicts = true 
    } = options;
    
    // Store current state for rollback
    const currentState = this.captureCurrentState();
    
    try {
      // Clear existing selections if requested
      if (clearExisting) {
        this.clearAllSelections();
      }
      
      // Filter results by confidence
      const highConfidenceResults = Array.from(detectionResults.values())
        .filter(result => result.confidence >= confidenceThreshold);
      
      // Apply selections
      const applicationResults = await this.applySelections(highConfidenceResults);
      
      // Update UI counters and state
      this.updateUIState();
      
      // Emit completion event
      this.emitApplicationComplete(applicationResults);
      
    } catch (error) {
      // Rollback on failure
      this.rollbackToState(currentState);
      throw error;
    }
  }
  
  async applySelections(detectionResults) {
    const results = { applied: [], skipped: [], failed: [] };
    
    for (const detection of detectionResults) {
      if (!detection.selected) continue;
      
      try {
        const applied = await this.applyModSelection(detection.modName);
        if (applied) {
          results.applied.push(detection.modName);
        } else {
          results.skipped.push(detection.modName);
        }
      } catch (error) {
        results.failed.push({ modName: detection.modName, error: error.message });
      }
    }
    
    return results;
  }
  
  async applyModSelection(modName) {
    // Find mod elements in DOM
    const hexElements = document.querySelectorAll(`.hex[data-hex-name="${modName}"]`);
    
    if (hexElements.length === 0) {
      console.warn(`No hex elements found for mod: ${modName}`);
      return false;
    }
    
    // Use existing selection logic
    const primaryHex = hexElements[0];
    if (!primaryHex.hasAttribute('checked')) {
      primaryHex.click(); // Triggers existing onHexToggle logic
      return true;
    }
    
    return false; // Already selected
  }
}
```

### 5.2 Conflict Resolution System

```javascript
class ConflictResolver {
  async resolveConflicts(detectedSelections, currentSelections) {
    const conflicts = this.identifyConflicts(detectedSelections, currentSelections);
    
    if (conflicts.length === 0) return { resolution: 'none', changes: [] };
    
    const resolution = await this.promptUserForResolution(conflicts);
    
    switch (resolution.action) {
      case 'apply_detected':
        return this.applyDetectedOverrides(conflicts);
      case 'keep_current':
        return { resolution: 'keep_current', changes: [] };
      case 'selective':
        return this.applySelectiveChanges(resolution.selections);
      default:
        throw new Error('Invalid conflict resolution');
    }
  }
  
  identifyConflicts(detected, current) {
    const conflicts = [];
    
    for (const [modName, detection] of detected) {
      const currentlySelected = current.has(modName);
      const shouldBeSelected = detection.selected && detection.confidence > 0.7;
      
      if (currentlySelected !== shouldBeSelected) {
        conflicts.push({
          modName,
          current: currentlySelected,
          detected: shouldBeSelected,
          confidence: detection.confidence
        });
      }
    }
    
    return conflicts;
  }
}
```

### 5.3 State Management Integration

```javascript
// Integration with existing base.js functionality
class StateManager {
  constructor() {
    this.originalHandlers = {
      onHexToggle: window.onHexToggle,
      onMaxToggle: window.onMaxToggle,
      resetSelection: document.getElementById('reset-selection').onclick
    };
  }
  
  preserveExistingFunctionality() {
    // Ensure screenshot application doesn't break existing features
    this.validateURLSharing();
    this.validatePrefabExport();
    this.validateSelectionCounting();
  }
  
  validateURLSharing() {
    // Test that copy-link functionality still works
    const copyLinkButton = document.getElementById('copy-link');
    const originalHandler = copyLinkButton.onclick;
    
    // Ensure our changes don't interfere
    copyLinkButton.onclick = (e) => {
      try {
        return originalHandler.call(copyLinkButton, e);
      } catch (error) {
        console.error('URL sharing broken by screenshot integration:', error);
        throw error;
      }
    };
  }
}
```

---

## Testing Requirements

### Integration Tests

```javascript
describe('Selection Application Integration', () => {
  it('should apply selections without breaking existing functionality', async () => {
    const mockDetections = createMockDetectionResults();
    
    // Apply selections
    await selectionApplicator.applyDetectedSelections(mockDetections);
    
    // Test existing functionality still works
    expect(document.querySelectorAll('.hex[checked]').length).toBeGreaterThan(0);
    expect(document.getElementById('hex-select-count').textContent).toBeTruthy();
    
    // Test URL sharing
    const copyLinkButton = document.getElementById('copy-link');
    expect(() => copyLinkButton.click()).not.toThrow();
    
    // Test prefab export
    const copyPrefabButton = document.getElementById('copy-prefab');
    expect(() => copyPrefabButton.click()).not.toThrow();
  });
});
```

---

## Implementation Checklist

### Phase 5.1: Core Integration
- [ ] Implement SelectionApplicator class
- [ ] Integrate with existing onHexToggle logic
- [ ] Add state capture and rollback functionality
- [ ] Test with existing mod selection system
- [ ] Validate URL sharing compatibility
- [ ] Ensure prefab export functionality

### Phase 5.2: Conflict Resolution
- [ ] Build ConflictResolver system
- [ ] Create user prompt interface
- [ ] Implement selective application logic
- [ ] Test conflict detection accuracy
- [ ] Add manual override options
- [ ] Document resolution strategies

### Phase 5.3: Testing & Validation
- [ ] Write integration tests
- [ ] Test existing functionality preservation
- [ ] Validate state consistency
- [ ] Benchmark application performance
- [ ] Test edge cases and error handling

---

**Next Phase:** [Phase 6: User Feedback & Results Display](Phase6-UserFeedback.md)
