# Devpost submission draft - Storyboard (Banana Hacks 2026)

Staging document. Final submit click waits for Navin's review + explicit word.

## Project name
Storyboard - turn a story into a comic strip

## Tagline (one liner)
Paste any short story, get a consistent-character comic strip drawn entirely by AI, export it as a PNG.

## Links
- Live demo: https://hexraei.github.io/storyboard/
- GitHub: https://github.com/Hexraei/storyboard
- Demo video: [Navin's YouTube link - public, <=3 min, his voiceover]

## Description (paste into Devpost)

### Inspiration
Storyboarding is the wall every visual story hits first. Indie filmmakers,
comic creators, and small studios need panels to pitch a scene before they
commit to production, and illustrators are slow and expensive. Parents and
teachers want to turn bedtime tales and lessons into something visual. Small
businesses want comic-style social content without hiring an artist. We asked:
what if typing the story was the whole job?

### What it does
Storyboard turns 3-8 sentences into a finished comic strip. An LLM story
editor splits your story into panels and locks a visual design for every
character. Each panel is then drawn by a text-to-image model in one shared
art style you pick (comic ink, flat vector, watercolor, pixel art, noir, 3D
render). Because the character designs are locked and reused in every prompt,
your hero looks like your hero in panel 1 and panel 6. The strip is laid out
as a real comic page with narration captions and exports as a PNG.

### How we built it
Fully static TypeScript + Vite frontend on GitHub Pages - no backend, nothing
stored server-side. The pipeline: story text -> LLM story editor (panel script
+ locked character sheets) -> per-panel prompt builder (scene + locked cast +
shared style anchor) -> seeded text-to-image generation per panel with a retry
and redraw loop -> canvas comic layout -> PNG export. Both the LLM step and
image generation run through the Pollinations generation gateway on its free
tier.

### Challenges we ran into
Getting one character to look like the same character across panels. Our first
image model ignored art-style suffixes and drifted photoreal, and the anonymous
legacy endpoint ignored the model parameter entirely for keyed requests, so
"the same model" was not actually guaranteed. The fix was architectural: one
authenticated gateway, one style-faithful model (tongyi-mai/z-image-turbo) for
every panel, locked character descriptors injected into every prompt, and a
seeded retry/redraw loop. We also top-anchor the export crop so provider-side
watermarks never reach the downloaded PNG.

### Accomplishments we're proud of
Character consistency across a whole strip from a single text input, running
entirely in the browser on free-tier infrastructure. The multi-step pipeline
(LLM edit -> locked cast -> per-panel generation -> layout) is what makes the
output feel designed rather than random.

### What we learned
Prompt structure beats prompt volume: a short locked character sheet reused
everywhere outperforms long per-panel descriptions. Model choice is a product
decision, not just an infra one.

### What's next
Speech-bubble dialogue, panel reordering, more export formats, and account-free
sharing links.

## AI-tool disclosure (required)
This project was built with AI assistance throughout: code generation, copy,
and the LLM story-editor step at runtime. Image generation via Pollinations
(tongyi-mai/z-image-turbo); LLM via the Pollinations gateway.

## Built with (tags)
typescript, vite, pollinations, z-image-turbo, llm, text-to-image, github-pages, canvas

## Eligibility self-check vs rules
- Image AI is core: every panel is AI-generated; remove it and there is no product. YES
- Solves a real-world problem: storyboarding for indie creators + education + social content. YES
- Work done inside the event window (Oct 9-12). YES
- Demo video <=3 min, public YouTube, own voiceover. PENDING (Navin)
- AI-tool disclosure included. YES
