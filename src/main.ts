import './style.css';
import {
  STYLES,
  analyzeStory,
  fullPrompt,
  imageUrl,
  loadPanelImage,
  type Character,
  type PanelSpec,
} from './pipeline';
import { downloadCanvas, exportStrip } from './comic';

const EXAMPLES = [
  'A young barista discovers her coffee foam predicts the future. She sees a storm in a latte, warns the whole street, and saves the market from a flood. Everyone celebrates with free coffee.',
  'A stray cat sneaks into a space agency and accidentally launches itself to the moon. It plants a tiny flag, naps in the lander, and comes home a hero.',
  'Maya finds an old paintbrush that brings whatever she paints to life. She paints a friend, loses control of it, and learns to paint with her heart instead of her hand.',
];

interface State {
  analysis: { title: string; characters: Character[] } | null;
  panels: PanelSpec[];
  style: string;
  running: boolean;
}

const state: State = { analysis: null, panels: [], style: Object.keys(STYLES)[0], running: false };
const app = document.querySelector<HTMLDivElement>('#app')!;

function el(tag: string, cls = '', text = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function render() {
  app.innerHTML = '';
  const header = el('header');
  const logo = el('h1', '', 'Storyboard');
  const tagline = el('p', 'tagline', 'Type a story. Get a comic strip. Every panel drawn by AI.');
  header.append(logo, tagline);
  app.append(header);

  if (!state.analysis) renderComposer();
  else renderStrip();
}

function renderComposer() {
  const box = el('section', 'composer');
  const ta = document.createElement('textarea');
  ta.placeholder = 'Once upon a time... (write 3-8 sentences)';
  ta.rows = 6;

  const chips = el('div', 'chips');
  EXAMPLES.forEach((ex, i) => {
    const chip = el('button', 'chip', `Example ${i + 1}`);
    chip.addEventListener('click', () => {
      ta.value = ex;
    });
    chips.append(chip);
  });

  const controls = el('div', 'controls');
  const countWrap = el('label', 'field');
  countWrap.append(el('span', '', 'Panels'));
  const countSel = document.createElement('select');
  [3, 4, 5, 6].forEach((n) => {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = String(n);
    countSel.append(o);
  });
  countWrap.append(countSel);

  const styleWrap = el('label', 'field');
  styleWrap.append(el('span', '', 'Art style'));
  const styleSel = document.createElement('select');
  Object.keys(STYLES).forEach((s) => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    styleSel.append(o);
  });
  styleWrap.append(styleSel);
  controls.append(countWrap, styleWrap);

  const go = el('button', 'go', 'Make my comic');
  const status = el('div', 'status');

  go.addEventListener('click', async () => {
    const story = ta.value.trim();
    if (story.length < 20) {
      status.textContent = 'Give me a little more story - a few sentences at least.';
      return;
    }
    if (state.running) return;
    state.running = true;
    state.style = styleSel.value;
    go.setAttribute('disabled', 'true');
    status.textContent = 'Reading your story, designing characters...';
    try {
      const analysis = await analyzeStory(story, Number(countSel.value));
      const stripSeed = Math.floor(Math.random() * 1_000_000);
      state.analysis = { title: analysis.title, characters: analysis.characters };
      state.panels = analysis.panels.map((p, i) => ({
        caption: p.caption,
        prompt: p.prompt,
        seed: stripSeed + i * 97,
        status: 'pending',
      }));
      render();
      void generateAll();
    } catch {
      status.textContent = 'The story parser hiccuped. Try again in a few seconds.';
      go.removeAttribute('disabled');
    } finally {
      state.running = false;
    }
  });

  box.append(ta, chips, controls, go, status);
  app.append(box);

  const how = el('section', 'how');
  how.append(
    el('h2', '', 'How it works'),
    step('1', 'Story in', 'Paste any short story - a memory, a pitch, a bedtime tale.'),
    step('2', 'AI cast + script', 'Characters get locked designs so they look the same in every panel.'),
    step('3', 'Panels drawn', 'Each scene is generated as its own image, in one shared art style.'),
    step('4', 'Strip out', 'Export a real comic page as a PNG and share it anywhere.'),
  );
  app.append(how);
}

function step(n: string, title: string, body: string): HTMLElement {
  const s = el('div', 'step');
  s.append(el('b', 'n', n), el('b', '', title), el('p', '', body));
  return s;
}

