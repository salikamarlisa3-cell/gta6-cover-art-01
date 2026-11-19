# Neon Vice Panels — GTA-style Cover Art Maker

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/salikamarlisa3-cell/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/salikamarlisa3-cell/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Neon Vice Panels is a fully offline, canvas-based cover art maker in the
spirit of big open-world game key art: slanted multi-panel posters, bold
outlined headlines and sun-drenched colour grades. It opens on a finished
poster — the four built-in sample scenes pre-assigned to a Classic Panels
layout under the headline "NEON VICE" — and every control reshapes that
poster live. One renderer drives the on-screen preview, the PNG export and
the screenshot scenes, so the cover you see is exactly the cover you save.

## Features

- **Four layouts** with fraction-based geometry that adapts to any canvas
  size: Classic Panels (four-panel poster grid with slanted dividers),
  Hero Loading Screen (one big panel plus a slim side strip), Duo Split
  (two tall panels on a diagonal seam) and Trio Magazine (three columns
  under a "Special Edition" headline band).
- **Your photos, your framing**: upload through the file picker or by
  dragging a photo onto the poster. Click a panel to select it, assign the
  current photo to that panel or fill every panel at once, then drag on the
  canvas to reframe and use the slider or mouse wheel to zoom per panel.
- **Four sample scenes included**: two photographic samples from the kit
  (Boulevard, Pier) plus two scenes synthesized from scratch with the
  Python/PIL script in `tools/make-samples.py` — a neon boulevard night
  with palm and sports-car silhouettes, and a beach sunset with a
  boardwalk. All art is original; the app evokes a style without lifting
  any game's logos, artwork or fonts.
- **Caption block**: editable title and tagline in heavy uppercase
  lettering — white fill, dark outline, hard offset shadow and an accent
  bar — with size and vertical-position sliders.
- **Five one-click grades**: Vice Sunset, Neon Midnight, Golden Dusk,
  Vintage Print, and Chrome Rain (cool silver-blue with a magenta rim
  light bleeding in from the edges).
- **Export** a clean PNG (no selection UI) at exactly 1080×1080,
  1080×1350 or 1920×1080.
- **Zero network**: the app is plain static files under `app/` — vanilla
  JavaScript ES modules, local font stacks only, no requests of any kind.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 in a desktop browser.

Screenshot scenes are deterministic URLs, e.g.
`?shot=cover&layout=trio&grade=midnight&w=1024&h=1280` renders only the
cover at that size, and `?shot=editor&photo=boulevard` shows the full
editor with a photo loaded; `window.__shotReady` is set once painted.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` there via the vendored make.fun library.
