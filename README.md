## What this is
It's an [interactive cheat sheet for Nova Drift](https://gent8.github.io/nova-drift-cheatsheet/).

## Why
As a new player, I found it hard to find powerups and understand the synergies between different mods. This fork adds a search feature to the interactive cheat sheet, allowing you to quickly find specific mods.

## New Feature: Screenshot Import (In Development)
We're developing a screenshot import feature that allows players to upload screenshots of their Nova Drift builds and automatically import them into the cheat sheet. 

**Current Status**: Phase 0 validation complete. Manual crop will be the primary workflow due to Nova Drift's low-contrast UI making automated detection non-viable. See [Phase 0 Completion Summary](docs/phase0-completion-summary.md) for details.

## Initial setup for build
```
haxelib install csv
```

## Building
Copy `japanese.csv` from Nova Drift directory to `docs/` and rename it to `localization.csv`.

Do
```
haxe -lib csv -cp src -neko docs/gen.n -main Main
neko docs/gen.n
```
which generates `index.html`.

And
```
haxe -cp src -js docs/script.js -main WebMain
```
which generates `script.js`

## [Re-]building textures
1. Extract game sprites using [YYTextureView](https://yal.cc/r/17/yytextureview/) (open data.win, Show Sprites, Save Images).

2. Copy all textures starting with sHex to `base-full/`.

3. Generate lower-resolution textures using ImageMagick:
```
for %v in (base-full\*.png) do @magick %v -resize 48x48^ base-mini\%~nxv
```

4. Generate texture atlas and texture CSS using [free web variant of TexturePacker](https://www.codeandweb.com/free-sprite-sheet-packer) (set "Data format" to "CSS", set "Sprite prefix" to "hex").

5. Find-replace with regex in generated CSS file:
```
-sHex(\w+?)(?:_0)?\b
```
to
```
.$1
```

6. Replace `url(spritesheet.png)` with `url(hex.png)` in generated CSS file.

## [Re-]building module hint file
```
haxe -lib csv -cp src -neko docs/modgen.n -main ModGen
neko docs/modgen.n
```