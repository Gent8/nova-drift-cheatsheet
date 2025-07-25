# Nova Drift Screenshot Recognition - Phase Implementation Prompts

This directory contains organized prompts for implementing each phase of the screenshot-based preset recognition system.

## 📁 Directory Structure

## 📁 Directory Structure

```
phase-prompts/
├── README.md                           # This file
├── phase1-image-upload/
│   ├── initialize.md                   # Standard Phase 1 implementation prompt
│   └── architectural-fix.md            # Phase 1 architectural fix prompt
├── phase2-hex-mapping/
│   ├── initialize.md                   # Standard Phase 2 implementation prompt
│   └── critical-fix.md                 # Phase 2 critical implementation fix prompt
├── phase3-image-processing/
│   ├── initialize.md                   # Standard Phase 3 implementation prompt
│   └── critical-fix.md                 # Phase 3 critical implementation fix prompt
├── phase4-recognition/
│   ├── initialize.md                   # Standard Phase 4 implementation prompt
│   └── critical-issue-fix.md           # Phase 4 critical issue fix prompt
├── phase5-integration/
│   └── initialize.md                   # Standard Phase 5 implementation prompt
├── phase6-user-feedback/
│   └── initialize.md                   # Standard Phase 6 implementation prompt
├── phase7-testing/
│   └── initialize.md                   # Standard Phase 7 implementation prompt
└── phase8-documentation/
    └── initialize.md                   # Standard Phase 8 implementation prompt
```

## 🔄 Migration Note

This organized structure replaces the previous monolithic `initialize-prompts.md` file. All prompts have been separated into individual files within phase-specific directories for better maintainability.

## 📋 Usage Instructions

1. **Navigate to the appropriate phase directory**
2. **Copy the content from `initialize.md`** for standard implementation
3. **Use the fix prompts** (architectural-fix.md, critical-fix.md, etc.) when issues are discovered
4. **Paste into your AI conversation** to start that phase
5. **Ensure the agent runs unit tests** to verify all success criteria are met
6. **Check terminal output** to confirm tests pass before proceeding

## Phase Sequence

Execute in this order:
1. **Phase 1:** Image Upload & UX
2. **Phase 2:** Hex Grid Mapping  
3. **Phase 3:** Image Processing
4. **Phase 4:** Recognition Logic
5. **Phase 5:** System Integration
6. **Phase 6:** User Feedback
7. **Phase 7:** Testing & Calibration
8. **Phase 8:** Documentation

## Success Criteria

⚠️ **Critical**: Do not proceed to the next phase unless the agent has run terminal-based unit tests that verify all success criteria. Agents can easily read terminal output but may miss issues in HTML modules or other non-terminal outputs.

## Quick Reference

- **Project Type:** Haxe-based web application with JavaScript output
- **Architecture:** Client-side only, no external dependencies
- **Integration:** Must work with existing Nova Drift cheatsheet UI
- **Success Metrics:** >90% accuracy, <2s processing, <50KB payload, <100MB memory

---

*Generated for Nova Drift cheatsheet screenshot recognition system implementation*
