import { fitCanvas, token, onResize } from './util.js';

// 1/δ tubes of size δ × 1, one per direction jπ/N. The multiplicity m(x)
// is computed on a grid; the ledger checks (∫m)² ≤ |E| ∫m² live.

const G = 400;          // grid resolution over the world square [-1, 1]^2
const PX = 2 / G;       // world size of one cell

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

function tubes(N) {
  const r = rng(7 + N), out = [];
  for (let j = 0; j < N; j++) {
    const th = (j * Math.PI) / N + Math.PI / (2 * N);
    const a = r() * 2 * Math.PI, d = Math.sqrt(r()) * 0.42;
    out.push({ c: [d * Math.cos(a), d * Math.sin(a)], u: [Math.cos(th), Math.sin(th)] });
  }
  return out;
}

function multiplicity(N) {
  const delta = 1 / N, m = new Uint16Array(G * G);
  for (const { c, u } of tubes(N)) {
    const ex = Math.abs(u[0]) * 0.5 + Math.abs(u[1]) * delta / 2;
    const ey = Math.abs(u[1]) * 0.5 + Math.abs(u[0]) * delta / 2;
    const i0 = Math.max(0, Math.floor((c[0] - ex + 1) / PX)), i1 = Math.min(G - 1, Math.ceil((c[0] + ex + 1) / PX));
    const j0 = Math.max(0, Math.floor((c[1] - ey + 1) / PX)), j1 = Math.min(G - 1, Math.ceil((c[1] + ey + 1) / PX));
    for (let j = j0; j <= j1; j++) {
      const y = -1 + (j + 0.5) * PX - c[1];
      for (let i = i0; i <= i1; i++) {
        const x = -1 + (i + 0.5) * PX - c[0];
        if (Math.abs(x * u[0] + y * u[1]) <= 0.5 && Math.abs(-x * u[1] + y * u[0]) <= delta / 2) m[j * G + i]++;
      }
    }
  }
  let s1 = 0, s2 = 0, E = 0, max = 0;
  for (const v of m) { if (v) { s1 += v; s2 += v * v; E++; if (v > max) max = v; } }
  const a = PX * PX;
  return { m, max, int1: s1 * a, int2: s2 * a, E: E * a };
}

const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

export function initTubes(panel) {
  const canvas = panel.querySelector('#tubeCanvas');
  const ctx = canvas.getContext('2d');
  const ledger = panel.querySelector('#ledger');
  const img = document.createElement('canvas');
  img.width = img.height = G;
  const ictx = img.getContext('2d');
  let N = 16, data = null;

  function compute() {
    data = multiplicity(N);
    const lo = hex(token('--heat-lo')), hi = hex(token('--heat-hi'));
    const im = ictx.createImageData(G, G), L = Math.log(Math.max(2, data.max));
    for (let k = 0; k < data.m.length; k++) {
      const v = data.m[k];
      if (!v) continue;
      const t = Math.log(v) / L, o = 4 * ((G - 1 - Math.floor(k / G)) * G + (k % G));
      im.data[o] = lo[0] + (hi[0] - lo[0]) * t;
      im.data[o + 1] = lo[1] + (hi[1] - lo[1]) * t;
      im.data[o + 2] = lo[2] + (hi[2] - lo[2]) * t;
      im.data[o + 3] = 150 + 105 * t;
    }
    ictx.putImageData(im, 0, 0);
    const d = data;
    ledger.innerHTML = `
      <div><span>∫ m</span><b>${d.int1.toFixed(2)}</b></div>
      <div><span>∫ m²</span><b>${d.int2.toFixed(2)}</b></div>
      <div class="hl"><span>|E|</span><b>${d.E.toFixed(2)}</b></div>`;
    draw();
  }

  function draw() {
    if (!data) return;
    const { w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w, h) * 0.98;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s);
  }

  panel.querySelectorAll('[data-delta]').forEach(b => b.addEventListener('click', () => {
    N = +b.dataset.delta;
    panel.querySelectorAll('[data-delta]').forEach(x => x.classList.toggle('on', x === b));
    compute();
  }));
  onResize(canvas, draw);
  document.addEventListener('themechange', () => { if (data) compute(); });

  return { enter() { compute(); }, leave() {} };
}
