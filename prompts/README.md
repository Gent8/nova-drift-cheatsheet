# Implementation Prompts - Nova Drift Screenshot Recognition

This directory contains detailed prompts for implementing the screenshot-based preset recognition system for the Nova Drift cheatsheet. Each prompt is designed to guide an AI agent through a specific phase of the implementation.

## 📋 Prompt Sequence

Execute these prompts in order, ensuring each phase is complete and tested before moving to the next:

1. **[Phase 1: Image Upload & UX](01-phase1-image-upload.md)** - File handling and user interface
2. **[Phase 2: Hex Grid Mapping](02-phase2-hex-mapping.md)** - Coordinate system and position mapping
3. **[Phase 3: Image Processing](03-phase3-image-processing.md)** - Canvas manipulation and region extraction
4. **[Phase 4: Recognition Logic](04-phase4-recognition.md)** - Selection detection algorithms
5. **[Phase 5: System Integration](05-phase5-integration.md)** - Connect with mod selection system
6. **[Phase 6: User Feedback](06-phase6-user-feedback.md)** - Results display and correction interface
7. **[Phase 7: Testing & Calibration](07-phase7-testing.md)** - Automated testing and validation
8. **[Phase 8: Documentation](08-phase8-documentation.md)** - User guides and technical docs

## 🎯 Usage Instructions

### For AI Agents
1. Read `../implementation/README.md` first for architectural overview
2. Execute prompts sequentially, one phase at a time
3. Complete all success criteria before proceeding to next phase
4. Test functionality after each phase
5. Ensure integration with existing codebase

### For Human Developers
- Each prompt can be adapted for human development teams
- Reference the detailed implementation docs in `../implementation/`
- Follow the technical specifications and success criteria
- Maintain the modular, client-side architecture

## 🔧 Technical Context

**Project Type:** Haxe-based web application with JavaScript output  
**Architecture:** Client-side only, no external dependencies  
**Integration:** Must work with existing Nova Drift cheatsheet UI  
**Browser Support:** Chrome 90+, Firefox 90+, Safari 14+, Edge 90+

## 📊 Success Metrics

- **Accuracy:** >90% for high-quality screenshots
- **Performance:** <2s processing time for 1920x1080 images
- **File Size:** <50KB additional JavaScript payload
- **Memory:** <100MB peak usage during processing

## 🚀 Quick Start

```bash
# Start with Phase 1
# Read and execute: 01-phase1-image-upload.md

# After Phase 1 completion, proceed to Phase 2
# Read and execute: 02-phase2-hex-mapping.md

# Continue sequentially through all phases...
```

## 📝 Notes

- Each prompt includes specific integration points with existing code
- Success criteria are clearly defined for each phase
- Testing requirements are included in each prompt
- Architecture principles are maintained throughout all phases
