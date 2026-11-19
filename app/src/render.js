// Neon Vice Panels renderer: one pure drawing routine shared by the live
// preview, the PNG export and the screenshot scenes, so what you see is
// exactly what you save. All geometry is fraction-based, so every layout
// adapts to any canvas size.

export const LAYOUTS = {
  classic: {
    label: 'Classic Panels',
    panels: [
      [[0, 0], [0.63, 0], [0.56, 0.58], [0, 0.58]],
      [[0.63, 0], [1, 0], [1, 0.58], [0.56, 0.58]],
      [[0, 0.58], [0.56, 0.58], [0.49, 1], [0, 1]],
      [[0.56, 0.58], [1, 0.58], [1, 1], [0.49, 1]],
    ],
  },
  hero: {
    label: 'Hero Loading Screen',
    panels: [
      [[0, 0], [0.76, 0], [0.76, 1], [0, 1]],
      [[0.76, 0], [1, 0], [1, 0.52], [0.76, 0.52]],
      [[0.76, 0.52], [1, 0.52], [1, 1], [0.76, 1]],
    ],
  },
  duo: {
    label: 'Duo Split',
    panels: [
      [[0, 0], [0.57, 0], [0.43, 1], [0, 1]],
      [[0.57, 0], [1, 0], [1, 1], [0.43, 1]],
    ],
  },
  trio: {
    label: 'Trio Magazine',
    band: 0.13,
    panels: [
      [[0, 0.13], [0.36, 0.13], [0.33, 1], [0, 1]],
      [[0.36, 0.13], [0.68, 0.13], [0.67, 1], [0.33, 1]],
      [[0.68, 0.13], [1, 0.13], [1, 1], [0.67, 1]],
    ],
  },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset', accent: '#ff9e2c' },
  midnight: { label: 'Neon Midnight', accent: '#22d8ff' },
  dusk: { label: 'Golden Dusk', accent: '#ffc44d' },
  vintage: { label: 'Vintage Print', accent: '#e8b04b' },
  chrome: { label: 'Chrome Rain', accent: '#ff3fd8' },
};

const INK = '#160a24';

/** Polygon points of a panel in pixels for a w x h canvas. */
export function panelPoly(layout, index, w, h) {
  return LAYOUTS[layout].panels[index].map(([fx, fy]) => [fx * w, fy * h]);
}

/** Shrink a polygon toward its centroid so neighbours leave a gutter. */
function inset(poly, px) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length;
  return poly.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const m = Math.max(0, 1 - px / d);
    return [cx + dx * m, cy + dy * m];
  });
}

function tracePath(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** Draw one panel: photo cover-fitted inside its polygon, or a dusk gradient placeholder. */
function drawPanel(ctx, w, h, panel, poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  const bw = Math.max(...xs) - bx;
  const bh = Math.max(...ys) - by;
  ctx.save();
  tracePath(ctx, poly);
  ctx.clip();
  const img = panel.img;
  if (img && img.naturalWidth > 0) {
    const zoom = panel.zoom || 1;
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const slackX = Math.max(0, dw - bw);
    const slackY = Math.max(0, dh - bh);
    const dx = bx + (bw - dw) / 2 + (panel.ox || 0) * slackX;
    const dy = by + (bh - dh) / 2 + (panel.oy || 0) * slackY;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, by, 0, by + bh);
    g.addColorStop(0, '#3a1560');
    g.addColorStop(0.6, '#a12c78');
    g.addColorStop(1, '#ff7a3c');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bw, bh);
  }
  ctx.restore();
}

