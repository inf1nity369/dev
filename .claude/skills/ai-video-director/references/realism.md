# Photorealism in AI Video — Skin, Color, Texture, Motion, Environment

**The master principle:** AI video models default to the *average of their training data's "high-quality" subset* — stock footage, ads, beauty retouching, HDR phone processing. That average IS the fake look: too sharp, too saturated, too smooth, too symmetrical, too well-lit. Photorealism is achieved by prompting *away* from perfection and *toward* the specific imperfections of real cameras, real optics, real skin, and real physics. **Realism = specified imperfection.**

## 1. Skin Realism

**Why AI skin looks waxy/plastic:** (a) training data dominated by retouched commercial imagery; (b) diffusion denoising suppresses high-frequency micro-texture (pores, vellus hair) because it's statistically indistinguishable from noise; (c) the model renders skin as a single uniform surface — real skin is translucent and layered. In VFX terms: missing **subsurface scattering** (light enters skin, scatters in dermis, exits elsewhere — red warmth in shadow transitions, glow at backlit ears/nostrils/fingers) and wrong **specular response** (real skin has layered specular lobes — oily T-zone sheen vs matte cheeks; uniform reflectivity = plastic).

**Prompt vocabulary for real skin:**
- **visible skin pores**, **natural skin texture with slight imperfections**, **fine lines**, **vellus hair / peach fuzz catching the light**, **subtle freckles**, **faint blemishes**, **slight redness around the nose**, **uneven skin tone**, **stubble**, **chapped lips**
- **subsurface scattering**, **translucent skin at ear edges**, **realistic specular highlights**, **slight oily sheen on forehead and nose (T-zone)**, **matte cheeks**
- Asymmetry cues: **slightly asymmetrical face**, **one eyebrow higher**, **crooked tooth** — perfect symmetry is a top AI tell.
- Anti-retouch: **no skin smoothing**, **unretouched**, **no beauty filter**

Example: *"Close-up of a man in his 40s, natural skin texture with visible pores and fine lines, slight forehead sheen under window light, faint stubble, subtle redness around the nose, unretouched documentary look."*

**Critical caveat:** over-stacking micro-texture words in the *motion* prompt causes texture shimmer/crawl across frames. Keep 2–3 texture terms max in the video prompt; in image-to-video, bake micro-texture into the reference frame instead. Lighting does more than keywords: **soft directional light from a single source** (window light, overcast) reveals texture; flat even lighting erases it.

## 2. Color Science & Grading

**AI's default failure:** oversaturated, HDR-ish, high micro-contrast — the "Instagram ad" average. Real cinema is *restrained*: controlled palette, compressed saturation, soft tonal curve.

**Film-look anatomy:**
- **Lifted blacks / faded blacks** — shadows never reach pure black. Crushed blacks = digital/AI tell.
- **Rolled-off highlights** — film compresses toward white gradually. Prompt: **soft highlight roll-off**, **no blown highlights**.
- **Halation** — red/orange glow bleeding around bright highlights (CineStill 800T signature). Prompt: **subtle halation around light sources**.
- **Gentle S-curve contrast, muted/desaturated palette**, saturation concentrated in skin tones.

**Film stock vocabulary (style tokens models respond to):**
- **Kodak Portra 400** — warm, low contrast, flattering pastel skin, lifted blacks (portrait look).
- **Kodak Vision3 250D** — daylight cine stock, clean neutral color, fine grain (daytime exteriors).
- **Kodak Vision3 500T** — tungsten night stock; cool daylight shift, grainier, neon-friendly (night/urban).
- **Fujifilm Eterna** — soft, low-saturation, cool-green cinema look.
- **CineStill 800T** — tungsten + strong halation; night-street aesthetic.

Fragment: *"shot on Kodak Vision3 500T 35mm film, tungsten-balanced, lifted blacks, soft highlight roll-off, subtle halation on neon signs, muted color palette"*