async function generateAll() {
  // Serialized: the free image endpoint rate-limits concurrent anonymous requests.
  for (let i = 0; i < state.panels.length; i++) {
    await generatePanel(i);
    renderStripActions();
    await new Promise((r) => setTimeout(r, 8000));
  }
}

async function generatePanel(i: number) {
  const p = state.panels[i];
  const styleSuffix = STYLES[state.style];
  const prompt = fullPrompt(p.prompt, state.analysis!.characters, styleSuffix);
  p.status = 'loading';
  updatePanelView(i);
  // The free image tier rate-limits bursts; alternate models and back off hard.
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const model = attempt % 2 === 0 ? 'flux' : 'turbo';
      const url = imageUrl(prompt, p.seed + attempt * 1000, 960, 720, model);
      await loadPanelImage(url);
      p.imageUrl = url;
      p.status = 'done';
      updatePanelView(i);
      return;
    } catch {
      p.status = attempt === 5 ? 'error' : 'loading';
      updatePanelView(i);
      await new Promise((r) => setTimeout(r, 10000 * Math.pow(2, Math.min(attempt, 2))));
    }
  }
}

function renderStrip() {
  const top = el('section', 'striphead');
  top.append(el('h2', 'striptitle', state.analysis!.title));
  const sub = el('p', 'castline');
  sub.textContent =
    state.analysis!.characters.length > 0
      ? 'Cast: ' + state.analysis!.characters.map((c) => c.name).join(', ')
      : '';
  top.append(sub);

  const newBtn = el('button', 'ghost', 'New story');
  newBtn.addEventListener('click', () => {
    state.analysis = null;
    state.panels = [];
    render();
  });
  top.append(newBtn);

  const grid = el('section', 'grid');
  grid.dataset.count = String(state.panels.length);
  state.panels.forEach((p, i) => {
    const card = el('div', 'panel');
    card.id = `panel-${i}`;
    card.append(panelBody(p, i));
    grid.append(card);
  });

  const actions = el('section', 'actions');
  actions.id = 'strip-actions';

  app.append(top, grid, actions);
  renderStripActions();
}

function panelBody(p: PanelSpec, i: number): HTMLElement {
  const wrap = el('div', 'panelbody');
  if (p.status === 'done' && p.imageUrl) {
    const img = document.createElement('img');
    img.src = p.imageUrl;
    img.alt = p.caption;
    wrap.append(img);
  } else {
    const ph = el('div', 'placeholder', p.status === 'error' ? 'Could not draw this panel.' : 'Drawing...');
    if (p.status !== 'error') ph.append(el('div', 'spinner'));
    wrap.append(ph);
  }
  const cap = el('p', 'caption', p.caption);
  wrap.append(cap);

  const tools = el('div', 'paneltools');
  const regen = el('button', 'mini', p.status === 'loading' ? '...' : 'Redraw');
  regen.addEventListener('click', () => {
    if (p.status === 'loading') return;
    p.seed = Math.floor(Math.random() * 1_000_000);
    void generatePanel(i).then(renderStripActions);
  });
  tools.append(regen);
  wrap.append(tools);
  return wrap;
}

function updatePanelView(i: number) {
  const card = document.getElementById(`panel-${i}`);
  if (!card) return;
  card.innerHTML = '';
  card.append(panelBody(state.panels[i], i));
}

function renderStripActions() {
  const actions = document.getElementById('strip-actions');
  if (!actions) return;
  actions.innerHTML = '';
  const ready = state.panels.filter((p) => p.status === 'done').length;
  const total = state.panels.length;
  const info = el('span', 'progress', `${ready}/${total} panels drawn`);
  const dl = el('button', 'go', 'Download comic (PNG)');
  if (ready < total) dl.setAttribute('disabled', 'true');
  dl.addEventListener('click', async () => {
    dl.setAttribute('disabled', 'true');
    dl.textContent = 'Composing page...';
    try {
      const imgs = await Promise.all(
        state.panels.map(async (p) => ({ img: await loadPanelImage(p.imageUrl!), caption: p.caption })),
      );
      const canvas = exportStrip(state.analysis!.title, imgs);
      downloadCanvas(canvas, `${state.analysis!.title.replace(/\W+/g, '-').toLowerCase()}-comic.png`);
    } finally {
      dl.removeAttribute('disabled');
      dl.textContent = 'Download comic (PNG)';
    }
  });
  actions.append(info, dl);
}

render();
