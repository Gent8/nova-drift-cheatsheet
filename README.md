## What this is
It's an interactive cheat sheet for Nova Drift.


## Initial setup for build
```
haxelib install csv
```

## Building
Copy `localization.csv` from Nova Drift directory to `bin/`

Do
```
haxe -lib csv -cp src -neko bin/gen.n -main Main
cd bin
neko gen.n
```
which generates `index.html`.

And
```
haxe -cp src -js bin/script.js -main WebMain
```
which generates `script.js`

## [Re-]building textures
1. Extract game sprites using [YYTextureView](https://yal.cc/r/17/yytextureview/) (open data.win, Show Sprites, Save Images).

2. Copy all textures starting with sHex to `base-full/`.

3. Generate lower-resolution textures using ImageMagick:
```
for %v in (base-full\*) do @magick %v -resize 64x64^ base-mini\%~nxv
```

4. Generate texture atlas and texture CSS using [free web variant of TexturePacker](https://www.codeandweb.com/free-sprite-sheet-packer) (set "Data format" to "CSS", set "Sprite prefix" to "hex").

5. Find-replace with regex in generated CSS file:
```
-sHex(\w+?)(?:_0)?
```
to
```
.$1
```

6. Convert the PNG spritesheet to JPEG. Background color doesn't matter since we're using clipping anyway.

## [Re-]building module hint file
```
haxe -lib csv -cp src -neko bin/modgen.n -main ModGen
cd bin
neko modgen.n
```