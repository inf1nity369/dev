# Non-English Dialogue (Serbian / Balkan languages) in AI Video

For ads and content in Serbian, Croatian, Bosnian or other non-English languages. Veo's native audio works outside English, but reliability drops — this file covers how to prompt it and the pro fallback pipeline when native generation isn't good enough.

## 1. What to expect

- Veo 3.x CAN generate non-English dialogue, but pronunciation and accent control are **less consistent than English** (reviewer consensus; no vendor per-language guarantees). Expect more re-rolls for a usable take.
- **Accent drift in image-to-video:** Veo tends to pull the voice/accent toward what the reference image's person *looks like*, and prompt wording does not reliably override it. Documented community workaround: generate speech separately (TTS) and re-sync lips.
- Serbian and Croatian share a dialect base — a generated accent that passes for one may sound off to speakers of the other. Always verify with a native speaker before publishing.

## 2. Prompting native Serbian dialogue (Veo)

- Write the line **in Serbian, in the prompt**, and name the language and accent explicitly in the direction:
  > *A man in his 30s behind a kafana bar looks at the camera and says in Serbian, with a natural Belgrade accent: Ovo je najbolja kafa u gradu.*
- Use **Latin script** for the dialogue line (dominant in training data for the region's web content).
- Name the accent concretely (**"Belgrade accent"**, **"Vojvodina accent"**, **"southern Serbian accent"**) rather than "Slavic" or "foreign" — vague accent words produce generic Eastern-European caricature.
- Keep the same limits as English: **~12–20 spoken words per 8s clip**, one speaker per clip preferred, colon form + "(no subtitles, no on-screen text)".
- Specify delivery in English, line in Serbian: *"she says warmly, in Serbian: …"* — direction words in English are followed more reliably.
- Generate **5+ takes** for non-English dialogue (vs 3–5 for English) and transcribe/check each; wrong stress or vowel length is the most common failure.

## 3. The pro fallback pipeline (when native audio misses)

The standard for serious Serbian-language ads — used when Veo's Serbian isn't clean or when using models with no audio (Kling, Runway, Hailuo):

1. **Generate the video without usable dialogue** — either silent/mouth-moving performance ("she speaks to the camera, mid-sentence, natural conversational mouth movement") or English scratch dialogue for timing.
2. **Generate Serbian VO separately** with a TTS that supports Serbian (ElevenLabs multilingual models support Serbian; record a human VO for top quality — a real native read beats TTS for ad trust).
3. **Lip-sync the VO onto the video** with a dedicated lip-sync model: Kling's built-in Lip Sync feature (upload clip + audio), Sync.so, HeyGen video translate, or similar video-to-video lip-sync tools.
4. Mix in post: VO at a consistent level, room tone under it, SFX layer — see `post-production.md`.

This pipeline also gives you **one video → many languages** (same visuals, swapped VO + lip-sync per market), which is how multi-market AI ads are produced.

## 4. Serbian ad-specific notes

- **Cultural grounding sells realism as much as skin texture:** name real local environments and props in prompts — *"a kafana with checkered tablecloths"*, *"socialist-era apartment block (zgrada) exterior"*, *"green Belgrade city bus passing in the background"*, *"a kiosk with newspapers"*. Generic "European street" reads as fake to a local audience.
- **Casting description:** describe the person plainly and locally, not model-pretty: *"an ordinary-looking man in his 40s, short dark hair going grey, polo shirt"* — the "unremarkable" trick matters double in a market where audiences know the faces of real local ads.
- **On-screen text in Serbian (price, brand, CTA) never goes in the generation** — AI renders gibberish, and even near-misses in diacritics (č/ć/š/ž/đ) destroy credibility. All Serbian text, captions and price tags are added in the edit.
- **Burned-in Serbian captions in post** are expected by local social audiences (most Reels are watched muted) — style them in the edit, never prompt them.
