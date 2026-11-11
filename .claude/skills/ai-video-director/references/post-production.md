# Post-Production & Motion Design for AI Video

## 1. Pipeline Order (creator standard)

**Edit (picture lock) → Upscale → Color grade → Grain → Sound → Export.**

1. **Edit first at native res** (CapCut/Premiere/Resolve): assemble, trim each generation to its best seconds, kill dead air.
2. **Upscale: Topaz Video AI** (industry default) — Proteus model for general/manual texture control, **Iris when faces are prominent**; 720p/1080p → 4K; also de-artifacts. Frame interpolation (Chronos/Apollo) 24→60fps **only for slow-mo/speed-ramp material** — blanket 60fps makes AI footage look like video-game smoothness; keep 24fps for cinematic. Resolve SuperScale = lighter alternative.
3. **Grade in DaVinci Resolve** — node chain: (1) balance/correction per clip to unify mismatched generations, (2) creative LUT at reduced strength (~50–70%), (3) **Film Grain OFX, 35mm preset, 8–15% opacity**, (4) optional slight blur/halation. Grading is the #1 trick to unify clips from different generations/models and kill the "plastic AI sheen"; teal-orange and filmic LUTs dominate.
4. **Grain goes last, at delivery resolution** (grain added before upscale gets stretched; grain masks residual AI artifacts).
5. **Sound design:** even Veo audio gets rebuilt — keep Veo dialogue, replace/layer ambience + foley (Epidemic Sound, Artlist, ElevenLabs SFX; ElevenLabs for VO/dubbing). Music drives cut points.

## 2. Social/Reels Editing Rhythm

- Hook lands **in the first 1–2 seconds** (viewer decision window ≈1.4–2.3s) — open mid-action, no logos/intros.
- New visual information every **~1.5–3s** (a cut or an in-shot change; alternate wide/medium/close).
- Stack mini-payoffs every 3–5s; cut the half-second before every action completes.
- 9:16 vertical, burned captions for speech, loop the ending back into the hook.

## 3. Motion Design Concepts Applied to AI Video

- **Easing:** real cameras/subjects accelerate and decelerate — prompt it ("camera slowly eases to a stop," "gently decelerating push-in") and apply ease-in/out on post moves; linear motion reads as CG.
- **Speed ramps:** AI generations are constant-speed; ramps (slow→fast→slow in Resolve/Premiere with optical-flow interpolation or Topaz Apollo for the slow part) add energy and hide morphing moments. Signature of high-end AI reels.
- **Match-on-action:** cut between two generations during a movement (reaching, turning, door swing) so the action bridges the cut — the core trick for invisible seams between clips that don't perfectly match.
- **J-cuts / L-cuts:** audio leads or trails the picture cut; essential for making separate dialogue generations feel like one conversation (bring the next line in under the outgoing shot).
- **Montage rhythm:** cut on the beat (or just before it for urgency); vary shot sizes between cuts (wide→close, never like-to-like); hold emotional beats longer, action beats shorter; one idea per shot. Kuleshov logic: sequence order creates meaning the AI never generated — reaction shots are cheap to generate and glue narratives together.
- **Camera-language shorthand pros reuse:** dolly-in = intimacy/tension; pull-back reveal = context/scale; low angle = power; handheld = urgency/realism; locked-off tripod = calm/dread; slow push + shallow DOF = the default "cinematic" look; whip pan / crash zoom = comedy or energy transitions (and natural cut points for match cuts).

## 4. Background: the "AI Video Bootcamp" school of practice

The aivideobootcamp community (Daniel Riley + Mateo Starcevic Filipovic; Skool-based curriculum) teaches the same pro consensus codified in this skill: **image-first realistic character workflows** (build the character still, then animate), **character consistency across scenes** (reference images + identical character descriptions in every prompt), hyper-real skin/texture work, longer-form AI filmmaking with dialogue and emotional pacing, and a strong **post-production layer** (upscaling/enhancement) on top of raw generations. Their 9-phase curriculum runs from fundamentals to "Clone Yourself" (consented likeness work). When the user asks to work "like aivideobootcamp", that means: keyframe-first I2V pipeline, continuity bible, multiple takes + cherry-picking, and a full Resolve/Topaz finishing pass.
