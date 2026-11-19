// Neon Vice Panels editor: wires the controls to the shared renderer, and
// serves the deterministic ?shot= scenes used for the entry screenshots.
import { LAYOUTS, GRADES, drawCover, panelAt } from './render.js';

const SAMPLES = [
  { id: 'boulevard', label: 'Boulevard', src: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier', src: 'samples/pier.jpg' },
  { id: 'neon-boulevard', label: 'Neon Boulevard', src: 'samples/neon-boulevard.jpg' },
  { id: 'palm-sunset', label: 'Palm Sunset', src: 'samples/palm-sunset.jpg' },
];
const sampleById = (id) => SAMPLES.find((s) => s.id === id) || SAMPLES[0];

const state = {
  layout: 'classic',
  grade: 'sunset',
  title: 'NEON VICE',
  tagline: 'every sunset has a price',
  titleSize: 1,
  titleY: 0.86,
  selected: 0,
  panels: [],
};
let current = null; // the brush photo: { img, label }
const imageCache = new Map();

function blankPanel() {
  return { img: null, zoom: 1, ox: 0, oy: 0 };
}
for (let i = 0; i < 4; i++) state.panels.push(blankPanel());

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

async function setBrush(sample) {
  const img = await loadImage(sample.src);
  current = { img, label: sample.label };
  return current;
}

function assignPanel(i, brush) {
  if (!brush) return;
  state.panels[i].img = brush.img;
}
function fillAll(brush) {
  if (!brush) return;
  for (const p of state.panels) p.img = brush.img;
}

// ---------------------------------------------------------------- editor UI

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const status = $('status');

function redraw() {
  drawCover(ctx, canvas.width, canvas.height, state, { ui: true });
}

function setStatus(text) {
  if (status) status.textContent = text;
}

function buildChips(containerId, entries, key) {
  const box = $(containerId);
  box.innerHTML = '';
  for (const [id, def] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state[key] === id ? ' on' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      state[key] = id;
      if (key === 'layout' && state.selected >= LAYOUTS[id].panels.length) state.selected = 0;
      buildChips(containerId, entries, key);
      redraw();
    });
    box.appendChild(b);
  }
}

function buildSamples() {
  const box = $('samples');
  box.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (current && current.label === s.label ? ' on' : '');
    const img = document.createElement('img');
    img.src = s.src;
    img.alt = s.label;
    const cap = document.createElement('span');
    cap.textContent = s.label;
    b.append(img, cap);
    b.addEventListener('click', async () => {
      await setBrush(s);
      assignPanel(state.selected, current);
      buildSamples();
      redraw();
      setStatus(`${s.label} placed in panel ${state.selected + 1}.`);
    });
    box.appendChild(b);
  }
}

function wireEditor() {
  buildChips('layouts', Object.entries(LAYOUTS), 'layout');
  buildChips('grades', Object.entries(GRADES), 'grade');
  buildSamples();

  $('photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = await loadImage(URL.createObjectURL(file));
    current = { img, label: file.name };
    assignPanel(state.selected, current);
    buildSamples();
    redraw();
    setStatus(`Your photo placed in panel ${state.selected + 1}. Drag on the canvas to reframe it.`);
  });

  $('assign').addEventListener('click', () => {
    assignPanel(state.selected, current);
    redraw();
    setStatus(current ? `${current.label} assigned to panel ${state.selected + 1}.` : 'Pick a photo first.');
  });
  $('fill').addEventListener('click', () => {
    fillAll(current);
    redraw();
    setStatus(current ? `${current.label} fills every panel.` : 'Pick a photo first.');
  });

  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
  $('titleSize').addEventListener('input', (e) => { state.titleSize = Number(e.target.value); redraw(); });
  $('titleY').addEventListener('input', (e) => { state.titleY = Number(e.target.value); redraw(); });
  $('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value);
    redraw();
  });

  $('export').addEventListener('click', () => {
    const [w, h] = $('exportSize').value.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off.getContext('2d'), w, h, state, { ui: false });
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-vice-${w}x${h}.png`;
      a.click();
      setStatus(`Saved neon-vice-${w}x${h}.png`);
    }, 'image/png');
  });

  // click a panel to select it, drag on the canvas to reframe its photo
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
  };
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = toCanvas(e);
    const hit = panelAt(state.layout, canvas.width, canvas.height, x, y);
    if (hit >= 0) {
      state.selected = hit;
      $('zoom').value = state.panels[hit].zoom;
    }
    drag = { x, y, moved: false };
    canvas.setPointerCapture(e.pointerId);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [x, y] = toCanvas(e);
    const dx = x - drag.x;
    const dy = y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    if (drag.moved) {
      const p = state.panels[state.selected];
      p.ox = Math.max(-1, Math.min(1, p.ox - (dx / canvas.width) * 1.6));
      p.oy = Math.max(-1, Math.min(1, p.oy - (dy / canvas.height) * 1.6));
      drag.x = x;
      drag.y = y;
      redraw();
    }
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selected];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
    $('zoom').value = p.zoom;
    redraw();
  }, { passive: false });

  // drag-and-drop a photo anywhere onto the stage
  const stage = $('stage');
  stage.addEventListener('dragover', (e) => { e.preventDefault(); stage.classList.add('drop'); });
  stage.addEventListener('dragleave', () => stage.classList.remove('drop'));
  stage.addEventListener('drop', async (e) => {
    e.preventDefault();
    stage.classList.remove('drop');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const img = await loadImage(URL.createObjectURL(file));
    current = { img, label: file.name };
    assignPanel(state.selected, current);
    redraw();
    setStatus(`Dropped photo placed in panel ${state.selected + 1}.`);
  });
}

async function loadDefaults() {
  const order = ['boulevard', 'pier', 'neon-boulevard', 'palm-sunset'];
  for (let i = 0; i < order.length; i++) {
    state.panels[i].img = await loadImage(sampleById(order[i]).src);
  }
  await setBrush(sampleById('boulevard'));
}

// ---------------------------------------------------------------- shot mode

async function runShotMode(q) {
  const shot = q.get('shot');
  if (q.get('layout') && LAYOUTS[q.get('layout')]) state.layout = q.get('layout');
  if (q.get('grade') && GRADES[q.get('grade')]) state.grade = q.get('grade');
  if (q.get('caption') !== null) state.title = q.get('caption');
  if (q.get('tagline') !== null) state.tagline = q.get('tagline');
  const photoId = q.get('photo');
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const w = Number(q.get('w')) || window.innerWidth;
    const h = Number(q.get('h')) || window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    if (photoId) {
      fillAll(await setBrush(sampleById(photoId)));
    } else {
      await loadDefaults();
    }
    drawCover(ctx, w, h, state, { ui: false });
  } else {
    if (photoId) {
      fillAll(await setBrush(sampleById(photoId)));
    } else {
      await loadDefaults();
    }
    buildChips('layouts', Object.entries(LAYOUTS), 'layout');
    buildChips('grades', Object.entries(GRADES), 'grade');
    buildSamples();
    $('title').value = state.title;
    $('tagline').value = state.tagline;
    redraw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

// ---------------------------------------------------------------- boot

const query = new URLSearchParams(location.search);
const shotKind = query.get('shot');
if (shotKind === 'cover') {
  runShotMode(query);
} else {
  wireEditor();
  if (shotKind) {
    runShotMode(query);
  } else {
    loadDefaults().then(() => { buildSamples(); redraw(); });
  }
}
