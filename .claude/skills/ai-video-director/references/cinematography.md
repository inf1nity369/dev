# Cinematography Language for AI Video Prompting

How to speak like a cinematographer in prompts. Every concept below is prompt-ready vocabulary: lift phrases verbatim into prompts.

## 0. Master Prompt Grammar (per model vendor)

- **Google Veo (official)**: `[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]`. Google calls the cinematography element "the most powerful tool for conveying tone and emotion." Veo defaults to a **static shot** if no camera move is named. Veo supports **timestamp prompting** for beats: `[00:00-00:02] Medium shot from behind... [00:02-00:04] Reverse shot of her face... SFX: rustling leaves. Emotion: wonder.` Audio: dialogue in quotes (`A woman says, "We have to leave now."`), `SFX:` and `Ambient noise:` prefixes.
- **OpenAI Sora 2 (official cookbook)**: treat each prompt as a **storyboard panel** — "brief the model as you would a cinematographer." One camera setup + one action + one lighting recipe per block. Name framing precisely; describe action in **beats** (seconds). Film-stock references ("**shot on Kodak Vision3 500T, natural grain**") outperform the vague word "cinematic."
- **Runway Gen-4/4.5**: separate **subject motion** and **camera motion** into two channels; describe motion, not a still. **No negative phrasing** — "no camera movement" can produce movement; write "**camera holds completely static, locked-off tripod shot**" instead.
- **Kling (official)**: subject, action, setting, camera language, lighting, mood, plus one quality tag ("**photorealistic, masterpiece cinematography**"); 50–100 words; ONE camera instruction per prompt — stacked moves cause instability.
- **Universal rules**: (1) all models reward *positive, concrete, professional* vocabulary over adjectives like "epic"; (2) one shot = one idea = one move; (3) negation fails on every model — describe what IS there; (4) a real camera package (body + lens + stock) is the strongest single realism lever.

## 1. Camera Bodies & Formats — the "shot on" vocabulary

Naming a capture format sets the model's entire texture prior: grain, color science, dynamic range, DOF.

| Prompt phrase | Visual signature it implies |
|---|---|
| **"shot on ARRI Alexa 35"** / **"ARRI Alexa, ARRI Reveal color science"** | The Hollywood default. Creamy highlight rolloff, 17 stops DR, gentle filmic color, zero digital harshness. Best all-purpose photorealism token. |
| **"shot on RED Komodo"** / **"RED V-Raptor 8K"** | Crisp, high-resolution, slightly punchier digital look; commercials, music videos, action/FPV rigs (Komodo is the crash-cam). |
| **"shot on Sony Venice 2"** | Beautiful skin tones, clean low-light/night work, rich color depth; the night-exterior and prestige-drama camera (Top Gun: Maverick). |
| **"shot on IMAX 70mm"** | Enormous clarity, deep focus, vast scale, tall 1.43:1 feel; landscapes/epics, not intimate faces. |
| **"shot on 35mm film"** / **"Kodak Vision3 500T"** (tungsten, grainy night) / **"Kodak Vision3 250D"** (daylight) / **"Kodak Portra look"** | Organic grain, halation around highlights, slightly lifted blacks, analog color. The single best anti-"AI-look" token. Add **"subtle film grain, halation"**. |
| **"shot on 16mm film"** / **"Super 16"** | Heavy visible grain, softer resolution, indie/documentary/1970s nostalgia, slight gate weave. |
| **"shot on iPhone 15 Pro"** / **"smartphone footage"** / **"vertical phone video"** | Deep focus everywhere, slightly over-sharpened, mild HDR flatness; ideal for UGC-realism, vlog, found-footage authenticity. |
| **"VHS camcorder footage, 1990s"** / **"MiniDV"** | Interlace artifacts, chroma bleed, timestamp-era nostalgia. |
| **"security camera / dashcam / bodycam footage"** | Fixed wide lens, crushed compression, rolling timestamp — strong realism shorthand. |

Fragment: *"Handheld documentary footage shot on Super 16mm, Kodak Vision3 500T, heavy natural grain, slightly underexposed."*

## 2. Lenses & Focal Lengths

State ONE focal length per shot. Models honor perspective physics surprisingly well.

