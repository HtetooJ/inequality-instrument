# Inequality instrument

Standalone React/Vite exploration for testing a fixed inequality with a finite-range rotary dial and a split-flap calculation board.

## Run locally

```sh
npm install
npm run dev
```

SND03 Industrial JP drives the flap and control cues from the official SND library. The completion sounds are bundled recordings. Board lettering uses Barlow Condensed.

## Controls

- Turn the circular dial by dragging around its face or use the arrow keys. It selects values 1–20 and stops at both ends; zero is not available. The red pointer and outer marks show the selected position.
- Press **Run** to reveal four calculation rows at 0.6-second intervals. The first three rows play a flap cue; the final TRUE/FALSE row plays the selected completion recording once as it appears. The result holds until **Reset**, which restores x to 9.
- The board status shows the test value and whether the instrument is ready, playing, or complete. The red carriage moves through the active row.
- Use the header **Sound** switch to mute or enable audio. Open **Settings** to compare Rising pitch, Rising tempo, and Alternating emphasis flap cadences, or preview and select a recorded bell or struck-metal chime for completion. Output level is fixed at maximum and Run/Reset presses are quiet. Settings also offers Light enamel / Graphite finishes. On desktop, Settings reserves a side column; on narrow screens it appears below the instrument. Preview choices reset on reload.
- `Home` and `End` on the focused dial select 1 and 20. `Arrow Up/Right` adds one; `Arrow Down/Left` subtracts one.

The first viewport is art-directed for desktop. On a narrow screen, the dial and board remain in the instrument layout, and the conclusion uses two flap lines.

## Asset notes

- SND03 Industrial JP belongs to Dentsu / INDUSTRIAL JP. Its audio is delivered under the SND site terms through the library’s published audio sprite. [SND terms and attribution](https://snd.dev/) · [SND sound library](https://github.com/snd-lib/snd-lib)
- Completion recording sources and licenses are listed in `public/sounds/CREDITS.md`.
- The prototype uses Barlow Condensed and IBM Plex Mono from Google Fonts. For production integration, bundle the font files and preserve their OFL notices.

No generated 3D files are needed. The wheel and character units are precise SVG/CSS geometry at a fixed camera angle.
