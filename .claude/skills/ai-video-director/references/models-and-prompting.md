# AI Video Models & Prompt Formats (state of the art: late 2025)

## 1. Model Landscape — pick the right tool

| Model | T2V/I2V | Native audio | Clip length | Where it wins | Weaknesses |
|---|---|---|---|---|---|
| **Veo 3.1** (Google) | Both + ingredients + first/last frame | **Yes — dialogue, SFX, ambient, synced** | 4/6/8s (extendable in Flow to ~1min+) | Best speech/lip-sync, best prompt adherence, ecosystem (Flow, Gemini API, Vertex) | 8s base cap, cost, occasional unwanted subtitles |
| **Sora 2 / Pro** (OpenAI) | T2V (+ image input, cameos) | Yes | 4/8/12s API (~15s app) | Physics plausibility, multi-shot in one gen, cameo (consented likeness), Remix iteration | Watermark in app, strict guardrails, gated availability |
| **Kling 2.1 / 2.5 Turbo** | Both; start+end frame; **Elements** (multi-ref character assets) | No | 5s/10s, 1080p | Motion quality & physicality per dollar, I2V fidelity, cheap iteration volume | No audio, weak text rendering |
| **Runway Gen-4 / Turbo + Aleph** | Gen-4: I2V-centric; Aleph: video-to-video editing (relight, remove objects, change angle) | No | 5s/10s | Control tooling, **References** (up to 3 images for character/location consistency), in-context editing | Shorter clips; realism a tier below Veo/Kling on people; official stance: avoid negative prompting |
| **Luma Ray3** | Both; keyframes | No | 5/9/10s, up to 4K | "Reasoning" video model, 16-bit HDR EXR for pro pipelines, Draft Mode (fast cheap previews → Hi-Fi) | Weaker character consistency, no audio |
| **Hailuo / MiniMax 2.3** | Both | No | 6s/10s | Expressive human motion/dance, bracket camera commands (`[Push in]`, `[Pan left]`) | No audio, short clips |
| **Wan 2.2 / 2.5** (Alibaba) | Both | **2.5: yes** | 5–10s, 1080p | **Open weights (2.2)** — local/ComfyUI, LoRA fine-tuning | Needs big GPUs; polish below Veo/Kling |
| **Seedance 1.0** (ByteDance) | Both | No | 5/10s | **Native multi-shot narrative in one generation** (coherent cuts), speed, cheap API | No audio |
| **Midjourney Video** | **I2V only** | No | 5s, ×4 extend → ~21s | Unmatched stylized aesthetics from MJ stills, cheap exploration | Low res, no T2V, loose adherence |

**One-liners pros use:** dialogue scene → Veo 3.1; physical comedy/your own face → Sora 2; action/motion per dollar → Kling 2.5; brand work needing exact character/location continuity → Runway Gen-4 + References; edit existing footage → Runway Aleph; pro color pipeline/HDR → Ray3; anime/dance → Hailuo; local/fine-tuned → Wan 2.2; multi-shot story in one gen → Seedance; stylized loops → Midjourney.

## 2. Prompt Structure Formulas

### Google's official Veo formula
**[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]**
(Vertex docs enumerate 7 elements: subject, context, action, style, camera motion, composition, ambiance + optional audio.)

Official example: *"Medium shot, a tired corporate worker, rubbing his temples in exhaustion, in front of a bulky 1980s computer in a cluttered office late at night. The scene is lit by the harsh fluorescent overhead lights and the green glow of the monochrome monitor. Retro aesthetic, shot as if on 1980s color film, slightly grainy."*

### The generic ordered-components formula (creator consensus)
**Subject → Action → Scene/Context → Camera → Lighting → Style/Mood → Audio**, written as one flowing paragraph (prose beats keyword soup in every 2025 model). Put camera first when the move defines the shot.

### Sora 2 (official cookbook philosophy)
"Brief the model as you would a cinematographer. Treat your prompt as a creative wish list, not a contract." Shorter prompts = more model creativity; longer = more control but less reliable adherence. Clip length/res are API parameters, not prose. Official template:
```
[Prose scene description in plain language]

Cinematography:
Camera shot: [framing and angle]
Mood: [overall tone]

Actions:
- [Action 1: a clear, specific beat]
- [Action 2: another distinct beat]
- [Action 3: another action or dialogue line]

Dialogue:
[short natural lines, brief enough to fit the clip]
```
Weak→strong: "A beautiful street at night" → "Wet asphalt, zebra crosswalk, neon signs reflecting in puddles". "Person moves quickly" → "Cyclist pedals three times, brakes, and stops at crosswalk". "Cinematic look" → "Anamorphic 2.0x lens, shallow DOF, volumetric light". Motion in beats: "Actor takes four steps to the window, pauses, and pulls the curtain in the final second." **One camera move + one subject action per shot.**

