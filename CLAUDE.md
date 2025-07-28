# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an interactive cheat sheet for Nova Drift (space shooter game) that runs as a static website on GitHub Pages. The project uses Haxe to generate both HTML content and client-side JavaScript, with a focus on helping players visualize game builds and understand mod synergies.

**Currently developing**: Screenshot Build Import Assistant - a client-side image recognition system that allows users to upload screenshots of game builds and automatically import them.

## Essential Commands

### Initial Setup
```bash
haxelib install csv
```

### Core Build Process
```bash
# 1. Copy localization file first
# Copy japanese.csv from Nova Drift directory to docs/ and rename to localization.csv

# 2. Generate HTML content
haxe -lib csv -cp src -neko docs/gen.n -main Main
neko docs/gen.n

# 3. Generate JavaScript
haxe -cp src -js docs/script.js -main WebMain
```

### Additional Build Commands
```bash
# Generate module hints
haxe -lib csv -cp src -neko docs/modgen.n -main ModGen
neko docs/modgen.n
```

### Texture Building (when updating game assets)
```bash
# Generate lower-res textures with ImageMagick
for %v in (base-full\*.png) do @magick %v -resize 48x48^ base-mini\%~nxv
```

## Architecture

### Core System
- **Static-only constraint**: Everything runs client-side to work with GitHub Pages
- **Haxe source** (`/src/`): Cross-compiles to JavaScript and Neko executables
- **Generated output** (`/docs/`): Built website files
- **Main.hx**: Generates HTML structure and mod data from enums
- **WebMain.hx**: Handles client interactions, tooltips, and search functionality

### Screenshot Import Feature (In Development)
- **Multi-stage recognition pipeline**: 4-phase system (Brightness, Color, Edge, Pattern detection)
- **Client-side ML**: Browser-based mod recognition from uploaded screenshots
- **Performance target**: <20 seconds end-to-end processing
- **Accuracy target**: >75% raw recognition, >95% user-verified
- **Storage**: IndexedDB for local caching and personalization

### Data Management
- **Mod definitions**: Extensive enum system in Haxe for all game modifications
- **Localization**: CSV-based translations (currently English/Japanese)
- **Build sharing**: URL parameter encoding for sharing mod configurations

## Key Technical Constraints

1. **No backend services**: All processing must happen client-side
2. **GitHub Pages hosting**: Static files only, no server-side processing
3. **Cross-browser compatibility**: Must work in modern browsers without additional dependencies
4. **Game data synchronization**: Mod data must be manually updated from game files

## Development Notes

- The project has no formal testing framework - testing is manual
- No linting or code formatting tools configured
- Code quality relies on Haxe compiler type checking
- Assets are extracted from game files using YYTextureView and processed with ImageMagick
- TexturePacker generates sprite atlases with specific CSS class naming conventions

## Recent Development Focus

The project is actively developing a sophisticated image recognition system for screenshot imports, organized in phases with detailed planning documents in `/docs/currentPlan/`. The system aims to automatically recognize game mods from user-uploaded screenshots while maintaining the static-only architecture constraint.