/** The colour grade: blend-mode washes, a light bloom and a vignette, per grade name. */
function applyGrade(ctx, w, h, grade) {
  const wash = (stops, mode, alpha) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, col] of stops) g.addColorStop(at, col);
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
  if (grade === 'sunset') {
    wash([[0, '#3d1160'], [0.45, '#c22a7a'], [0.75, '#ff6a3c'], [1, '#ffb03a']], 'overlay', 0.55);
    wash([[0, 'rgba(0,0,0,0)'], [1, '#5c0f4a']], 'multiply', 0.35);
  } else if (grade === 'midnight') {
    wash([[0, '#0a1e5e'], [0.5, '#123a8f'], [1, '#3d0a5e']], 'overlay', 0.6);
    wash([[0, '#18c8ff'], [0.4, 'rgba(0,0,0,0)'], [1, '#ff2fb3']], 'soft-light', 0.9);
  } else if (grade === 'dusk') {
    wash([[0, '#7a4a12'], [0.55, '#d98a2b'], [1, '#8f4a1e']], 'overlay', 0.5);
    wash([[0, 'rgba(0,0,0,0)'], [1, '#40200a']], 'multiply', 0.3);
  } else if (grade === 'vintage') {
    wash([[0, '#c8a468'], [0.5, '#a67c4e'], [1, '#6e4f30']], 'overlay', 0.45);
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = '#8a8378';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    // faded print: lift the blacks a touch
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#40382c';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else if (grade === 'chrome') {
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#7e8894';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    wash([[0, '#274b73'], [0.55, '#5e7ea6'], [1, '#1c2440']], 'overlay', 0.55);
    // magenta rim light bleeding in from both side edges
    const rim = ctx.createLinearGradient(0, 0, w, 0);
    rim.addColorStop(0, '#ff3fd8');
    rim.addColorStop(0.16, 'rgba(0,0,0,0)');
    rim.addColorStop(0.84, 'rgba(0,0,0,0)');
    rim.addColorStop(1, '#ff3fd8');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  // vignette for every grade
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(8,2,16,0)');
  v.addColorStop(1, grade === 'vintage' ? 'rgba(30,20,8,0.5)' : 'rgba(8,2,16,0.46)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

/** Fit a font size so `text` fits `maxWidth`, shrinking from `start`. */
function fitSize(ctx, text, start, maxWidth, weight, family) {
  let size = start;
  const set = () => { ctx.font = `${weight} ${size}px ${family}`; };
  set();
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    set();
  }
  return size;
}

const TITLE_FONT = `'Arial Black', 'Segoe UI Black', 'Helvetica Neue', Arial, sans-serif`;
const BODY_FONT = `'Segoe UI', 'Helvetica Neue', Arial, sans-serif`;

/** Caption block: accent bar, heavy outlined title with a hard shadow, letter-spaced tagline. */
function drawCaption(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim();
  const accent = GRADES[state.grade].accent;
  const sizeScale = state.titleSize || 1;
  const baseY = (state.titleY || 0.86) * h;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    const size = fitSize(ctx, title, h * 0.115 * sizeScale, w * 0.92, 900, TITLE_FONT);
    // accent bar just above the title
    const barW = Math.min(w * 0.92, ctx.measureText(title).width);
    ctx.fillStyle = accent;
    ctx.fillRect(w / 2 - barW / 2, baseY - size * 1.28, barW, Math.max(3, size * 0.09));
    // hard shadow pass, then dark outline, then white fill
    ctx.lineJoin = 'round';
    ctx.fillStyle = INK;
    ctx.fillText(title, w / 2 + size * 0.055, baseY + size * 0.055);
    ctx.strokeStyle = INK;
    ctx.lineWidth = size * 0.16;
    ctx.strokeText(title, w / 2, baseY);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, baseY);
    if (tagline) {
      const ts = Math.max(11, size * 0.30);
      ctx.font = `600 ${ts}px ${BODY_FONT}`;
      try { ctx.letterSpacing = `${Math.round(ts * 0.32)}px`; } catch { /* older engines */ }
      const tw = ctx.measureText(tagline).width;
      const pad = ts * 0.9;
      ctx.fillStyle = 'rgba(14,4,26,0.72)';
      ctx.fillRect(w / 2 - tw / 2 - pad, baseY + ts * 0.55, tw + pad * 2, ts * 1.62);
      ctx.fillStyle = accent;
      ctx.fillRect(w / 2 - tw / 2 - pad, baseY + ts * 0.55, tw + pad * 2, Math.max(2, ts * 0.10));
      ctx.fillStyle = '#ffe9f6';
      ctx.fillText(tagline, w / 2, baseY + ts * 1.78);
      try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
    }
  }
  ctx.restore();
}

/**
 * Draw the whole cover described by `state` onto `ctx` at w x h.
 * state: { layout, grade, title, tagline, titleSize, titleY,
 *          panels: [{img, zoom, ox, oy}], selected }
 * opts.ui draws the editor-only selection outline when true.
 */
export function drawCover(ctx, w, h, state, opts = {}) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.classic;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  const gutter = Math.max(3, Math.min(w, h) * 0.008);
  layout.panels.forEach((_, i) => {
    const panel = state.panels[i] || { img: null, zoom: 1, ox: 0, oy: 0 };
    drawPanel(ctx, w, h, panel, inset(panelPoly(state.layout, i, w, h), gutter));
  });
  applyGrade(ctx, w, h, state.grade);
  if (layout.band) {
    const bh = layout.band * h;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, bh);
    ctx.fillStyle = GRADES[state.grade].accent;
    ctx.fillRect(0, bh - Math.max(3, h * 0.008), w, Math.max(3, h * 0.008));
    ctx.save();
    ctx.textAlign = 'center';
    let bs = bh * 0.42;
    const setBand = () => {
      ctx.font = `800 ${bs}px ${BODY_FONT}`;
      try { ctx.letterSpacing = `${Math.round(bs * 0.34)}px`; } catch { /* older engines */ }
    };
    setBand();
    while (bs > 8 && ctx.measureText('SPECIAL EDITION').width > w * 0.9) {
      bs *= 0.92;
      setBand();
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SPECIAL EDITION', w / 2, bh * 0.68);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
    ctx.restore();
  }
  drawCaption(ctx, w, h, state);
  if (opts.ui) {
    const i = state.selected || 0;
    if (layout.panels[i]) {
      const poly = inset(panelPoly(state.layout, i, w, h), gutter);
      ctx.save();
      tracePath(ctx, poly);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.setLineDash([Math.max(8, w * 0.02), Math.max(6, w * 0.014)]);
      ctx.stroke();
      ctx.setLineDash([]);
      const [lx, ly] = poly[0];
      ctx.font = `700 ${Math.max(12, h * 0.028)}px ${BODY_FONT}`;
      const label = `PANEL ${i + 1}`;
      const lw = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(14,4,26,0.85)';
      ctx.fillRect(lx + 8, ly + 8, lw, Math.max(20, h * 0.042));
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx + 16, ly + 8 + Math.max(20, h * 0.042) / 2);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Point-in-polygon hit test over the layout's panels; returns the index or -1. */
export function panelAt(layoutName, w, h, x, y) {
  const layout = LAYOUTS[layoutName];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const poly = panelPoly(layoutName, i, w, h);
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}
