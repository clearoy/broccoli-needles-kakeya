import { fitCanvas, token, onResize, alpha, easeInOut, clamp, drawNeedle } from './util.js';

// A unit needle turning through 180° inside three classical regions.
// Each motion is a function t ∈ [0,1] -> [x0, y0, x1, y1] in unit coords
// (y down); the "head" end x1,y1 carries the arrow so the U-turn is visible.

const SQ3 = Math.sqrt(3);
const S = 2 / SQ3; // side of the equilateral triangle of height 1
const A = [0, -2 / 3], B = [S / 2, 1 / 3], C = [-S / 2, 1 / 3];
const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
const at = (p, a, r = 1) => [p[0] + r * Math.cos(a), p[1] + r * Math.sin(a)];

const disk = {
  boundary: () => { const pts = []; for (let i = 0; i < 128; i++) pts.push(at([0, 0], (i / 128) * 2 * Math.PI, 0.5)); return pts; },
  needle(t) {
    const a = Math.PI * easeInOut(t);
    const p = at([0, 0], a + Math.PI, 0.5), q = at([0, 0], a, 0.5);
    return [...p, ...q];
  },
};

// Pivot at A (tail fixed), slide to B, pivot at B (head fixed), slide to C, pivot at C (tail fixed).
const triangle = (() => {
  const aAC = ang(A, C), aAB = ang(A, B), aBA = ang(B, A), aBC = ang(B, C), aCB = ang(C, B), aCA = ang(C, A);
  const lerpA = (a0, a1, u) => { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a0 + d * u; };
  const legs = [
    u => { const a = lerpA(aAC, aAB, u); return [...A, ...at(A, a)]; },
    u => { const p = [A[0] + (B[0] - A[0]) * u * (S - 1) / S, A[1] + (B[1] - A[1]) * u * (S - 1) / S]; return [...p, ...at(p, aAB)]; },
    u => { const a = lerpA(aBA, aBC, u); return [...at(B, a), ...B]; },
    u => { const q = [B[0] + (C[0] - B[0]) * u * (S - 1) / S, B[1] + (C[1] - B[1]) * u * (S - 1) / S]; return [...at(q, aBC), ...q]; },
    u => { const a = lerpA(aCB, aCA, u); return [...C, ...at(C, a)]; },
  ];
  const w = [3, 1, 3, 1, 3], W = w.reduce((x, y) => x + y);
  return {
    boundary: () => [A, B, C],
    needle(t) {
      let s = clamp(t, 0, 1) * W;
      for (let i = 0; i < legs.length; i++) {
        if (s <= w[i] || i === legs.length - 1) return legs[i](easeInOut(clamp(s / w[i], 0, 1)));
        s -= w[i];
      }
    },
  };
})();

// Deltoid with r = 1/4: every tangent chord has length 4r = 1.
const deltoid = (() => {
  const r = 0.25;
  const P = t => [2 * r * Math.cos(t) + r * Math.cos(2 * t), 2 * r * Math.sin(t) - r * Math.sin(2 * t)];
  const ring = [];
  for (let i = 0; i < 1440; i++) ring.push(P((i / 1440) * 2 * Math.PI));
  function chord(t) {
    const p = P(t);
    let d = [-2 * r * Math.sin(t) - 2 * r * Math.sin(2 * t), 2 * r * Math.cos(t) - 2 * r * Math.cos(2 * t)];
    const L = Math.hypot(d[0], d[1]) || 1;
    d = [d[0] / L, d[1] / L];
    // intersections of the tangent line with the boundary, as signed distance along d
    const hits = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const ca = (a[0] - p[0]) * d[1] - (a[1] - p[1]) * d[0];
      const cb = (b[0] - p[0]) * d[1] - (b[1] - p[1]) * d[0];
      if (ca === cb || ca * cb > 0) continue;
      const u = ca / (ca - cb);
      const x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
      const s = (x - p[0]) * d[0] + (y - p[1]) * d[1];
      if (Math.abs(s) > 0.02) hits.push(s);
    }
    const neg = Math.max(...hits.filter(s => s < 0), -0.5);
    const pos = Math.min(...hits.filter(s => s > 0), 0.5);
    return [p[0] + d[0] * neg, p[1] + d[1] * neg, p[0] + d[0] * pos, p[1] + d[1] * pos];
  }
  // start at a cusp-free parameter; t ∈ [0, 2π] turns the chord by π
  const t0 = Math.PI / 3;
  const table = [];
  for (let i = 0; i <= 720; i++) {
    let c = chord(t0 + 0.0001 + (i / 720) * 2 * Math.PI);
    const prev = table[i - 1];
    // the tangent flips at each cusp; keep the head on the same end
    if (prev && (c[2] - c[0]) * (prev[2] - prev[0]) + (c[3] - c[1]) * (prev[3] - prev[1]) < 0) c = [c[2], c[3], c[0], c[1]];
    table.push(c);
  }
  return {
    boundary: () => ring.filter((_, i) => i % 6 === 0),
    needle(t) {
      const x = clamp(t, 0, 1) * 720, i = Math.min(719, Math.floor(x)), f = x - i;
      const a = table[i], b = table[i + 1];
      return a.map((v, k) => v + (b[k] - v) * f);
    },
  };
})();