Ultra-detailed mode: labeled production blocks — Format & Look ("Duration 4s; 180° shutter; 65mm photochemical contrast; fine grain; subtle halation"), Lenses & Filtration ("32mm/50mm spherical primes; Black Pro-Mist 1/4"), Grade/Palette, Lighting & Atmosphere, Location & Framing, Wardrobe/Props, Sound ("Diegetic only; no score"), plus a timestamped shot list ("0.00–2.40 — 'Arrival Drift' (32mm, shoulder-mounted slow dolly left)"). Timestamped shot lists measurably improve sequence adherence. **Lighting consistency rule:** name light sources + direction and 3–5 palette anchor colors — this is what makes separate clips cut together.

### Veo timestamp prompting (official, one-generation multi-shot)
```
[00:00-00:02] Medium shot from behind a young female explorer... as she pushes aside a jungle vine to reveal a hidden path.
[00:02-00:04] Reverse shot of her freckled face, expression filled with awe. SFX: rustle of leaves, distant bird calls.
[00:04-00:06] Tracking shot following her as she steps into the clearing. Emotion: wonder and reverence.
[00:06-00:08] Wide, high-angle crane shot revealing her standing small in the vast temple complex.
```

### The JSON prompt format (viral community convention)
No model officially parses JSON — it works because it forces completeness and consistent key reuse across shots. Canonical template:
```json
{
  "shot": {"composition": "medium close-up", "camera_motion": "slow dolly-in", "lens": "35mm, shallow depth of field", "frame_rate": "24fps", "film_grain": "subtle"},
  "subject": {"description": "a woman in her 30s, auburn hair in a loose bun, olive trench coat", "wardrobe": "olive trench coat, silver pendant", "action": "turns from the rain-streaked window and smiles faintly"},
  "scene": {"location": "dim Parisian apartment, night", "time_of_day": "night", "environment": "rain on windows, warm lamp in background"},
  "visual_details": {"props": "steaming mug, open paperback", "physics": "steam drifts, raindrops streak"},
  "cinematography": {"lighting": "warm practical key, cool window rim", "style": "cinematic realism, 35mm film", "tone": "wistful, intimate"},
  "audio": {"dialogue": "She says: I thought you'd forgotten.", "ambient": "rain patter, distant traffic", "sfx": "soft thunder roll", "music": "none"},
  "color_palette": "amber, slate blue, walnut"
}
```
Verdict: JSON ≈ paragraph for one-offs; JSON wins for **brand templates, variable swapping, API automation, multi-shot consistency** (reuse identical subject/scene blocks, change only action/camera). Prose wins when you want model creativity.

### Ideal prompt length per model
- **Veo 3/3.1:** 60–150 words sweet spot; audio cues included; >200 words → instruction dropping.
- **Sora 2:** both extremes valid — 1–2 sentence creative prompts, or full production blocks.
- **Kling:** 30–80 words; motion-first; with a start frame **describe only the motion, never re-describe the image**; give each motion an **end state** ("…and comes to rest") or the clip stalls/morphs.
- **Runway Gen-4:** short and motion-only ("the man turns his head slowly; camera static, locked off"); the image carries everything else; **no negative prompts**; simple present tense.
- **Hailuo:** medium; bracketed camera commands: `[Push in]`, `[Pan right]`, `[Tracking shot]`.
- **Midjourney video:** "low motion"/"high motion" preset + one short motion sentence.

## 3. Veo Dialogue & Audio

- **Official syntax:** dialogue in quotes — `A woman says, "We have to leave now."` SFX: `SFX: thunder cracks in the distance`. Ambient: `Ambient noise: the quiet hum of a starship bridge`.
- **The colon trick (community):** quoted strings sometimes render as burned-in subtitles, so creators write `He looks at the camera and says: It was never about the money.` (colon, no quotes). Colon form + explicit "no subtitles" = highest-reliability combo.
- **"No subtitles":** append `(no subtitles, no on-screen text)` and/or put `subtitles, captions, text overlay, watermark` in the negative field. Still probabilistic — repeat it, plan to re-roll.
- **Accent/tone/delivery before the line:** "in a thick Scottish accent, voice low and weary, he says: …"; "she whispers urgently:". Keep to **~12–20 spoken words per 8s clip** or lip-sync drifts.
- **Multi-speaker:** label consistently ("The detective says: … The woman replies: …"); 2-person exchanges work, 3+ degrades.
- **Silence control:** if you don't specify audio, Veo invents it (spurious laughter/music). Always state the full soundscape: `Audio: only wind and gravel footsteps; no music, no crowd.`

