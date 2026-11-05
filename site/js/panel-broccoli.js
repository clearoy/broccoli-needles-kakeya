import { fitCanvas, onResize, tween, easeInOut, clamp } from './util.js';

// Romanesco seen from above: every floret is a Vogel (golden-angle) spiral of
// smaller florets. Recursion stops once a floret is a few pixels wide, so
// zooming in keeps revealing detail.

const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const CHILDREN = [89, 55, 55, 55, 55, 55, 55];
const LEAF_PX = 3.2;
const MAX_DEPTH = 7;

function makeSprite(hueShift) {
  const s = 64, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s * 0.36, s * 0.32, s * 0.04, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `hsl(${78 + hueShift} 75% 78%)`);
  grad.addColorStop(0.45, `hsl(${84 + hueShift} 58% 52%)`);
  grad.addColorStop(0.85, `hsl(${100 + hueShift} 55% 27%)`);
  grad.addColorStop(1, `hsla(${110 + hueShift} 60% 14% / 0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  g.fill();
  return c;
}

// Draws the Romanesco head on `canvas`; `r.view` (screen = world * z + o)
// can be changed for zooming before calling `r.draw()` again.
export function romanesco(canvas) {
  const ctx = canvas.getContext('2d');
  const sprites = [makeSprite(-4), makeSprite(2), makeSprite(8)];
  const r = { view: { z: 1, ox: 0, oy: 0 }, draw };
  let W = 1, H = 1;

  function floret(x, y, R, depth, seed) {
    const sx = x * r.view.z + r.view.ox, sy = y * r.view.z + r.view.oy, sr = R * r.view.z;
    if (sx + sr < 0 || sy + sr < 0 || sx - sr > W || sy - sr > H) return;
    if (sr < LEAF_PX || depth >= MAX_DEPTH) {
      const d = sr * 2.3;
      ctx.drawImage(sprites[seed % 3], sx - d / 2, sy - d / 2, d, d);
      return;
    }
    // dark well under each floret (not under the whole head)
    if (depth > 0) {
      ctx.fillStyle = `hsl(${118 - depth * 4} 55% ${9 + depth * 2}%)`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr * 1.02, 0, Math.PI * 2);
      ctx.fill();
    }

    const n = CHILDREN[depth];
    const rot = seed * 0.7;
    // outer (lower) florets first, the tip last
    for (let i = n - 1; i >= 0; i--) {
      const u = (i + 0.6) / n;
      const r = R * 0.9 * Math.sqrt(u);
      const a = i * GOLDEN + rot;
      const cr = R * (0.07 + 0.095 * Math.sqrt(u)) * (n === 89 ? 0.8 : 1);
      floret(x + r * Math.cos(a), y + r * Math.sin(a), cr, depth + 1, seed * 7 + i);
    }
  }

  function draw() {
    const f = fitCanvas(canvas);
    W = f.w; H = f.h;
    ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.46;
    // soft shadow halo
    const sx = (W / 2) * r.view.z + r.view.ox, sy = (H / 2) * r.view.z + r.view.oy;
    const halo = ctx.createRadialGradient(sx, sy, R * r.view.z * 0.9, sx, sy, R * r.view.z * 1.12);
    halo.addColorStop(0, 'rgba(0,0,0,0.35)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
    floret(W / 2, H / 2, R, 0, 1);
  }

  return r;
}

export function initBroccoli(panel) {
  const canvas = panel.querySelector('#brocCanvas');
  const card = panel.querySelector('.broc-card');
  const hint = panel.querySelector('#brocHint');
  const slider = panel.querySelector('#guess');
  const $val = panel.querySelector('#guessVal');
  const markYou = panel.querySelector('#markYou');
  const markTruth = panel.querySelector('#markTruth');
  const scale = panel.querySelector('#scale');
  const revealBtn = panel.querySelector('#revealBtn');

  const rom = romanesco(canvas);
  const draw = () => rom.draw();
  let busy = null;

  function zoomTo(px, py, factor) {
    if (busy) return;
    const start = { ...rom.view };
    const zEnd = clamp(start.z * factor, 1, 4000);
    const f = zEnd / start.z;
    hint.style.opacity = 0;
    busy = tween(1300, t => {
      const e = easeInOut(t), k = Math.pow(f, e);
      rom.view = { z: start.z * k, ox: px - (px - start.ox) * k, oy: py - (py - start.oy) * k };
      draw();
    }, () => { busy = null; });
  }

  function reset() {
    if (busy) return;
    const start = { ...rom.view };
    busy = tween(900, t => {
      const e = easeInOut(t);
      const z = Math.exp(Math.log(start.z) * (1 - e));
      rom.view = { z, ox: start.ox * (1 - e), oy: start.oy * (1 - e) };
      draw();
    }, () => { busy = null; rom.view = { z: 1, ox: 0, oy: 0 }; hint.style.opacity = 1; draw(); });
  }

  card.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    const r = canvas.getBoundingClientRect();
    const dpr = canvas.width / r.width;
    zoomTo((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, 6);
  });
  panel.querySelector('#brocReset').addEventListener('click', reset);
  onResize(canvas, draw);

  // ── guess ──
  const pos = v => `${(v - 2) * 100}%`;
  function updateGuess() {
    const v = +slider.value;
    $val.textContent = v.toFixed(2);
    markYou.style.left = pos(v);
  }
  slider.addEventListener('input', updateGuess);
  const answer = panel.querySelector('.answer');
  revealBtn.addEventListener('click', () => { setRevealed(true); answer.classList.add('shown'); });
  updateGuess();

  function setRevealed(on) {
    scale.classList.toggle('revealed', on);
    markTruth.style.left = on ? pos(2.66) : pos(2);
    revealBtn.disabled = on;
  }
  setRevealed(false);

  return {
    enter() { draw(); },
    leave() {},
  };
}