- **14–18mm (ultra-wide)**: exaggerated perspective, stretched foregrounds, barrel distortion at edges, huge environments. Never for close faces. *"ultra-wide 14mm lens, exaggerated perspective, foreground looming."*
- **24mm (wide)**: immersive, environmental; subject anchored in context; mild distortion. Documentary/establishing walk-and-talk lens. *"24mm wide-angle lens, subject small in frame, deep environmental context."*
- **35mm**: the "human eye in a room" lens; natural perspective with context; classic American indie/Spielberg feel. Safe default for full-body and medium work.
- **50mm**: neutral perspective, zero distortion, what-the-eye-sees. Classic for MS/MCU, conversational realism. *"50mm prime at eye level, natural perspective."*
- **85mm (portrait)**: flattering facial compression, melts background, isolates subject. THE face lens. *"85mm portrait lens, f/1.8, creamy background separation."*
- **100–135mm+ (telephoto)**: strong compression — background stacks against subject, space flattens; voyeuristic, surveillance, longing-across-distance; compressed traffic/crowd shots. *"135mm telephoto, compressed perspective, background stacked tight behind her."*
- **Macro**: *"macro lens, extreme close-up of the iris / dew on the leaf, paper-thin focus plane."*

**Anamorphic vs spherical:**
- **Anamorphic**: *"anamorphic lens, 2.39:1 aspect ratio, oval bokeh, horizontal blue lens flares, gentle edge distortion and waterfall background falloff."* Signals big-budget cinema instantly. Name **"Panavision C-Series anamorphic"** (classic Hollywood, Tarantino) or **"Atlas Orion anamorphic"** (modern indie).
- **Spherical**: round bokeh, edge-to-edge sharpness, neutral rendering — specify **"spherical primes"** for clean modern realism without streak flares.

**Vintage glass tokens**: **"Cooke S4 primes, the Cooke Look"** (warm, gentle rounded skin rendering); **"Helios 44-2 swirly bokeh"** (spiraling background blur); **"vintage Canon K-35s"** (low-contrast halation glow, 70s Hollywood); **"uncoated vintage glass, blooming highlights, low contrast"**. Vintage lens tokens are powerful de-AI-ifiers because they add imperfection.

## 3. Aperture & Depth of Field

- **"f/1.4"** / **"wide open aperture, razor-thin depth of field"**: one eye sharp, everything melts; intimacy, dreaminess. Overuse reads as "AI showreel" — real cinema often stops down.
- **"f/2.8–f/4"**: shallow but both eyes and face sharp; the actual narrative-cinema norm. Good default for faces.
- **"f/8–f/11, deep focus"**: everything sharp foreground-to-background; Citizen Kane/Kubrick staging, documentary truth, landscapes. *"deep focus at f/8, foreground and distant mountains equally sharp."*
- **Bokeh quality**: **"creamy bokeh"**, **"round specular bokeh balls from city lights"**, **"cat-eye bokeh at edges"**, **"swirly bokeh"**, **"oval anamorphic bokeh"**.
- **Rack focus**: THE most reliable "pro camera operator exists" cue. *"Rack focus from the rain-streaked glass in the foreground to her face behind it, slow and deliberate."*
- **Focus breathing**: *"subtle focus breathing as the focus racks"* adds analog authenticity.
- Veo's official vocabulary includes **"shallow depth of field"**, **"soft focus"**, **"deep focus"**, **"macro lens"**.

## 4. Shutter Angle, Frame Rate & Motion Blur — the #1 AI tell

- **180° shutter rule**: shutter = 1/(2×fps) → at 24fps, 1/48s exposure. This produces the exact motion-blur quantum the eye reads as "film." Wrong blur (too crisp = soap-opera; too smeared = dreamlike mush) instantly screams AI.
- Include in nearly every photorealistic prompt: **"24fps, 180-degree shutter, natural cinematic motion blur"**.
- **"90-degree shutter, staccato crisp motion"**: Saving Private Ryan combat harshness, adrenaline.
- **"360-degree shutter, smeared dreamy motion trails"**: hallucination, flashback, drunkenness.
- **Slow motion**: name capture rate — *"120fps slow motion played at 24fps, silky movement"*; **"overcranked"** = slo-mo, **"undercranked"** = sped-up chaos.
- Avoid bare "smooth motion"/"fluid motion" — they push models toward interpolated 60fps soap-opera sheen. Say **"filmic 24fps motion cadence"**.
- Human micro-motion realism tokens: *"natural blinking, subtle weight shifts, breathing visible in the shoulders, imperfect micro-movements."*

