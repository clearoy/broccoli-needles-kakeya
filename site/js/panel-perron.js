import { B, pieces, unionArea } from './perron.js';
import { fitCanvas, token, onResize, alpha, easeInOut } from './util.js';

// Build a Perron tree from 2^N pieces, hold it, and start again.
const N = 8;
const ALPHA = 0.84;   // overlap ratio that minimises the final area for N = 8 (see perron.js)
const STEP_MS = 900;  // per halving step
const HOLD_MS = 2500; // pause on the finished tree, and on the starting triangle
const AREA_T = B / 2; // area of the starting triangle (base B, height 1) = 1/√3

// horizontal centre of the pieces at build progress p
function centre(p) {
  let lo = Infinity, hi = -Infinity;
  for (const [x0, x1, ax] of pieces(N, ALPHA, p, easeInOut)) { lo = Math.min(lo, x0, ax); hi = Math.max(hi, x1, ax); }
  return (lo + hi) / 2;
}
// widest half-span needed to keep the tree centred with the original triangle [0, B] in view
const HALF = (() => {
  let m = B / 2;
  for (let p = 0; p <= N; p += 0.05) {
    const c = centre(p);
    m = Math.max(m, c, B - c);
  }
  return m;
})();

function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const c = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1)}`;
}

export function initPerron(panel) {
  const canvas = panel.querySelector('#perronCanvas');
  const ctx = canvas.getContext('2d');
  const $area = panel.querySelector('#pArea');
  let p = 0, raf = 0, t0 = 0, active = false;

  function draw() {
    const { w, h, dpr } = fitCanvas(canvas);
    const tris = pieces(N, ALPHA, p, easeInOut);
    const ink = token('--ink'), c1 = token('--s1'), c2 = token('--s3');
    ctx.clearRect(0, 0, w, h);

    // frame the finished tree and the original triangle together
    // the view follows the tree so the motion stays centred
    const cxW = centre(p);
    const s = Math.min((w * 0.46) / HALF, h * 0.82);
    const X = x => w / 2 + (x - cxW) * s, Y = y => h / 2 + (0.5 - y) * s;

    // the original triangle
    ctx.setLineDash([5 * dpr, 6 * dpr]);
    ctx.strokeStyle = alpha(ink, 0.3);
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(B), Y(0)); ctx.lineTo(X(B / 2), Y(1)); ctx.closePath(); ctx.stroke();
    ctx.setLineDash([]);

    tris.forEach(([x0, x1, ax], i) => {
      ctx.beginPath();
      ctx.moveTo(X(x0), Y(0)); ctx.lineTo(X(x1), Y(0)); ctx.lineTo(X(ax), Y(1)); ctx.closePath();
      ctx.fillStyle = alpha(mix(c1, c2, i / (tris.length - 1)), 0.5);
      ctx.fill();
    });

    $area.textContent = (unionArea(tris) * AREA_T).toFixed(3);
  }

  function tick(now) {
    const build = N * STEP_MS, cycle = HOLD_MS + build + HOLD_MS;
    const t = (now - t0) % cycle;
    p = t < HOLD_MS ? 0 : Math.min(N, (t - HOLD_MS) / STEP_MS);
    draw();
    if (active) raf = requestAnimationFrame(tick);
  }

  onResize(canvas, draw);
  document.addEventListener('themechange', draw);

  return {
    enter() { active = true; t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); },
    leave() { active = false; cancelAnimationFrame(raf); },
  };
}
