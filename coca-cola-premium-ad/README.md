# Coca-Cola, "Ice Cold": a premium studio product spot (spec)

An 18-second, 1080p/30 fps CGI product commercial for a Coca-Cola can. Everything is made in code:
- the picture is Three.js PBR, rendered offline frame by frame in headless Chromium;
- the sound design and score are synthesized in NumPy/SciPy;
- no stock footage, no samples, no AI-generated images.

> This is a spec / portfolio piece. It is not affiliated with or endorsed by The Coca-Cola Company.
> The wordmark comes from the Simple Icons package and is a trademark of its owner.

**Output:** `out/coca-cola-ice-cold-spec-ad.mp4` (H.264 High, yuv420p, AAC 256k, faststart). It plays on phones, Instagram, YouTube and TV.

## Edit (cuts on a 150 BPM grid: 0.4 s beats, 1.6 s bars)

| Time | Shot | What happens |
|---|---|---|
| 0.0–2.8 | Cold reveal | Fade up from black on an extreme 100 mm macro of the frosted shoulder. A strip light slides across and the droplets ignite. One big bead lets go and runs down (stick-slip). |
| 2.8–5.2 | Logo glide | 85 mm tracking move along the wordmark. The can counter-rotates, droplets go through the focus plane, and the shot ends on a whip-pan. |
| 5.2–8.0 | Phsst | Whip in to a 3/4 top-down view of the lid: near-silence, then the tab click (6.0) and the PHSST on the bar downbeat (6.4). CO₂ mist, spray, a flash frame and a camera kick follow, and the fizz rises. |
| 8.0–11.6 | Swirl | The drop. A cola ribbon spirals up around the can and speed-ramps from 1× to 0.2× slow motion. Ice tumbles through frame while splash droplets and carbonation fill the air. The camera orbits about 70°. |
| 11.6–14.4 | Hero landing | The can falls into a low hero frame and lands on wet black lacquer on the beat: crown splash, camera shake, sub boom. A light sweep then crosses the logo. |
| 14.4–18.0 | Packshot | The camera settles with the can on the right third. The wordmark wipes in on the left (15.2), the tagline tightens its tracking (15.8), and a shine sweeps across (16.35). The frame holds, then fades. |

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
  1. 5 sub-frames per frame with a 180° shutter, which gives real motion blur. Sub-pixel jitter on those sub-frames supersamples the image.
  2. Physical thin-lens depth of field: a half-res golden-angle gather with bokeh highlights.
  3. Bloom with warm halation.
  4. Khronos PBR Neutral tonemap (it keeps brand red from skewing orange), contrast, split-tone, vignette, chromatic aberration, film grain and dither.
- **Sound.** The track follows Coca-Cola's sound ritual: tab click → PHSST → fizz. It also has:
  - whooshes that follow the camera;
  - a riser into a 150 BPM half-time groove (D minor → F);
  - a liquid swirl and ice clinks;
  - a landing boom with splash;
  - a bell sting on the logo.

  Everything goes through a reverb and a glue compressor/limiter.

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
