# Storyboard - turn a story into a comic strip

**Live demo:** https://hexraei.github.io/storyboard/

Built for **Banana Hacks 2026** (Generative AI & Image Creation).

## What it does

Storyboard turns any short story into a real comic strip:

1. **Story in.** Paste 3-8 sentences - a memory, a pitch, a bedtime tale.
2. **AI cast + script.** An LLM story editor splits your story into panels and
   locks a visual design for every character, so they look the same in every panel.
3. **Panels drawn.** Each scene is generated as its own image with a text-to-image
   model, in one shared art style you pick (comic ink, watercolor, pixel art, ...).
4. **Strip out.** The panels are laid out as a comic page with narration captions,
   and you can download it as a PNG to share anywhere.

Image AI is the heart of the product: remove it and there is no strip at all.

## Who it's for

- **Indie creators and small studios** who need quick visual storyboards to pitch
  scenes before committing to production.
- **Teachers and parents** turning lessons or bedtime stories into visual strips
  for kids.
- **Small businesses** making comic-style content for social media without an
  illustrator.

## How it works (the pipeline)

```
story text
  -> LLM story editor (panel script + locked character sheets)
  -> per-panel prompt builder (scene + locked cast + shared style anchor)
  -> seeded text-to-image generation per panel (retry + redraw loop)
  -> canvas comic layout (captions, gutters, halftone header)
  -> PNG export
```

- Frontend: TypeScript + Vite, fully static, hosted on GitHub Pages.
- The LLM step and image generation run through the Pollinations generation
  gateway (`gen.pollinations.ai`) on its free tier.
- The whole pipeline runs in the browser; nothing is stored server-side.

## Run it locally

```bash
npm install
npm run dev
```

`docs/index.html` is the self-contained production build served by GitHub Pages.

## Build notes and deviations (Banana Hacks transparency log)

- **API key in the frontend bundle.** The Pollinations secret key is embedded in
  the client so judges and Devpost viewers can run the demo without any setup.
  Blast radius is deliberately small: the key is generate-only, scoped to
  image+text models, on the free tier, and the account has no payment method
  attached. **The key will be rotated/deleted after judging closes.**
- **Model choice.** Panel art uses tongyi-mai/z-image-turbo via the authenticated
  gateway. Earlier builds used flux schnell, but flux ignored the art-style
  suffixes and drifted photoreal, and the legacy anonymous endpoint ignored the
  model parameter for keyed requests (identical output across models) and
  rate-limited hard under load. One consistent model for every panel is what
  makes the locked-character pitch work, so the fallback chain was removed in
  favor of a single style-faithful model.
- **Watermark handling.** Exports top-anchor the cover crop so any provider-side
  bottom-edge watermark stays out of the downloaded PNG.

## AI disclosure

This project was built with AI assistance (code generation, copy, and the LLM
story-editor step at runtime), as encouraged by the Banana Hacks rules.
