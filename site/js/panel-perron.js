import { B, pieces, unionArea } from './perron.js';
import { fitCanvas, token, onResize, alpha, easeInOut } from './util.js';

const SVG = 'http://www.w3.org/2000/svg';
const N_MAX = 10;
// overlap ratio per depth, chosen to minimise the final area (see perron.js)
const ALPHA = [1, 0.68, 0.7, 0.74, 0.78, 0.8, 0.82, 0.84, 0.84, 0.86, 0.86];
const STEP_MS = 900;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(d => SUP[d]).join('');

function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`;
}

export function initPerron(panel) {
  const canvas = panel.querySelector('#perronCanvas');
  const ctx = canvas.getContext('2d');
  const slider = panel.querySelector('#pN');
  const $nTxt = panel.querySelector('#pNTxt');
  const $area = panel.querySelector('#pArea');
  const hud = panel.querySelector('#perronHud');
  const chart = panel.querySelector('#perronChart');
  const playBtn = panel.querySelector('#pPlay');

  let n = 6, p = 0, copies = 1, raf = 0, active = false, finals = null;

  function draw() {
    const { w, h, dpr } = fitCanvas(canvas);
    const tris = pieces(n, ALPHA[n], p, easeInOut);
    const ink = token('--ink'), c1 = token('--s1'), c2 = token('--s3');
    ctx.clearRect(0, 0, w, h);

    let minX = Infinity, maxX = -Infinity;
    for (const [x0, x1, ax] of tris) { minX = Math.min(minX, x0, ax); maxX = Math.max(maxX, x1, ax); }
    const cxW = (minX + maxX) / 2;
    let s = Math.min((w * 0.8) / (B + 0.35), h * 0.8);
    if (copies === 3) s *= 0.6;
    const X = x => w / 2 + (x - cxW) * s, Y = y => h / 2 + (0.5 - y) * s;

    // the original triangle
    ctx.setLineDash([5 * dpr, 6 * dpr]);
    ctx.strokeStyle = alpha(ink, 0.3);
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(B), Y(0)); ctx.lineTo(X(B / 2), Y(1)); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);

    const N = tris.length;
    for (let r = 0; r < copies; r++) {
      ctx.save();
      ctx.translate(X(cxW), Y(0.5));
      ctx.rotate((r * Math.PI) / 3);
      ctx.translate(-X(cxW), -Y(0.5));
      tris.forEach(([x0, x1, ax], i) => {
        const col = mix(c1, c2, N > 1 ? i / (N - 1) : 0);
        ctx.beginPath();
        ctx.moveTo(X(x0), Y(0)); ctx.lineTo(X(x1), Y(0)); ctx.lineTo(X(ax), Y(1)); ctx.closePath();
        ctx.fillStyle = alpha(col, N > 128 ? 0.35 : 0.45);
        ctx.fill();
        if (N <= 128) { ctx.strokeStyle = alpha(col, 0.95); ctx.lineWidth = 0.8 * dpr; ctx.stroke(); }
      });
      ctx.restore();
    }

    const A = unionArea(tris);
    $area.textContent = `${Math.round(A * 100)}%`;
    hud.textContent = `α = ${ALPHA[n].toFixed(2)}`;
  }

  function drawChart() {
    if (!finals) return;
    const r = chart.getBoundingClientRect();
    const W = Math.max(200, r.width), H = Math.max(120, r.height);
    chart.setAttribute('viewBox', `0 0 ${W} ${H}`);
    chart.innerHTML = '';
    const m = { l: 40, r: 12, t: 22, b: 30 };
    const bw = (W - m.l - m.r) / N_MAX;
    const Y = v => m.t + (1 - v) * (H - m.t - m.b);
    const el = (tag, at, txt) => { const e = document.createElementNS(SVG, tag); for (const k in at) e.setAttribute(k, at[k]); if (txt != null) e.textContent = txt; chart.appendChild(e); return e; };
    for (const v of [0, 0.5, 1]) {
      el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'grid' });
      el('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'tick' }, `${v * 100}%`);
    }
    finals.forEach((v, i) => {
      const k = i + 1, x = m.l + i * bw + bw * 0.18, bwid = bw * 0.64;
      const on = k === n;
      el('path', {
        d: `M${x} ${Y(0)}V${Y(v) + 4}q0 -4 4 -4h${bwid - 8}q4 0 4 4V${Y(0)}Z`,
        fill: on ? token('--accent') : alpha(token('--ink'), 0.22),
      });
      if (on) el('text', { x: x + bwid / 2, y: Y(v) - 6, 'text-anchor': 'middle', class: 'dlabel' }, `${Math.round(v * 100)}%`);
      el('text', { x: x + bwid / 2, y: H - m.b + 16, 'text-anchor': 'middle', class: 'tick' }, `2${sup(k)}`);
      const hit = el('rect', { x: m.l + i * bw, y: m.t, width: bw, height: H - m.t - m.b + 20, class: 'hit' });
      hit.addEventListener('click', () => setN(k));
    });
  }

  function stop() { cancelAnimationFrame(raf); raf = 0; playBtn.classList.remove('on'); }
  function build() {
    if (raf) return stop();
    if (p >= n) p = 0;
    playBtn.classList.add('on');
    const startP = p, t0 = performance.now();
    const tick = now => {
      p = Math.min(n, startP + (now - t0) / STEP_MS);
      draw();
      if (p < n && active) raf = requestAnimationFrame(tick);
      else stop();
    };
    raf = requestAnimationFrame(tick);
  }

  function setN(k) {
    stop();
    n = k; p = 0;
    slider.value = k;
    $nTxt.textContent = `2${sup(k)}`;
    draw(); drawChart();
  }

  slider.addEventListener('input', () => setN(+slider.value));
  playBtn.addEventListener('click', build);
  panel.querySelectorAll('[data-copies]').forEach(b => b.addEventListener('click', () => {
    copies = +b.dataset.copies;
    panel.querySelectorAll('[data-copies]').forEach(x => x.classList.toggle('on', x === b));
    if (copies === 3 && p < n && !raf) p = n;
    draw();
  }));
  onResize(canvas, draw);
  onResize(chart, drawChart);
  document.addEventListener('themechange', () => { draw(); drawChart(); });

  return {
    enter() {
      active = true;
      if (!finals) finals = Array.from({ length: N_MAX }, (_, i) => unionArea(pieces(i + 1, ALPHA[i + 1], i + 1)));
      setN(n);
      setTimeout(() => { if (active && !raf && p === 0) build(); }, 500);
    },
    leave() { active = false; stop(); },
  };
}
