// Storyboard pipeline: story -> characters + panel script -> panel images.
// Image AI is the heart: every panel is generated, nothing ships without it.

export interface Character {
  name: string;
  description: string; // locked visual descriptor reused in every panel
}

export interface PanelSpec {
  caption: string;
  prompt: string; // scene description, before style/character suffixes
  seed: number;
  imageUrl?: string;
  status: 'pending' | 'loading' | 'done' | 'error';
}

export interface StoryAnalysis {
  title: string;
  characters: Character[];
  panels: { caption: string; prompt: string }[];
}

export const STYLES: Record<string, string> = {
  'Comic ink': 'bold comic book ink style, clean black outlines, flat vibrant colors, halftone shading',
  'Flat vector': 'flat vector illustration, minimal geometric shapes, bold color palette',
  'Watercolor': 'loose watercolor painting, soft edges, visible paper texture, gentle color washes',
  'Pixel art': 'detailed pixel art, 16-bit retro game style, limited color palette',
  'Noir': 'black and white film noir style, dramatic shadows, high contrast ink wash',
  '3D render': 'stylized 3D render, soft studio lighting, pixar-like character design',
};

const TEXT_API = 'https://text.pollinations.ai/openai';

async function llmJson<T>(system: string, user: string, retries = 4): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(TEXT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages: [
            { role: 'system', content: system + '\nRespond with valid JSON only. No markdown fences, no commentary.' },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`text API ${res.status}`);
      const data = await res.json();
      let content: string = data.choices?.[0]?.message?.content ?? '';
      content = content.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('no JSON in response');
      return JSON.parse(content.slice(start, end + 1)) as T;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
    }
  }
  throw lastErr;
}

// Step 1+2: split the story into panels and lock character designs.
export async function analyzeStory(story: string, panelCount: number): Promise<StoryAnalysis> {
  const system = `You are the story editor of Storyboard, an app that turns short stories into comic strips.
Given a story and a panel count, produce a comic script as JSON with exactly this shape:
{
  "title": "short catchy strip title, max 6 words",
  "characters": [{"name": "...", "description": "locked visual descriptor: age look, hair, outfit, colors, distinctive features, max 25 words"}],
  "panels": [{"caption": "one short narration line from the story, max 15 words", "prompt": "vivid scene description for an image generator: setting, action, character poses, mood. Never include style words. Max 40 words."}]
}
Rules:
- Exactly the requested number of panels, in story order.
- Every named character gets one locked description, reused consistently.
- Panel prompts must name the characters present and stay faithful to the story moment.
- Captions read like comic narration boxes, not dialogue.`;
  const user = `Story:\n"""${story}"""\n\nPanel count: ${panelCount}`;
  const out = await llmJson<StoryAnalysis>(system, user);
  if (!Array.isArray(out.panels) || out.panels.length === 0) throw new Error('empty analysis');
  out.panels = out.panels.slice(0, panelCount);
  out.characters = Array.isArray(out.characters) ? out.characters : [];
  out.title = (out.title || 'Untitled strip').slice(0, 60);
  return out;
}

// Step 3: build the full image prompt for a panel.
export function fullPrompt(panelPrompt: string, characters: Character[], styleSuffix: string): string {
  const cast = characters.map((c) => `${c.name}: ${c.description}`).join('; ');
  const parts = [panelPrompt];
  if (cast) parts.push(`Characters - ${cast}`);
  parts.push(styleSuffix, 'single comic panel, no text, no speech bubbles, no watermark');
  return parts.join(', ');
}

export function imageUrl(prompt: string, seed: number, w = 960, h = 720): string {
  const p = encodeURIComponent(prompt).slice(0, 1500);
  return `https://image.pollinations.ai/prompt/${p}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
}

// Step 4: load one panel image (CORS-open, so canvas export stays clean).
export function loadPanelImage(url: string, timeoutMs = 120000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('image timed out'));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('image failed'));
    };
    img.src = url;
  });
}
