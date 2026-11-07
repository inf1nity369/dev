# Coca-Cola: premium CGI product spots (spec)

There are two cuts. Both are made entirely in code: Three.js rendered offline, with synthesized sound.

| Cut | Format | File |
|---|---|---|
| **Cinematic ASMR**: "Nothing sounds like an ice-cold Coke" | 9:16 vertical, 1080×1920, 25 fps, 15 s | `out/coca-cola-cinematic-asmr-9x16.mp4` |
| Bright studio: "Taste the Feeling" | 16:9, 1920×1080, 30 fps, 18 s | `out/coca-cola-ice-cold-spec-ad.mp4` |

## Cinematic ASMR cut (vertical)

The cut is warm macro cinematography in amber and gold. Sensory captions sit in a closed-caption style, and it ends on a black card and the red disc.

| Time | Shot | Caption |
|---|---|---|
| 0.0–2.0 | Macro on the frosted label. Focus breathes in as droplets catch the tungsten light. | [ ICE-COLD CONDENSATION ] |
| 2.0–3.6 | Lid macro: the tab lifts (2.2), then PSST (2.5), with CO₂ mist and spray. | [ THAT ICONIC PSST ] |
| 3.6–6.4 | A slow-motion jet of cola, backlit gold, carrying bubbles and peeling off spray. | [ MOUTHWATERING POUR ] |
| 6.4–9.6 | A zoom-dive into the drink, then rising bubbles in amber light under a slow rack focus. | [ A SYMPHONY OF BUBBLES ] |
| 9.6–12.0 | A Coca-Cola glass: drips slide over the printed wordmark while bubbles cling inside. | [ DRIPS OF PURE REFRESHMENT ] |
| 12.0–13.4 | Hero shot of the can and the glass on warm lacquer, then fade to black. | |
| 13.5–15.0 | "NOTHING SOUNDS LIKE / an Ice-Cold **Coke**.", then the red disc with the wordmark. | |

The sound is ASMR foreground with a quiet felt-piano bed in D major:
- condensation plips;
- the tab click, then a crisp PSST and fizz;
- a pour made of a bubbly stream and the rising pitch of a filling glass;
- muffled, underwater bubble plinks;
- drips letting go;
- a four-note sonic logo on the red disc.

```bash
./tools/build_asmr.sh        # renders + mixes out/coca-cola-cinematic-asmr-9x16.mp4 (~40 min on 4 cores)
NODE_PATH=$(npm root -g) node tools/render.cjs --edit asmr --stills 4.6,7.4,10.6
```

---

# Bright studio cut: "Ice Cold" / "Taste the Feeling"

An 18-second, 1080p/30 fps CGI product commercial for a Coca-Cola can. Everything is made in code:
- the picture is Three.js PBR, rendered offline frame by frame in headless Chromium;
- the sound design and score are synthesized in NumPy/SciPy;
- no stock footage, no samples, no AI-generated images.

> This is a spec / portfolio piece. It is not affiliated with or endorsed by The Coca-Cola Company.
> The wordmark comes from the Simple Icons package and is a trademark of its owner.

**Output:** `out/coca-cola-ice-cold-spec-ad.mp4` (H.264 High, yuv420p, AAC 256k, faststart). It plays on phones, Instagram, YouTube and TV.

## Edit (120 BPM, 2 s bars; every cut is a designed transition on the beat)

| Time | Shot | What happens |
|---|---|---|
| 0.0–1.0 | Intro | Dreamy open: carbonation rises in focus over a luminous red cyc with drifting bokeh. The can is a soft shape behind. |
| ~1.0 | **Ribbon wipe** | The white Coca-Cola swoosh sweeps across the frame and reveals the next shot. |
| 1.0–3.0 | Macro | A 100 mm macro on the condensation while a strip light glides across. Slogan: *"Ice cold."* |
| ~3.0 | **Zoom push** | Radial zoom blur through to the wordmark. |
| 3.0–5.0 | Logo glide | An 85 mm tracking move along the wordmark, with the can counter-rotating. |
| ~5.0 | **Bubble iris** | A growing bubble with an iridescent rim opens onto a bright cream studio. |
| 5.0–8.0 | Open | 3/4 view of the lid: tab click (5.5), then PHSST on the downbeat (6.0). Slogan: *"Open happiness."* |
| ~8.0 | **Light burst** | A warm flash plus zoom into the drop. |
| 8.0–12.0 | Swirl | A cola ribbon spirals up the can with a speed ramp to slow motion. Ice tumbles, bokeh sparkles. |
| ~12.0 | **Ribbon wipe** | The swoosh sweeps back the other way. |
| 12.0–18.0 | Hero → packshot | The can lands on glossy red lacquer (12.5), then glides to the right third. The wordmark appears (15.0), then *"Taste the Feeling."* (16.0) and a shine. |