## 5. Camera Movement Taxonomy

(Veo's officially named set: dolly shot, tracking shot, crane shot, aerial view, slow pan, POV shot, 180-degree arc shot. All models accept the taxonomy below; use ONE move per shot.)

| Move | Prompt phrasing | Emotional effect |
|---|---|---|
| **Static / locked-off** | *"locked-off tripod shot, camera completely static"* | Observation, tableau, tension through stillness (Haneke, Wes Anderson). Required phrasing on Runway to prevent drift. |
| **Pan** | *"slow pan left to right across the skyline"* / whip pan: *"fast whip pan with motion blur to the doorway"* | Survey/reveal; whip = shock, energy transfer. |
| **Tilt** | *"slow tilt up from boots to face"* | Reveal, power introduction (tilt up = stature). |
| **Dolly in / push-in** | *"slow dolly in toward her face as the realization lands"* | Growing intimacy, dawning dread. The most emotionally potent move; keep it SLOW for drama. |
| **Dolly out / pull-back** | *"slow pull-back revealing the empty hall around him"* | Abandonment, context reveal, ending feeling. |
| **Truck / crab** | *"camera trucks right, gliding laterally past the market stalls"* | Lateral exploration, parallax richness. |
| **Pedestal** | *"camera pedestals up, rising vertically while level"* | Elegant reveal without tilt distortion. |
| **Tracking shot** | *"tracking shot following behind him through the corridor"* (follow/lead/side-track) | Attachment to character; lead-track = confrontation energy. |
| **Crane / jib** | *"crane shot starting low on the hiker and ascending to reveal the canyon"* | Epic scale, god perspective, openings/finales. |
| **Steadicam** | *"smooth Steadicam oner drifting through the party, organic float"* | Dreamlike human glide — Goodfellas, The Shining corridors. |
| **Handheld (subtle)** | *"handheld camera with subtle organic sway, documentary intimacy"* | Realism, nervous presence. One of the strongest photorealism tokens — perfect AI stability is itself a tell. |
| **Handheld (run-and-gun)** | *"frantic run-and-gun handheld, shaky, whip-reframes, crash zooms"* | Panic, war-doc, found footage. |
| **Gimbal** | *"gimbal shot, smooth floating movement following the runner"* | Modern commercial glide. |
| **Drone / aerial** | *"aerial drone shot, slow forward flight over the coastline at 100m"*; FPV: *"FPV drone diving off the cliff edge and skimming the river, fast banking turns"* | Majesty, geography; FPV = adrenaline. |
| **Dolly zoom (Vertigo)** | *"dolly zoom: camera dollies in while zooming out, background warping away behind his frozen face"* | Vertigo, realization, world-shift. Specify both halves. |
| **Arc / orbit** | *"slow 180-degree arc shot circling the couple"* | Scrutiny, romance, hero moment. |
| **Roll** | *"camera rolls 45 degrees, horizon tilting"* | Disorientation; use sparingly. |
| **Snorricam** | *"Snorricam rigged to his chest, face locked center while the world lurches behind"* | Subjective breakdown (Requiem for a Dream). |
| **Crash zoom** | *"sudden crash zoom onto the window"* | 70s exploitation punch, emphasis. |

Phrasing rules: verb + direction + speed + motivation — *"slow dolly in"* beats *"camera moves."* Attach the move to a story reason: *"the camera pushes in as she opens the letter."*

## 6. Shot Sizes, Framing & Composition

**Shot-size ladder** (use full names — safer than abbreviations):
- **Extreme wide shot / establishing shot**: subject tiny in landscape — isolation, scale. *"extreme wide establishing shot, lone figure dwarfed by dunes."*
- **Wide shot (full shot)**: full body + environment — context, body language.
- **Cowboy shot**: mid-thigh up — confrontation swagger, shows hands.
- **Medium shot**: waist up — conversation default.
- **Medium close-up**: chest up — standard dialogue/interview framing.
- **Close-up**: face fills frame — emotion as event.
- **Extreme close-up**: *"extreme close-up of her eyes"* / **insert shot**: *"insert shot of the key turning in the lock"* — detail as plot.
- **Two-shot**; **over-the-shoulder**: *"over-the-shoulder shot from behind the detective, her face in focus"*; **POV**: *"POV shot from the driver's seat, hands on the wheel"*; **reverse shot** (Veo-official term); **dirty single** (sliver of foreground shoulder) vs **clean single**.

**Angles**: **eye-level** (neutral), **low angle** (*"low angle looking up, making him monumental"*), **high angle** (vulnerability), **overhead/top-down/God's-eye** (pattern, fate), **Dutch angle** (*"Dutch angle tilted 15 degrees"* = unease), **worm's-eye**, **ground-level**.

**Composition tokens**: **rule of thirds** (*"subject on the left third, gaze into the open right side"*), **centered symmetrical composition** (Kubrick/Anderson formality), **leading lines**, **negative space** (*"vast negative space above her, oppressive emptiness"*), **headroom** (tight = intensity; excessive = smallness), **lead room / nose room**, **frame within a frame** (*"framed through the doorway"*), **foreground occlusion** (*"shot through out-of-focus foliage in the foreground"* — massive realism/depth booster), **silhouette**, **reflection framing** (*"her reflection faintly visible on the bus window glass"*), **depth staging**: *"layered depth: rain-blurred foreground, subject in midground, neon signage in soft background."*

## 7. Lighting — the Cinematographer's Half of Realism

**Named setups (models have learned them):**
- **Three-point**: *"classic three-point lighting, soft key from camera left, gentle fill, rim light separating her from the background"* — clean interview/commercial.
- **Rembrandt**: *"Rembrandt lighting, inverted triangle of light on the shadow-side cheek"* — painterly drama.
- **Butterfly/paramount**: *"butterfly lighting from high front, small shadow under the nose"* — old-Hollywood glamour.
- **Split**: *"split lighting, exactly half the face in shadow"* — duality, moral conflict.
- **Rim / kicker / edge light**: *"strong rim light tracing his silhouette against the dark"* — separation, heroism; **hair light**.
- **Key-to-fill ratio**: *"high-key lighting, low contrast, bright and airy"* (commercial) vs **"low-key lighting, 8:1 key-to-fill ratio, deep shadows"** (noir, thriller). **Chiaroscuro**: *"chiaroscuro lighting, single hard source carving the face out of blackness, Caravaggio-like."*
- **Motivated lighting** (gold standard of realism): every light has an in-world source — *"motivated lighting: the only sources are the desk lamp and the streetlight through the blinds."* Pair with **practicals**: *"practical lamps visible in frame — neon sign, bedside lamp, candle — doing the actual lighting."* Venetian-blind shadow slats = instant noir.
- **Hard vs soft**: *"hard directional sunlight, crisp shadows"* vs *"large softbox-quality light, wrapping soft shadows"*. **"book-lit, bounced soft source"** = modern prestige-TV skin rendering.

**Natural-light looks:**
- **Golden hour**: *"golden hour backlight, long warm shadows, sun flaring at frame edge, hazy rim on hair"* — nostalgia, romance (add **"available natural light only"** for the Malick look).
- **Blue hour**: *"blue hour twilight, soft cyan ambient against warm tungsten windows"* — melancholy.
- **Overcast**: *"overcast sky acting as a giant softbox, shadowless even light, muted palette"* — Scandinavian realism, grief.
- **Harsh noon**: *"harsh midday sun, top-down shadows in eye sockets"* — desert hostility (Sicario).
- **Window light**: *"single large north-facing window, Vermeer-like soft side light, room falling to darkness."*
- **Firelight/candlelight**: *"lit only by flickering candlelight, warm orange dancing shadows, Barry Lyndon style."*

**Night & stylized:**
- **Sodium-vapor**: *"sodium vapor streetlights, monochromatic orange pools of light, empty wet asphalt"* — urban loneliness.
- **Neon noir**: *"neon-noir: magenta and cyan practical signage reflecting in rain-slicked streets"*; **mixed color temperature**: *"cool blue moonlight through the window against warm tungsten interior."*
- **Moonlight**: *"blue-silver moonlight, low ambient, day-for-night feel."*
- **Volumetric**: *"volumetric god rays through the forest canopy / dust motes in a shaft of window light / headlight beams cutting through fog"*; add **"atmospheric haze"** to any interior for cinema-grade depth.
- **TV-glow** (*"lit only by the flickering blue glow of the television"*), **monitor glow**, **police lightbar strobe**, **lightning flashes**.

**Grade/palette tokens**: **"teal and orange color grade"**, **"bleach bypass, desaturated silver"**, **"Kodachrome palette"**, **"muted earth tones"**, **"low-contrast flat log look"**; define 3–5 palette anchors (Sora guidance): *"palette: slate blue, amber, bone white."*

## 8. Scene Blocking & Direction — writing action like a director

Real directors direct in **beats** — discrete micro-events. An AI shot is 5–10s ≈ 2–4 beats. Structure every prompt's action as: **initial state → trigger → reaction → settle**.

- **Beat template for an 8s shot**: *(0-2s)* establish state — *"she sits motionless, staring at the phone"*; *(2-4s)* trigger — *"it buzzes; she flinches"*; *(4-7s)* action — *"she picks it up, reads, her jaw tightens"*; *(7-8s)* button — *"she looks up past the lens."* Veo takes this literally with `[00:00-00:02]` timestamp syntax; for other models write sequenced sentences with "then," "as," "finally."
- **Verb discipline**: concrete, observable, single-subject verbs. "Walks briskly," "hesitates at the threshold," "exhales and sets down the cup" — never internal states alone; externalize: *"her shoulders drop; she presses her lips together, eyes glossy."*
- **Business**: give actors object-work — *"stirring coffee, lighting a cigarette, folding the map"* — hands doing something is a top realism cue.
- **Blocking vocabulary**: *"she crosses frame left to right," "he enters frame from background and approaches camera," "they hold a two-shot, then she steps out of frame,"* **"walks toward camera," "turns away from camera," "breaks the fourth wall, looks directly into the lens."** Use **foreground/midground/background** staging: *"a waiter passes close in the blurred foreground as the couple argues in midground."*
- **Eyelines**: *"her eyeline is off-camera left, fixed on something unseen"* — controls perceived geography.
- **Timing/pace words**: "slowly," "deliberately," "in one fluid motion," "a long two-second pause before," "suddenly." Pauses and stillness read as directed; nonstop motion reads as AI.
- **Choreograph camera WITH action**: *"as she stands, the camera pedestals up with her"*; *"the push-in lands at the exact moment she opens the box."* Motivated moves are the hallmark of direction.
- **One subject intent per shot.** Multiple simultaneous complex actions = model instability.

## 9. Anti-"AI-look" Checklist

1. Always specify: **camera body or film stock + focal length + aperture + shot size + one move + lighting setup + 24fps/180° shutter**.
2. Add controlled imperfection: **film grain, halation, handheld sway, lens breathing, foreground occlusion, atmospheric haze, practical flares, dust motes, mixed color temperatures, skin texture with visible pores, flyaway hairs**.
3. Avoid: bare "cinematic/4K/8K/hyper-realistic/masterpiece" (weak, genericizing — except Kling, which likes one quality tag), negative phrasing, more than one camera move, perfect symmetry + perfect stability + perfect lighting simultaneously (the uncanny trifecta).
4. Model quirks: **Veo** — static by default, timestamp beats, `SFX:`/dialogue-in-quotes; **Sora** — storyboard blocks, film-stock names, beats in seconds, palette anchors; **Runway** — motion-first language, "camera holds completely static" to lock, subject-motion vs camera-motion as separate sentences; **Kling** — plain simple language, 50–100 words, one move, push/pull/pan/tilt core set.

**Full-stack template fragment**: *"Medium close-up on a weathered fisherman, 85mm anamorphic at f/2.8, shot on ARRI Alexa 35, 24fps 180-degree shutter. Slow dolly in as he mends a net, pauses, and looks up toward the horizon. Golden hour backlight with warm rim on his profile, motivated fill from the water's bounce, atmospheric sea haze, oval bokeh, subtle handheld sway, fine film grain. Palette: amber, slate, bone. Ambient noise: gulls and slack rigging."*