## 4. Image-to-Video Workflows (how pros actually work)

**Why I2V dominates pro work:** the still locks identity, wardrobe, set, lighting, composition — the hardest things for T2V to repeat — so the video prompt only solves motion. Cheaper to iterate stills than video.

Standard pipeline:
1. **Keyframe generation:** Midjourney (aesthetics) / Gemini 2.5 Flash Image "Nano Banana" (character edits + consistency; Google's recommended pair for Veo) / Flux (realism, LoRA-able). Generate a character sheet: front/profile/three-quarter.
2. **Consistency anchors:** MJ `--cref` (character reference) + `--sref` (style) across keyframes; Flux character LoRA; or Nano Banana "same character, now sitting in a diner" edits.
3. **Animate:** feed keyframe to Kling/Veo/Runway/Luma with a motion-only prompt.
4. **First-frame → last-frame interpolation:** Kling (start+end), Veo 3.1 First/Last Frame (with audio), Luma keyframes. Rule: **both frames must match lens, framing and lighting** (never wide start → telephoto end). Use for product reveals, outfit changes, camera moves between composed stills.
5. **In-model references:** Runway Gen-4 References (up to 3 images: character/location/style); Kling **Elements** (reusable character asset from 2–4 stills, at least one frontal, or one 3–8s clip); Veo 3.1 **Ingredients to Video** (up to 3 reference images). Official Veo ingredients example: *"Using the provided images for the detective, the woman, and the office setting, create a medium shot of the detective behind his desk. He looks up at the woman and says in a weary voice, 'Of all the offices in this town, you had to walk into mine.'"* — shot 2 reuses identical ingredient phrasing with the reply.

## 5. Multi-Shot & Scene Extension (30–60s from 8s clips)

- **Google Flow Scenebuilder:** **Extend** (continues the same shot — reads final frame + new prompt; for continuous action; re-extendable 8s→16s→…) vs **Jump To** (new shot = a cut; for new angles). Failure modes: Jump To when you wanted continuity → jarring cut; Extend when you wanted a new angle → long boring shot.
- **Clip-chaining without Flow:** export the **last frame** of clip A, use it as the I2V input of clip B, repeat. Degrades each hop — re-anchor every 2–3 hops with a fresh character keyframe.
- **Continuity bible** (the single most-taught technique in every creator course): write fixed facts and paste them **identically into every prompt** — character ("a 40-year-old man with cropped grey hair, scar on left eyebrow, worn brown leather jacket over a black tee"), set, time of day, light direction, palette anchors, lens/film stock. Changing synonyms ("jacket" → "coat") causes drift.
- **Match cuts between generations:** end clip A on a motion that clip B begins (door closing → door opening); cut on action hides the seam. Keep **screen direction** constant and state it.
- **Assembling 30–60s:** 4–8 clips × 8s from a numbered shot list derived from a script (have an LLM expand a logline into a per-shot prompt table first); never use full 8s of every clip — cut each to its best 2–4s.
- **Seedance alternative:** natively generates multi-shot sequences in one prompt — fast previz before rebuilding shots in Veo/Kling.

## 6. Iteration Discipline

- **Takes:** generate **3–5 takes per shot** (outputs vary by design), cherry-pick, refine. A finished 30s film ≈ 40–100 generations.
- **Seed control:** Veo API (`seed`), Wan, fal-hosted models; absent in consumer Kling/Sora UIs. Discipline: **lock seed while changing the prompt** to see the prompt's effect; **lock prompt while sweeping seeds (4–8 rolls)** to find composition. Log prompt + model version + settings + seed for every keeper.
- **One variable at a time.** Sora Remix is built for this: "Same shot, switch to 85mm lens"; "Same lighting, new palette: teal, sand, rust". If a shot keeps misfiring: strip it back — freeze the camera, simplify the action, clear the background — then re-layer.
- **Rules of thumb:** after 3–4 failed re-rolls, rewrite the prompt; after ~10 revisions, the shot concept is wrong — split it into two shots.
- **Common mistakes:** overstuffing (more than one action + one move per clip); conflicting instructions ("photorealistic anime", static camera + "sweeping dolly"); vague verbs ("moves dramatically"); negations read as content ("no crowd" → crowd); expecting on-screen text to render (do titles in post); complex hand–object interaction; re-describing a supplied image in I2V prompts (causes fighting/morphing).