## How it is built (techniques taken from pro beverage pack-shot work)

- **Can.** Real 330 ml proportions (66 mm Ø). It is a lathed body with a neck, double seam and countersink. The lid is a separate piece with spun-aluminium ring normals, plus an extruded tab, rivet and score panel that actually open.
- **Label.** An 8K procedural texture: brand red, the white dynamic ribbon, the wordmark and micro-print. Each ink gets its own material response:
  - red ink is semi-metallic;
  - white ink is dielectric;
  - bare aluminium is metal.
- **Condensation.** A procedural 4K height field turned into normal, frost and roughness maps:
  - droplet sizes are bimodal, the way real breath-figure condensation forms;
  - gravity pulls drops bottom-heavy;
  - running drips leave cleared trails;
  - big drops clear the frost around them.

  It drives a clearcoat "water layer" with its own normals and roughness, plus a frost veil.
- **Look.** A bright, friendly palette: a luminous Coca-Cola-red cyc with a coral glow, soft light rays and drifting bokeh, and a cream high-key studio for the opening moment. The grade is clean, with light vignette and grain.
- **Light.** An HDR studio built from emissive softboxes:
  - a key strip and a secondary strip, which make the vertical highlight lines;
  - twin back rims for the edge lines;
  - an overhead strip;
  - a red bounce.

  On top of that, an animated rect-area "sweep" light, a screen-space cyc with an art-directed red glow, and black lacquer with a mirrored reflection.
- **Liquid and FX.**
  - The cola is a transmissive physical material with caramel attenuation and backlit amber edges.
  - The procedural ribbon is rebuilt every frame.
  - Splash, crown and spray are ballistic instanced droplets.
  - Carbonation is instanced bubbles.
  - The ice is frosted and transmissive.
  - The CO₂ mist is sprites.
- **Camera.** Physical focal lengths on a 36 mm sensor. The eases are bezier curves, e.g. `cubic-bezier(.83,0,.17,1)` for hero moves. The spot also uses whip transitions, a speed ramp and deterministic decaying shake.
- **Finishing.** In order:
  1. 4–5 sub-frames per frame with a 180° shutter, which gives real motion blur. Sub-pixel jitter on those sub-frames supersamples the image.
  2. Physical thin-lens depth of field: a half-res golden-angle gather with bokeh highlights.
  3. Bloom with warm halation.
  4. Transitions composited between two fully rendered shots: ribbon wipe, zoom push, bubble iris and light burst.
  5. Khronos PBR Neutral tonemap (it keeps brand red from skewing orange), a gentle grade, kinetic typography, and dither.
- **Sound.** An upbeat 120 BPM tune in G major (G–D–Em–C), synthesized:
  - a marimba melody, doubled by bells after the drop;
  - a warm pad, plucky bass, soft kick, claps and shakers.

  Every transition has its own sound: a swoosh with glitter, zoom whoosh, bubble bloops and a burst shimmer. Then come the tab click, PHSST and fizz, ice clinks tuned to the key, a soft landing thump with splash, a glockenspiel arpeggio on the logo, and the melody resolves home on *"Taste the Feeling."*

## Run it

```bash
npm install
./tools/build.sh                       # full 1080p render + audio + mux (~1 h on 4 CPU cores, software GL)
NODE_PATH=$(npm root -g) node tools/render.cjs --stills 1.6,9,17.5   # check frames -> out/stills
NODE_PATH=$(npm root -g) node tools/render.cjs --video --w 960 --h 540 --sub 2 --out preview_540.mp4
python3 audio/sound.py out/soundtrack.wav
```

Real-time preview: serve the folder (e.g. `npx http-server .`) and open `index.html`. It has a scrub bar and play button. Add `?sub=3` for motion blur.

Files: `src/can.js` (model), `src/textures.js` (label + condensation), `src/stage.js` (studio),
`src/fx.js` (liquid, ice, bubbles, mist, bursts), `src/timeline.js` (edit + choreography),
`src/post.js` (finishing), `src/overlay.js` (end card), `audio/sound.py` (score + SFX), `tools/` (renderer).