**Named grades:** **teal and orange** (specify "subtle" — it's cliché at full strength), **bleach bypass** (desaturated, high-contrast, silvery — war/thriller), **desaturated shadows with warm highlights**, **flat/log-like contrast**.

**White balance & mixed temperature** — a huge realism lever AI underuses. Real interiors mix sources: **warm tungsten practicals (3200K) against cool blue daylight from windows (5600K)**, **green-tinted fluorescent spill**, **sodium-vapor orange streetlights**. Prompt the *mix*: *"kitchen lit by warm tungsten overhead bulb, cool blue daylight spilling from the window, mixed color temperature."* Single perfectly-white-balanced light everywhere = synthetic.

**Palette discipline:** name 2–3 colors and forbid the rest: *"restrained palette of olive green, cream, and faded denim blue; muted saturation."* Counter the HDR default explicitly: **natural contrast**, **muted colors**, **standard dynamic range**.

## 3. Film Texture & Lens Character

Clinical digital cleanliness reads as CG. Every real image passes through imperfect optics and a noisy capture medium.

- **Grain:** **fine 35mm film grain** (tight, organic) vs **coarse 16mm grain** (chunky, documentary) vs **Super 8** (heavy grain, gate weave, home-movie). Grain also masks AI texture-crawl — creators add grain in post precisely to hide diffusion artifacts. Digital equivalent: **visible high-ISO sensor noise in the shadows** for dim scenes.
- **Why "shot on..." works:** camera/stock tokens pull the whole correlated bundle of training data — grain, color response, dynamic range, lens behavior — more reliably than listing attributes separately.
- **Lens imperfections:** **slight chromatic aberration at frame edges**, **natural vignetting / corner falloff**, **soft focus falloff at edges**, **slight barrel distortion** (wide/phone lenses), **lens breathing on focus pulls**.
- **Flares:** **anamorphic horizontal blue flare streaks** (cinema signature) vs **veiling glare** (overall low-contrast haze when shooting toward light — subtler and more realistic) vs **soft bloom around highlights**.
- **Sharpness:** ask for **slight softness**, **organic softness**, **gentle diffusion (Black Pro-Mist filter look)**; avoid "ultra sharp, 8K, highly detailed" which drive the clinical AI look.
- **Motion blur:** **natural motion blur**, **24fps with 180-degree shutter**. Frozen-crisp fast motion = synthetic tell.

Fragment: *"handheld 16mm documentary footage, coarse film grain, slight chromatic aberration, natural vignetting, gentle veiling glare from the window, soft organic focus."*

## 4. Motion Realism

Humans are never still. AI defaults to statue-stillness or dreamy floatiness.

**Micro-movement baseline (prompt explicitly):**
- **Blinks** — real rate ~every 3–5 s; AI faces under-blink ("dead stare"). Prompt: **blinking naturally**.
- **Breathing** — **chest rising and falling subtly**.
- **Weight shifts** — **shifting weight from one foot to the other**, **adjusting posture**.
- **Eyes** — real gaze darts in saccades; prompt **eyes glancing around the room**, **gaze shifting between objects**, **looking slightly off-camera then back**. Fixed locked gaze = uncanny.
- **Fidgets:** **fingers tapping**, **adjusting sleeve**, **tucking hair behind ear**, **micro expressions**, **small nod**.

**Secondary motion / inertia / follow-through** — what sells physical weight. Prompt with timing: *"she turns her head; her ponytail swings and settles half a second later"*, *"jacket hem bounces once before settling"*, **hair responding to movement and breeze**, **fabric settling after motion**, **momentum and inertia**, **weight and gravity in every movement**. Keep bounded: one primary action + 1–2 supporting micro-motions; more competing gestures = temporal instability.

**Gait:** AI walking errors = foot sliding, wrong cadence, no arm counter-swing, floaty bob. Fix by specifying contact and pace: *"walking slowly with a steady gait, heels striking the pavement, arms swinging naturally, slight head bob."*

**Hands:** worst anatomy zone. Mitigations: (1) **anchor hands to objects** — *"hand wrapped around a coffee mug"* is far more stable than free-gesturing hands; (2) frame to hide — **waist-up shot**, **hands in pockets**; (3) keep hand actions simple, clips short; (4) negatives: **extra fingers, fused fingers, deformed hands**.

**Lip-sync:** separate the dialogue block from visual description (measurably improves sync); keep lines short. Honest caveat: prompting biases but doesn't guarantee — generate multiple takes and cherry-pick; motion realism is partly a *selection* problem.

## 5. Environment Realism

- **Atmospheric depth:** air is never clear. **Atmospheric haze softening the distant skyline**, **light morning fog**, **dust motes floating in a shaft of sunlight**, **heat shimmer**, **smoke drifting through the light beam** — particles tell the model where depth lives (**volumetric light**, **god rays** — sparingly).
- **Aerial perspective:** **distant hills faded by atmospheric perspective** (lower contrast, cooler, hazier with distance).
- **Parallax:** specify layers for camera moves: *"slow dolly left; foreground branches drift faster than the distant buildings — natural parallax."*
- **Reflections/shadows consistency:** anchor them — **reflections on wet pavement**, **her reflection moving in the shop window**, **long shadows anchoring the late-afternoon sun**, **soft contact shadows under every object**. Missing contact shadows make objects float.
- **Crowds:** background extras are a top tell (clone faces, broken gait). Keep crowds **sparse, out of focus, in mid-distance**: *"a few blurred pedestrians passing in the background, shallow depth of field."* Never put a crowd in sharp focus.
- **Water/fire/smoke:** push explicitly — **sunlight refracting through the water**, **ripples spreading from the oar**, **caustic light patterns**; fire: **flickering irregular flames, embers rising**; smoke: **curling, dissipating smoke**. Keep fluid interactions simple.

Fragment: *"wet asphalt reflecting neon signage, light rain, atmospheric haze over the far intersection, a few out-of-focus pedestrians, long shadows from sodium streetlights."*

## 6. Uncanny Valley Checklist — tells → countermeasures

| Tell | What it looks like | Prompt countermeasure |
|---|---|---|
| Morphing/identity drift | Face "melts"/ages across shot | Short clips (4–8s); strong reference image; one subject, one action |
| Texture crawl | Skin/hair/walls shimmer frame-to-frame | Fewer micro-texture keywords in motion prompt; add **film grain** (masks crawl); texture in reference image |
| Dead eyes | No blinks, locked gaze, glassy | **blinking naturally, eyes glancing around, catchlights in eyes** |
| Too-smooth/floaty motion | Dreamlike ease, no weight | **weight, momentum, inertia**; follow-through timing; **handheld camera** |
| Perfect symmetry/beauty | Flawless model-average face | **slightly asymmetrical features, ordinary-looking, average face** |
| Warping background | Walls/objects shift behind subject | Simple static backgrounds; shallow DOF; **locked-off tripod shot** |
| Object permanence failures | Items appear/vanish | Fewer props; anchor hands to one object; short duration |
| Hands | Extra/fused fingers | Hide, anchor, or simplify; negatives **extra fingers, deformed hands** |
| Text gibberish | Signs/labels as alien script | **no visible text or signage**; add real text in post |
| Too-perfect lighting | Uniform flattering light everywhere | One motivated source, mixed color temps, **practical lights**, shadows |
| No contact shadows | Floating objects/feet | **grounded, contact shadows, feet firmly planted** |
| Oversaturated HDR sheen | Vivid plastic world | Film stock + **muted palette, natural contrast** |
| Clone crowds | Identical/glitching background people | Blur, sparsity, mid-distance |
| Wrong motion blur | Crisp frozen fast motion | **natural motion blur, 24fps, 180° shutter** |

## 7. Negative Prompts & Avoidance Vocabulary

**Words to AVOID in positive prompts** (they steer toward AI-slop average): *beautiful, stunning, gorgeous, perfect, flawless, hyperrealistic, ultra-realistic, 8K, ultra-detailed, masterpiece, award-winning, epic, perfect lighting.*

**Replace with documentary/mundane register:** **candid**, **unposed**, **documentary footage**, **news b-roll**, **observational**, **unremarkable**, **ordinary**, **mundane**, **everyday**, **unstaged**, **caught mid-moment**, **raw footage**, **archival**.

**The "amateur iPhone footage" trick** — the single most-cited realism hack. Deliberately prompting *low* production value reads as authentic because nobody fakes bad footage: *"amateur iPhone footage, handheld, slight camera shake, auto-exposure adjusting, slight motion blur, natural lighting, muted colors, vertical video."* Related registers: **dashcam footage**, **CCTV / security camera**, **bodycam**, **GoPro**, **home video, 2009 camcorder**, **found footage**, **Zoom call recording** — each carries its own correlated imperfection bundle.

**The "unremarkable" trick:** describe subjects as **an ordinary-looking man**, **a woman with an average face**, **unremarkable suburban street** — fights the model's pull toward idealized faces, a core uncanny trigger.

**Working negative-prompt list for realism** (Kling has a dedicated negative field; Veo takes a "no X" constraints line; Runway has no field — phrase as positive descriptions there): `cartoon, anime, illustration, 3D render, CGI, painting, plastic skin, smooth skin, airbrushed, beauty filter, oversaturated, overexposed, HDR, oversharpened, extra fingers, fused fingers, deformed hands, warped face, morphing, flickering, subtitles, captions, watermark, text overlay, slow motion` (models drift to slo-mo; also state "real-time speed"). Negatives bias, they don't guarantee — pair every negative with a positive (not just "no plastic skin" but also "visible pores").

## 8. Audio Realism (Veo 3 / native-audio models)

Silence or mismatched audio instantly flags AI.
- **Dialogue:** spoken lines in quotes with the speaker named: *The waitress says: "Rough night, huh?"* Keep lines short; specify delivery: **speaking softly**, **tired, flat delivery**, **mid-conversation**, **slight pause before answering**. Separate the dialogue block from visual description (improves lip-sync).
- **Always add "No subtitles."** — Veo 3 otherwise often burns in captions (pair with "no watermark").
- **Room tone:** real rooms are never silent — **ambient room tone**, **air conditioning hum**, **clock ticking**, **refrigerator hum**, **distant traffic through the window**.
- **Diegetic SFX layer, described separately:** **footsteps on hardwood**, **cutlery clinking**, **fabric rustle**, **chair creak**, **birdsong and wind in leaves**.
- **Acoustic space:** **slight natural reverb of a tiled bathroom**, **muffled close sound of a car interior**, **echoing parking garage**.
- Avoid **background music** for realism pieces — score signals "produced content"; ambience signals reality.

Fragment: *"Audio: ambient diner room tone, low chatter, cutlery clinks, espresso machine hiss. She says quietly: 'I already told you.' No music. No subtitles."*

## Master Realism-First Template

> **[Capture medium]** handheld documentary footage, shot on 35mm film (Kodak Vision3 500T), fine film grain, slight chromatic aberration, natural vignetting, soft highlight roll-off, lifted blacks, muted color palette. **[Subject]** An ordinary-looking woman in her 50s, natural skin texture with visible pores and fine lines, slight sheen on her forehead, unretouched. **[Action + micro-motion]** She washes dishes at the sink, shifting her weight, blinking naturally, glancing out the window; steam rises; her sleeve settles after she reaches for a towel. **[Light]** Warm tungsten bulb overhead mixing with cool blue dusk light from the window; soft shadows, one motivated source. **[Environment]** Cluttered lived-in kitchen, contact shadows under every object, slight haze. **[Camera]** Slow handheld drift, subtle shake, shallow depth of field, natural motion blur, 24fps. **[Audio]** Room tone, running water, dish clinks, distant TV murmur. No music. No subtitles. **[Negatives]** No smooth skin, no oversaturation, no CGI look, no text, no slow motion.

**Workflow truths:** (1) short clips (4–8s) stay coherent; (2) generate multiple takes and cherry-pick — prompting biases, selection finishes; (3) for image-to-video, realism of the reference frame dominates — bake texture, grain, imperfection into it; (4) grain/LUT/shake added in post both authenticate and mask residual AI artifacts; (5) never generate on-screen text.