const SHAPES = { disk, triangle, deltoid };
const DURATION = { disk: 3200, triangle: 5200, deltoid: 6000 };

export function initNeedle(panel) {
  const canvas = panel.querySelector('#needleCanvas');
  const ctx = canvas.getContext('2d');
  const trace = document.createElement('canvas');
  const tctx = trace.getContext('2d');
  let shape = 'disk', t0 = 0, raf = 0, lastT = 0, active = false;

  function view() {
    const { w, h, dpr } = fitCanvas(canvas);
    const extent = { disk: 1, triangle: 1.15, deltoid: 1.5 }[shape];
    const s = (Math.min(w, h) * 0.84) / extent;
    return { w, h, dpr, s, cx: w / 2, cy: h / 2 + (shape === 'triangle' ? s * 0.04 : 0) };
  }

  function frame(now) {
    const v = view();
    const { w, h, dpr, s, cx, cy } = v;
    if (trace.width !== w || trace.height !== h) { trace.width = w; trace.height = h; lastT = 0; }
    const t = clamp((now - t0) / DURATION[shape], 0, 1);
    const ink = token('--ink'), acc = token('--accent');
    const X = p => cx + p * s, Y = p => cy + p * s;
    const M = SHAPES[shape];

    // sweep: stamp intermediate needles onto the trace layer
    tctx.strokeStyle = alpha(acc, 0.9);
    tctx.lineWidth = 2.5 * dpr;
    tctx.lineCap = 'round';
    tctx.beginPath();
    const steps = Math.max(1, Math.ceil((t - lastT) * 900));
    for (let i = 1; i <= steps; i++) {
      const n = M.needle(lastT + ((t - lastT) * i) / steps);
      tctx.moveTo(X(n[0]), Y(n[1])); tctx.lineTo(X(n[2]), Y(n[3]));
    }
    tctx.stroke();
    lastT = t;

    ctx.clearRect(0, 0, w, h);
    // region outline
    const b = M.boundary();
    ctx.beginPath();
    b.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
    ctx.closePath();
    ctx.setLineDash([5 * dpr, 6 * dpr]);
    ctx.strokeStyle = alpha(ink, 0.45);
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.28;
    ctx.drawImage(trace, 0, 0);
    ctx.globalAlpha = 1;

    const n = M.needle(t);
    drawNeedle(ctx, X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), ink, dpr);

    if (t < 1 && active) raf = requestAnimationFrame(frame);
  }

  function play() {
    cancelAnimationFrame(raf);
    tctx.clearRect(0, 0, trace.width, trace.height);
    lastT = 0;
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function setShape(id) {
    shape = id;
    panel.querySelectorAll('[data-shape]').forEach(b => b.classList.toggle('on', b.dataset.shape === id));
    play();
  }

  panel.querySelectorAll('button[data-shape]').forEach(b => b.addEventListener('click', () => setShape(b.dataset.shape)));
  panel.querySelector('#needleReplay').addEventListener('click', play);
  onResize(canvas, () => { if (active) play(); });
  document.addEventListener('themechange', () => { if (active) play(); });

  return {
    enter() { active = true; play(); },
    leave() { active = false; cancelAnimationFrame(raf); },
  };
}
