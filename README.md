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

- Frontend: TypeScript + Vite, zero build-time secrets, fully static.
- LLM step and image generation run through free, key-less inference endpoints,
  so anyone can try the demo without an account.
- The whole pipeline runs in the browser; nothing is stored server-side.

## Run it locally

```bash
npm install
npm run dev
```

`docs/index.html` is the self-contained production build served by GitHub Pages.

## AI disclosure

This project was built with AI assistance (code generation, copy, and the LLM
story-editor step at runtime), as encouraged by the Banana Hacks rules.
